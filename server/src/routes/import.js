const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { query } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { parseUploadedDocument } = require('../utils/documentParser');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = express.Router();

// Helper: Normalize column names
function normalizeKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Helper: Find value from multiple possible header keys
function getRowValue(row, possibleNames) {
  for (const key of Object.keys(row)) {
    const normalizedKey = normalizeKey(key);
    for (const name of possibleNames) {
      if (normalizedKey === normalizeKey(name) || normalizedKey.includes(normalizeKey(name))) {
        return String(row[key] || '').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return '';
}

// Helper: Parse gender string
function parseGender(raw) {
  const clean = String(raw || '').trim().toLowerCase();
  if (['m', 'male', 'boy', 'boys', 'b'].includes(clean)) return 'MALE';
  if (['f', 'female', 'girl', 'girls', 'g'].includes(clean)) return 'FEMALE';
  return 'UNKNOWN';
}

// POST /api/import/preview
// Parses uploaded file (Excel, Word docx, Image OCR, CSV), validates, auto-groups by bus and stop, separates boys/girls
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    let rows = [];
    let detectedFormat = 'UNKNOWN';

    // Fetch existing known bus stops from DB to enhance parsing accuracy
    const stopRows = await query.all('SELECT DISTINCT stop_name FROM bus_stops');
    const knownStops = stopRows.map(s => s.stop_name).filter(Boolean);

    let defaultGenderFromFile = 'MALE';
    let isFacultyFile = false;

    if (req.file) {
      const parsed = await parseUploadedDocument(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        knownStops
      );
      rows = parsed.rows;
      detectedFormat = parsed.sourceFormat;
      if (parsed.defaultGender) defaultGenderFromFile = parsed.defaultGender;
      if (parsed.isFacultyDoc) isFacultyFile = true;
      if (/faculty|staff|prof|teacher/i.test(req.file.originalname)) isFacultyFile = true;
    } else if (req.body.textData) {
      const parsed = await parseUploadedDocument(
        Buffer.from(req.body.textData, 'utf8'),
        'input.csv',
        'text/csv',
        knownStops
      );
      rows = parsed.rows;
      detectedFormat = 'TEXT_DATA';
      if (parsed.defaultGender) defaultGenderFromFile = parsed.defaultGender;
      if (parsed.isFacultyDoc) isFacultyFile = true;
    } else {
      return res.status(400).json({ error: 'No file or text data provided for import.' });
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Uploaded file yielded no readable records. Please ensure names and details are clearly visible.' });
    }

    // Determine targetType (explicit from client OR auto-detected)
    const requestedTarget = (req.body.targetType || '').toUpperCase();
    const hasFacultyKeys = rows.some(r => Object.keys(r).some(k => /faculty|staff|prof/i.test(k)));
    const isFaculty = requestedTarget === 'FACULTY' || (requestedTarget !== 'STUDENTS' && (isFacultyFile || hasFacultyKeys));

    // =========================================================================
    // 1. FACULTY IMPORT PREVIEW & DEDUPLICATION (Saves to Faculty Attendance)
    // =========================================================================
    if (isFaculty) {
      const existingFaculty = await query.all('SELECT id, faculty_id, name, department, phone FROM faculty');
      const existingFacMap = new Map();
      const existingFacNameMap = new Map();

      for (const f of existingFaculty) {
        if (f.faculty_id) existingFacMap.set(f.faculty_id.toUpperCase(), f);
        if (f.name) existingFacNameMap.set(`${f.name.toLowerCase().trim()}|${(f.department || '').toUpperCase().trim()}`, f);
      }

      const seenInFile = new Set();
      const validRecords = [];
      const invalidRecords = [];
      const duplicateRecords = [];
      const deptSet = new Set();
      const busSet = new Set();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2;

        const name = (row.name || getRowValue(row, [
          'facultyname', 'faculty_name', 'staffname', 'staff_name', 'teachername', 'nameoffaculty',
          'nameofstaff', 'name', 'studentname', 'student_name', 'fullname'
        ])).trim();

        if (!name || /^(total|date|s\.?no|boarding|signature)/i.test(name)) continue;

        let rawFacId = row.faculty_id || row.register_number || getRowValue(row, [
          'facultyid', 'faculty_id', 'staffid', 'staff_id', 'empid', 'emp_id', 'staffno',
          'id', 'idno', 'aidno', 'adno', 'regno'
        ]);
        let facultyId = String(rawFacId || '').trim().toUpperCase();

        const rawDept = row.department || getRowValue(row, [
          'collegedpt', 'college_dpt', 'department', 'dept', 'branch', 'course', 'dpt'
        ]);
        const department = (rawDept || 'CSE').trim().toUpperCase();
        deptSet.add(department);

        const phone = (row.phone || getRowValue(row, [
          'phone', 'phonenumber', 'phoneno', 'mobile', 'mobileno', 'mobilenumber', 'contact'
        ]) || '').trim();

        const rawBus = row.bus_number || getRowValue(row, ['bus', 'busno', 'busnumber', 'route']) || 'BUS 16';
        const busNumber = rawBus.toUpperCase().startsWith('BUS') ? rawBus.toUpperCase() : `BUS ${rawBus}`;
        busSet.add(busNumber);

        if (!facultyId) {
          const cleanNameKey = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 6) || 'FAC';
          const cleanDeptKey = department.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 4) || 'GEN';
          facultyId = `FAC-${cleanDeptKey}-${cleanNameKey}-${i + 1}`;
        }

        const normKey = `${name.toLowerCase().trim()}|${department}`;
        let isDuplicate = false;
        let dupReason = '';

        if (seenInFile.has(facultyId) || seenInFile.has(normKey)) {
          isDuplicate = true;
          dupReason = 'Duplicate entry in uploaded document (skipped)';
        } else if (existingFacMap.has(facultyId)) {
          isDuplicate = true;
          dupReason = `Already in Faculty Roster with ID ${facultyId}`;
        } else if (existingFacNameMap.has(normKey)) {
          isDuplicate = true;
          dupReason = `Already in Faculty Roster (${name} - ${department})`;
        }

        if (isDuplicate) {
          duplicateRecords.push({
            rowNumber,
            faculty_id: facultyId,
            name,
            department,
            phone,
            bus_number: busNumber,
            reason: dupReason
          });
        } else {
          seenInFile.add(facultyId);
          seenInFile.add(normKey);
          validRecords.push({
            rowNumber,
            faculty_id: facultyId,
            name,
            department,
            phone,
            bus_number: busNumber,
            target_type: 'FACULTY'
          });
        }
      }

      return res.json({
        target_type: 'FACULTY',
        source_format: detectedFormat,
        summary: {
          target_type: 'FACULTY',
          total_records_read: rows.length,
          valid_records_count: validRecords.length,
          duplicate_records_count: duplicateRecords.length,
          invalid_records_count: invalidRecords.length,
          departments: Array.from(deptSet),
          buses: Array.from(busSet)
        },
        valid_records: validRecords,
        duplicate_records: duplicateRecords,
        invalid_records: invalidRecords
      });
    }

    // =========================================================================
    // 2. STUDENT IMPORT PREVIEW & DEDUPLICATION (Saves to Students Attendance)
    // =========================================================================
    // Existing students in database to detect duplicates across Register/AID No, Department, and Name
    const existingStudents = await query.all('SELECT register_number, name, department FROM students');
    const existingRegMap = new Map();
    const existingCompositeSet = new Set();

    for (const s of existingStudents) {
      const reg = String(s.register_number || '').trim().toUpperCase();
      const nm = String(s.name || '').trim().toLowerCase();
      const dep = String(s.department || '').trim().toUpperCase();
      if (reg) existingRegMap.set(reg, { name: nm, department: dep });
      if (nm && dep) existingCompositeSet.add(`${nm}|${dep}`);
      if (reg && nm) existingCompositeSet.add(`${reg}|${nm}`);
    }

    const seenInFile = new Set();
    const validRecords = [];
    const invalidRecords = [];
    const duplicateRecords = [];

    const busGroupMap = {}; // busName -> { stops: { stopName: { boys: [], girls: [] } } }
    let lastSeenStop = 'Campus / Main Stop';

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // Accounting for 1-based index and header

      // Handle pre-classified records (from Excel parser/Word/OCR) and raw header objects
      const name = (row.name || getRowValue(row, [
        'name', 'studentname', 'student_name', 'fullname', 'candidate_name', 'student', 'nameofstudent'
      ])).trim();

      if (!name || /^(total|date|s\.?no|boarding|signature)/i.test(name)) continue;

      // Register / AID / AD / ID number extraction supporting multiple conventions
      let rawRegNo = row.register_number || getRowValue(row, [
        'aidno', 'aid_no', 'aid.no', 'aidnumber', 'aid_number', 'aid',
        'adno', 'ad_no', 'ad.no', 'adnumber', 'ad_number', 'admissionno', 'admission_no', 'admissionnumber',
        'idno', 'id_no', 'id.no', 'idnumber', 'id_number', 'studentid', 'student_id', 'id',
        'regno', 'registerno', 'register_number', 'registernumber', 'rollno', 'roll_no', 'reg_number', 'register_no', 'roll', 'ad'
      ]);
      let regNo = String(rawRegNo || '').toUpperCase().trim();

      // College / Department (e.g. DSEC/EEE, DSU/Mech, Pharmacy, DSPC/CSE)
      const rawDept = row.department || getRowValue(row, [
        'collegedpt', 'college_dpt', 'college/dpt', 'collegedept', 'college_dept', 'college/dept',
        'college', 'department', 'dept', 'branch', 'course', 'dpt'
      ]);
      const department = (rawDept || 'CSE').trim().toUpperCase();

      // Auto-assign provisional ID if student does not yet have an AID / AD.No
      // Deterministic ID ensures identical repeated entries without AID are still detected as duplicates
      if (!regNo) {
        const cleanNameKey = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 6) || 'STU';
        const cleanDeptKey = department.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 4) || 'GEN';
        regNo = `PROV-${cleanNameKey}-${cleanDeptKey}`;
      }

      // Boarding Point with propagation for merged cells
      const rawStopName = row.stop_name || getRowValue(row, [
        'boardingpoint', 'boarding_point', 'boardingdetails', 'boarding_details',
        'stop', 'busstop', 'stopping', 'bus_stop', 'stop_name', 'stage'
      ]);
      if (rawStopName && rawStopName.trim()) {
        lastSeenStop = rawStopName.trim();
      }
      const stopName = (rawStopName || lastSeenStop || 'Campus / Main Stop').trim();

      // Year (I, II, III, IV)
      const rawYear = row.year || getRowValue(row, ['year', 'yr', 'class', 'currentyear']);
      let year = (rawYear || 'I').trim().toUpperCase();
      if (year === '1' || year === '1ST') year = 'I';
      else if (year === '2' || year === '2ND') year = 'II';
      else if (year === '3' || year === '3RD') year = 'III';
      else if (year === '4' || year === '4TH') year = 'IV';

      // Gender (defaults gracefully to detected gender from file e.g. FEMALE for girls docx)
      const rawGender = row.gender || getRowValue(row, ['gender', 'sex']);
      let gender = parseGender(rawGender);
      if (gender === 'UNKNOWN') {
        gender = defaultGenderFromFile || 'MALE';
      }

      const rawBus = row.bus_number || getRowValue(row, ['bus', 'busno', 'busnumber', 'bus_number', 'route']) || 'BUS 16';
      const busNumber = rawBus.toUpperCase().startsWith('BUS') ? rawBus.toUpperCase() : `BUS ${rawBus}`;

      // Validation
      const errors = [];
      if (!name) errors.push('Missing Student Name');
      if (!regNo) errors.push('Missing Register / AID / AD.No');
      if (!stopName) errors.push('Missing Bus Stop / Boarding Point');

      // Smart Deduplication:
      // Don't just check name alone! Verify AID/Register Number + Department.
      // If AID number, Department & Name are repeated, take it only once.
      const normalizedName = name.toLowerCase().replace(/\s+/g, ' ');
      const studentCompositeKey = `${regNo}|${department}`;

      let isDuplicateInFile = false;
      let isDuplicateInDB = false;
      let duplicateReason = '';

      if (seenInFile.has(studentCompositeKey) || seenInFile.has(regNo)) {
        isDuplicateInFile = true;
        duplicateReason = 'Duplicate entry in uploaded file (taken once, duplicate skipped)';
      } else if (existingRegMap.has(regNo)) {
        const existing = existingRegMap.get(regNo);
        isDuplicateInDB = true;
        duplicateReason = `Already in database (${existing.department || department}) - will update details`;
      } else if (existingCompositeSet.has(`${normalizedName}|${department}`)) {
        isDuplicateInDB = true;
        duplicateReason = `Already in database (${name}) - will update details`;
      }

      if (isDuplicateInFile) {
        duplicateRecords.push({
          rowNumber,
          register_number: regNo,
          name,
          department,
          bus_number: busNumber,
          stop_name: stopName,
          reason: duplicateReason
        });
        continue; // Only skip genuine duplicates within the file itself
      }

      if (isDuplicateInDB) {
        duplicateRecords.push({
          rowNumber,
          register_number: regNo,
          name,
          department,
          bus_number: busNumber,
          stop_name: stopName,
          reason: duplicateReason
        });
      }

      if (errors.length > 0) {
        invalidRecords.push({
          rowNumber,
          name: name || 'Unknown',
          register_number: regNo || 'Missing',
          errors
        });
      } else {
        seenInFile.add(studentCompositeKey);
        seenInFile.add(regNo);
        const record = {
          rowNumber,
          name,
          register_number: regNo,
          gender,
          bus_number: busNumber,
          stop_name: stopName,
          department,
          year,
          is_update: isDuplicateInDB
        };
        validRecords.push(record);

        // Grouping
        const bKey = record.bus_number;
        const sKey = record.stop_name;

        if (!busGroupMap[bKey]) {
          busGroupMap[bKey] = { stops: {} };
        }
        if (!busGroupMap[bKey].stops[sKey]) {
          busGroupMap[bKey].stops[sKey] = { boys: [], girls: [] };
        }

        if (gender === 'MALE') {
          busGroupMap[bKey].stops[sKey].boys.push(record);
        } else {
          busGroupMap[bKey].stops[sKey].girls.push(record);
        }
      }
    }

    // Format grouped hierarchy for frontend inspection
    const busesSummary = Object.keys(busGroupMap).map(busName => {
      const stopsObj = busGroupMap[busName].stops;
      const stopsList = Object.keys(stopsObj).map(stopName => {
        const boys = stopsObj[stopName].boys;
        const girls = stopsObj[stopName].girls;
        return {
          stop_name: stopName,
          total: boys.length + girls.length,
          boys_count: boys.length,
          girls_count: girls.length,
          boys,
          girls
        };
      });

      const totalBusStudents = stopsList.reduce((acc, s) => acc + s.total, 0);
      return {
        bus_number: busName,
        total_students: totalBusStudents,
        total_stops: stopsList.length,
        stops: stopsList
      };
    });

    const totalBoys = validRecords.filter(r => r.gender === 'MALE').length;
    const totalGirls = validRecords.filter(r => r.gender === 'FEMALE').length;

    return res.json({
      source_format: detectedFormat,
      summary: {
        total_records_read: rows.length,
        valid_records_count: validRecords.length,
        invalid_records_count: invalidRecords.length,
        duplicate_records_count: duplicateRecords.length,
        total_boys: totalBoys,
        total_girls: totalGirls,
        total_buses: Object.keys(busGroupMap).length,
        total_stops: Object.values(busGroupMap).reduce((acc, b) => acc + Object.keys(b.stops).length, 0)
      },
      buses: busesSummary,
      valid_records: validRecords,
      invalid_records: invalidRecords,
      duplicate_records: duplicateRecords
    });
  } catch (err) {
    console.error('[Import Preview Error]:', err);
    return res.status(500).json({ error: 'Failed to process import file: ' + err.message });
  }
});

// POST /api/import/commit
// Saves verified records into the SQLite database with automatic stop creation
router.post('/commit', verifyToken, requireRole(['ADMIN', 'COORDINATOR', 'STUDENT_COORDINATOR', 'STOP_COORDINATOR', 'FACULTY']), async (req, res) => {
  try {
    const { records, targetType } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'No records provided for database commit.' });
    }

    const isFacultyCommit = targetType === 'FACULTY' || records[0]?.target_type === 'FACULTY' || !!records[0]?.faculty_id;

    // -------------------------------------------------------------------------
    // COMMIT TO FACULTY TABLE (Faculty Transportation Roster)
    // -------------------------------------------------------------------------
    if (isFacultyCommit) {
      let insertedCount = 0;
      let updatedCount = 0;

      for (const rec of records) {
        // Find or create Bus
        const busNum = rec.bus_number || 'BUS 16';
        let bus = await query.get('SELECT id FROM buses WHERE bus_number = ?', [busNum]);
        let busId;
        if (!bus) {
          const busInsert = await query.run(`
            INSERT INTO buses (bus_number, route_name, capacity, is_active)
            VALUES (?, ?, 60, 1)
          `, [busNum, `${busNum} Route`]);
          busId = busInsert.lastID;
        } else {
          busId = bus.id;
        }

        const facId = rec.faculty_id || `FAC-${rec.department || 'GEN'}-${rec.name.replace(/[^A-Za-z0-9]/g, '').substring(0, 6)}`;
        const existing = await query.get(
          'SELECT id FROM faculty WHERE faculty_id = ? OR (LOWER(name) = LOWER(?) AND department = ?)',
          [facId, rec.name, rec.department]
        );

        if (existing) {
          await query.run(`
            UPDATE faculty SET
              name = ?,
              department = ?,
              bus_id = ?,
              phone = COALESCE(NULLIF(?, ''), phone),
              is_active = 1
            WHERE id = ?
          `, [rec.name, rec.department, busId, rec.phone || null, existing.id]);
          updatedCount++;
        } else {
          await query.run(`
            INSERT INTO faculty (faculty_id, name, department, bus_id, phone, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
          `, [facId, rec.name, rec.department, busId, rec.phone || null]);
          insertedCount++;
        }
      }

      return res.json({
        success: true,
        target_type: 'FACULTY',
        message: `Successfully imported ${insertedCount} faculty members into Faculty Attendance Roster (${updatedCount} updated).`,
        inserted_count: insertedCount,
        updated_count: updatedCount
      });
    }

    // -------------------------------------------------------------------------
    // COMMIT TO STUDENTS TABLE (Student Attendance Roster)
    // -------------------------------------------------------------------------
    let insertedCount = 0;
    let updatedCount = 0;

    for (const rec of records) {
      if (!rec.register_number || !rec.name) continue;

      // 1. Determine Target Bus
      let busId;
      if (req.body.targetBusId) {
        busId = req.body.targetBusId;
      } else {
        const busNum = rec.bus_number || 'BUS 16';
        let bus = await query.get('SELECT id FROM buses WHERE bus_number = ?', [busNum]);
        if (!bus) {
          const busInsert = await query.run(`
            INSERT INTO buses (bus_number, route_name, capacity, is_active)
            VALUES (?, ?, 60, 1)
          `, [busNum, `${busNum} Route`]);
          busId = busInsert.lastID;
        } else {
          busId = bus.id;
        }
      }

      // 2. Find or create Bus Stop under this bus
      const stopName = (rec.stop_name || 'Campus / Main Stop').trim();
      let stop = await query.get(
        'SELECT id FROM bus_stops WHERE bus_id = ? AND LOWER(stop_name) = LOWER(?)',
        [busId, stopName]
      );
      let stopId;
      if (!stop) {
        // Find max stop_order
        const maxOrder = await query.get('SELECT MAX(stop_order) as m FROM bus_stops WHERE bus_id = ?', [busId]);
        const nextOrder = (maxOrder && maxOrder.m ? maxOrder.m : 0) + 1;
        const stopInsert = await query.run(`
          INSERT INTO bus_stops (bus_id, stop_name, stop_order, pickup_time)
          VALUES (?, ?, ?, '08:00 AM')
        `, [busId, stopName, nextOrder]);
        stopId = stopInsert.lastID;
      } else {
        stopId = stop.id;
      }

      // 3. Upsert Student (Update if exists, Insert if new)
      const existing = await query.get('SELECT id FROM students WHERE register_number = ?', [rec.register_number]);
      if (existing) {
        await query.run(`
          UPDATE students SET
            name = ?,
            gender = ?,
            bus_id = ?,
            stop_id = ?,
            department = ?,
            year = ?,
            is_active = 1
          WHERE id = ?
        `, [rec.name, rec.gender || 'MALE', busId, stopId, rec.department || 'CSE', rec.year || 'II', existing.id]);
        updatedCount++;
      } else {
        await query.run(`
          INSERT INTO students (register_number, name, gender, bus_id, stop_id, department, year, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, [rec.register_number, rec.name, rec.gender || 'MALE', busId, stopId, rec.department || 'CSE', rec.year || 'II']);
        insertedCount++;
      }
    }

    const message = updatedCount > 0
      ? `Successfully saved ${insertedCount + updatedCount} students (${insertedCount} new added, ${updatedCount} updated) across bus stops.`
      : `Successfully imported ${insertedCount} students grouped into stops.`;

    return res.json({
      success: true,
      message,
      inserted_count: insertedCount,
      updated_count: updatedCount
    });
  } catch (err) {
    console.error('[Import Commit Error]:', err);
    return res.status(500).json({ error: 'Failed to commit imported records.' });
  }
});

// GET /api/import/template
// Generates sample Excel template with randomized college students
router.get('/template', (req, res) => {
  const sampleData = [
    { 'Student Name': 'Ramesh R', 'Register Number': '23CSE101', 'Gender': 'Male', 'Bus Number': 'BUS 01', 'Bus Stop': 'Gandhigramam', 'Department': 'CSE', 'Year': 'II' },
    { 'Student Name': 'Soundharya S', 'Register Number': '23CSE102', 'Gender': 'Female', 'Bus Number': 'BUS 01', 'Bus Stop': 'Karur Town', 'Department': 'CSE', 'Year': 'II' },
    { 'Student Name': 'Vasanth M', 'Register Number': '23ECE101', 'Gender': 'Male', 'Bus Number': 'BUS 01', 'Bus Stop': 'Gandhigramam', 'Department': 'ECE', 'Year': 'II' },
    { 'Student Name': 'Yamuna P', 'Register Number': '23ECE102', 'Gender': 'Female', 'Bus Number': 'BUS 01', 'Bus Stop': 'Thanthonimalai', 'Department': 'ECE', 'Year': 'II' },
    { 'Student Name': 'Karthik N', 'Register Number': '23MECH101', 'Gender': 'Male', 'Bus Number': 'BUS 01', 'Bus Stop': 'Gandhigramam', 'Department': 'MECH', 'Year': 'III' },
    { 'Student Name': 'Pavithra K', 'Register Number': '23AIDS101', 'Gender': 'Female', 'Bus Number': 'BUS 01', 'Bus Stop': 'Gandhigramam', 'Department': 'AI&DS', 'Year': 'II' }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=Students_Import_Template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buffer);
});

module.exports = router;

const express = require('express');
const XLSX = require('xlsx');
const { query } = require('../config/database');

const router = express.Router();

// Helper to set column widths nicely in Excel
function autofitColumns(ws, data) {
  if (!data || data.length === 0) return;
  const keys = Object.keys(data[0]);
  const cols = keys.map(key => {
    let maxLen = key.length;
    for (const row of data) {
      const val = row[key] ? String(row[key]) : '';
      if (val.length > maxLen) maxLen = val.length;
    }
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });
  ws['!cols'] = cols;
}

// GET /api/reports/daily?date=2026-09-18&busId=1
router.get('/daily', async (req, res) => {
  try {
    let { busId, date = new Date().toISOString().split('T')[0] } = req.query;

    let bus;
    if (busId) {
      bus = await query.get('SELECT * FROM buses WHERE id = ?', [busId]);
    }
    if (!bus) {
      bus = await query.get("SELECT * FROM buses WHERE bus_number = 'BUS 16' OR is_active = 1 LIMIT 1");
    }
    const resolvedBusId = bus ? bus.id : 1;

    // 1. Unified Students List with both Morning (M) and Evening (E) attendance!
    const unifiedStudents = await query.all(`
      SELECT 
        s.id,
        s.name,
        s.register_number,
        s.gender,
        s.department,
        s.year,
        bs.id as stop_id,
        bs.stop_name,
        bs.stop_order,
        COALESCE(ar_m.status, 'UNMARKED') as morning_status,
        ar_m.marked_at as morning_time,
        COALESCE(ar_e.status, 'UNMARKED') as evening_status,
        ar_e.marked_at as evening_time
      FROM students s
      JOIN bus_stops bs ON s.stop_id = bs.id
      LEFT JOIN attendance_records ar_m ON s.id = ar_m.student_id AND ar_m.attendance_date = ? AND ar_m.session = 'MORNING'
      LEFT JOIN attendance_records ar_e ON s.id = ar_e.student_id AND ar_e.attendance_date = ? AND ar_e.session = 'EVENING'
      WHERE s.bus_id = ? AND s.is_active = 1
      ORDER BY bs.stop_order ASC, s.name ASC
    `, [date, date, resolvedBusId]);

    // Session Summaries
    const mPresent = unifiedStudents.filter(s => s.morning_status === 'PRESENT').length;
    const mAbsent = unifiedStudents.filter(s => s.morning_status === 'ABSENT').length;
    const mUnmarked = unifiedStudents.filter(s => s.morning_status === 'UNMARKED').length;

    const ePresent = unifiedStudents.filter(s => s.evening_status === 'PRESENT').length;
    const eAbsent = unifiedStudents.filter(s => s.evening_status === 'ABSENT').length;
    const eUnmarked = unifiedStudents.filter(s => s.evening_status === 'UNMARKED').length;

    const totalStudents = unifiedStudents.length;

    // Stop-wise breakdown
    const stops = await query.all(`
      SELECT 
        bs.id as stop_id,
        bs.stop_name,
        bs.stop_order,
        bs.pickup_time,
        COUNT(s.id) as total_students,
        SUM(CASE WHEN s.gender = 'MALE' THEN 1 ELSE 0 END) as boys_count,
        SUM(CASE WHEN s.gender = 'FEMALE' THEN 1 ELSE 0 END) as girls_count,
        SUM(CASE WHEN ar_m.status = 'PRESENT' THEN 1 ELSE 0 END) as morning_present,
        SUM(CASE WHEN ar_m.status = 'ABSENT' THEN 1 ELSE 0 END) as morning_absent,
        SUM(CASE WHEN ar_e.status = 'PRESENT' THEN 1 ELSE 0 END) as evening_present,
        SUM(CASE WHEN ar_e.status = 'ABSENT' THEN 1 ELSE 0 END) as evening_absent
      FROM bus_stops bs
      LEFT JOIN students s ON bs.id = s.stop_id AND s.is_active = 1
      LEFT JOIN attendance_records ar_m ON s.id = ar_m.student_id AND ar_m.attendance_date = ? AND ar_m.session = 'MORNING'
      LEFT JOIN attendance_records ar_e ON s.id = ar_e.student_id AND ar_e.attendance_date = ? AND ar_e.session = 'EVENING'
      WHERE bs.bus_id = ?
      GROUP BY bs.id
      ORDER BY bs.stop_order ASC
    `, [date, date, resolvedBusId]);

    // Faculty Attendance for this day
    const facultyRecords = await query.all(`
      SELECT f.faculty_id, f.name, f.department,
        COALESCE(far_m.status, 'UNMARKED') as morning_status,
        COALESCE(far_e.status, 'UNMARKED') as evening_status
      FROM faculty f
      LEFT JOIN faculty_attendance_records far_m ON f.id = far_m.faculty_id AND far_m.attendance_date = ? AND far_m.session = 'MORNING'
      LEFT JOIN faculty_attendance_records far_e ON f.id = far_e.faculty_id AND far_e.attendance_date = ? AND far_e.session = 'EVENING'
      WHERE f.bus_id = ? AND f.is_active = 1
      ORDER BY f.department ASC, f.name ASC
    `, [date, date, resolvedBusId]);

    return res.json({
      bus,
      date,
      overall: {
        total_students: totalStudents,
        present: mPresent,
        absent: mAbsent,
        unmarked: mUnmarked,
        attendance_percentage: totalStudents > 0 ? Math.round((mPresent / totalStudents) * 100) : 0,
        morning: {
          present: mPresent,
          absent: mAbsent,
          unmarked: mUnmarked,
          attendance_percentage: totalStudents > 0 ? Math.round((mPresent / totalStudents) * 100) : 0
        },
        evening: {
          present: ePresent,
          absent: eAbsent,
          unmarked: eUnmarked,
          attendance_percentage: totalStudents > 0 ? Math.round((ePresent / totalStudents) * 100) : 0
        }
      },
      students_unified: unifiedStudents,
      stops,
      faculty: {
        records: facultyRecords
      }
    });
  } catch (err) {
    console.error('[Daily Report Error]:', err);
    return res.status(500).json({ error: 'Failed to generate daily report.' });
  }
});

// GET /api/reports/weekly?startDate=YYYY-MM-DD&busId=...
router.get('/weekly', async (req, res) => {
  try {
    let { busId, startDate } = req.query;

    let bus;
    if (busId) {
      bus = await query.get('SELECT * FROM buses WHERE id = ?', [busId]);
    }
    if (!bus) {
      bus = await query.get("SELECT * FROM buses WHERE bus_number = 'BUS 16' OR is_active = 1 LIMIT 1");
    }
    const resolvedBusId = bus ? bus.id : 1;

    // Determine week bounds (default to current week: Monday to Saturday)
    let start = startDate ? new Date(startDate) : new Date();
    const dayOfWeek = start.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(start);
    monday.setDate(start.getDate() - distanceToMonday);

    const weekDates = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(d.toISOString().split('T')[0]);
    }

    const startStr = weekDates[0];
    const endStr = weekDates[weekDates.length - 1];

    // Students with attendance across the week
    const students = await query.all(`
      SELECT s.id, s.register_number, s.name, s.gender, s.department, s.year, bs.stop_name
      FROM students s
      JOIN bus_stops bs ON s.stop_id = bs.id
      WHERE s.bus_id = ? AND s.is_active = 1
      ORDER BY bs.stop_order ASC, s.name ASC
    `, [resolvedBusId]);

    const records = await query.all(`
      SELECT student_id, attendance_date, status
      FROM attendance_records
      WHERE bus_id = ? AND attendance_date >= ? AND attendance_date <= ?
    `, [resolvedBusId, startStr, endStr]);

    const studentMap = {};
    for (const r of records) {
      if (!studentMap[r.student_id]) studentMap[r.student_id] = {};
      studentMap[r.student_id][r.attendance_date] = r.status;
    }

    let totalStudents = students.length;
    let totalPresentMarks = 0;
    let totalRecordedMarks = 0;

    const studentRoster = students.map(stu => {
      const days = {};
      let presentDays = 0;
      let absentDays = 0;

      for (const d of weekDates) {
        const st = studentMap[stu.id] ? (studentMap[stu.id][d] || 'UNMARKED') : 'UNMARKED';
        days[d] = st;
        if (st === 'PRESENT') {
          presentDays++;
          totalPresentMarks++;
          totalRecordedMarks++;
        } else if (st === 'ABSENT') {
          absentDays++;
          totalRecordedMarks++;
        }
      }

      const totalActiveDays = presentDays + absentDays;
      const pct = totalActiveDays > 0 ? Math.round((presentDays / totalActiveDays) * 100) : 0;

      return {
        ...stu,
        days,
        present_days: presentDays,
        absent_days: absentDays,
        attendance_percentage: pct
      };
    });

    const overallPct = totalRecordedMarks > 0 ? Math.round((totalPresentMarks / totalRecordedMarks) * 100) : 0;

    return res.json({
      bus,
      startDate: startStr,
      endDate: endStr,
      weekDates,
      total_students: totalStudents,
      overall_percentage: overallPct,
      students: studentRoster
    });
  } catch (err) {
    console.error('[Weekly Report Error]:', err);
    return res.status(500).json({ error: 'Failed to generate weekly report.' });
  }
});

// GET /api/reports/monthly?month=2026-09&busId=...
router.get('/monthly', async (req, res) => {
  try {
    let { busId, month = new Date().toISOString().substring(0, 7) } = req.query;

    let bus;
    if (busId) {
      bus = await query.get('SELECT * FROM buses WHERE id = ?', [busId]);
    }
    if (!bus) {
      bus = await query.get("SELECT * FROM buses WHERE bus_number = 'BUS 16' OR is_active = 1 LIMIT 1");
    }
    const resolvedBusId = bus ? bus.id : 1;

    // Distinct attendance dates in this month
    const distinctDates = await query.all(`
      SELECT DISTINCT attendance_date
      FROM attendance_records
      WHERE bus_id = ? AND attendance_date LIKE ?
      ORDER BY attendance_date ASC
    `, [resolvedBusId, `${month}%`]);

    const totalDays = distinctDates.length;

    // Student-wise attendance for this month
    const studentRecords = await query.all(`
      SELECT 
        s.id,
        s.register_number,
        s.name,
        s.gender,
        s.department,
        bs.stop_name,
        SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN ar.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_days
      FROM students s
      JOIN bus_stops bs ON s.stop_id = bs.id
      LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.attendance_date LIKE ?
      WHERE s.bus_id = ? AND s.is_active = 1
      GROUP BY s.id
      ORDER BY bs.stop_order ASC, s.name ASC
    `, [`${month}%`, resolvedBusId]);

    const studentList = studentRecords.map(s => {
      const percentage = totalDays > 0 ? Math.round((s.present_days / totalDays) * 100) : 0;
      return {
        ...s,
        total_days: totalDays,
        attendance_percentage: percentage
      };
    });

    // Stop-wise monthly averages
    const stopSummary = await query.all(`
      SELECT 
        bs.id as stop_id,
        bs.stop_name,
        COUNT(DISTINCT s.id) as total_students,
        SUM(CASE WHEN s.gender = 'MALE' THEN 1 ELSE 0 END) as boys_count,
        SUM(CASE WHEN s.gender = 'FEMALE' THEN 1 ELSE 0 END) as girls_count,
        SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) as total_present_marks,
        SUM(CASE WHEN ar.status = 'ABSENT' THEN 1 ELSE 0 END) as total_absent_marks
      FROM bus_stops bs
      JOIN students s ON bs.id = s.stop_id AND s.is_active = 1
      LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.attendance_date LIKE ?
      WHERE bs.bus_id = ?
      GROUP BY bs.id
      ORDER BY bs.stop_order ASC
    `, [`${month}%`, resolvedBusId]);

    const stopStats = stopSummary.map(st => {
      const maxPossibleMarks = st.total_students * (totalDays || 1);
      const avgPercentage = maxPossibleMarks > 0 ? Math.round((st.total_present_marks / maxPossibleMarks) * 100) : 0;
      return {
        ...st,
        attendance_percentage: avgPercentage
      };
    });

    let totalPresentMarks = 0;
    studentList.forEach(s => {
      totalPresentMarks += s.present_days;
    });
    const totalPossible = studentList.length * (totalDays || 1);
    const overallAvg = totalPossible > 0 ? Math.round((totalPresentMarks / totalPossible) * 100) : 0;

    return res.json({
      bus,
      month,
      total_days: totalDays,
      total_students: studentList.length,
      average_attendance: overallAvg,
      students: studentList,
      stops: stopStats
    });
  } catch (err) {
    console.error('[Monthly Report Error]:', err);
    return res.status(500).json({ error: 'Failed to generate monthly report.' });
  }
});

// EXCEL EXPORTS

// 1. GET /api/reports/export/daily-excel
router.get('/export/daily-excel', async (req, res) => {
  try {
    let { busId, date = new Date().toISOString().split('T')[0] } = req.query;

    let bus;
    if (busId) bus = await query.get('SELECT * FROM buses WHERE id = ?', [busId]);
    if (!bus) bus = await query.get("SELECT * FROM buses WHERE bus_number = 'BUS 16' OR is_active = 1 LIMIT 1");
    const resolvedBusId = bus ? bus.id : 1;

    const students = await query.all(`
      SELECT 
        bs.stop_name as "Boarding Point",
        s.name as "Name",
        s.register_number as "AD.No",
        s.department as "College/DPT",
        s.year as "Year",
        COALESCE(ar_m.status, 'UNMARKED') as "Morning (M)",
        COALESCE(ar_e.status, 'UNMARKED') as "Evening (E)"
      FROM students s
      JOIN bus_stops bs ON s.stop_id = bs.id
      LEFT JOIN attendance_records ar_m ON s.id = ar_m.student_id AND ar_m.attendance_date = ? AND ar_m.session = 'MORNING'
      LEFT JOIN attendance_records ar_e ON s.id = ar_e.student_id AND ar_e.attendance_date = ? AND ar_e.session = 'EVENING'
      WHERE s.bus_id = ? AND s.is_active = 1
      ORDER BY bs.stop_order ASC, s.name ASC
    `, [date, date, resolvedBusId]);

    let sNo = 1;
    let lastStop = '';
    const formattedRows = students.map(s => {
      if (s['Boarding Point'] !== lastStop) {
        lastStop = s['Boarding Point'];
        sNo = 1;
      }
      const mVal = s['Morning (M)'] === 'PRESENT' ? 'P' : (s['Morning (M)'] === 'ABSENT' ? 'A' : '-');
      const eVal = s['Evening (E)'] === 'PRESENT' ? 'P' : (s['Evening (E)'] === 'ABSENT' ? 'A' : '-');

      let statusSummary = 'Unmarked';
      if (mVal === 'P' && eVal === 'P') statusSummary = 'Both Present';
      else if (mVal === 'P' && eVal === 'A') statusSummary = 'Morning Only';
      else if (mVal === 'A' && eVal === 'P') statusSummary = 'Evening Only';
      else if (mVal === 'A' && eVal === 'A') statusSummary = 'Both Absent';
      else if (mVal === 'P') statusSummary = 'Morning Present';
      else if (eVal === 'P') statusSummary = 'Evening Present';
      else if (mVal === 'A') statusSummary = 'Morning Absent';
      else if (eVal === 'A') statusSummary = 'Evening Absent';

      return {
        'Boarding Point': s['Boarding Point'],
        'S.No': sNo++,
        'Name': s['Name'],
        'AD.No': s['AD.No'],
        'College/DPT': s['College/DPT'],
        'Year': s['Year'],
        'Morning (M)': mVal,
        'Evening (E)': eVal,
        'Daily Status': statusSummary
      };
    });

    const wb = XLSX.utils.book_new();

    const wsStudents = XLSX.utils.json_to_sheet(formattedRows);
    autofitColumns(wsStudents, formattedRows);
    XLSX.utils.book_append_sheet(wb, wsStudents, 'Attendance Register');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const safeBusName = (bus ? bus.bus_number : 'BUS_16').replace(/\s+/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename=DSEC_${safeBusName}_Attendance_${date}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('[Daily Excel Error]:', err);
    return res.status(500).json({ error: 'Failed to export Daily Excel report.' });
  }
});

// 2. GET /api/reports/export/weekly-excel
router.get('/export/weekly-excel', async (req, res) => {
  try {
    let { busId, startDate } = req.query;

    let bus;
    if (busId) bus = await query.get('SELECT * FROM buses WHERE id = ?', [busId]);
    if (!bus) bus = await query.get("SELECT * FROM buses WHERE bus_number = 'BUS 16' OR is_active = 1 LIMIT 1");
    const resolvedBusId = bus ? bus.id : 1;

    let start = startDate ? new Date(startDate) : new Date();
    const dayOfWeek = start.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(start);
    monday.setDate(start.getDate() - distanceToMonday);

    const weekDates = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(d.toISOString().split('T')[0]);
    }
    const startStr = weekDates[0];
    const endStr = weekDates[weekDates.length - 1];

    const students = await query.all(`
      SELECT s.id, s.register_number, s.name, s.gender, s.department, bs.stop_name
      FROM students s
      JOIN bus_stops bs ON s.stop_id = bs.id
      WHERE s.bus_id = ? AND s.is_active = 1
      ORDER BY bs.stop_order ASC, s.name ASC
    `, [resolvedBusId]);

    const records = await query.all(`
      SELECT student_id, attendance_date, status
      FROM attendance_records
      WHERE bus_id = ? AND attendance_date >= ? AND attendance_date <= ?
    `, [resolvedBusId, startStr, endStr]);

    const map = {};
    for (const r of records) {
      if (!map[r.student_id]) map[r.student_id] = {};
      map[r.student_id][r.attendance_date] = r.status === 'PRESENT' ? 'P' : (r.status === 'ABSENT' ? 'A' : '-');
    }

    const weeklyTable = students.map(stu => {
      const row = {
        'Register No': stu.register_number,
        'Student Name': stu.name,
        'Gender': stu.gender,
        'Bus Stop': stu.stop_name,
        'Dept': stu.department
      };

      let pCount = 0;
      let aCount = 0;
      for (const d of weekDates) {
        const shortDate = d.substring(5); // MM-DD
        const val = map[stu.id] ? (map[stu.id][d] || '-') : '-';
        row[shortDate] = val;
        if (val === 'P') pCount++;
        else if (val === 'A') aCount++;
      }

      const totalActive = pCount + aCount;
      const pct = totalActive > 0 ? Math.round((pCount / totalActive) * 100) : 0;

      row['Present Days'] = pCount;
      row['Absent Days'] = aCount;
      row['Attendance %'] = `${pct}%`;

      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(weeklyTable);
    autofitColumns(ws, weeklyTable);
    XLSX.utils.book_append_sheet(wb, ws, 'Weekly Roster');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const safeBusName = (bus ? bus.bus_number : 'BUS_16').replace(/\s+/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename=Weekly_Attendance_${safeBusName}_${startStr}_to_${endStr}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('[Weekly Excel Error]:', err);
    return res.status(500).json({ error: 'Failed to export Weekly Excel report.' });
  }
});

// 3. GET /api/reports/export/monthly-excel
router.get('/export/monthly-excel', async (req, res) => {
  try {
    let { busId, month = new Date().toISOString().substring(0, 7) } = req.query;

    let bus;
    if (busId) bus = await query.get('SELECT * FROM buses WHERE id = ?', [busId]);
    if (!bus) bus = await query.get("SELECT * FROM buses WHERE bus_number = 'BUS 16' OR is_active = 1 LIMIT 1");
    const resolvedBusId = bus ? bus.id : 1;

    const distinctDates = await query.all(`
      SELECT DISTINCT attendance_date
      FROM attendance_records
      WHERE bus_id = ? AND attendance_date LIKE ?
    `, [resolvedBusId, `${month}%`]);
    const totalDays = distinctDates.length;

    const studentRecords = await query.all(`
      SELECT 
        s.register_number as "Register No",
        s.name as "Student Name",
        s.gender as "Gender",
        bs.stop_name as "Bus Stop",
        s.department as "Department",
        SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) as "Present Days",
        SUM(CASE WHEN ar.status = 'ABSENT' THEN 1 ELSE 0 END) as "Absent Days",
        ${totalDays} as "Total Days Recorded"
      FROM students s
      JOIN bus_stops bs ON s.stop_id = bs.id
      LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.attendance_date LIKE ?
      WHERE s.bus_id = ? AND s.is_active = 1
      GROUP BY s.id
      ORDER BY bs.stop_order ASC, s.name ASC
    `, [`${month}%`, resolvedBusId]);

    const formattedData = studentRecords.map(s => {
      const pct = totalDays > 0 ? Math.round((s['Present Days'] / totalDays) * 100) : 0;
      return {
        ...s,
        'Attendance %': `${pct}%`
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedData);
    autofitColumns(ws, formattedData);
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Attendance');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const safeBusName = (bus ? bus.bus_number : 'BUS_16').replace(/\s+/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename=Monthly_Attendance_${safeBusName}_${month}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('[Monthly Excel Error]:', err);
    return res.status(500).json({ error: 'Failed to export monthly Excel report.' });
  }
});

module.exports = router;

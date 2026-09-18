const XLSX = require('xlsx');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');

// Known department codes in colleges & universities
const KNOWN_DEPTS = [
  'CSE', 'ECE', 'MECH', 'IT', 'AI&DS', 'AIDS', 'AIML', 'CIVIL',
  'EEE', 'BME', 'BIOTECH', 'CSBS', 'CYBER', 'AERO', 'AUTO',
  'MBA', 'MCA', 'BCA', 'BSC', 'BCOM', 'BA'
];

// High-precision Register / AID / ID Number extraction
// Matches e.g. 24CSE081, 23ECE102, DSU24001, 927621104001, 24IT081, RA2411003010001, AID101, AD102, etc.
const REG_NO_REGEX = /^([0-9]{2,4}[A-Z]{2,6}[0-9]{1,6}|[A-Z]{1,5}[-_.]?[0-9]{2,10}|[0-9]{5,14})$/i;
const REG_NO_INLINE_REGEX = /\b([0-9]{2,4}[A-Z]{2,6}[0-9]{1,6}|[A-Z]{1,5}[-_.]?[0-9]{2,10}|[0-9]{5,14})\b/i;

function normalizeKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function parseGender(raw) {
  const clean = String(raw || '').trim().toLowerCase();
  if (['m', 'male', 'boy', 'boys', 'b'].includes(clean)) return 'MALE';
  if (['f', 'female', 'girl', 'girls', 'g'].includes(clean)) return 'FEMALE';
  return 'UNKNOWN';
}

function formatName(name) {
  if (!name) return '';
  // Remove leading/trailing numbers, dots, hyphens, and symbols
  let clean = name
    .replace(/^[\s\d.\-_–—:;|]+/, '')
    .replace(/[\s\-_–—:;|]+$/, '')
    .replace(/[-–—_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return clean
    .split(' ')
    .filter(Boolean)
    .map(word => {
      if (word.length <= 2 && /^[A-Za-z]\.?$/.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// Classify a list of cells from a table row or delimited line
function classifyCells(cells, knownStops = []) {
  let regNo = '';
  let gender = '';
  let department = '';
  let year = '';
  let busNumber = 'BUS 16';
  const remaining = [];

  let phone = '';

  for (const rawCell of cells) {
    let val = String(rawCell || '').trim().replace(/^["']|["']$/g, '');
    if (!val) continue;

    // Check Phone Number (10 digits)
    if (!phone && /^[6-9]\d{9}$/.test(val.replace(/[-\s]/g, ''))) {
      phone = val.replace(/[-\s]/g, '');
      continue;
    }

    // Check Register / AD.No Number (alphanumeric like 24CSE081 or numeric like 36230612 / 202420833)
    if (!regNo && (REG_NO_REGEX.test(val) || /^[0-9]{7,10}$/.test(val))) {
      regNo = val.toUpperCase();
      continue;
    }

    // Check Gender
    if (!gender && /^(male|female|boy|girl|boys|girls|[mf])$/i.test(val)) {
      gender = parseGender(val);
      continue;
    }

    // Check College / Department (e.g. DSEC/EEE, DSU/Mech, Pharmacy, DSPC/CSE, SAHS/MLT)
    if (!department && (
      /^[A-Za-z0-9]{2,6}\s*\/\s*[A-Za-z0-9&]{2,6}$/.test(val) ||
      /^(pharmacy|diplamo|polytechnic|nursing|sahs)/i.test(val) ||
      KNOWN_DEPTS.some(d => d.toLowerCase() === val.toLowerCase())
    )) {
      department = val.toUpperCase().replace(/\s+/g, '');
      continue;
    }

    // Check Year
    if (!year && /^(IV|III|II|I|1st|2nd|3rd|4th|[1-4])$/i.test(val)) {
      const yVal = val.toUpperCase();
      if (yVal === '1' || yVal === '1ST') year = 'I';
      else if (yVal === '2' || yVal === '2ND') year = 'II';
      else if (yVal === '3' || yVal === '3RD') year = 'III';
      else if (yVal === '4' || yVal === '4TH') year = 'IV';
      else year = yVal;
      continue;
    }

    // Check Bus
    if (/^BUS\s*0?[0-9]{1,2}$/i.test(val)) {
      busNumber = val.toUpperCase().replace(/\s+/, ' ');
      continue;
    }

    // Strip leading serial number (e.g. "1. Anandhi S" -> "Anandhi S")
    const strippedVal = val.replace(/^\s*\d+[\s.)-]+\s*/, '').trim();
    if (strippedVal) {
      remaining.push(strippedVal);
    }
  }

  // From remaining cells, distinguish Student Name from Bus Stop
  let stopName = '';
  let studentName = '';

  for (const rem of remaining) {
    const isStopMatch =
      knownStops.some(s => s && s.toLowerCase() === rem.toLowerCase()) ||
      /stop|town|nagar|stand|junction|gate|road|palayam|bypass|colony|corner|thanthoni/i.test(rem);

    if (!stopName && isStopMatch) {
      stopName = rem;
    } else if (!studentName && /^[A-Za-z\s.]+$/.test(rem)) {
      studentName = rem;
    } else if (!stopName) {
      stopName = rem;
    } else if (!studentName) {
      studentName = rem;
    }
  }

  return {
    name: formatName(studentName),
    register_number: regNo,
    faculty_id: regNo,
    phone,
    gender: gender || 'UNKNOWN',
    stop_name: stopName ? stopName.trim() : 'Campus / Main Stop',
    department: department || 'CSE',
    year: year || 'II',
    bus_number: busNumber
  };
}

// Parse unstructured line (e.g. from OCR or plain text)
function parseUnstructuredLine(line, knownStops = []) {
  let text = String(line || '').trim();
  if (!text || text.length < 5) return null;

  // Skip table header lines
  const lower = text.toLowerCase();
  if (
    (lower.includes('student') || lower.includes('name')) &&
    (lower.includes('reg') || lower.includes('register') || lower.includes('number'))
  ) {
    return null;
  }

  // Skip title / banner lines
  if (lower.includes('dhanalakshmi') || lower.includes('roster') || lower.includes('transport')) {
    return null;
  }

  // 1. If line contains standard delimiters (commas, tabs, pipes, semicolons, or " - ")
  if (/[,\t|;]|\s+-\s+/.test(text)) {
    const cells = text.split(/[,\t|;]|\s+-\s+/).map(c => c.trim()).filter(Boolean);
    if (cells.length >= 2) {
      const res = classifyCells(cells, knownStops);
      if (res.register_number && res.name) return res;
    }
  }

  // 2. Otherwise, parse space-separated line
  let rem = text.replace(/^\s*\d+[\s.)-]+\s*/, '').trim();

  // Extract Register Number
  const regMatch = rem.match(REG_NO_INLINE_REGEX);
  if (!regMatch) return null;
  const regNo = regMatch[1].toUpperCase();
  rem = rem.replace(regMatch[0], ' ');

  // Extract Gender (require full word to avoid matching initials)
  let gender = 'UNKNOWN';
  const genMatch = rem.match(/\b(male|female|boy|girl|boys|girls)\b/i);
  if (genMatch) {
    gender = parseGender(genMatch[1]);
    rem = rem.replace(genMatch[0], ' ');
  }

  // Extract Department
  let department = 'CSE';
  for (const dept of KNOWN_DEPTS) {
    const dRegex = new RegExp(`\\b${dept}\\b`, 'i');
    if (dRegex.test(rem)) {
      department = dept.toUpperCase();
      rem = rem.replace(dRegex, ' ');
      break;
    }
  }

  // Extract Year
  let year = 'II';
  const yearMatch = rem.match(/\b(IV|III|II|I|1st|2nd|3rd|4th|[1-4])\b/);
  if (yearMatch) {
    const yVal = yearMatch[1].toUpperCase();
    if (yVal === '1' || yVal === '1ST') year = 'I';
    else if (yVal === '2' || yVal === '2ND') year = 'II';
    else if (yVal === '3' || yVal === '3RD') year = 'III';
    else if (yVal === '4' || yVal === '4TH') year = 'IV';
    else year = yVal;
    rem = rem.replace(yearMatch[0], ' ');
  }

  // Extract Bus Number
  let busNumber = 'BUS 16';
  const busMatch = rem.match(/\b(BUS\s*0?[0-9]{1,2})\b/i);
  if (busMatch) {
    busNumber = busMatch[1].toUpperCase().replace(/\s+/, ' ');
    rem = rem.replace(busMatch[0], ' ');
  }

  // Extract Bus Stop
  let stopName = '';
  for (const s of knownStops) {
    if (s && new RegExp(`\\b${s}\\b`, 'i').test(rem)) {
      stopName = s;
      rem = rem.replace(new RegExp(`\\b${s}\\b`, 'i'), ' ');
      break;
    }
  }

  // Clean serial numbers, punctuation, and hyphens
  rem = rem.replace(/[-–—_~|\\/;:,.]+/g, ' ').replace(/\s+/g, ' ').trim();

  // If stop wasn't matched yet, check for multi-word or hyphenated stop
  if (!stopName) {
    const parts = rem.split(/\s{2,}|\s*-\s*/);
    if (parts.length >= 2) {
      rem = parts[0].trim();
      stopName = parts[1].trim();
    } else {
      stopName = 'Campus / Main Stop';
    }
  }

  const name = formatName(rem);
  if (!name || name.length < 2) return null;

  return {
    name,
    register_number: regNo,
    gender,
    bus_number: busNumber,
    stop_name: stopName,
    department,
    year
  };
}

// Extract HTML tables produced by Word documents (.docx)
function parseHtmlTables(html, knownStops = []) {
  const rows = [];
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableContent = tableMatch[1];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let headers = null;

    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const rowContent = rowMatch[1];
      const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      let cellMatch;
      const cells = [];

      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(cellText);
      }

      if (cells.length === 0) continue;

      const lowerRow = cells.join(' ').toLowerCase();
      // Detect header row
      if (!headers && (lowerRow.includes('name') || lowerRow.includes('reg') || lowerRow.includes('stop'))) {
        headers = cells.map(c => normalizeKey(c));
        continue;
      }

      if (headers && headers.length === cells.length) {
        // Structured row matching headers
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cells[idx] || '';
        });
        rows.push(rowObj);
      } else {
        // Unstructured or headerless table row -> classify cells directly!
        const classified = classifyCells(cells, knownStops);
        if (classified.name && (classified.register_number || classified.department || classified.phone)) {
          rows.push(classified);
        }
      }
    }
  }

  return rows;
}

// Intelligent Excel Spreadsheet Parser with title banner extraction & merged cell Boarding Point propagation
function parseExcelSpreadsheet(workbook, knownStops = []) {
  let allRows = [];
  let detectedBus = 'BUS 16';
  let detectedGender = 'MALE';

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rawData || rawData.length === 0) continue;

    if (/boys?/i.test(sheetName)) detectedGender = 'MALE';
    if (/girls?/i.test(sheetName)) detectedGender = 'FEMALE';
    const sMatch = sheetName.match(/bus\s*0?(\d+)/i);
    if (sMatch) detectedBus = `BUS 0${sMatch[1]}`.replace(/0+(\d{2})/, '$1');

    let headerRowIndex = -1;
    let colMap = {
      stop: -1,
      name: -1,
      adNo: -1,
      dept: -1,
      year: -1,
      gender: -1,
      bus: -1
    };

    // Scan top 15 rows to find title banners and the real header row
    for (let r = 0; r < Math.min(rawData.length, 15); r++) {
      const row = rawData[r].map(c => String(c || '').trim());
      const rowText = row.join(' ').toLowerCase();

      if (rowText.includes('bus') && (rowText.includes('boys') || rowText.includes('girls') || rowText.includes('boarding'))) {
        const bMatch = rowText.match(/bus\s*(?:no:?|number:?)?\s*0?(\d+)/i);
        if (bMatch) detectedBus = `BUS 0${bMatch[1]}`.replace(/0+(\d{2})/, '$1');
        if (rowText.includes('boy')) detectedGender = 'MALE';
        if (rowText.includes('girl')) detectedGender = 'FEMALE';
      }

      const candidateColMap = {
        stop: -1,
        name: -1,
        adNo: -1,
        dept: -1,
        year: -1,
        gender: -1,
        bus: -1
      };
      let hasName = false;
      let hasStop = false;
      let hasAdNo = false;

      row.forEach((cell, cIdx) => {
        const norm = cell.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (['name', 'studentname', 'student', 'candidate'].some(k => norm.includes(k))) {
          hasName = true;
          candidateColMap.name = cIdx;
        }
        if (['boarding', 'boardingpoint', 'boardingdetails', 'stop', 'busstop', 'stopping', 'stage'].some(k => norm.includes(k))) {
          hasStop = true;
          candidateColMap.stop = cIdx;
        }
        if ([
          'adno', 'adnumber', 'admissionno', 'admissionnumber', 'regno', 'registerno', 'register_number',
          'rollno', 'register', 'ad', 'aid', 'aidno', 'aidnumber', 'aid_no', 'id', 'idno', 'idnumber',
          'studentid', 'student_id', 'roll'
        ].some(k => norm === k || norm.startsWith('adno') || norm.startsWith('aid') || norm.includes('admission') || norm.includes('regno') || norm.includes('studentid'))) {
          hasAdNo = true;
          candidateColMap.adNo = cIdx;
        }
        if (['collegedpt', 'collegedept', 'college', 'department', 'dept', 'branch', 'dpt'].some(k => norm.includes(k))) {
          candidateColMap.dept = cIdx;
        }
        if (['year', 'yr', 'class'].some(k => norm === k || norm.startsWith('year'))) {
          candidateColMap.year = cIdx;
        }
        if (['gender', 'sex'].some(k => norm.includes(k))) {
          candidateColMap.gender = cIdx;
        }
        if (['busno', 'busnumber', 'route'].some(k => norm.includes(k)) || (norm === 'bus' && candidateColMap.stop !== cIdx)) {
          candidateColMap.bus = cIdx;
        }
      });

      if (hasName && (hasStop || hasAdNo || candidateColMap.dept !== -1)) {
        headerRowIndex = r;
        colMap = candidateColMap;
        break;
      }
    }

    if (headerRowIndex === -1) {
      const fallbackRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      allRows.push(...fallbackRows);
      continue;
    }

    let currentStop = 'Campus / Main Stop';
    for (let r = headerRowIndex + 1; r < rawData.length; r++) {
      const row = rawData[r].map(c => String(c || '').trim());
      if (row.length === 0 || row.every(c => !c)) continue;

      if (colMap.stop !== -1 && row[colMap.stop]) {
        const rawStop = row[colMap.stop].trim();
        if (!/^(total|date|s\.?no|boarding|signature)/i.test(rawStop)) {
          currentStop = rawStop;
        }
      }

      let studentName = colMap.name !== -1 ? row[colMap.name] : '';
      if (!studentName || /^(total|date|s\.?no|boarding|signature)/i.test(studentName)) continue;

      let rawRegNo = colMap.adNo !== -1 ? row[colMap.adNo] : '';
      let rawDept = colMap.dept !== -1 ? row[colMap.dept] : 'CSE';
      let rawYear = colMap.year !== -1 ? row[colMap.year] : 'I';
      let rawGen = colMap.gender !== -1 ? row[colMap.gender] : detectedGender;
      let rawBus = colMap.bus !== -1 && row[colMap.bus] ? row[colMap.bus] : detectedBus;

      allRows.push({
        name: formatName(studentName),
        register_number: rawRegNo ? rawRegNo.toUpperCase() : '',
        stop_name: currentStop,
        department: rawDept || 'CSE',
        year: rawYear || 'I',
        gender: parseGender(rawGen) === 'UNKNOWN' ? detectedGender : parseGender(rawGen),
        bus_number: rawBus
      });
    }
  }

  return { rows: allRows, detectedBus, detectedGender };
}

// Master Document & Image Parser
async function parseUploadedDocument(fileBuffer, originalName, mimeType, knownStops = []) {
  const ext = (originalName || '').split('.').pop().toLowerCase();
  const fileNameLower = (originalName || '').toLowerCase();
  let rows = [];
  let sourceFormat = 'UNKNOWN';

  let defaultGender = 'MALE';
  if (/girls|girl|female|women/i.test(fileNameLower)) {
    defaultGender = 'FEMALE';
  } else if (/boys|boy|male|men/i.test(fileNameLower)) {
    defaultGender = 'MALE';
  }

  let isFacultyDoc = /faculty|staff|prof|teacher|lecturer/i.test(fileNameLower);

  let defaultBus = 'BUS 16';
  const busMatch = fileNameLower.match(/bus\s*0?(\d+)/i);
  if (busMatch) {
    defaultBus = `BUS 0${busMatch[1]}`.replace(/0(\d{2,})/, '$1');
  }

  // 1. Word Document (.docx / .doc)
  if (
    ext === 'docx' ||
    ext === 'doc' ||
    mimeType?.includes('wordprocessingml') ||
    mimeType?.includes('msword')
  ) {
    sourceFormat = 'WORD_DOCUMENT';
    console.log(`[Parser] Parsing Word Document: ${originalName}`);
    try {
      const htmlResult = await mammoth.convertToHtml({ buffer: fileBuffer });
      if (!isFacultyDoc && /faculty|staff\s*name|teaching\s*staff|designation|assistant\s*professor/i.test(htmlResult.value)) {
        isFacultyDoc = true;
      }
      const tableRows = parseHtmlTables(htmlResult.value, knownStops);

      if (tableRows && tableRows.length > 0) {
        rows = tableRows;
        console.log(`[Parser] Extracted ${rows.length} rows from Word document table(s).`);
      } else {
        const textResult = await mammoth.extractRawText({ buffer: fileBuffer });
        const lines = textResult.value.split(/\r?\n/);
        for (const line of lines) {
          const parsed = parseUnstructuredLine(line, knownStops);
          if (parsed) rows.push(parsed);
        }
        console.log(`[Parser] Extracted ${rows.length} lines from Word document paragraphs.`);
      }
    } catch (err) {
      console.warn('[Parser] Error parsing Word document with mammoth:', err.message);
      throw new Error(`Failed to parse Word document: ${err.message}`);
    }
  }
  // 2. Images & Photos (.png, .jpg, .jpeg, .webp, .bmp, .tiff)
  else if (
    ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'].includes(ext) ||
    mimeType?.startsWith('image/')
  ) {
    sourceFormat = 'IMAGE_OCR';
    console.log(`[Parser] Processing Image with OCR: ${originalName}...`);
    try {
      const ocrResult = await Tesseract.recognize(fileBuffer, 'eng');
      const ocrText = ocrResult?.data?.text || '';
      const lines = ocrText.split(/\r?\n/);

      for (const line of lines) {
        const parsed = parseUnstructuredLine(line, knownStops);
        if (parsed) rows.push(parsed);
      }
      console.log(`[Parser] OCR successfully recognized ${rows.length} records from image.`);
    } catch (err) {
      console.warn('[Parser] OCR error:', err.message);
      throw new Error(`Failed to analyze image text: ${err.message}`);
    }
  }
  // 3. Plain Text, OCR Text, CSV, or Excel Spreadsheets
  else {
    const isExplicitSpreadsheet = ['xlsx', 'xls', 'ods'].includes(ext);
    if (isExplicitSpreadsheet) {
      sourceFormat = 'EXCEL';
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const parsedExcel = parseExcelSpreadsheet(workbook, knownStops);
      rows = parsedExcel.rows;
      defaultGender = parsedExcel.detectedGender;
      defaultBus = parsedExcel.detectedBus;
      console.log(`[Parser] Excel parsed: ${rows.length} rows, Bus: ${defaultBus}, Gender: ${defaultGender}`);
    } else {
      // Plain text, CSV, TSV, or OCR text
      const text = fileBuffer.toString('utf8');
      const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      // Check if first line has structured CSV headers (e.g. Student Name, Register Number)
      const firstLine = (lines[0] || '').toLowerCase();
      const hasCsvHeaders =
        (firstLine.includes(',') || firstLine.includes('\t')) &&
        (firstLine.includes('name') || firstLine.includes('reg') || firstLine.includes('student'));

      if (hasCsvHeaders) {
        sourceFormat = 'CSV';
        const cleanCell = (val) => String(val || '').trim().replace(/^["']|["']$/g, '');
        const headers = lines[0].split(/[,\t|]/).map(cleanCell);
        rows = lines.slice(1).map(line => {
          const vals = line.split(/[,\t|]/).map(cleanCell);
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = vals[i] || '';
          });
          return obj;
        });
      } else {
        // Unstructured lines / OCR text output
        sourceFormat = originalName.includes('ocr') ? 'IMAGE_OCR' : 'TEXT_ROSTER';
        for (const line of lines) {
          const parsed = parseUnstructuredLine(line, knownStops);
          if (parsed) rows.push(parsed);
        }
      }
    }
  }

  const finalRows = rows.map(r => ({
    ...r,
    gender: (!r.gender || r.gender === 'UNKNOWN') ? defaultGender : r.gender,
    bus_number: r.bus_number || defaultBus
  }));

  return { rows: finalRows, sourceFormat, defaultGender, defaultBus, isFacultyDoc };
}

module.exports = {
  parseUploadedDocument,
  parseUnstructuredLine,
  classifyCells,
  formatName,
  parseGender
};

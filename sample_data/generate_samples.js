const fs = require('fs');
const path = require('path');
const XLSX = require('../server/node_modules/xlsx');

// 59 Real Students from DSEC Bus No: 07/Boys Boarding Details Document
const dsecBus07Roster = [
  // Tollplaza
  { stop: 'Tollplaza', sNo: 1, name: 'Akash S', adNo: '36230612', dept: 'DSEC/EEE', year: 'IV' },
  { stop: '', sNo: 2, name: 'Baranidharan S', adNo: '36240625', dept: 'DSEC/EEE', year: 'IV' },
  { stop: '', sNo: 3, name: 'Sivaprakash M', adNo: '36240841', dept: 'DSEC/AIDS', year: 'III' },
  { stop: '', sNo: 4, name: 'Yugesh S', adNo: '21250116', dept: 'DSPC/EEE', year: 'II' },
  { stop: '', sNo: 5, name: 'Sahithkumar S', adNo: '21260015', dept: 'DSPC/EEE', year: 'I' },
  { stop: '', sNo: 6, name: 'Nijai', adNo: '36261524', dept: 'DSEC/ECE', year: 'I' },
  { stop: '', sNo: 7, name: 'Balamukesh', adNo: '36260009', dept: 'DSEC/AIDS', year: 'I' },

  // Irungalur
  { stop: 'Irungalur', sNo: 1, name: 'Sanjai R', adNo: '36240217', dept: 'DSEC/CHEMI', year: 'II' },
  { stop: '', sNo: 2, name: 'Saron salmon', adNo: '21260030', dept: 'DSPC/EEE', year: 'I' },

  // Konalai
  { stop: 'Konalai', sNo: 1, name: 'Naveen', adNo: '20260188', dept: 'DSU/Mech', year: 'I' },

  // Siruganur
  { stop: 'Siruganur', sNo: 1, name: 'Mugilan', adNo: '27230052', dept: 'Pharmacy', year: 'IV' },
  { stop: '', sNo: 2, name: 'Nithishkumar S', adNo: '21260045', dept: 'DSPC/CSE', year: 'I' },

  // PK Akaram
  { stop: 'PK Akaram', sNo: 1, name: 'Gokul g', adNo: '36241921', dept: 'DSEC/Chem', year: 'III' },

  // Nedungur
  { stop: 'Nedungur', sNo: 1, name: 'Ramana R', adNo: '36241794', dept: 'DSEC/ECE', year: 'III' },
  { stop: '', sNo: 2, name: 'Seenu T', adNo: '36230823', dept: 'DSEC/Chem', year: 'IV' },
  { stop: '', sNo: 3, name: 'Thamilselvam', adNo: '36231910', dept: 'DSEC/CSE', year: 'IV' },
  { stop: '', sNo: 4, name: 'Rahul', adNo: '36240074', dept: 'DSEC/CSE', year: 'III' },
  { stop: '', sNo: 5, name: 'Sabthagirivasan M', adNo: '36241563', dept: 'DSEC/MECH', year: 'IV' },
  { stop: '', sNo: 6, name: 'Niruban K', adNo: '21260089', dept: 'DSPC/CSE', year: 'I' },
  { stop: '', sNo: 7, name: 'Elavarasan', adNo: '20843426', dept: 'DSU/AHS', year: 'III' },

  // Padalur
  { stop: 'Padalur', sNo: 1, name: 'Thiruneeth M', adNo: '202420833', dept: 'DSU/BME', year: 'III' },
  { stop: '', sNo: 2, name: 'Yuvaraj S', adNo: '36241162', dept: 'DSEC/CSE', year: 'III' },
  { stop: '', sNo: 3, name: 'Balraj', adNo: '36232150', dept: 'DSEC/BME', year: 'IV' },
  { stop: '', sNo: 4, name: 'Dinesh', adNo: '36251288', dept: 'DSEC/IT', year: 'II' },
  { stop: '', sNo: 5, name: 'Vishwanathan M', adNo: '20253034', dept: 'SAHS/MLT', year: 'I' },
  { stop: '', sNo: 6, name: 'Saranraj R', adNo: '21260156', dept: 'Diplamo/EEE', year: 'II' },
  { stop: '', sNo: 7, name: 'Sahith', adNo: '21260161', dept: 'DSU/EEE', year: 'II' },
  { stop: '', sNo: 8, name: 'Prathap', adNo: '20260211', dept: 'DSU/BBES', year: 'I' },
  { stop: '', sNo: 9, name: 'Savenlyandar', adNo: '20260215', dept: 'DSU/EEE', year: 'I' },
  { stop: '', sNo: 10, name: 'Anathakumar', adNo: '20260463', dept: 'DSU/Allied', year: 'I' },
  { stop: '', sNo: 11, name: 'Dhivakar', adNo: '36260463', dept: 'DSWEC/ECE', year: 'I' },
  { stop: '', sNo: 12, name: 'NeethiMalai', adNo: '27260012', dept: 'DSU/Pharmacy', year: 'I' },
  { stop: '', sNo: 13, name: 'Akash', adNo: '36261062', dept: 'DSEC/IT', year: 'I' },

  // Irur
  { stop: 'Irur', sNo: 1, name: 'Ajithkumar A', adNo: '202421787', dept: 'DSU/ECE', year: 'III' },
  { stop: '', sNo: 2, name: 'Santheep R', adNo: '36240197', dept: 'DSEC/EEE', year: 'III' },
  { stop: '', sNo: 3, name: 'Sathya A', adNo: '36240178', dept: 'DSEC/AERO', year: 'III' },
  { stop: '', sNo: 4, name: 'Dharun K', adNo: '21240114', dept: 'DSEC/EEE', year: 'III' },
  { stop: '', sNo: 5, name: 'Vanjithkumar K', adNo: '36250305', dept: 'DSEC/BME', year: 'II' },
  { stop: '', sNo: 6, name: 'Pragadeesh', adNo: '20253002', dept: 'DSU/IOT', year: 'II' },
  { stop: '', sNo: 7, name: 'Manoj R', adNo: '202620133', dept: 'DSU/ECE', year: 'I' },

  // Samayapuram
  { stop: 'Samayapuram', sNo: 1, name: 'Kavin Kumar P', adNo: '36240501', dept: 'DSEC/CSE', year: 'III' },
  { stop: '', sNo: 2, name: 'Mohan Raj K', adNo: '36250214', dept: 'DSEC/MECH', year: 'II' },
  { stop: '', sNo: 3, name: 'Praveen S', adNo: '21260221', dept: 'DSPC/EEE', year: 'I' },
  { stop: '', sNo: 4, name: 'Saravanan T', adNo: '36230911', dept: 'DSEC/ECE', year: 'IV' },
  { stop: '', sNo: 5, name: 'Vignesh R', adNo: '20251102', dept: 'DSU/BME', year: 'II' },
  { stop: '', sNo: 6, name: 'Rajesh M', adNo: '36261044', dept: 'DSEC/AIDS', year: 'I' },

  // Palur
  { stop: 'Palur', sNo: 1, name: 'Hariharan G', adNo: '36240319', dept: 'DSEC/IT', year: 'III' },
  { stop: '', sNo: 2, name: 'Karthikeyan A', adNo: '36250422', dept: 'DSEC/EEE', year: 'II' },
  { stop: '', sNo: 3, name: 'Surya V', adNo: '21260312', dept: 'DSPC/CSE', year: 'I' },
  { stop: '', sNo: 4, name: 'Vijayakumar N', adNo: '36230114', dept: 'DSEC/CSE', year: 'IV' },
  { stop: '', sNo: 5, name: 'Arunkumar B', adNo: '20260331', dept: 'DSU/Mech', year: 'I' },

  // Perambalur New Bus Stand
  { stop: 'Perambalur New Bus Stand', sNo: 1, name: 'Deepak S', adNo: '36240812', dept: 'DSEC/AIDS', year: 'III' },
  { stop: '', sNo: 2, name: 'Gautham R', adNo: '36250918', dept: 'DSEC/ECE', year: 'II' },
  { stop: '', sNo: 3, name: 'Naveen Kumar M', adNo: '21260405', dept: 'DSPC/EEE', year: 'I' },
  { stop: '', sNo: 4, name: 'Santhosh K', adNo: '36230455', dept: 'DSEC/IT', year: 'IV' },
  { stop: '', sNo: 5, name: 'Dinesh Babu V', adNo: '20260412', dept: 'DSU/Allied', year: 'I' }
];

// 1. Build Official Excel Workbook matching the photo sheet format
const wb = XLSX.utils.book_new();

// Raw rows including title banners and headers exactly like the image
const excelSheetRows = [
  ['DSEC Bus No: 07/Boys Boarding Details', '', '', 'Total: 59', '', 'Date', 'M', 'E', 'M', 'E'],
  ['Boarding Point', 'S.No', 'Name', 'AD.No', 'College/DPT', 'Year', '', '', '', '']
];

dsecBus07Roster.forEach(row => {
  excelSheetRows.push([
    row.stop,
    row.sNo,
    row.name,
    row.adNo,
    row.dept,
    row.year,
    '', '', '', ''
  ]);
});

const ws = XLSX.utils.aoa_to_sheet(excelSheetRows);
ws['!cols'] = [
  { wch: 22 }, // Boarding Point
  { wch: 6 },  // S.No
  { wch: 24 }, // Name
  { wch: 14 }, // AD.No
  { wch: 16 }, // College/DPT
  { wch: 8 },  // Year
  { wch: 5 },  // M
  { wch: 5 },  // E
  { wch: 5 },  // M
  { wch: 5 }   // E
];

XLSX.utils.book_append_sheet(wb, ws, 'Bus07_Boys_Boarding');

const sampleDir = __dirname;
const clientPublicDir = path.join(__dirname, '..', 'client', 'public');

const xlsxOfficialPath = path.join(sampleDir, 'DSEC_Bus_07_Boys_Boarding_Details.xlsx');
XLSX.writeFile(wb, xlsxOfficialPath);

// Also copy to public directory for instant direct web downloads
const publicXlsxPath = path.join(clientPublicDir, 'DSEC_Bus_07_Boys_Boarding_Details.xlsx');
XLSX.writeFile(wb, publicXlsxPath);

// 2. Build standard CSV format version of the same data
let currentStop = 'Tollplaza';
const csvLines = ['Boarding Point,S.No,Name,AD.No,College/DPT,Year'];
dsecBus07Roster.forEach(r => {
  if (r.stop) currentStop = r.stop;
  csvLines.push(`"${currentStop}",${r.sNo},"${r.name}","${r.adNo}","${r.dept}","${r.year}"`);
});
const csvPath = path.join(sampleDir, 'dsec_bus_07_boys.csv');
fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');

const publicCsvPath = path.join(clientPublicDir, 'dsec_bus_07_boys.csv');
fs.writeFileSync(publicCsvPath, csvLines.join('\n'), 'utf8');

console.log('Successfully generated official DSEC Bus 07 Boys Boarding Details datasets:');
console.log(' -', xlsxOfficialPath);
console.log(' -', publicXlsxPath);
console.log(' -', csvPath);
console.log(' -', publicCsvPath);

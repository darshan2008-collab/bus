const fs = require('fs');
const path = require('path');
const { query } = require('../src/config/database');
const { parseUploadedDocument } = require('../src/utils/documentParser');

async function cleanAndImportReal() {
  try {
    console.log('--- Step 1: Removing fake students and old records ---');
    await query.run('DELETE FROM attendance_records');
    await query.run('DELETE FROM attendance_sessions');
    await query.run('DELETE FROM faculty_attendance_records');
    await query.run('DELETE FROM students');
    await query.run('DELETE FROM bus_stops');
    console.log('Fake students, fake stops, and old attendance cleared.');

    console.log('--- Step 2: Loading official DSEC Bus 07 sheet ---');
    const filePath = path.resolve(__dirname, '../../sample_data/DSEC_Bus_07_Boys_Boarding_Details.xlsx');
    const buf = fs.readFileSync(filePath);
    const parsed = await parseUploadedDocument(buf, 'DSEC_Bus_07_Boys_Boarding_Details.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    let bus = await query.get('SELECT id FROM buses WHERE bus_number = ?', ['BUS 16']);
    let busId;
    if (!bus) {
      const busRes = await query.run('INSERT INTO buses (bus_number, route_name, capacity, is_active) VALUES (?, ?, 60, 1)', ['BUS 16', 'DSEC Campus Route 16']);
      busId = busRes.lastID;
    } else {
      busId = bus.id;
    }

    const insertedStops = {};
    let stopOrder = 1;
    let studentCount = 0;

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const stopName = row.stop_name ? row.stop_name.trim() : 'Tollplaza';

      if (!insertedStops[stopName]) {
        let stop = await query.get('SELECT id FROM bus_stops WHERE bus_id = ? AND LOWER(stop_name) = LOWER(?)', [busId, stopName]);
        if (!stop) {
          const stopRes = await query.run('INSERT INTO bus_stops (bus_id, stop_name, stop_order, pickup_time) VALUES (?, ?, ?, ?)', [
            busId,
            stopName,
            stopOrder++,
            '07:45 AM'
          ]);
          insertedStops[stopName] = stopRes.lastID;
        } else {
          insertedStops[stopName] = stop.id;
        }
      }

      const stopId = insertedStops[stopName];
      let regNo = row.register_number;
      if (!regNo) {
        const cleanName = row.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
        regNo = `PROV-${cleanName}-${i + 1}`;
      }

      await query.run(`
        INSERT INTO students (register_number, name, gender, bus_id, stop_id, department, year, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(register_number) DO UPDATE SET
          name = excluded.name,
          bus_id = excluded.bus_id,
          stop_id = excluded.stop_id,
          department = excluded.department,
          year = excluded.year
      `, [
        regNo,
        row.name,
        row.gender || 'MALE',
        busId,
        stopId,
        row.department || 'DSEC/EEE',
        row.year || 'I'
      ]);
      studentCount++;
    }

    console.log(`--- Step 3: Finished! ---`);
    console.log(`Imported ${studentCount} REAL students across ${Object.keys(insertedStops).length} stops for BUS 16.`);

    const countRes = await query.get('SELECT COUNT(*) as total FROM students');
    console.log(`Verified students in database: ${countRes.total}`);

    const stops = await query.all('SELECT id, stop_name, stop_order FROM bus_stops ORDER BY stop_order');
    console.log('Stops in database:', stops);

    process.exit(0);
  } catch (err) {
    console.error('Error during clean and import:', err);
    process.exit(1);
  }
}

cleanAndImportReal();

const bcrypt = require('bcryptjs');
const { query, initSchema } = require('../config/database');

async function seed(forceReset = false) {
  console.log('[Seed] Initializing database schema...');
  await initSchema();

  if (forceReset) {
    console.log('[Seed] Resetting database to clean BUS 16 configuration...');
    await query.exec(`
      DELETE FROM attendance_audit_logs;
      DELETE FROM attendance_sessions;
      DELETE FROM attendance_records;
      DELETE FROM faculty_attendance_records;
      DELETE FROM students;
      DELETE FROM faculty;
      DELETE FROM users;
      DELETE FROM bus_stops;
      DELETE FROM buses;
    `);
  } else {
    // Check if BUS 16 already exists
    const existingBus7 = await query.get("SELECT id FROM buses WHERE bus_number = 'BUS 16'");
    if (existingBus7) {
      console.log('[Seed] BUS 16 database already configured. Skipping seed.');
      return;
    }
  }

  console.log('[Seed] Setting up Bus Number 16 (BUS 16)...');

  // 1. Insert Single Focus Bus: BUS 16
  const bus7Res = await query.run(`
    INSERT INTO buses (bus_number, route_name, capacity, driver_name, driver_phone, is_active)
    VALUES ('BUS 16', 'College Route 16', 60, 'Driver Assigned', '9842107777', 1)
  `);
  const bus7Id = bus7Res.lastID;

  // 2. Hash passwords
  const adminPass = await bcrypt.hash('admin123', 10);
  const coordPass = await bcrypt.hash('password123', 10);

  // 3. Insert Accounts for BUS 16
  // Admin
  await query.run(`
    INSERT INTO users (user_id, name, role, password_hash, assigned_bus_id, assigned_stop_id, phone, is_active)
    VALUES ('admin', 'College Transport Admin', 'ADMIN', ?, ?, NULL, '9443200000', 1)
  `, [adminPass, bus7Id]);

  // Coordinator 1 (User requested Coordinator 1 to remain for testing/preview)
  await query.run(`
    INSERT INTO users (user_id, name, role, password_hash, assigned_bus_id, assigned_stop_id, phone, is_active)
    VALUES ('coord1_bus16', 'Coordinator 1', 'STUDENT_COORDINATOR', ?, ?, NULL, '9842100001', 1)
  `, [coordPass, bus7Id]);

  // Faculty Member
  await query.run(`
    INSERT INTO users (user_id, name, role, password_hash, assigned_bus_id, assigned_stop_id, phone, is_active)
    VALUES ('fac_bus16', 'Faculty Member', 'FACULTY', ?, ?, NULL, '9842100007', 1)
  `, [coordPass, bus7Id]);

  console.log(`[Seed] Successfully initialized clean environment for:`);
  console.log(`  - Bus: BUS 16 (Bus Number 16)`);
  console.log(`  - Authorized Accounts:`);
  console.log(`      * Admin: admin / admin123`);
  console.log(`      * Coordinator 1: coord1_bus16 / password123`);
  console.log(`      * Faculty: fac_bus16 / password123`);
  console.log(`  - All fake students and previous bus data cleared. Ready for pure user data.`);
}

if (require.main === module) {
  seed(true).then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('[Seed] Error during seeding:', err);
    process.exit(1);
  });
}

module.exports = seed;

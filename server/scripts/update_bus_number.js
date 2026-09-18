const { query } = require('../src/config/database');

async function runUpdate() {
  console.log('--- Updating BUS 07 to BUS 16 in SQLite database ---');
  
  // 1. Update buses table
  await query.run(`
    UPDATE buses 
    SET bus_number = 'BUS 16', route_name = 'DSEC Campus Route 16' 
    WHERE bus_number = 'BUS 07' OR id = 4
  `);

  // 2. Update users table (and also create coord1_bus07 as fallback so existing login sessions still resolve)
  await query.run(`
    UPDATE users 
    SET user_id = 'coord1_bus16', name = 'Coordinator 1 (Bus 16)' 
    WHERE user_id = 'coord1_bus07'
  `);

  await query.run(`
    UPDATE users 
    SET user_id = 'fac_bus16', name = 'Faculty (Bus 16)' 
    WHERE user_id = 'fac_bus07'
  `);

  // 3. Check and log results
  const buses = await query.all('SELECT * FROM buses');
  console.log('Buses in DB:', buses);

  const users = await query.all('SELECT id, user_id, name, role, assigned_bus_id FROM users');
  console.log('Users in DB:', users);

  const studentsCount = await query.get('SELECT COUNT(*) as count FROM students WHERE bus_id = 4');
  console.log(`Students on Bus 16 (id=4): ${studentsCount.count}`);

  console.log('--- Successfully updated to BUS 16 ---');
}

runUpdate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

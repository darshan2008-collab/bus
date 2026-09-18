const WebSocket = require('../server/node_modules/ws');

async function testSync() {
  console.log('[Test] Starting multi-coordinator real-time test...');

  // 1. Login Coordinator 1
  const loginRes1 = await fetch('http://localhost:5200/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: 'coord1_bus01', password: 'password123' })
  }).then(r => r.json());

  // 2. Login Coordinator 2
  const loginRes2 = await fetch('http://localhost:5200/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: 'coord2_bus01', password: 'password123' })
  }).then(r => r.json());

  console.log('[Test] Coordinator 1 logged in:', loginRes1.user.name);
  console.log('[Test] Coordinator 2 logged in:', loginRes2.user.name);

  // 3. Connect WebSocket for Coordinator 2 to listen for updates
  const wsCoord2 = new WebSocket(`ws://localhost:5200/ws/sync?busId=1&token=${loginRes2.token}`);

  let receivedUpdate = false;

  await new Promise((resolve) => {
    wsCoord2.on('open', () => {
      console.log('[Test] Coordinator 2 WebSocket connected!');
      resolve();
    });
  });

  wsCoord2.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    console.log('[Test] Coordinator 2 received event:', data.type);
    if (data.type === 'ATTENDANCE_UPDATED') {
      console.log('[Test] Details:', data.payload);
      receivedUpdate = true;
    }
  });

  // 4. Coordinator 1 marks student 1 as PRESENT on 2026-09-18
  console.log('[Test] Coordinator 1 marking student 1 as PRESENT via REST API...');
  const markRes = await fetch('http://localhost:5200/api/attendance/mark', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginRes1.token}`
    },
    body: JSON.stringify({
      student_id: 1,
      bus_id: 1,
      stop_id: 1,
      attendance_date: '2026-09-18',
      status: 'PRESENT'
    })
  }).then(r => r.json());

  console.log('[Test] Coordinator 1 mark response:', markRes);

  // Wait 1 second to confirm Coordinator 2 received it
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (receivedUpdate) {
    console.log('[Test] SUCCESS: Multi-coordinator real-time synchronization verified!');
  } else {
    console.error('[Test] FAILED: Coordinator 2 did not receive update.');
  }

  wsCoord2.close();
}

testSync().then(() => process.exit(0)).catch(err => {
  console.error('[Test Error]:', err);
  process.exit(1);
});

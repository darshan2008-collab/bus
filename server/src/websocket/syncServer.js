const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { query } = require('../config/database');

let wss = null;
// Map of socket -> clientInfo { socket, user_id, name, role, bus_id, stop_id }
const activeSockets = new Map();

function setupWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws/sync' });

  wss.on('connection', (ws, req) => {
    // URL format: /ws/sync?token=...&busId=1
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const requestedBusId = url.searchParams.get('busId');

    let user = null;
    if (token) {
      try {
        user = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        // Unauthenticated or invalid token
      }
    }

    const busId = requestedBusId ? parseInt(requestedBusId, 10) : (user ? user.assigned_bus_id : null);

    const clientInfo = {
      ws,
      user_id: user ? user.user_id : 'anonymous',
      name: user ? user.name : 'Guest',
      role: user ? user.role : 'GUEST',
      bus_id: busId,
      stop_id: user ? user.assigned_stop_id : null,
      connected_at: new Date().toISOString()
    };

    activeSockets.set(ws, clientInfo);

    // If user is a coordinator, update last_active_at in DB
    if (user && user.user_id) {
      query.run('UPDATE users SET last_active_at = ? WHERE user_id = ?', [
        new Date().toISOString(),
        user.user_id
      ]).catch(() => {});
    }

    // Broadcast presence update to bus
    if (busId) {
      broadcastPresence(busId);
    }

    // Send initial handshake
    ws.send(JSON.stringify({
      type: 'SYNC_CONNECTED',
      payload: {
        message: 'Real-time attendance synchronization connected',
        user_id: clientInfo.user_id,
        bus_id: busId
      }
    }));

    ws.on('message', async (messageData) => {
      try {
        const data = JSON.parse(messageData.toString());

        if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          return;
        }

        if (data.type === 'SUBSCRIBE_BUS') {
          clientInfo.bus_id = parseInt(data.busId, 10);
          broadcastPresence(clientInfo.bus_id);
          return;
        }

        // When coordinator marks attendance over WebSocket
        if (data.type === 'MARK_ATTENDANCE') {
          const { student_id, bus_id, stop_id, attendance_date, status, session } = data.payload;
          const recordSession = session === 'EVENING' ? 'EVENING' : 'MORNING';
          const marked_by = clientInfo.user_id;
          const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const now = new Date().toISOString();

          let resolvedStopId = (stop_id && stop_id !== 'all') ? stop_id : null;
          if (!resolvedStopId && student_id) {
            const stu = await query.get('SELECT stop_id FROM students WHERE id = ?', [student_id]);
            if (stu) resolvedStopId = stu.stop_id;
          }

          // Upsert attendance record in SQLite
          await query.run(`
            INSERT INTO attendance_records (student_id, bus_id, stop_id, attendance_date, status, marked_by_user_id, marked_at, updated_at, session)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(student_id, attendance_date, bus_id, session) DO UPDATE SET
              status = excluded.status,
              marked_by_user_id = excluded.marked_by_user_id,
              marked_at = excluded.marked_at,
              updated_at = excluded.updated_at
          `, [student_id, bus_id, resolvedStopId, attendance_date, status, marked_by, time, now, recordSession]);

          // Update user last activity
          await query.run('UPDATE users SET last_active_at = ? WHERE user_id = ?', [now, marked_by]);

          // Broadcast attendance update to all coordinators on the bus
          broadcastToBus(bus_id, {
            type: 'ATTENDANCE_UPDATED',
            payload: {
              student_id,
              bus_id,
              stop_id: resolvedStopId,
              attendance_date,
              status,
              session: recordSession,
              marked_by_user_id: marked_by,
              marked_by_name: clientInfo.name,
              marked_at: time
            }
          });

          // Also broadcast updated presence/counts
          broadcastPresence(bus_id);
        }
      } catch (err) {
        console.error('[WS] Message handling error:', err.message);
      }
    });

    ws.on('close', () => {
      const closedBusId = clientInfo.bus_id;
      activeSockets.delete(ws);
      if (closedBusId) {
        broadcastPresence(closedBusId);
      }
    });

    ws.on('error', (err) => {
      console.error('[WS] Socket error:', err.message);
    });
  });

  console.log('[WS] Real-time synchronization server initialized on /ws/sync');
}

function broadcastToBus(busId, data) {
  const json = JSON.stringify(data);
  for (const [ws, client] of activeSockets.entries()) {
    if (ws.readyState === WebSocket.OPEN && client.bus_id === parseInt(busId, 10)) {
      ws.send(json);
    }
  }
}

async function broadcastPresence(busId) {
  try {
    const statusData = await getCoordinatorsStatus(busId);
    broadcastToBus(busId, {
      type: 'COORDINATORS_STATUS_UPDATE',
      payload: statusData
    });
  } catch (err) {
    console.error('[WS] broadcastPresence error:', err.message);
  }
}

async function getCoordinatorsStatus(busId) {
  const numericBusId = parseInt(busId, 10);
  // Get the 4 assigned coordinators for this bus
  const coordinators = await query.all(`
    SELECT u.id, u.user_id, u.name, u.role, u.assigned_bus_id, u.assigned_stop_id, u.last_active_at,
           bs.stop_name as assigned_stop_name
    FROM users u
    LEFT JOIN bus_stops bs ON u.assigned_stop_id = bs.id
    WHERE u.assigned_bus_id = ? AND u.role IN ('STUDENT_COORDINATOR', 'STOP_COORDINATOR')
    ORDER BY u.role DESC, u.user_id ASC
  `, [numericBusId]);

  const today = new Date().toISOString().split('T')[0];

  // Count how many students each coordinator marked today
  const markingStats = await query.all(`
    SELECT marked_by_user_id, COUNT(*) as count
    FROM attendance_records
    WHERE bus_id = ? AND attendance_date = ?
    GROUP BY marked_by_user_id
  `, [numericBusId, today]);

  const markingMap = {};
  for (const stat of markingStats) {
    markingMap[stat.marked_by_user_id] = stat.count;
  }

  // Check online presence from activeSockets
  const onlineUserIds = new Set();
  for (const client of activeSockets.values()) {
    if (client.bus_id === numericBusId && client.user_id) {
      onlineUserIds.add(client.user_id);
    }
  }

  const result = coordinators.map((coord, index) => {
    const isOnline = onlineUserIds.has(coord.user_id);
    let displayTitle = '';
    if (coord.role === 'STOP_COORDINATOR') {
      displayTitle = 'Stop Coordinator';
    } else {
      displayTitle = `Coordinator ${index + 1}`;
    }

    return {
      user_id: coord.user_id,
      name: coord.name,
      role: coord.role,
      title: displayTitle,
      assigned_stop_name: coord.assigned_stop_name,
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      marked_count: markingMap[coord.user_id] || 0,
      last_active_at: coord.last_active_at
    };
  });

  return {
    bus_id: numericBusId,
    timestamp: new Date().toISOString(),
    coordinators: result
  };
}

module.exports = {
  setupWebSocket,
  broadcastToBus,
  broadcastPresence,
  getCoordinatorsStatus
};

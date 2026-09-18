const express = require('express');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/faculty?busId=1
router.get('/', async (req, res) => {
  try {
    const { busId } = req.query;
    let sql = `
      SELECT f.*, b.bus_number, b.route_name
      FROM faculty f
      JOIN buses b ON f.bus_id = b.id
      WHERE f.is_active = 1
    `;
    const params = [];
    if (busId) {
      sql += ' AND f.bus_id = ?';
      params.push(busId);
    }
    sql += ' ORDER BY f.department ASC, f.name ASC';

    const faculty = await query.all(sql, params);
    return res.json({ faculty });
  } catch (err) {
    console.error('[Faculty List Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve faculty list.' });
  }
});

// GET /api/faculty/daily?busId=1&date=2026-09-18
router.get('/daily', async (req, res) => {
  try {
    const { busId, date = new Date().toISOString().split('T')[0] } = req.query;

    let sql = `
      SELECT 
        f.id,
        f.faculty_id,
        f.name,
        f.department,
        f.phone,
        COALESCE(f.is_coordinator, 0) as is_coordinator,
        b.bus_number,
        COALESCE(far_m.status, 'UNMARKED') as morning_status,
        COALESCE(far_e.status, 'UNMARKED') as evening_status,
        COALESCE(far_m.status, COALESCE(far_e.status, 'UNMARKED')) as attendance_status,
        COALESCE(far_m.marked_at, far_e.marked_at) as marked_at,
        COALESCE(u_m.name, u_e.name) as marked_by_name
      FROM faculty f
      JOIN buses b ON f.bus_id = b.id
      LEFT JOIN faculty_attendance_records far_m ON f.id = far_m.faculty_id AND far_m.attendance_date = ? AND far_m.session = 'MORNING'
      LEFT JOIN users u_m ON far_m.marked_by_user_id = u_m.user_id
      LEFT JOIN faculty_attendance_records far_e ON f.id = far_e.faculty_id AND far_e.attendance_date = ? AND far_e.session = 'EVENING'
      LEFT JOIN users u_e ON far_e.marked_by_user_id = u_e.user_id
      WHERE f.is_active = 1
    `;
    const params = [date, date];
    if (busId) {
      sql += ' AND f.bus_id = ?';
      params.push(busId);
    }
    sql += ' ORDER BY f.is_coordinator DESC, f.department ASC, f.name ASC';

    const records = await query.all(sql, params);

    const counts = {
      total: records.length,
      morning_present: records.filter(r => r.morning_status === 'PRESENT').length,
      morning_absent: records.filter(r => r.morning_status === 'ABSENT').length,
      morning_unmarked: records.filter(r => r.morning_status === 'UNMARKED').length,
      evening_present: records.filter(r => r.evening_status === 'PRESENT').length,
      evening_absent: records.filter(r => r.evening_status === 'ABSENT').length,
      evening_unmarked: records.filter(r => r.evening_status === 'UNMARKED').length,
      present: records.filter(r => r.attendance_status === 'PRESENT').length,
      absent: records.filter(r => r.attendance_status === 'ABSENT').length,
      unmarked: records.filter(r => r.attendance_status === 'UNMARKED').length
    };

    return res.json({
      date,
      counts,
      records
    });
  } catch (err) {
    console.error('[Faculty Daily Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve daily faculty attendance.' });
  }
});

// POST /api/faculty/mark
router.post('/mark', verifyToken, async (req, res) => {
  try {
    const { faculty_id, bus_id, attendance_date, status, session = 'MORNING' } = req.body;

    if (!faculty_id || !bus_id || !attendance_date || !status) {
      return res.status(400).json({ error: 'Missing required faculty attendance parameters.' });
    }

    if (!['PRESENT', 'ABSENT', 'UNMARKED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be PRESENT, ABSENT, or UNMARKED.' });
    }

    const sess = (session || 'MORNING').toUpperCase();
    const marked_by = req.user.user_id;
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (status === 'UNMARKED') {
      await query.run(`
        DELETE FROM faculty_attendance_records
        WHERE faculty_id = ? AND attendance_date = ? AND session = ?
      `, [faculty_id, attendance_date, sess]);
    } else {
      await query.run(`
        INSERT INTO faculty_attendance_records (faculty_id, bus_id, attendance_date, session, status, marked_by_user_id, marked_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(faculty_id, attendance_date, session) DO UPDATE SET
          status = excluded.status,
          marked_by_user_id = excluded.marked_by_user_id,
          marked_at = excluded.marked_at
      `, [faculty_id, bus_id, attendance_date, sess, status, marked_by, time]);
    }

    return res.json({ success: true, message: 'Faculty attendance updated.', status, session: sess });
  } catch (err) {
    console.error('[Faculty Mark Error]:', err);
    return res.status(500).json({ error: 'Failed to update faculty attendance.' });
  }
});

// GET /api/faculty/monthly?month=2026-09&busId=1
router.get('/monthly', async (req, res) => {
  try {
    const { month = '2026-09', busId } = req.query;

    let sql = `
      SELECT 
        f.id,
        f.faculty_id,
        f.name,
        f.department,
        COALESCE(f.is_coordinator, 0) as is_coordinator,
        b.bus_number,
        COUNT(far.id) as recorded_days,
        SUM(CASE WHEN far.status = 'PRESENT' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN far.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_days
      FROM faculty f
      JOIN buses b ON f.bus_id = b.id
      LEFT JOIN faculty_attendance_records far ON f.id = far.faculty_id AND far.attendance_date LIKE ?
      WHERE f.is_active = 1
    `;
    const params = [`${month}%`];
    if (busId) {
      sql += ' AND f.bus_id = ?';
      params.push(busId);
    }
    sql += ' GROUP BY f.id ORDER BY f.is_coordinator DESC, f.department ASC, f.name ASC';

    const records = await query.all(sql, params);

    const facultyStats = records.map(r => {
      const percentage = r.recorded_days > 0 ? Math.round((r.present_days / r.recorded_days) * 100) : 0;
      return {
        ...r,
        attendance_percentage: percentage
      };
    });

    return res.json({
      month,
      records: facultyStats
    });
  } catch (err) {
    console.error('[Faculty Monthly Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve monthly faculty report.' });
  }
});

// POST /api/faculty/set-coordinator
router.post('/set-coordinator', verifyToken, async (req, res) => {
  try {
    const { faculty_id, bus_id } = req.body;
    if (!faculty_id) {
      return res.status(400).json({ error: 'Faculty ID is required' });
    }
    if (bus_id) {
      await query.run('UPDATE faculty SET is_coordinator = 0 WHERE bus_id = ?', [bus_id]);
    }
    await query.run('UPDATE faculty SET is_coordinator = 1 WHERE id = ? OR faculty_id = ?', [faculty_id, faculty_id]);
    return res.json({ success: true, message: 'Faculty Coordinator updated successfully.' });
  } catch (err) {
    console.error('[Set Coordinator Error]:', err);
    return res.status(500).json({ error: 'Failed to update faculty coordinator.' });
  }
});

module.exports = router;

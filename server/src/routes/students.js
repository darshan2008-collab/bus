const express = require('express');
const { query } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/students?busId=1&search=...&gender=...&stopId=...
router.get('/', async (req, res) => {
  try {
    const { busId, stopId, gender, search, page = 1, limit = 100 } = req.query;

    let sql = `
      SELECT s.*, b.bus_number, bs.stop_name
      FROM students s
      JOIN buses b ON s.bus_id = b.id
      JOIN bus_stops bs ON s.stop_id = bs.id
      WHERE s.is_active = 1
    `;
    const params = [];

    if (busId) {
      sql += ' AND s.bus_id = ?';
      params.push(busId);
    }
    if (stopId) {
      sql += ' AND s.stop_id = ?';
      params.push(stopId);
    }
    if (gender) {
      sql += ' AND s.gender = ?';
      params.push(gender.toUpperCase());
    }
    if (search) {
      sql += ' AND (s.name LIKE ? OR s.register_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY bs.stop_order ASC, s.gender DESC, s.name ASC';

    const students = await query.all(sql, params);
    return res.json({ students, total: students.length });
  } catch (err) {
    console.error('[Students List Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve students.' });
  }
});

// GET /api/students/by-stop/:stopId?date=2026-09-18&session=MORNING
// CRITICAL: Automatically separates students into BOYS and GIRLS inside the stop and loads session attendance!
router.get('/by-stop/:stopId', async (req, res) => {
  try {
    const stopId = req.params.stopId;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const sessionType = (req.query.session || 'MORNING').toUpperCase();
    const busId = req.query.busId || 4;

    // Handle "ALL STOPS" request
    if (stopId === 'all') {
      const bus = await query.get('SELECT * FROM buses WHERE id = ?', [busId]);

      const students = await query.all(`
        SELECT 
          s.id,
          s.register_number,
          s.name,
          s.gender,
          s.department,
          s.year,
          s.bus_id,
          s.stop_id,
          bs.stop_name,
          bs.stop_order,
          COALESCE(ar_m.status, 'UNMARKED') as morning_status,
          ar_m.marked_by_user_id as morning_marked_by,
          ar_m.marked_at as morning_marked_at,
          COALESCE(ar_e.status, 'UNMARKED') as evening_status,
          ar_e.marked_by_user_id as evening_marked_by,
          ar_e.marked_at as evening_marked_at,
          COALESCE(
            CASE WHEN ? = 'EVENING' THEN ar_e.status ELSE ar_m.status END,
            'UNMARKED'
          ) as attendance_status
        FROM students s
        LEFT JOIN bus_stops bs ON s.stop_id = bs.id
        LEFT JOIN attendance_records ar_m ON s.id = ar_m.student_id AND ar_m.attendance_date = ? AND ar_m.session = 'MORNING'
        LEFT JOIN attendance_records ar_e ON s.id = ar_e.student_id AND ar_e.attendance_date = ? AND ar_e.session = 'EVENING'
        WHERE s.bus_id = ? AND s.is_active = 1
        ORDER BY bs.stop_order ASC, s.name ASC
      `, [sessionType, date, date, busId]);

      const boys = students.filter(s => s.gender === 'MALE');
      const girls = students.filter(s => s.gender === 'FEMALE');

      const counts = {
        total: students.length,
        boys: boys.length,
        girls: girls.length,
        present: students.filter(s => s.attendance_status === 'PRESENT').length,
        absent: students.filter(s => s.attendance_status === 'ABSENT').length,
        unmarked: students.filter(s => s.attendance_status === 'UNMARKED').length
      };

      // Check if all stops on this bus are submitted
      const unsubmittedStops = await query.all(`
        SELECT bs.id FROM bus_stops bs
        LEFT JOIN attendance_sessions asess ON bs.id = asess.stop_id AND asess.attendance_date = ? AND asess.session = ? AND asess.status = 'SUBMITTED'
        WHERE bs.bus_id = ? AND asess.id IS NULL
      `, [date, sessionType, busId]);

      const isAllSubmitted = unsubmittedStops.length === 0 && students.length > 0;

      return res.json({
        stop: {
          id: 'all',
          stop_name: 'All Stops',
          bus_number: bus ? bus.bus_number : 'BUS 16',
          pickup_time: 'Full Route'
        },
        date,
        session_type: sessionType,
        counts,
        is_submitted: isAllSubmitted,
        session: {
          session: sessionType,
          status: isAllSubmitted ? 'SUBMITTED' : 'IN_PROGRESS'
        },
        boys,
        girls,
        all_students: students,
        is_all_stops: true
      });
    }

    const stop = await query.get(`
      SELECT bs.*, b.bus_number 
      FROM bus_stops bs
      JOIN buses b ON bs.bus_id = b.id
      WHERE bs.id = ?
    `, [stopId]);

    if (!stop) {
      return res.status(404).json({ error: 'Bus stop not found.' });
    }

    const students = await query.all(`
      SELECT 
        s.id,
        s.register_number,
        s.name,
        s.gender,
        s.department,
        s.year,
        s.bus_id,
        s.stop_id,
        bs.stop_name,
        COALESCE(ar_m.status, 'UNMARKED') as morning_status,
        ar_m.marked_by_user_id as morning_marked_by,
        ar_m.marked_at as morning_marked_at,
        COALESCE(ar_e.status, 'UNMARKED') as evening_status,
        ar_e.marked_by_user_id as evening_marked_by,
        ar_e.marked_at as evening_marked_at,
        COALESCE(
          CASE WHEN ? = 'EVENING' THEN ar_e.status ELSE ar_m.status END,
          'UNMARKED'
        ) as attendance_status
      FROM students s
      LEFT JOIN bus_stops bs ON s.stop_id = bs.id
      LEFT JOIN attendance_records ar_m ON s.id = ar_m.student_id AND ar_m.attendance_date = ? AND ar_m.session = 'MORNING'
      LEFT JOIN attendance_records ar_e ON s.id = ar_e.student_id AND ar_e.attendance_date = ? AND ar_e.session = 'EVENING'
      WHERE s.stop_id = ? AND s.is_active = 1
      ORDER BY s.name ASC
    `, [sessionType, date, date, stopId]);

    // Separate boys and girls
    const boys = students.filter(s => s.gender === 'MALE');
    const girls = students.filter(s => s.gender === 'FEMALE');

    // Counts
    const counts = {
      total: students.length,
      boys: boys.length,
      girls: girls.length,
      present: students.filter(s => s.attendance_status === 'PRESENT').length,
      absent: students.filter(s => s.attendance_status === 'ABSENT').length,
      unmarked: students.filter(s => s.attendance_status === 'UNMARKED').length
    };

    // Check submission status for session
    const session = await query.get(
      'SELECT * FROM attendance_sessions WHERE stop_id = ? AND attendance_date = ? AND session = ?',
      [stopId, date, sessionType]
    );

    return res.json({
      stop,
      date,
      session_type: sessionType,
      counts,
      is_submitted: !!session && session.status === 'SUBMITTED',
      session,
      boys,
      girls,
      all_students: students
    });
  } catch (err) {
    console.error('[Students By Stop Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve stop students.' });
  }
});

// GET /api/students/:id/history
router.get('/:id/history', async (req, res) => {
  try {
    const studentId = req.params.id;

    const student = await query.get(`
      SELECT s.*, b.bus_number, b.route_name, bs.stop_name
      FROM students s
      JOIN buses b ON s.bus_id = b.id
      JOIN bus_stops bs ON s.stop_id = bs.id
      WHERE s.id = ?
    `, [studentId]);

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Historical attendance records
    const history = await query.all(`
      SELECT 
        ar.*,
        u.name as marked_by_name,
        u.role as marked_by_role
      FROM attendance_records ar
      LEFT JOIN users u ON ar.marked_by_user_id = u.user_id
      WHERE ar.student_id = ?
      ORDER BY ar.attendance_date DESC
    `, [studentId]);

    // Statistics
    const totalDays = history.length;
    const presentDays = history.filter(h => h.status === 'PRESENT').length;
    const absentDays = history.filter(h => h.status === 'ABSENT').length;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return res.json({
      student,
      stats: {
        total_days: totalDays,
        present_days: presentDays,
        absent_days: absentDays,
        attendance_percentage: percentage
      },
      history
    });
  } catch (err) {
    console.error('[Student History Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve student history.' });
  }
});

// POST /api/students (Admin)
router.post('/', verifyToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { register_number, name, gender, bus_id, stop_id, department, year, phone } = req.body;
    if (!register_number || !name || !gender || !bus_id || !stop_id) {
      return res.status(400).json({ error: 'Required student fields missing.' });
    }

    const existing = await query.get('SELECT id FROM students WHERE register_number = ?', [register_number.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Student with this register number already exists.' });
    }

    const result = await query.run(`
      INSERT INTO students (register_number, name, gender, bus_id, stop_id, department, year, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [register_number.trim(), name.trim(), gender.toUpperCase(), bus_id, stop_id, department || 'General', year || 'I', phone]);

    return res.status(201).json({ id: result.lastID, message: 'Student registered successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create student.' });
  }
});

module.exports = router;

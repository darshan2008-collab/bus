const express = require('express');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/buses
router.get('/', async (req, res) => {
  try {
    const buses = await query.all(`
      SELECT b.*, 
             COUNT(DISTINCT bs.id) as stop_count,
             COUNT(DISTINCT s.id) as student_count
      FROM buses b
      LEFT JOIN bus_stops bs ON b.id = bs.bus_id
      LEFT JOIN students s ON b.id = s.bus_id AND s.is_active = 1
      WHERE b.is_active = 1
      GROUP BY b.id
      ORDER BY b.bus_number ASC
    `);
    return res.json({ buses });
  } catch (err) {
    console.error('[Buses Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve buses.' });
  }
});

// GET /api/buses/:id/stops
router.get('/:id/stops', async (req, res) => {
  try {
    const busId = req.params.id;
    const stops = await query.all(`
      SELECT bs.*,
             COUNT(s.id) as total_students,
             SUM(CASE WHEN s.gender = 'MALE' THEN 1 ELSE 0 END) as boys_count,
             SUM(CASE WHEN s.gender = 'FEMALE' THEN 1 ELSE 0 END) as girls_count
      FROM bus_stops bs
      LEFT JOIN students s ON bs.id = s.stop_id AND s.is_active = 1
      WHERE bs.bus_id = ?
      GROUP BY bs.id
      ORDER BY bs.stop_order ASC, bs.stop_name ASC
    `, [busId]);

    return res.json({ stops });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve bus stops.' });
  }
});

// GET /api/buses/:id/summary?date=2026-09-18&session=MORNING
router.get('/:id/summary', async (req, res) => {
  try {
    const busId = req.params.id;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const sessionType = (req.query.session || 'MORNING').toUpperCase();

    // Bus info
    const bus = await query.get('SELECT * FROM buses WHERE id = ?', [busId]);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found.' });
    }

    // Stop-wise statistics for this date & session
    const stops = await query.all(`
      SELECT 
        bs.id as stop_id,
        bs.stop_name,
        bs.stop_order,
        bs.pickup_time,
        COUNT(s.id) as total_students,
        SUM(CASE WHEN s.gender = 'MALE' THEN 1 ELSE 0 END) as boys_count,
        SUM(CASE WHEN s.gender = 'FEMALE' THEN 1 ELSE 0 END) as girls_count,
        SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN ar.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
        sess.status as session_status,
        sess.submitted_by,
        sess.submitted_at
      FROM bus_stops bs
      LEFT JOIN students s ON bs.id = s.stop_id AND s.is_active = 1
      LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.attendance_date = ? AND ar.session = ?
      LEFT JOIN attendance_sessions sess ON bs.id = sess.stop_id AND sess.attendance_date = ? AND sess.session = ?
      WHERE bs.bus_id = ?
      GROUP BY bs.id
      ORDER BY bs.stop_order ASC
    `, [date, sessionType, date, sessionType, busId]);

    // Calculate totals and unmarked
    let totalStudents = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalUnmarked = 0;

    const stopSummaries = stops.map(stop => {
      const unmarked = stop.total_students - (stop.present_count + stop.absent_count);
      totalStudents += stop.total_students;
      totalPresent += stop.present_count;
      totalAbsent += stop.absent_count;
      totalUnmarked += unmarked;

      const isCompleted = stop.total_students > 0 && unmarked === 0 && stop.session_status === 'SUBMITTED';

      return {
        ...stop,
        unmarked_count: unmarked,
        completion_status: isCompleted ? 'COMPLETED' : (unmarked < stop.total_students ? 'IN_PROGRESS' : 'PENDING')
      };
    });

    // Faculty attendance summary for this bus and date
    const facultyCounts = await query.get(`
      SELECT 
        COUNT(f.id) as total_faculty,
        SUM(CASE WHEN far.status = 'PRESENT' THEN 1 ELSE 0 END) as present_faculty,
        SUM(CASE WHEN far.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_faculty
      FROM faculty f
      LEFT JOIN faculty_attendance_records far ON f.id = far.faculty_id AND far.attendance_date = ?
      WHERE f.bus_id = ? AND f.is_active = 1
    `, [date, busId]);

    return res.json({
      bus,
      date,
      overall: {
        total_students: totalStudents,
        present: totalPresent,
        absent: totalAbsent,
        unmarked: totalUnmarked,
        attendance_percentage: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0
      },
      faculty: {
        total: facultyCounts.total_faculty || 0,
        present: facultyCounts.present_faculty || 0,
        absent: facultyCounts.absent_faculty || 0
      },
      stops: stopSummaries
    });
  } catch (err) {
    console.error('[Bus Summary Error]:', err);
    return res.status(500).json({ error: 'Failed to generate bus summary.' });
  }
});

module.exports = router;

const express = require('express');
const { query } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { broadcastToBus, broadcastPresence } = require('../websocket/syncServer');

const router = express.Router();

// POST /api/attendance/mark
// Mark or update single student attendance for a specific date and session (MORNING or EVENING)
router.post('/mark', verifyToken, async (req, res) => {
  try {
    const { student_id, bus_id, stop_id, attendance_date, status } = req.body;
    const session = (req.body.session || 'MORNING').toUpperCase();

    if (!student_id || !bus_id || !attendance_date || !status) {
      return res.status(400).json({ error: 'Missing required attendance parameters.' });
    }

    let resolvedStopId = (stop_id && stop_id !== 'all') ? stop_id : null;
    if (!resolvedStopId && student_id) {
      const stu = await query.get('SELECT stop_id FROM students WHERE id = ?', [student_id]);
      if (stu) resolvedStopId = stu.stop_id;
    }

    if (!['PRESENT', 'ABSENT', 'UNMARKED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid attendance status. Must be PRESENT, ABSENT, or UNMARKED.' });
    }

    const marked_by = req.user.user_id;
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const now = new Date().toISOString();

    if (status === 'UNMARKED') {
      // Remove record or set status UNMARKED
      await query.run(`
        DELETE FROM attendance_records
        WHERE student_id = ? AND attendance_date = ? AND bus_id = ? AND session = ?
      `, [student_id, attendance_date, bus_id, session]);
    } else {
      // Upsert
      await query.run(`
        INSERT INTO attendance_records (student_id, bus_id, stop_id, attendance_date, session, status, marked_by_user_id, marked_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(student_id, attendance_date, bus_id, session) DO UPDATE SET
          status = excluded.status,
          marked_by_user_id = excluded.marked_by_user_id,
          marked_at = excluded.marked_at,
          updated_at = excluded.updated_at
      `, [student_id, bus_id, resolvedStopId, attendance_date, session, status, marked_by, time, now]);
    }

    // Update coordinator last activity
    await query.run('UPDATE users SET last_active_at = ? WHERE user_id = ?', [now, marked_by]);

    // Broadcast change to all active coordinators on this bus
    broadcastToBus(bus_id, {
      type: 'ATTENDANCE_UPDATED',
      payload: {
        student_id,
        bus_id,
        stop_id,
        attendance_date,
        session,
        status,
        marked_by_user_id: marked_by,
        marked_by_name: req.user.name,
        marked_at: time
      }
    });

    broadcastPresence(bus_id);

    return res.json({
      success: true,
      record: {
        student_id,
        bus_id,
        stop_id,
        attendance_date,
        session,
        status,
        marked_by,
        marked_at: time
      }
    });
  } catch (err) {
    console.error('[Mark Attendance Error]:', err);
    return res.status(500).json({ error: 'Failed to record attendance.' });
  }
});

// POST /api/attendance/batch-submit
// Final submission for a stop session with confirmation
router.post('/batch-submit', verifyToken, async (req, res) => {
  try {
    const { bus_id, stop_id, attendance_date, records } = req.body;
    const session = (req.body.session || 'MORNING').toUpperCase();

    if (!bus_id || !stop_id || !attendance_date) {
      return res.status(400).json({ error: 'Missing required submission details.' });
    }

    const marked_by = req.user.user_id;
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const now = new Date().toISOString();

    let presentCount = 0;
    let absentCount = 0;

    // Process records
    if (Array.isArray(records) && records.length > 0) {
      for (const rec of records) {
        if (rec.status && rec.status !== 'UNMARKED') {
          let recStopId = (stop_id !== 'all') ? stop_id : null;
          if (!recStopId && rec.student_id) {
            const stu = await query.get('SELECT stop_id FROM students WHERE id = ?', [rec.student_id]);
            if (stu) recStopId = stu.stop_id;
          }

          await query.run(`
            INSERT INTO attendance_records (student_id, bus_id, stop_id, attendance_date, session, status, marked_by_user_id, marked_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(student_id, attendance_date, bus_id, session) DO UPDATE SET
              status = excluded.status,
              marked_by_user_id = excluded.marked_by_user_id,
              marked_at = excluded.marked_at,
              updated_at = excluded.updated_at
          `, [rec.student_id, bus_id, recStopId, attendance_date, session, rec.status, marked_by, time, now]);
        }
      }
    }

    if (stop_id === 'all') {
      // Mark all stops on this bus as submitted
      const busStops = await query.all('SELECT id FROM bus_stops WHERE bus_id = ?', [bus_id]);
      for (const bs of busStops) {
        const stopStudents = await query.all('SELECT id FROM students WHERE stop_id = ? AND is_active = 1', [bs.id]);
        const stopRecords = await query.all(`
          SELECT status FROM attendance_records
          WHERE stop_id = ? AND attendance_date = ? AND session = ?
        `, [bs.id, attendance_date, session]);
        let pC = 0, aC = 0;
        for (const r of stopRecords) {
          if (r.status === 'PRESENT') pC++;
          else if (r.status === 'ABSENT') aC++;
        }
        await query.run(`
          INSERT INTO attendance_sessions (bus_id, stop_id, attendance_date, session, status, submitted_by, submitted_at, present_count, absent_count, total_count)
          VALUES (?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?)
          ON CONFLICT(bus_id, stop_id, attendance_date, session) DO UPDATE SET
            status = 'SUBMITTED',
            submitted_by = excluded.submitted_by,
            submitted_at = excluded.submitted_at,
            present_count = excluded.present_count,
            absent_count = excluded.absent_count,
            total_count = excluded.total_count
        `, [bus_id, bs.id, attendance_date, session, marked_by, time, pC, aC, stopStudents.length]);
      }
    } else {
      // Single stop submission
      const stopStudents = await query.all(
        'SELECT id FROM students WHERE stop_id = ? AND is_active = 1',
        [stop_id]
      );
      const totalCount = stopStudents.length;

      const stopRecords = await query.all(`
        SELECT status FROM attendance_records
        WHERE stop_id = ? AND attendance_date = ? AND session = ?
      `, [stop_id, attendance_date, session]);

      for (const r of stopRecords) {
        if (r.status === 'PRESENT') presentCount++;
        else if (r.status === 'ABSENT') absentCount++;
      }

      await query.run(`
        INSERT INTO attendance_sessions (bus_id, stop_id, attendance_date, session, status, submitted_by, submitted_at, present_count, absent_count, total_count)
        VALUES (?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?)
        ON CONFLICT(bus_id, stop_id, attendance_date, session) DO UPDATE SET
          status = 'SUBMITTED',
          submitted_by = excluded.submitted_by,
          submitted_at = excluded.submitted_at,
          present_count = excluded.present_count,
          absent_count = excluded.absent_count,
          total_count = excluded.total_count
      `, [bus_id, stop_id, attendance_date, session, marked_by, time, presentCount, absentCount, totalCount]);
    }

    // Update coordinator last activity
    await query.run('UPDATE users SET last_active_at = ? WHERE user_id = ?', [now, marked_by]);

    // Broadcast submission event to all bus coordinators
    broadcastToBus(bus_id, {
      type: 'STOP_ATTENDANCE_SUBMITTED',
      payload: {
        bus_id,
        stop_id,
        attendance_date,
        session
      }
    });

    broadcastPresence(bus_id);

    return res.json({
      success: true,
      message: 'Attendance submitted successfully.',
      session: {
        bus_id,
        stop_id,
        attendance_date,
        status: 'SUBMITTED',
        submitted_by: marked_by,
        submitted_at: time,
        present_count: presentCount,
        absent_count: absentCount,
        total_count: totalCount
      }
    });
  } catch (err) {
    console.error('[Batch Submit Error]:', err);
    return res.status(500).json({ error: 'Failed to submit attendance session.' });
  }
});

// GET /api/attendance/history
// Filterable permanent attendance history
router.get('/history', async (req, res) => {
  try {
    const { date, busId, stopId, gender, status, search, limit = 100 } = req.query;

    let sql = `
      SELECT 
        ar.id,
        ar.attendance_date,
        ar.status,
        ar.marked_at,
        ar.updated_at,
        ar.marked_by_user_id,
        u.name as marked_by_name,
        s.id as student_id,
        s.name as student_name,
        s.register_number,
        s.gender,
        s.department,
        b.bus_number,
        bs.stop_name
      FROM attendance_records ar
      JOIN students s ON ar.student_id = s.id
      JOIN buses b ON ar.bus_id = b.id
      JOIN bus_stops bs ON ar.stop_id = bs.id
      LEFT JOIN users u ON ar.marked_by_user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      sql += ' AND ar.attendance_date = ?';
      params.push(date);
    }
    if (busId) {
      sql += ' AND ar.bus_id = ?';
      params.push(busId);
    }
    if (stopId) {
      sql += ' AND ar.stop_id = ?';
      params.push(stopId);
    }
    if (gender) {
      sql += ' AND s.gender = ?';
      params.push(gender.toUpperCase());
    }
    if (status) {
      sql += ' AND ar.status = ?';
      params.push(status.toUpperCase());
    }
    if (search) {
      sql += ' AND (s.name LIKE ? OR s.register_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY ar.attendance_date DESC, bs.stop_order ASC, s.name ASC LIMIT ?';
    params.push(parseInt(limit, 10));

    const records = await query.all(sql, params);
    return res.json({ records, count: records.length });
  } catch (err) {
    console.error('[Attendance History Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve attendance history.' });
  }
});

// POST /api/attendance/audit-edit (Admin only modification of historic record)
router.post('/audit-edit', verifyToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { record_id, new_status, reason } = req.body;

    if (!record_id || !new_status || !reason || !reason.trim()) {
      return res.status(400).json({ error: 'Record ID, new status, and audit justification reason are required.' });
    }

    const record = await query.get('SELECT * FROM attendance_records WHERE id = ?', [record_id]);
    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    const original_status = record.status;
    if (original_status === new_status) {
      return res.status(400).json({ error: 'New status must be different from current status.' });
    }

    const now = new Date().toISOString();
    const adminUser = req.user.user_id;

    // 1. Update the record
    await query.run(`
      UPDATE attendance_records
      SET status = ?, marked_by_user_id = ?, updated_at = ?
      WHERE id = ?
    `, [new_status, adminUser, now, record_id]);

    // 2. Insert into audit trail
    await query.run(`
      INSERT INTO attendance_audit_logs (attendance_record_id, student_id, attendance_date, original_status, new_status, changed_by_user_id, change_reason, changed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [record_id, record.student_id, record.attendance_date, original_status, new_status, adminUser, reason.trim(), now]);

    // Broadcast change
    broadcastToBus(record.bus_id, {
      type: 'ATTENDANCE_AUDITED',
      payload: {
        record_id,
        student_id: record.student_id,
        attendance_date: record.attendance_date,
        original_status,
        new_status,
        changed_by: adminUser,
        reason
      }
    });

    return res.json({
      success: true,
      message: 'Attendance record updated with full audit trail entry.',
      original_status,
      new_status
    });
  } catch (err) {
    console.error('[Audit Edit Error]:', err);
    return res.status(500).json({ error: 'Failed to apply audit edit.' });
  }
});

// GET /api/attendance/audit-logs
router.get('/audit-logs', verifyToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const logs = await query.all(`
      SELECT 
        aal.*,
        s.name as student_name,
        s.register_number,
        u.name as changed_by_name
      FROM attendance_audit_logs aal
      JOIN students s ON aal.student_id = s.id
      LEFT JOIN users u ON aal.changed_by_user_id = u.user_id
      ORDER BY aal.changed_at DESC
      LIMIT 100
    `);

    return res.json({ logs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

// GET /api/attendance/distinct-dates
router.get('/distinct-dates', async (req, res) => {
  try {
    const dates = await query.all(`
      SELECT DISTINCT attendance_date 
      FROM attendance_records 
      ORDER BY attendance_date DESC 
      LIMIT 30
    `);
    return res.json({ dates: dates.map(d => d.attendance_date) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch attendance dates.' });
  }
});

module.exports = router;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { apiRequest } from '../utils/api';
import DateRibbon from '../components/attendance/DateRibbon';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Search,
  Check,
  X
} from 'lucide-react';

export default function StopCoordinatorPage() {
  const { user, selectedBusId } = useAuth();
  const { registerListener } = useSync();

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const [stops, setStops] = useState([]);
  const [selectedStopId, setSelectedStopId] = useState(user?.assigned_stop_id || null);
  const [stopData, setStopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch stops for bus
  useEffect(() => {
    apiRequest(`/buses/${selectedBusId}/stops`).then((res) => {
      if (res && res.stops) {
        setStops(res.stops);
        // Default to assigned stop if available, or first stop
        if (!selectedStopId && res.stops.length > 0) {
          const matched = res.stops.find((s) => s.id === user?.assigned_stop_id);
          setSelectedStopId(matched ? matched.id : res.stops[0].id);
        }
      }
    });
  }, [selectedBusId, user]);

  // 2. Fetch stop details
  const fetchStopDetails = async (stopId, date) => {
    if (!stopId) return;
    setLoading(true);
    try {
      const data = await apiRequest(`/students/by-stop/${stopId}?date=${date}`);
      setStopData(data);
    } catch (err) {
      console.warn('Error fetching stop coordinator data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStopId) {
      fetchStopDetails(selectedStopId, selectedDate);
    }
  }, [selectedStopId, selectedDate]);

  // Real-time listener
  useEffect(() => {
    const unregister = registerListener((event) => {
      if (event.type === 'ATTENDANCE_UPDATED' || event.type === 'STOP_ATTENDANCE_SUBMITTED') {
        if (String(event.payload.stop_id) === String(selectedStopId)) {
          fetchStopDetails(selectedStopId, selectedDate);
        }
      }
    });
    return unregister;
  }, [selectedStopId, selectedDate]);

  const counts = stopData?.counts || { total: 0, boys: 0, girls: 0, present: 0, absent: 0, unmarked: 0 };
  const stop = stopData?.stop || {};
  const isCompleted = stopData?.is_submitted || (counts.total > 0 && counts.unmarked === 0);

  const filteredStudents = (stopData?.all_students || []).filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return s.name.toLowerCase().includes(q) || s.register_number.toLowerCase().includes(q);
  });

  return (
    <div className="page-container">
      {/* Date Ribbon */}
      <DateRibbon selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {/* Stop Coordinator Header Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--status-present)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className="section-label">STOP COORDINATOR MONITORING</span>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {user?.name} {user?.role === 'STOP_COORDINATOR' ? '(Assigned)' : '(Auditing View)'}
              </div>
            </div>
          </div>

          {/* Stop Selector Dropdown */}
          <select
            value={selectedStopId || ''}
            onChange={(e) => setSelectedStopId(parseInt(e.target.value, 10))}
            style={{
              padding: '8px 12px',
              fontSize: '12.5px',
              fontWeight: 700,
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.stop_name}
              </option>
            ))}
          </select>
        </div>

        {/* Big Stop Banner Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              {stop.stop_name || 'SELECT STOP'}
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                textTransform: 'uppercase',
                backgroundColor: isCompleted ? 'var(--status-present-bg)' : 'rgba(245, 158, 11, 0.15)',
                color: isCompleted ? 'var(--status-present)' : '#f59e0b',
                border: `1px solid ${isCompleted ? 'var(--status-present-border)' : '#f59e0b'}`
              }}
            >
              ATTENDANCE: {isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
            </span>
          </div>

          {/* Counts metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Students
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {counts.total}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                {counts.boys} Boys &bull; {counts.girls} Girls
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--status-present-bg)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-present-border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--status-present)', textTransform: 'uppercase', fontWeight: 700 }}>
                Present
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--status-present)' }}>
                {counts.present}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--status-present)' }}>
                {counts.total > 0 ? `${Math.round((counts.present / counts.total) * 100)}%` : '0%'}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--status-absent-bg)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-absent-border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--status-absent)', textTransform: 'uppercase', fontWeight: 700 }}>
                Absent
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--status-absent)' }}>
                {counts.absent}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--status-absent)' }}>
                Unmarked: {counts.unmarked}
              </div>
            </div>
          </div>

          {/* Session submission details */}
          {stopData?.session && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={13} color="var(--status-present)" />
              <span>
                Verified & Submitted at {stopData.session.submitted_at} by Coordinator {stopData.session.submitted_by}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Student-Level Inspection Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="section-label">STUDENT-LEVEL INSPECTION ({filteredStudents.length})</span>
          <div style={{ position: 'relative', width: '180px' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '6px 8px 6px 28px', fontSize: '11.5px' }}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="app-table">
            <thead>
              <tr>
                <th>Register No</th>
                <th>Student Name</th>
                <th>Gender</th>
                <th>Dept</th>
                <th>Status</th>
                <th>Marked By</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    Loading student attendance records...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    No students found matching query.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.register_number}</td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: s.gender === 'MALE' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                          color: s.gender === 'MALE' ? '#60a5fa' : '#f472b6',
                          fontWeight: 600
                        }}
                      >
                        {s.gender === 'MALE' ? 'BOY' : 'GIRL'}
                      </span>
                    </td>
                    <td>{s.department}</td>
                    <td>
                      <span
                        className={`student-status-badge ${s.attendance_status.toLowerCase()}`}
                        style={{ padding: '3px 8px', fontSize: '10.5px' }}
                      >
                        {s.attendance_status}
                      </span>
                    </td>
                    <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      {s.marked_by_user_id || '-'}
                    </td>
                    <td style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {s.marked_at || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import DateRibbon from '../components/attendance/DateRibbon';
import {
  History,
  Calendar,
  Search,
  Filter,
  ShieldAlert,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  Clock,
  MapPin
} from 'lucide-react';

export default function HistoryPage() {
  const { user, isAdmin, selectedBusId } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState('2026-09-17'); // Default to seeded past day
  const [stops, setStops] = useState([]);
  const [records, setRecords] = useState([]);
  const [distinctDates, setDistinctDates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [stopFilter, setStopFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Admin Audit Edit Modal
  const [editRecord, setEditRecord] = useState(null);
  const [editStatus, setEditStatus] = useState('PRESENT');
  const [editReason, setEditReason] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [auditNotice, setAuditNotice] = useState('');

  // 1. Fetch distinct dates with attendance
  useEffect(() => {
    apiRequest('/attendance/distinct-dates').then((res) => {
      if (res && res.dates) setDistinctDates(res.dates);
    });
    apiRequest(`/buses/${selectedBusId}/stops`).then((res) => {
      if (res && res.stops) setStops(res.stops);
    });
  }, [selectedBusId]);

  // 2. Fetch history records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      let query = `/attendance/history?busId=${selectedBusId}&date=${selectedDate}`;
      if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;
      if (stopFilter) query += `&stopId=${stopFilter}`;
      if (genderFilter) query += `&gender=${genderFilter}`;
      if (statusFilter) query += `&status=${statusFilter}`;

      const res = await apiRequest(query);
      if (res && res.records) {
        setRecords(res.records);
      }
    } catch (err) {
      console.warn('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedDate, selectedBusId, stopFilter, genderFilter, statusFilter]);

  // Handle Admin Audit Edit
  const handleApplyAuditEdit = async () => {
    if (!editReason.trim()) {
      alert('Audit justification reason is strictly required by institutional policy.');
      return;
    }
    setEditLoading(true);
    try {
      await apiRequest('/attendance/audit-edit', {
        method: 'POST',
        body: JSON.stringify({
          record_id: editRecord.id,
          new_status: editStatus,
          reason: editReason.trim()
        })
      });

      setAuditNotice(`Record updated from ${editRecord.status} to ${editStatus} with full audit trail entry.`);
      setEditRecord(null);
      setEditReason('');
      fetchRecords();
      setTimeout(() => setAuditNotice(''), 5000);
    } catch (err) {
      alert('Failed to edit record: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="section-label">PERMANENT ATTENDANCE ARCHIVE</span>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Historical Records & Auditing
        </h2>
      </div>

      {/* Date Navigation Strip */}
      <DateRibbon selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {/* Quick Jump to Archived Dates */}
      {distinctDates.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>
            ARCHIVED DATES:
          </span>
          {distinctDates.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: selectedDate === d ? 'var(--primary)' : 'var(--bg-surface)',
                color: selectedDate === d ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                whiteSpace: 'nowrap'
              }}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {/* Audit Success Alert */}
      {auditNotice && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'var(--status-present-bg)',
            border: '1px solid var(--status-present-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--status-present)',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          {auditNotice}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            placeholder="Search student or register no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchRecords()}
            style={{ width: '100%', padding: '10px 12px 10px 38px', fontSize: '13px' }}
          />
        </div>

        <div className="history-filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          <select value={stopFilter} onChange={(e) => setStopFilter(e.target.value)} style={{ padding: '8px', fontSize: '12px' }}>
            <option value="">All Stops</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.stop_name}
              </option>
            ))}
          </select>

          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} style={{ padding: '8px', fontSize: '12px' }}>
            <option value="">All Genders</option>
            <option value="MALE">Boys Only</option>
            <option value="FEMALE">Girls Only</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px', fontSize: '12px' }}>
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>
      </div>

      {/* Summary count for selected date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Date: <strong>{selectedDate}</strong> &bull; Total: <strong>{records.length}</strong> &bull; Present: <strong style={{ color: 'var(--status-present)' }}>{presentCount}</strong> &bull; Absent: <strong style={{ color: 'var(--status-absent)' }}>{absentCount}</strong>
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="desktop-table-view">
        <div className="table-responsive">
          <table className="app-table">
            <thead>
              <tr>
                <th>Reg No</th>
                <th>Student Name</th>
                <th>Stop</th>
                <th>Status</th>
                <th>Marked By</th>
                <th>Time</th>
                {isAdmin && <th>Audit</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Loading permanent records for {selectedDate}...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No attendance records exist for {selectedDate}.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.register_number}</td>
                    <td style={{ fontWeight: 600 }}>{r.student_name}</td>
                    <td>{r.stop_name}</td>
                    <td>
                      <span className={`student-status-badge ${r.status.toLowerCase()}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {r.marked_by_name || r.marked_by_user_id}
                    </td>
                    <td style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {r.marked_at}
                    </td>
                    {isAdmin && (
                      <td>
                        <button
                          onClick={() => {
                            setEditRecord(r);
                            setEditStatus(r.status === 'PRESENT' ? 'ABSENT' : 'PRESENT');
                          }}
                          className="btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '11px', minHeight: 'auto' }}
                          title="Admin Authorized Audit Edit"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View for Phones */}
      <div className="mobile-card-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Loading permanent records for {selectedDate}...
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No attendance records exist for {selectedDate}.
          </div>
        ) : (
          records.map((r) => (
            <div
              key={r.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '2px 7px',
                    backgroundColor: 'var(--bg-app)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {r.register_number}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className={`student-status-badge ${r.status.toLowerCase()}`}
                    style={{ padding: '3px 8px', fontSize: '10.5px' }}
                  >
                    {r.status}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setEditRecord(r);
                        setEditStatus(r.status === 'PRESENT' ? 'ABSENT' : 'PRESENT');
                      }}
                      className="btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '11px', minHeight: 'auto', gap: '3px' }}
                    >
                      <Edit2 size={11} />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {r.student_name}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} color="var(--primary)" />
                  <span>{r.stop_name}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {r.marked_at} &bull; {r.marked_by_name || r.marked_by_user_id}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Admin Audit Edit Modal */}
      {editRecord && (
        <div className="modal-overlay" onClick={() => setEditRecord(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="#f59e0b" />
                <span className="modal-title">ADMIN AUDIT CORRECTION</span>
              </div>
              <button onClick={() => setEditRecord(null)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Modifying past attendance records requires an auditable administrative justification reason.
            </div>

            <div style={{ backgroundColor: 'var(--bg-app)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                {editRecord.student_name} ({editRecord.register_number})
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Date: {editRecord.attendance_date} &bull; Current: <strong>{editRecord.status}</strong>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                NEW ATTENDANCE STATUS
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditStatus('PRESENT')}
                  className={`attendance-toggle-btn btn-present ${editStatus === 'PRESENT' ? 'selected' : ''}`}
                >
                  PRESENT
                </button>
                <button
                  type="button"
                  onClick={() => setEditStatus('ABSENT')}
                  className={`attendance-toggle-btn btn-absent ${editStatus === 'ABSENT' ? 'selected' : ''}`}
                >
                  ABSENT
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                AUDIT JUSTIFICATION REASON *
              </label>
              <textarea
                placeholder="e.g. Authorized medical gate pass verified by Principal / HOD..."
                rows={3}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEditRecord(null)} className="btn-secondary" style={{ flex: 1 }}>
                <span>Cancel</span>
              </button>
              <button
                onClick={handleApplyAuditEdit}
                disabled={editLoading || !editReason.trim()}
                className="btn-primary"
                style={{ flex: 2 }}
              >
                <span>{editLoading ? 'Recording Audit...' : 'Save Audit Correction'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

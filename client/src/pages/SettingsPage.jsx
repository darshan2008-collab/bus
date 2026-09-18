import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import {
  Settings,
  Shield,
  Clock,
  History,
  Bus,
  MapPin,
  Users,
  CheckCircle2
} from 'lucide-react';

export default function SettingsPage() {
  const { user, isAdmin, selectedBusId } = useAuth();
  const [activeTab, setActiveTab] = useState('AUDIT'); // 'AUDIT' | 'CONFIG'
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      setLoadingAudit(true);
      apiRequest('/attendance/audit-logs')
        .then((res) => {
          if (res && res.logs) setAuditLogs(res.logs);
        })
        .catch((err) => console.warn('Could not load audit logs:', err))
        .finally(() => setLoadingAudit(false));
    }
  }, [isAdmin]);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={22} color="var(--primary)" />
          <span className="section-label">ADMINISTRATION & AUDIT</span>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          System Audit Trail & Settings
        </h2>
      </div>

      {/* Tabs */}
      <div className="tab-segment-group">
        <button
          type="button"
          onClick={() => setActiveTab('AUDIT')}
          className={`tab-segment-btn ${activeTab === 'AUDIT' ? 'active' : ''}`}
        >
          <span>Attendance Audit Trail</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CONFIG')}
          className={`tab-segment-btn ${activeTab === 'CONFIG' ? 'active' : ''}`}
        >
          <span>Academic & Bus Config</span>
        </button>
      </div>

      {activeTab === 'AUDIT' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Every historical attendance modification made by an administrator is permanently logged with timestamp and mandatory justification reason:
          </div>

          <div className="table-responsive">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Student</th>
                  <th>Date</th>
                  <th>Original Status</th>
                  <th>New Status</th>
                  <th>Modified By</th>
                  <th>Audit Reason</th>
                </tr>
              </thead>
              <tbody>
                {loadingAudit ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      Loading audit logs...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      No audit modifications recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.changed_at}</td>
                      <td style={{ fontWeight: 600 }}>
                        {log.student_name} ({log.register_number})
                      </td>
                      <td>{log.attendance_date}</td>
                      <td>
                        <span className={`student-status-badge ${log.original_status.toLowerCase()}`}>
                          {log.original_status}
                        </span>
                      </td>
                      <td>
                        <span className={`student-status-badge ${log.new_status.toLowerCase()}`}>
                          {log.new_status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {log.changed_by_name || log.changed_by_user_id}
                      </td>
                      <td style={{ fontSize: '12px', fontStyle: 'italic', maxWidth: '240px' }}>
                        "{log.change_reason}"
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Institutional Config */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <span className="section-label">ACADEMIC YEAR & SESSION SETTINGS</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  CURRENT ACADEMIC YEAR
                </label>
                <input type="text" readOnly value="2026 - 2027" style={{ width: '100%', padding: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  SEMESTER
                </label>
                <input type="text" readOnly value="ODD SEMESTER" style={{ width: '100%', padding: '8px' }} />
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <span className="section-label">COORDINATOR STRUCTURE SPECIFICATIONS</span>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong>Rule 1:</strong> Each bus is assigned exactly 4 authorized attendance handlers (3 Student Coordinators + 1 Stop Coordinator).<br />
              <strong>Rule 2:</strong> Real-time WebSocket synchronization guarantees concurrent marking without page refresh.<br />
              <strong>Rule 3:</strong> Date partitioning prevents overwriting historical records permanently.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

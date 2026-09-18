import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { apiRequest } from '../utils/api';
import CoordinatorStatusBar from '../components/attendance/CoordinatorStatusBar';
import {
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  GraduationCap,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export default function DashboardPage({ onNavigateToAttendance, onSelectStop }) {
  const { selectedBusId } = useAuth();
  const { registerListener } = useSync();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const today = new Date().toISOString().split('T')[0];

  const fetchDashboardData = async () => {
    try {
      const data = await apiRequest(`/buses/${selectedBusId}/summary?date=${today}`);
      setSummaryData(data);

      const hist = await apiRequest(`/attendance/history?busId=${selectedBusId}&date=${today}&limit=6`);
      if (hist && hist.records) {
        setRecentActivity(hist.records);
      }
    } catch (err) {
      console.warn('[Dashboard] Error loading data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Listen for incoming WebSocket updates from any coordinator
    const unregister = registerListener((event) => {
      if (event.type === 'ATTENDANCE_UPDATED' || event.type === 'STOP_ATTENDANCE_SUBMITTED') {
        fetchDashboardData();
      }
    });

    return unregister;
  }, [selectedBusId]);

  if (loading && !summaryData) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '40px 16px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading dashboard data...</div>
      </div>
    );
  }

  const overall = summaryData?.overall || { total_students: 0, present: 0, absent: 0, unmarked: 0 };
  const stops = summaryData?.stops || [];
  const faculty = summaryData?.faculty || { total: 0, present: 0, absent: 0 };
  const bus = summaryData?.bus || { bus_number: `BUS ${selectedBusId}`, route_name: 'Main Route' };

  return (
    <div className="page-container">
      {/* Top Overview Banner with University Branding */}
      <div className="dash-overview-card">
        <div className="dash-overview-top">
          <div className="dash-overview-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="/dsu_seal.png"
              alt="DSU Seal"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                clipPath: 'circle(47% at 50% 49%)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                flexShrink: 0
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span className="overview-bus-pill">BUS 16 ACTIVE</span>
              <span className="overview-route-name" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {bus.route_name || 'DSU Campus Route 07'}
              </span>
            </div>
          </div>
          <div className="dash-date-badge">
            <Calendar size={13} />
            <span>{today}</span>
          </div>
        </div>

        <div className="dash-overview-action-row">
          <div>
            <div className="dash-route-heading">
              Attendance Overview
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500 }}>
              Dhanalakshmi Srinivasan University &bull; Perambalur Campus
            </div>
          </div>
          <button
            onClick={onNavigateToAttendance}
            className="btn-primary dash-action-btn"
          >
            <span>Mark Attendance</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* 4 Balanced Summary Cards */}
      <div className="dash-stats-grid">
        {/* TOTAL */}
        <div className="dash-stat-card total">
          <div className="dash-stat-top">
            <div className="dash-stat-icon-wrap total">
              <Users size={18} />
            </div>
            <span className="dash-stat-pill total">
              <span className="dash-stat-dot"></span>
              TOTAL
            </span>
          </div>
          <div className="dash-stat-body">
            <div className="dash-stat-number">{overall.total_students}</div>
            <div className="dash-stat-label">Enrolled Students</div>
          </div>
          <div className="dash-stat-footer">
            <div className="dash-stat-meter-bar">
              <div className="dash-stat-meter-fill total" style={{ width: '100%' }}></div>
            </div>
            <span className="dash-stat-caption">100% Roster</span>
          </div>
        </div>

        {/* PRESENT */}
        <div className="dash-stat-card present">
          <div className="dash-stat-top">
            <div className="dash-stat-icon-wrap present">
              <UserCheck size={18} />
            </div>
            <span className="dash-stat-pill present">
              <span className="dash-stat-dot"></span>
              PRESENT
            </span>
          </div>
          <div className="dash-stat-body">
            <div className="dash-stat-number">{overall.present}</div>
            <div className="dash-stat-label">Marked Present</div>
          </div>
          <div className="dash-stat-footer">
            <div className="dash-stat-meter-bar">
              <div
                className="dash-stat-meter-fill present"
                style={{ width: `${Math.min(overall.attendance_percentage || 0, 100)}%` }}
              ></div>
            </div>
            <span className="dash-stat-caption">{overall.attendance_percentage}% Attended</span>
          </div>
        </div>

        {/* ABSENT */}
        <div className="dash-stat-card absent">
          <div className="dash-stat-top">
            <div className="dash-stat-icon-wrap absent">
              <UserX size={18} />
            </div>
            <span className="dash-stat-pill absent">
              <span className="dash-stat-dot"></span>
              ABSENT
            </span>
          </div>
          <div className="dash-stat-body">
            <div className="dash-stat-number">{overall.absent}</div>
            <div className="dash-stat-label">Marked Absent</div>
          </div>
          <div className="dash-stat-footer">
            <div className="dash-stat-meter-bar">
              <div
                className="dash-stat-meter-fill absent"
                style={{
                  width: `${
                    overall.total_students > 0
                      ? Math.round((overall.absent / overall.total_students) * 100)
                      : 0
                  }%`
                }}
              ></div>
            </div>
            <span className="dash-stat-caption">
              {overall.total_students > 0
                ? `${Math.round((overall.absent / overall.total_students) * 100)}% of Total`
                : '0%'}
            </span>
          </div>
        </div>

        {/* UNMARKED */}
        <div className="dash-stat-card unmarked">
          <div className="dash-stat-top">
            <div className="dash-stat-icon-wrap unmarked">
              <AlertCircle size={18} />
            </div>
            <span className="dash-stat-pill unmarked">
              <span className="dash-stat-dot"></span>
              UNMARKED
            </span>
          </div>
          <div className="dash-stat-body">
            <div className="dash-stat-number">{overall.unmarked}</div>
            <div className="dash-stat-label">Pending Review</div>
          </div>
          <div className="dash-stat-footer">
            <div className="dash-stat-meter-bar">
              <div
                className="dash-stat-meter-fill unmarked"
                style={{
                  width: `${
                    overall.total_students > 0
                      ? Math.round((overall.unmarked / overall.total_students) * 100)
                      : 0
                  }%`
                }}
              ></div>
            </div>
            <span className="dash-stat-caption">
              {overall.unmarked === 0 ? 'All Cleared' : 'Awaiting Mark'}
            </span>
          </div>
        </div>
      </div>

      {/* Coordinator Real-time Status Card */}
      <CoordinatorStatusBar />

      {/* Bus Stops Status List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="section-label">BUS STOPS PROGRESS</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Tap stop to view/mark students
          </span>
        </div>

        {stops.length === 0 ? (
          <div className="dash-empty-state-card">
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
              Bus Number 7 is Ready for Student Data
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.4 }}>
              No student roster or bus stops uploaded yet for BUS 16. Upload your Excel (.xlsx) or CSV file via the <strong>Import Excel / CSV</strong> tab to automatically group students by stopping into Boys and Girls.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stops.map((stop) => {
              const isCompleted = stop.completion_status === 'COMPLETED';
              const isInProgress = stop.completion_status === 'IN_PROGRESS';

              return (
                <div
                  key={stop.stop_id}
                  onClick={() => onSelectStop && onSelectStop(stop.stop_id)}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background-color var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stop.stop_name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {stop.pickup_time}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Total: <strong>{stop.total_students}</strong> &bull; Boys: {stop.boys_count} &bull; Girls: {stop.girls_count}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                      <span style={{ color: 'var(--status-present)' }}>Present: {stop.present_count}</span>
                      <span style={{ color: 'var(--status-absent)' }}>Absent: {stop.absent_count}</span>
                      <span>Unmarked: {stop.unmarked_count}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        textTransform: 'uppercase',
                        backgroundColor: isCompleted
                          ? 'var(--status-present-bg)'
                          : isInProgress
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'var(--status-unmarked-bg)',
                        color: isCompleted
                          ? 'var(--status-present)'
                          : isInProgress
                          ? '#f59e0b'
                          : 'var(--text-secondary)',
                        border: `1px solid ${
                          isCompleted
                            ? 'var(--status-present-border)'
                            : isInProgress
                            ? '#f59e0b'
                            : 'var(--border-color)'
                        }`
                      }}
                    >
                      {stop.completion_status}
                    </span>
                    <ArrowRight size={14} color="var(--text-muted)" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Faculty Attendance Summary */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <GraduationCap size={20} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              FACULTY ATTENDANCE
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Total Assigned: {faculty.total} &bull; Present: <strong style={{ color: 'var(--status-present)' }}>{faculty.present}</strong> &bull; Absent: <strong style={{ color: 'var(--status-absent)' }}>{faculty.absent}</strong>
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)'
          }}
        >
          SEPARATE
        </span>
      </div>

      {/* Recent Attendance Activity Stream */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span className="section-label">LATEST ATTENDANCE ACTIVITY</span>
        {recentActivity.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>
            No recent attendance activity recorded yet today.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recentActivity.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px'
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.student_name}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({item.register_number})</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {item.stop_name} &bull; Marked by {item.marked_by_name || item.marked_by_user_id}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    className={`student-status-badge ${item.status.toLowerCase()}`}
                    style={{ padding: '2px 6px', fontSize: '10px' }}
                  >
                    {item.status}
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{item.marked_at}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

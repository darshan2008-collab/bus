import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import DateRibbon from '../components/attendance/DateRibbon';
import {
  GraduationCap,
  Check,
  X,
  Clock,
  Calendar,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Upload,
  Search,
  Award,
  ShieldCheck
} from 'lucide-react';

export default function FacultyPage({ onNavigateToImport }) {
  const { selectedBusId, activeSession = 'MORNING' } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [viewMode, setViewMode] = useState('DAILY'); // 'DAILY' | 'MONTHLY'
  const [selectedDate, setSelectedDate] = useState(today);
  const [dailyData, setDailyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Daily
  const fetchDaily = async (date) => {
    setLoading(true);
    try {
      const data = await apiRequest(`/faculty/daily?busId=${selectedBusId}&date=${date}`);
      setDailyData(data);
    } catch (err) {
      console.warn('Could not load daily faculty attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Monthly
  const fetchMonthly = async (month) => {
    setLoading(true);
    try {
      const data = await apiRequest(`/faculty/monthly?busId=${selectedBusId}&month=${month}`);
      setMonthlyData(data);
    } catch (err) {
      console.warn('Could not load monthly faculty attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'DAILY') {
      fetchDaily(selectedDate);
    } else {
      fetchMonthly(selectedDate.substring(0, 7));
    }
  }, [viewMode, selectedDate, selectedBusId]);

  const handleMarkFaculty = async (facultyId, newStatus, sessionToMark) => {
    const targetSession = sessionToMark || activeSession || 'MORNING';
    try {
      await apiRequest('/faculty/mark', {
        method: 'POST',
        body: JSON.stringify({
          faculty_id: facultyId,
          bus_id: selectedBusId,
          attendance_date: selectedDate,
          session: targetSession,
          status: newStatus
        })
      });
      fetchDaily(selectedDate);
    } catch (err) {
      alert('Failed to mark faculty attendance: ' + err.message);
    }
  };

  const allDailyRecords = dailyData?.records || [];
  const dailyCounts = dailyData?.counts || { total: 0, present: 0, absent: 0, unmarked: 0 };
  const monthlyRecords = monthlyData?.records || [];
  const facultyCoordinator = allDailyRecords.find((fac) => fac.is_coordinator === 1) || monthlyRecords.find((fac) => fac.is_coordinator === 1);

  // Filter by search query if any
  const filteredDailyRecords = allDailyRecords.filter((fac) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (fac.name && fac.name.toLowerCase().includes(q)) ||
      (fac.faculty_id && fac.faculty_id.toLowerCase().includes(q)) ||
      (fac.department && fac.department.toLowerCase().includes(q))
    );
  });

  // Calculate live statistics for active session
  const activePresentCount = activeSession === 'MORNING'
    ? (dailyCounts.morning_present ?? dailyCounts.present ?? 0)
    : (dailyCounts.evening_present ?? dailyCounts.present ?? 0);

  const activeAbsentCount = activeSession === 'MORNING'
    ? (dailyCounts.morning_absent ?? dailyCounts.absent ?? 0)
    : (dailyCounts.evening_absent ?? dailyCounts.absent ?? 0);

  const activeUnmarkedCount = activeSession === 'MORNING'
    ? (dailyCounts.morning_unmarked ?? dailyCounts.unmarked ?? 0)
    : (dailyCounts.evening_unmarked ?? dailyCounts.unmarked ?? 0);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GraduationCap size={22} color="var(--primary)" />
            <span className="section-label">FACULTY TRANSPORTATION ATTENDANCE</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Faculty Transportation Roster
          </h2>
        </div>

        {onNavigateToImport && (
          <button
            type="button"
            onClick={onNavigateToImport}
            className="btn-primary"
            style={{ width: 'auto', padding: '8px 14px', fontSize: '12.5px' }}
            title="Import faculty from Word Document (.docx/.doc) or Excel"
          >
            <Upload size={15} />
            <span>Upload Faculty (.docx / .xlsx)</span>
          </button>
        )}
      </div>

      {/* Mode Switcher: Daily vs Monthly */}
      <div className="tab-segment-group">
        <button
          type="button"
          onClick={() => setViewMode('DAILY')}
          className={`tab-segment-btn ${viewMode === 'DAILY' ? 'active' : ''}`}
        >
          <span>Daily Faculty Register</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('MONTHLY')}
          className={`tab-segment-btn ${viewMode === 'MONTHLY' ? 'active' : ''}`}
        >
          <span>Monthly Faculty Summary</span>
        </button>
      </div>

      {viewMode === 'DAILY' ? (
        <>
          {/* Date Ribbon */}
          <DateRibbon selectedDate={selectedDate} onSelectDate={setSelectedDate} />

          {/* Live Attendance Counter Bar */}
          <div className="sticky-counter-bar">
            <div className="counter-stop-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="counter-stop-name">
                  FACULTY ATTENDANCE REGISTER
                </span>
                <span className={`session-badge-pill ${activeSession.toLowerCase()}`} style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '99px',
                  letterSpacing: '0.04em',
                  background: activeSession === 'MORNING' ? 'rgba(234, 88, 12, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: activeSession === 'MORNING' ? '#ea580c' : '#3b82f6',
                  border: `1px solid ${activeSession === 'MORNING' ? 'rgba(234, 88, 12, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                }}>
                  {activeSession === 'MORNING' ? 'MORNING (M)' : 'EVENING (E)'}
                </span>
              </div>
              <span className="counter-stop-sub">
                {dailyCounts.total} Registered Faculty Members &bull; BUS 16
              </span>
            </div>

            <div className="counter-stat-group">
              <div className="counter-badge present">
                <span className="counter-badge-label">PRES</span>
                <span className="counter-badge-val">{activePresentCount}</span>
              </div>
              <div className="counter-badge absent">
                <span className="counter-badge-label">ABS</span>
                <span className="counter-badge-val">{activeAbsentCount}</span>
              </div>
              <div className="counter-badge unmarked">
                <span className="counter-badge-label">UNMK</span>
                <span className="counter-badge-val">{activeUnmarkedCount}</span>
              </div>
            </div>
          </div>

          {/* Faculty Coordinator Highlight Card */}
          {facultyCoordinator && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '12px 16px',
                backgroundColor: 'rgba(217, 119, 6, 0.08)',
                border: '1.5px solid rgba(217, 119, 6, 0.25)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={20} color="#b45309" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    BUS 16 FACULTY COORDINATOR
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {facultyCoordinator.name}{' '}
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      ({facultyCoordinator.department})
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11.5px', backgroundColor: 'var(--bg-app)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  {facultyCoordinator.faculty_id}
                </span>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#b45309', backgroundColor: '#fef3c7', padding: '3px 8px', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  ★ IN-CHARGE
                </span>
              </div>
            </div>
          )}

          {/* Search bar */}
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
              placeholder="Search faculty by name, ID or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 34px 10px 38px',
                fontSize: '13px'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Attendance Register Table Layout */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Loading faculty attendance register...
            </div>
          ) : allDailyRecords.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 16px',
                backgroundColor: 'var(--bg-surface)',
                border: '1.5px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <GraduationCap size={36} color="var(--primary)" style={{ opacity: 0.7 }} />
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                No Faculty Members Enrolled Yet
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.5 }}>
                Upload your Faculty Word Document (<code>.docx</code> / <code>.doc</code>) or Excel spreadsheet to register faculty members for transport attendance.
              </div>
              {onNavigateToImport && (
                <button
                  type="button"
                  onClick={onNavigateToImport}
                  className="btn-primary"
                  style={{ width: 'auto', marginTop: '6px', padding: '9px 18px', fontSize: '13px' }}
                >
                  <Upload size={16} />
                  <span>Upload Faculty Word Document</span>
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {/* Table Section Heading Banner (matches student stop banner in Image 2) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-app)',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GraduationCap size={16} color="var(--primary)" />
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase'
                    }}
                  >
                    FACULTY ATTENDANCE REGISTER
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-surface)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {filteredDailyRecords.length} Faculty Members
                </span>
              </div>

              {/* Exact Table Layout Matching Image 2 */}
              <div className="table-responsive" style={{ margin: 0 }}>
                <table className="app-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
                      <th style={{ width: '45px', textAlign: 'center' }}>S.No</th>
                      <th style={{ minWidth: '175px', whiteSpace: 'nowrap' }}>Staff ID</th>
                      <th>Faculty Name</th>
                      <th>Department / College</th>
                      <th>Phone</th>
                      <th
                        style={{
                          width: '130px',
                          textAlign: 'center',
                          backgroundColor:
                            activeSession === 'MORNING'
                              ? 'rgba(234, 88, 12, 0.06)'
                              : 'transparent'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: activeSession === 'MORNING' ? '#ea580c' : 'inherit' }}>
                            Morning (M)
                          </span>
                          {activeSession === 'MORNING' && (
                            <span style={{ fontSize: '9.5px', color: '#ea580c', fontWeight: 700 }}>ACTIVE</span>
                          )}
                        </div>
                      </th>
                      <th
                        style={{
                          width: '130px',
                          textAlign: 'center',
                          backgroundColor:
                            activeSession === 'EVENING'
                              ? 'rgba(59, 130, 246, 0.06)'
                              : 'transparent'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: activeSession === 'EVENING' ? '#3b82f6' : 'inherit' }}>
                            Evening (E)
                          </span>
                          {activeSession === 'EVENING' && (
                            <span style={{ fontSize: '9.5px', color: '#3b82f6', fontWeight: 700 }}>ACTIVE</span>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDailyRecords.map((fac, idx) => {
                      const isMorningPresent = fac.morning_status === 'PRESENT';
                      const isMorningAbsent = fac.morning_status === 'ABSENT';
                      const isEveningPresent = fac.evening_status === 'PRESENT';
                      const isEveningAbsent = fac.evening_status === 'ABSENT';

                      return (
                        <tr key={fac.id} className="register-row">
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11.5px', fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {fac.faculty_id}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span>{fac.name}</span>
                              {fac.is_coordinator === 1 && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    color: '#92400e',
                                    backgroundColor: '#fef3c7',
                                    border: '1px solid #fcd34d',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    letterSpacing: '0.03em',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title="Bus 16 Faculty Coordinator"
                                >
                                  ★ FACULTY COORDINATOR
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                backgroundColor: 'var(--bg-app)',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                display: 'inline-block'
                              }}
                            >
                              {fac.department}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {fac.phone || '—'}
                          </td>

                          {/* Morning Toggle Buttons [ ✓ P ] [ ✕ A ] */}
                          <td
                            style={{
                              textAlign: 'center',
                              backgroundColor:
                                activeSession === 'MORNING'
                                  ? 'rgba(234, 88, 12, 0.03)'
                                  : 'transparent'
                            }}
                          >
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => handleMarkFaculty(fac.id, isMorningPresent ? 'UNMARKED' : 'PRESENT', 'MORNING')}
                                className={`reg-btn p ${isMorningPresent ? 'active' : ''}`}
                                title={`Mark ${fac.name} Morning Present`}
                                aria-label={`Mark ${fac.name} Morning Present`}
                              >
                                <Check size={13} strokeWidth={2.8} />
                                <span>P</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkFaculty(fac.id, isMorningAbsent ? 'UNMARKED' : 'ABSENT', 'MORNING')}
                                className={`reg-btn a ${isMorningAbsent ? 'active' : ''}`}
                                title={`Mark ${fac.name} Morning Absent`}
                                aria-label={`Mark ${fac.name} Morning Absent`}
                              >
                                <X size={13} strokeWidth={2.8} />
                                <span>A</span>
                              </button>
                            </div>
                          </td>

                          {/* Evening Toggle Buttons [ ✓ P ] [ ✕ A ] */}
                          <td
                            style={{
                              textAlign: 'center',
                              backgroundColor:
                                activeSession === 'EVENING'
                                  ? 'rgba(59, 130, 246, 0.03)'
                                  : 'transparent'
                            }}
                          >
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => handleMarkFaculty(fac.id, isEveningPresent ? 'UNMARKED' : 'PRESENT', 'EVENING')}
                                className={`reg-btn p ${isEveningPresent ? 'active' : ''}`}
                                title={`Mark ${fac.name} Evening Present`}
                                aria-label={`Mark ${fac.name} Evening Present`}
                              >
                                <Check size={13} strokeWidth={2.8} />
                                <span>P</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkFaculty(fac.id, isEveningAbsent ? 'UNMARKED' : 'ABSENT', 'EVENING')}
                                className={`reg-btn a ${isEveningAbsent ? 'active' : ''}`}
                                title={`Mark ${fac.name} Evening Absent`}
                                aria-label={`Mark ${fac.name} Evening Absent`}
                              >
                                <X size={13} strokeWidth={2.8} />
                                <span>A</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Monthly Table */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Monthly Summary for <strong>{selectedDate.substring(0, 7)}</strong> &bull; BUS 16
          </div>

          <div className="table-responsive">
            <table className="app-table">
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>S.No</th>
                  <th style={{ minWidth: '175px', whiteSpace: 'nowrap' }}>Staff ID</th>
                  <th>Faculty Name</th>
                  <th>Department</th>
                  <th>Recorded Days</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRecords.map((fac, idx) => (
                  <tr key={fac.id}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fac.faculty_id}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{fac.name}</span>
                        {fac.is_coordinator === 1 && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '10px',
                              fontWeight: 800,
                              color: '#92400e',
                              backgroundColor: '#fef3c7',
                              border: '1px solid #fcd34d',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              letterSpacing: '0.03em',
                              whiteSpace: 'nowrap'
                            }}
                            title="Bus 16 Faculty Coordinator"
                          >
                            ★ FACULTY COORDINATOR
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                        {fac.department}
                      </span>
                    </td>
                    <td>{fac.total_days}</td>
                    <td style={{ color: 'var(--status-present)', fontWeight: 700 }}>{fac.present_days}</td>
                    <td style={{ color: 'var(--status-absent)', fontWeight: 700 }}>{fac.absent_days}</td>
                    <td>
                      <strong>{fac.attendance_pct}%</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

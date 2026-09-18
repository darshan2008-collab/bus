import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import DateRibbon from '../components/attendance/DateRibbon';
import {
  FileBarChart,
  Download,
  Printer,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Clock,
  Sparkles,
  Search
} from 'lucide-react';

export default function ReportsPage() {
  const { selectedBusId, user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  // Report types: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  const [reportType, setReportType] = useState('DAILY');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.substring(0, 7));

  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Daily roster filters
  const [dailySearchQuery, setDailySearchQuery] = useState('');
  const [dailyStopFilter, setDailyStopFilter] = useState('ALL');

  // Fetch Daily Report
  const fetchDaily = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/reports/daily?busId=${selectedBusId}&date=${selectedDate}`);
      setDailyData(data);
    } catch (err) {
      console.warn('Error fetching daily report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Weekly Report
  const fetchWeekly = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/reports/weekly?busId=${selectedBusId}&startDate=${selectedDate}`);
      setWeeklyData(data);
    } catch (err) {
      console.warn('Error fetching weekly report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Monthly Report
  const fetchMonthly = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/reports/monthly?busId=${selectedBusId}&month=${selectedMonth}`);
      setMonthlyData(data);
    } catch (err) {
      console.warn('Error fetching monthly report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportType === 'DAILY') {
      fetchDaily();
    } else if (reportType === 'WEEKLY') {
      fetchWeekly();
    } else {
      fetchMonthly();
    }
  }, [reportType, selectedDate, selectedMonth, selectedBusId]);

  // Export Daily Excel
  const handleExportDailyExcel = async () => {
    try {
      const blob = await apiRequest(`/reports/export/daily-excel?busId=${selectedBusId}&date=${selectedDate}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Daily_Report_BUS07_${selectedDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export Excel: ' + err.message);
    }
  };

  // Export Weekly Excel
  const handleExportWeeklyExcel = async () => {
    try {
      const blob = await apiRequest(`/reports/export/weekly-excel?busId=${selectedBusId}&startDate=${selectedDate}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Weekly_Report_BUS07_${weeklyData?.startDate || selectedDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export Weekly Excel: ' + err.message);
    }
  };

  // Export Monthly Excel
  const handleExportMonthlyExcel = async () => {
    try {
      const blob = await apiRequest(`/reports/export/monthly-excel?busId=${selectedBusId}&month=${selectedMonth}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Monthly_Report_BUS07_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export Monthly Excel: ' + err.message);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const dailyOverall = dailyData?.overall || { total_students: 0, boys: 0, girls: 0, present: 0, absent: 0, unmarked: 0, attendance_percentage: 0 };
  const dailyStops = dailyData?.stops || [];
  const coordinatorActivity = dailyData?.coordinator_activity || [];

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileBarChart size={22} color="var(--primary)" />
          <span className="section-label">ATTENDANCE ANALYTICS & EXCEL EXPORTS</span>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          BUS 16 Attendance Reports
        </h2>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Downloadable Excel sheets available for Coordinators, Faculty, and Admin.
        </div>
      </div>

      {/* Report Type 3-Way Tabs */}
      <div className="tab-segment-group" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <button
          type="button"
          onClick={() => setReportType('DAILY')}
          className={`tab-segment-btn ${reportType === 'DAILY' ? 'active' : ''}`}
        >
          <span>Daily Report</span>
        </button>
        <button
          type="button"
          onClick={() => setReportType('WEEKLY')}
          className={`tab-segment-btn ${reportType === 'WEEKLY' ? 'active' : ''}`}
        >
          <span>Weekly Report</span>
        </button>
        <button
          type="button"
          onClick={() => setReportType('MONTHLY')}
          className={`tab-segment-btn ${reportType === 'MONTHLY' ? 'active' : ''}`}
        >
          <span>Monthly Report</span>
        </button>
      </div>

      {/* Date controls & Export Action Buttons */}
      <div className="reports-action-row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        {reportType === 'DAILY' && (
          <div style={{ flex: 1, minWidth: '240px' }}>
            <DateRibbon selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </div>
        )}

        {reportType === 'WEEKLY' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              WEEK STARTING:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '13px' }}
            />
          </div>
        )}

        {reportType === 'MONTHLY' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              SELECT MONTH:
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '13px' }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="reports-action-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={
              reportType === 'DAILY'
                ? handleExportDailyExcel
                : reportType === 'WEEKLY'
                ? handleExportWeeklyExcel
                : handleExportMonthlyExcel
            }
            className="btn-primary"
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              minHeight: 'auto',
              width: 'auto',
              backgroundColor: '#16a34a',
              borderColor: '#15803d'
            }}
          >
            <FileSpreadsheet size={16} />
            <span>Download Excel Sheet</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '12px', minHeight: 'auto' }}
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 1. DAILY REPORT */}
      {reportType === 'DAILY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Dual-Session Overall Attendance Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {/* Morning Session Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span className="section-label" style={{ color: '#ea580c' }}>MORNING SESSION (M)</span>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0' }}>
                    Boarding to College
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>RATE</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#ea580c' }}>
                    {dailyOverall.morning?.attendance_percentage ?? dailyOverall.attendance_percentage}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <div style={{ backgroundColor: 'var(--status-present-bg)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-present-border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--status-present)', fontWeight: 700 }}>PRESENT</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--status-present)' }}>{dailyOverall.morning?.present ?? dailyOverall.present}</div>
                </div>
                <div style={{ backgroundColor: 'var(--status-absent-bg)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-absent-border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--status-absent)', fontWeight: 700 }}>ABSENT</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--status-absent)' }}>{dailyOverall.morning?.absent ?? dailyOverall.absent}</div>
                </div>
                <div style={{ backgroundColor: 'var(--status-unmarked-bg)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-unmarked-border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700 }}>UNMARKED</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>{dailyOverall.morning?.unmarked ?? dailyOverall.unmarked}</div>
                </div>
              </div>
            </div>

            {/* Evening Session Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span className="section-label" style={{ color: '#3b82f6' }}>EVENING SESSION (E)</span>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0' }}>
                    Return Boarding Home
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>RATE</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6' }}>
                    {dailyOverall.evening?.attendance_percentage ?? 0}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <div style={{ backgroundColor: 'var(--status-present-bg)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-present-border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--status-present)', fontWeight: 700 }}>PRESENT</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--status-present)' }}>{dailyOverall.evening?.present ?? 0}</div>
                </div>
                <div style={{ backgroundColor: 'var(--status-absent-bg)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-absent-border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--status-absent)', fontWeight: 700 }}>ABSENT</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--status-absent)' }}>{dailyOverall.evening?.absent ?? 0}</div>
                </div>
                <div style={{ backgroundColor: 'var(--status-unmarked-bg)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-unmarked-border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700 }}>UNMARKED</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-secondary)' }}>{dailyOverall.evening?.unmarked ?? 0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* STOP-WISE REPORT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="section-label">STOP-WISE DUAL-SESSION BREAKDOWN</span>
            {dailyStops.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '13px' }}>
                No stops or attendance records recorded for this date yet. Upload your roster via Import Excel / CSV to begin.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Bus Stop</th>
                      <th>Total</th>
                      <th>Boys</th>
                      <th>Girls</th>
                      <th style={{ textAlign: 'center' }}>Morning Pres</th>
                      <th style={{ textAlign: 'center' }}>Morning Abs</th>
                      <th style={{ textAlign: 'center' }}>Evening Pres</th>
                      <th style={{ textAlign: 'center' }}>Evening Abs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyStops.map((stop) => (
                      <tr key={stop.stop_id}>
                        <td style={{ fontWeight: 700 }}>{stop.stop_name}</td>
                        <td>{stop.total_students}</td>
                        <td>{stop.boys_count}</td>
                        <td>{stop.girls_count}</td>
                        <td style={{ textAlign: 'center', color: 'var(--status-present)', fontWeight: 700 }}>
                          {stop.morning_present ?? stop.present_count ?? 0}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--status-absent)', fontWeight: 700 }}>
                          {stop.morning_absent ?? stop.absent_count ?? 0}
                        </td>
                        <td style={{ textAlign: 'center', color: '#3b82f6', fontWeight: 700 }}>
                          {stop.evening_present ?? 0}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--status-absent)', fontWeight: 700 }}>
                          {stop.evening_absent ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* OFFICIAL COLLEGE ROSTER (Side-by-Side M & E register format) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span className="section-label">OFFICIAL BOARDING REGISTER (M &amp; E)</span>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Matches college paper format: Boarding Point &bull; Name &bull; AD.No &bull; College/DPT &bull; Year &bull; M &bull; E
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search name, AD.No..."
                    value={dailySearchQuery}
                    onChange={(e) => setDailySearchQuery(e.target.value)}
                    style={{ padding: '6px 10px 6px 30px', fontSize: '12px', width: '180px' }}
                  />
                </div>
                <select
                  value={dailyStopFilter}
                  onChange={(e) => setDailyStopFilter(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: 'var(--radius-sm)' }}
                >
                  <option value="ALL">All Stops</option>
                  {dailyStops.map(s => (
                    <option key={s.stop_id} value={s.stop_name}>{s.stop_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {(!dailyData?.students_unified || dailyData.students_unified.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '13px' }}>
                No students enrolled or attendance records found for this date.
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '480px', overflowY: 'auto' }}>
                <table className="app-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>S.No</th>
                      <th>Boarding Point</th>
                      <th>Student Name</th>
                      <th>AD.No</th>
                      <th>College/DPT</th>
                      <th>Year</th>
                      <th style={{ textAlign: 'center', width: '70px' }}>M</th>
                      <th style={{ textAlign: 'center', width: '70px' }}>E</th>
                      <th style={{ textAlign: 'center' }}>Daily Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dailyData.students_unified || [])
                      .filter((stu) => {
                        if (dailyStopFilter !== 'ALL' && stu.stop_name !== dailyStopFilter) return false;
                        if (dailySearchQuery.trim()) {
                          const q = dailySearchQuery.toLowerCase().trim();
                          return (
                            stu.name.toLowerCase().includes(q) ||
                            (stu.register_number && stu.register_number.toLowerCase().includes(q)) ||
                            (stu.department && stu.department.toLowerCase().includes(q))
                          );
                        }
                        return true;
                      })
                      .map((stu, idx) => {
                        const mStatus = stu.morning_status || 'UNMARKED';
                        const eStatus = stu.evening_status || 'UNMARKED';
                        const dailyStatus = stu.daily_status || 'UNMARKED';

                        return (
                          <tr key={stu.id || idx}>
                            <td style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ fontWeight: 600 }}>{stu.stop_name}</td>
                            <td style={{ fontWeight: 700 }}>{stu.name}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{stu.register_number}</td>
                            <td>
                              <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                                {stu.department || '-'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>{stu.year_of_study || '-'}</td>
                            {/* Morning Pill */}
                            <td style={{ textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '24px',
                                  height: '24px',
                                  lineHeight: '24px',
                                  borderRadius: '50%',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  backgroundColor:
                                    mStatus === 'PRESENT'
                                      ? 'var(--status-present-bg)'
                                      : mStatus === 'ABSENT'
                                      ? 'var(--status-absent-bg)'
                                      : 'var(--bg-subtle)',
                                  color:
                                    mStatus === 'PRESENT'
                                      ? 'var(--status-present)'
                                      : mStatus === 'ABSENT'
                                      ? 'var(--status-absent)'
                                      : 'var(--text-muted)'
                                }}
                              >
                                {mStatus === 'PRESENT' ? 'P' : mStatus === 'ABSENT' ? 'A' : '-'}
                              </span>
                            </td>
                            {/* Evening Pill */}
                            <td style={{ textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '24px',
                                  height: '24px',
                                  lineHeight: '24px',
                                  borderRadius: '50%',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  backgroundColor:
                                    eStatus === 'PRESENT'
                                      ? 'rgba(59, 130, 246, 0.15)'
                                      : eStatus === 'ABSENT'
                                      ? 'var(--status-absent-bg)'
                                      : 'var(--bg-subtle)',
                                  color:
                                    eStatus === 'PRESENT'
                                      ? '#3b82f6'
                                      : eStatus === 'ABSENT'
                                      ? 'var(--status-absent)'
                                      : 'var(--text-muted)'
                                }}
                              >
                                {eStatus === 'PRESENT' ? 'P' : eStatus === 'ABSENT' ? 'A' : '-'}
                              </span>
                            </td>
                            {/* Daily Combined Badge */}
                            <td style={{ textAlign: 'center' }}>
                              <span
                                className={`student-status-badge ${
                                  dailyStatus === 'FULL_DAY'
                                    ? 'present'
                                    : dailyStatus.startsWith('HALF')
                                    ? 'unmarked'
                                    : dailyStatus === 'ABSENT'
                                    ? 'absent'
                                    : 'unmarked'
                                }`}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '10px',
                                  letterSpacing: '0.03em',
                                  backgroundColor:
                                    dailyStatus === 'FULL_DAY'
                                      ? 'var(--status-present-bg)'
                                      : dailyStatus.startsWith('HALF')
                                      ? 'rgba(234, 179, 8, 0.15)'
                                      : dailyStatus === 'ABSENT'
                                      ? 'var(--status-absent-bg)'
                                      : 'var(--bg-subtle)',
                                  color:
                                    dailyStatus === 'FULL_DAY'
                                      ? 'var(--status-present)'
                                      : dailyStatus.startsWith('HALF')
                                      ? '#ca8a04'
                                      : dailyStatus === 'ABSENT'
                                      ? 'var(--status-absent)'
                                      : 'var(--text-muted)'
                                }}
                              >
                                {dailyStatus.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. WEEKLY REPORT */}
      {reportType === 'WEEKLY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="section-label">WEEKLY ATTENDANCE ROSTER</span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                   {weeklyData?.startDate} to {weeklyData?.endDate} &bull; BUS 16
                </h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>WEEKLY ATTENDANCE</span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>
                  {weeklyData?.overall_percentage || 0}%
                </div>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Total Students Tracked: <strong>{weeklyData?.total_students || 0}</strong>
            </div>
          </div>

          <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="app-table">
              <thead>
                <tr>
                  <th>Reg No</th>
                  <th>Student Name</th>
                  <th>Stop</th>
                  {(weeklyData?.weekDates || []).map((d) => (
                    <th key={d} style={{ textAlign: 'center' }}>
                      {d.substring(5)}
                    </th>
                  ))}
                  <th style={{ textAlign: 'center' }}>Pres</th>
                  <th style={{ textAlign: 'center' }}>Abs</th>
                  <th style={{ textAlign: 'center' }}>Att %</th>
                </tr>
              </thead>
              <tbody>
                {(weeklyData?.students || []).length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No students enrolled on BUS 16 yet. Use the Import page to upload students.
                    </td>
                  </tr>
                ) : (
                  (weeklyData?.students || []).map((stu) => (
                    <tr key={stu.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{stu.register_number}</td>
                      <td style={{ fontWeight: 600 }}>{stu.name}</td>
                      <td>{stu.stop_name}</td>
                      {(weeklyData?.weekDates || []).map((d) => {
                        const st = stu.days ? stu.days[d] : 'UNMARKED';
                        return (
                          <td key={d} style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: '22px',
                                height: '22px',
                                lineHeight: '22px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor:
                                  st === 'PRESENT'
                                    ? 'var(--status-present-bg)'
                                    : st === 'ABSENT'
                                    ? 'var(--status-absent-bg)'
                                    : 'var(--bg-subtle)',
                                color:
                                  st === 'PRESENT'
                                    ? 'var(--status-present)'
                                    : st === 'ABSENT'
                                    ? 'var(--status-absent)'
                                    : 'var(--text-muted)'
                              }}
                            >
                              {st === 'PRESENT' ? 'P' : st === 'ABSENT' ? 'A' : '-'}
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--status-present)' }}>
                        {stu.present_days}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--status-absent)' }}>
                        {stu.absent_days}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {stu.attendance_percentage}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. MONTHLY REPORT */}
      {reportType === 'MONTHLY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="section-label">MONTHLY TRANSPORT REPORT</span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                   {monthlyData?.month || selectedMonth} &bull; BUS 16
                </h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>AVG ATTENDANCE</span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>
                  {monthlyData?.average_attendance || 0}%
                </div>
              </div>
            </div>

            <div className="stop-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div style={{ backgroundColor: 'var(--bg-app)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>DAYS RECORDED</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{monthlyData?.total_days || 0}</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-app)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL ENROLLED</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{monthlyData?.total_students || 0}</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-app)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL STOPS</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{monthlyData?.stops?.length || 0}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="section-label">STUDENT MONTHLY ATTENDANCE</span>
            <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Reg No</th>
                    <th>Student Name</th>
                    <th>Bus Stop</th>
                    <th>Present Days</th>
                    <th>Absent Days</th>
                    <th>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlyData?.students || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No records for this month yet.
                      </td>
                    </tr>
                  ) : (
                    (monthlyData?.students || []).map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.register_number}</td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td>{s.stop_name}</td>
                        <td style={{ color: 'var(--status-present)', fontWeight: 700 }}>{s.present_days}</td>
                        <td style={{ color: 'var(--status-absent)', fontWeight: 700 }}>{s.absent_days}</td>
                        <td>
                          <strong
                            style={{
                              color: s.attendance_percentage >= 75 ? 'var(--status-present)' : 'var(--status-absent)'
                            }}
                          >
                            {s.attendance_percentage}%
                          </strong>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

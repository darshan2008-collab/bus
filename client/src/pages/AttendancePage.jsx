import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { apiRequest } from '../utils/api';
import DateRibbon from '../components/attendance/DateRibbon';
import AttendanceRegisterTable from '../components/attendance/AttendanceRegisterTable';
import SubmitModal from '../components/attendance/SubmitModal';
import {
  Search,
  CheckCircle2,
  X,
  MapPin,
  Layers,
  Send
} from 'lucide-react';

const AttendancePage = forwardRef(function AttendancePage({ defaultStopId }, ref) {
  const { user, selectedBusId, activeSession } = useAuth();
  const { registerListener, markAttendanceLive } = useSync();

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const [stops, setStops] = useState([]);
  const [activeStopId, setActiveStopId] = useState(defaultStopId || 'all');

  // Stop student data
  const [stopDetails, setStopDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Local student attendance map: studentId -> { status, morning_status, evening_status, markedBy, markedAt }
  const [attendanceMap, setAttendanceMap] = useState({});

  // Active gender view tab: 'ALL' | 'BOYS' | 'GIRLS'
  const [genderTab, setGenderTab] = useState('ALL');

  // Search & Status filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PRESENT' | 'ABSENT' | 'UNMARKED'

  // Submit Modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessNotice, setSubmitSuccessNotice] = useState(false);

  // Expose openSubmitModal to App.jsx so the fixed button can live outside the scroll container
  useImperativeHandle(ref, () => ({
    openSubmitModal: () => setIsSubmitModalOpen(true),
    getActiveStopId: () => activeStopId,
  }));

  // 1. Fetch stops for active bus
  useEffect(() => {
    apiRequest(`/buses/${selectedBusId}/stops`)
      .then((res) => {
        if (res && res.stops) {
          setStops(res.stops);
          if (!activeStopId) {
            setActiveStopId('all');
          }
        }
      })
      .catch((err) => console.warn('Could not load stops:', err));
  }, [selectedBusId]);

  const totalBusStudents = useMemo(() => {
    return stops.reduce((acc, s) => acc + (s.total_students || 0), 0);
  }, [stops]);

  // 2. Fetch students & existing attendance for active stop & date & session
  const fetchStopData = async (stopId, date, session = activeSession) => {
    if (!stopId) return;
    setLoading(true);
    try {
      const data = await apiRequest(`/students/by-stop/${stopId}?busId=${selectedBusId}&date=${date}&session=${session}`);
      setStopDetails(data);

      // Populate local attendance map with both morning and evening status
      const map = {};
      if (data.all_students) {
        data.all_students.forEach((stu) => {
          map[stu.id] = {
            status: stu.attendance_status || 'UNMARKED',
            morning_status: stu.morning_status || 'UNMARKED',
            morning_marked_by: stu.morning_marked_by || null,
            morning_marked_at: stu.morning_marked_at || null,
            evening_status: stu.evening_status || 'UNMARKED',
            evening_marked_by: stu.evening_marked_by || null,
            evening_marked_at: stu.evening_marked_at || null,
            markedBy: stu.marked_by_user_id || null,
            markedAt: stu.marked_at || null
          };
        });
      }
      setAttendanceMap(map);
    } catch (err) {
      console.warn('Error fetching stop students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeStopId) {
      fetchStopData(activeStopId, selectedDate, activeSession);
    }
  }, [activeStopId, selectedDate, activeSession]);

  // 3. Real-time WebSocket listener for instant coordinator updates
  useEffect(() => {
    const unregister = registerListener((event) => {
      if (event.type === 'ATTENDANCE_UPDATED') {
        const { student_id, stop_id, attendance_date, status, session, marked_by_name, marked_by_user_id, marked_at } = event.payload;

        // Update if it matches active stop (or if viewing ALL stops) and current date
        if (
          (activeStopId === 'all' || String(stop_id) === String(activeStopId)) &&
          attendance_date === selectedDate
        ) {
          setAttendanceMap((prev) => {
            const cur = prev[student_id] || {};
            const isM = session === 'MORNING';
            return {
              ...prev,
              [student_id]: {
                ...cur,
                morning_status: isM ? status : cur.morning_status,
                evening_status: !isM ? status : cur.evening_status,
                status: session === activeSession ? status : cur.status,
                markedBy: marked_by_name || marked_by_user_id,
                markedAt: marked_at
              }
            };
          });
        }
      } else if (event.type === 'STOP_ATTENDANCE_SUBMITTED') {
        const { stop_id, attendance_date, session } = event.payload;
        if (
          (activeStopId === 'all' || String(stop_id) === String(activeStopId)) &&
          attendance_date === selectedDate
        ) {
          fetchStopData(activeStopId, selectedDate, activeSession);
        }
      }
    });

    return unregister;
  }, [activeStopId, selectedDate, activeSession]);

  // Handle marking action supporting both MORNING and EVENING sessions directly from register
  const handleMarkStudent = (studentId, newStatus, targetSession = activeSession, studentStopId) => {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const targetStopId = studentStopId || (activeStopId !== 'all' ? activeStopId : null);

    // Optimistic local state update
    setAttendanceMap((prev) => {
      const cur = prev[studentId] || {};
      const isM = targetSession === 'MORNING';
      return {
        ...prev,
        [studentId]: {
          ...cur,
          morning_status: isM ? newStatus : cur.morning_status,
          evening_status: !isM ? newStatus : cur.evening_status,
          status: targetSession === activeSession ? newStatus : cur.status,
          markedBy: user?.name || user?.user_id || 'Coordinator',
          markedAt: time
        }
      };
    });

    // Broadcast over WebSocket & persistent DB
    markAttendanceLive({
      student_id: studentId,
      bus_id: selectedBusId,
      stop_id: targetStopId,
      attendance_date: selectedDate,
      session: targetSession,
      status: newStatus
    });
  };

  // Submit attendance session
  const handleSubmitAttendance = async () => {
    setIsSubmitting(true);
    try {
      const recordsToSubmit = Object.keys(attendanceMap).map((sId) => ({
        student_id: parseInt(sId, 10),
        status: attendanceMap[sId].status
      }));

      await apiRequest('/attendance/batch-submit', {
        method: 'POST',
        body: JSON.stringify({
          bus_id: selectedBusId,
          stop_id: activeStopId,
          attendance_date: selectedDate,
          session: activeSession,
          records: recordsToSubmit
        })
      });

      setIsSubmitModalOpen(false);
      setSubmitSuccessNotice(true);
      fetchStopData(activeStopId, selectedDate, activeSession);
      setTimeout(() => setSubmitSuccessNotice(false), 4000);
    } catch (err) {
      alert('Failed to submit attendance: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute live statistics for sticky header
  const liveStats = useMemo(() => {
    const allStu = stopDetails?.all_students || [];
    let present = 0;
    let absent = 0;
    let unmarked = 0;

    allStu.forEach((s) => {
      const status = attendanceMap[s.id]?.status || 'UNMARKED';
      if (status === 'PRESENT') present++;
      else if (status === 'ABSENT') absent++;
      else unmarked++;
    });

    const boysList = allStu.filter((s) => s.gender === 'MALE');
    const girlsList = allStu.filter((s) => s.gender === 'FEMALE');

    return {
      total: allStu.length,
      present,
      absent,
      unmarked,
      boysCount: boysList.length,
      girlsCount: girlsList.length
    };
  }, [stopDetails, attendanceMap]);

  // Filter student lists
  const filteredStudents = useMemo(() => {
    let list = stopDetails?.all_students || [];

    // Gender filter tab
    if (genderTab === 'BOYS') {
      list = list.filter((s) => s.gender === 'MALE');
    } else if (genderTab === 'GIRLS') {
      list = list.filter((s) => s.gender === 'FEMALE');
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      list = list.filter((s) => {
        const current = attendanceMap[s.id]?.status || 'UNMARKED';
        return current === statusFilter;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) || s.register_number.toLowerCase().includes(q)
      );
    }

    return list;
  }, [stopDetails, genderTab, statusFilter, searchQuery, attendanceMap]);

  // Group students by stop for the Stop Header Register Table layout
  const stopGroupedStudents = useMemo(() => {
    const groups = {};
    filteredStudents.forEach((stu) => {
      const sName = stu.stop_name || stopDetails?.stop?.stop_name || 'Designated Stop';
      if (!groups[sName]) groups[sName] = [];
      groups[sName].push(stu);
    });
    return groups;
  }, [filteredStudents, stopDetails]);

  const activeStop = stops.find((s) => s.id === activeStopId);

  return (
    <div className="page-container">
      {/* Date Navigation Ribbon */}
      <DateRibbon selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {/* Stop Selection Horizontal Carousel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="section-label">SELECT BUS STOP</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {stops.length} designated stops
          </span>
        </div>

        <div className="stop-scroller">
          {/* ALL STOPS PILL OPTION */}
          <button
            type="button"
            onClick={() => setActiveStopId('all')}
            className={`stop-card-btn ${activeStopId === 'all' ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Layers size={13} color={activeStopId === 'all' ? 'var(--primary)' : 'var(--text-secondary)'} />
              <span className="stop-card-title" style={{ fontWeight: 800 }}>ALL STOPS</span>
            </div>
            <span className="stop-card-meta">
              {totalBusStudents || liveStats.total} Students &bull; Full Route
            </span>
          </button>

          {stops.map((stop) => {
            const isCurrent = stop.id === activeStopId;
            return (
              <button
                key={stop.id}
                type="button"
                onClick={() => setActiveStopId(stop.id)}
                className={`stop-card-btn ${isCurrent ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} color={isCurrent ? 'var(--primary)' : 'var(--text-secondary)'} />
                  <span className="stop-card-title">{stop.stop_name}</span>
                </div>
                <span className="stop-card-meta">
                  {stop.total_students || 0} Students &bull; {stop.pickup_time || '07:45 AM'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky Stop Counter Bar */}
      <div className="sticky-counter-bar">
        <div className="counter-stop-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="counter-stop-name">
              {activeStopId === 'all' ? 'ALL STOPS (FULL ROUTE)' : (activeStop?.stop_name || 'SELECT STOP')}
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
            {liveStats.total} Students ({liveStats.boysCount} Boys, {liveStats.girlsCount} Girls)
          </span>
        </div>

        <div className="counter-stat-group">
          <div className="counter-badge present">
            <span className="counter-badge-label">PRES</span>
            <span className="counter-badge-val">{liveStats.present}</span>
          </div>
          <div className="counter-badge absent">
            <span className="counter-badge-label">ABS</span>
            <span className="counter-badge-val">{liveStats.absent}</span>
          </div>
          <div className="counter-badge unmarked">
            <span className="counter-badge-label">UNMK</span>
            <span className="counter-badge-val">{liveStats.unmarked}</span>
          </div>
        </div>
      </div>

      {/* Submission Success Alert */}
      {submitSuccessNotice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            backgroundColor: 'var(--status-present-bg)',
            border: '1px solid var(--status-present-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--status-present)',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          <CheckCircle2 size={18} />
          <span>Attendance submitted successfully for {activeStop?.stop_name}.</span>
        </div>
      )}

      {/* Gender Segmented Tabs: ALL / BOYS / GIRLS */}
      <div className="gender-tabs-container">
        <button
          onClick={() => setGenderTab('BOYS')}
          className={`gender-tab-btn ${genderTab === 'BOYS' ? 'active' : ''}`}
        >
          <span>BOYS</span>
          <span className="gender-tab-pill">{liveStats.boysCount}</span>
        </button>

        <button
          onClick={() => setGenderTab('GIRLS')}
          className={`gender-tab-btn ${genderTab === 'GIRLS' ? 'active' : ''}`}
        >
          <span>GIRLS</span>
          <span className="gender-tab-pill">{liveStats.girlsCount}</span>
        </button>
      </div>

      {/* Search & Status Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            placeholder="Search by student name or register no..."
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
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="filter-chips-scroller no-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {['ALL', 'PRESENT', 'ABSENT', 'UNMARKED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.03em',
                backgroundColor: statusFilter === st ? 'var(--primary)' : 'var(--bg-surface)',
                color: statusFilter === st ? '#ffffff' : 'var(--text-secondary)',
                border: `1px solid ${statusFilter === st ? 'var(--primary)' : 'var(--border-color)'}`,
                whiteSpace: 'nowrap'
              }}
            >
              {st}
            </button>
          ))}
          {genderTab !== 'ALL' && (
            <button
              onClick={() => setGenderTab('ALL')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                whiteSpace: 'nowrap'
              }}
            >
              SHOW ALL ({liveStats.total})
            </button>
          )}
        </div>
      </div>

      {/* Attendance Register Table Layout (Stop Headings + Register Rows) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
          Loading attendance register...
        </div>
      ) : (
        <AttendanceRegisterTable
          stopGroups={stopGroupedStudents}
          attendanceMap={attendanceMap}
          onMark={handleMarkStudent}
          activeSession={activeSession}
        />
      )}

      {/* Submit Modal — rendered before the sticky button so button stays last in DOM flow */}
      <SubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleSubmitAttendance}
        stopName={activeStopId === 'all' ? 'All Stops (Full Bus Route)' : (activeStop?.stop_name || 'Selected Stop')}
        busName={`BUS 16`}
        date={selectedDate}
        counts={liveStats}
        loading={isSubmitting}
        isSubmitted={stopDetails?.is_submitted}
        session={stopDetails?.session}
      />

      {/* ── REVIEW & SUBMIT BUTTON ───────────────────────────────────────────
          Static at the very END of the content — scrolls with the page.
          Only visible after the last student card. Never floats/travels.
      ───────────────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '24px 0 16px 0',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button
          type="button"
          onClick={() => setIsSubmitModalOpen(true)}
          className="btn-primary"
          style={{
            width: '100%',
            minHeight: '48px',
            fontWeight: 700,
            fontSize: '14px',
            letterSpacing: '0.02em',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 18px rgba(37,99,235,0.28)'
          }}
        >
          <Send size={17} />
          <span>
            {activeStopId === 'all'
              ? 'REVIEW & SUBMIT ALL STOPS ATTENDANCE'
              : 'REVIEW & SUBMIT STOP ATTENDANCE'}
          </span>
        </button>
      </div>
    </div>
  );
});

export default AttendancePage;

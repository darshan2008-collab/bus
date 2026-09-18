import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import {
  Search,
  Filter,
  Users,
  Eye,
  X,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  MapPin
} from 'lucide-react';

export default function StudentsPage() {
  const { selectedBusId } = useAuth();
  const [students, setStudents] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStopFilter, setSelectedStopFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  // Student Profile History Modal
  const [profileStudent, setProfileStudent] = useState(null);
  const [profileHistory, setProfileHistory] = useState([]);
  const [profileStats, setProfileStats] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    apiRequest(`/buses/${selectedBusId}/stops`).then((res) => {
      if (res && res.stops) setStops(res.stops);
    });
  }, [selectedBusId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let query = `/students?busId=${selectedBusId}`;
      if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;
      if (selectedStopFilter) query += `&stopId=${selectedStopFilter}`;
      if (genderFilter) query += `&gender=${genderFilter}`;

      const res = await apiRequest(query);
      if (res && res.students) {
        setStudents(res.students);
      }
    } catch (err) {
      console.warn('Could not fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedBusId, selectedStopFilter, genderFilter]);

  const handleOpenProfile = async (stu) => {
    setProfileStudent(stu);
    setProfileLoading(true);
    try {
      const data = await apiRequest(`/students/${stu.id}/history`);
      setProfileHistory(data.history || []);
      setProfileStats(data.stats || null);
    } catch (err) {
      console.warn('Could not fetch student history:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="section-label">STUDENT DIRECTORY</span>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Manage & Inspect Students
        </h2>
      </div>

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
            placeholder="Search student name or register no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
            style={{ width: '100%', padding: '10px 12px 10px 38px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <select
            value={selectedStopFilter}
            onChange={(e) => setSelectedStopFilter(e.target.value)}
            style={{ padding: '8px 10px', fontSize: '12px' }}
          >
            <option value="">All Bus Stops</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.stop_name}
              </option>
            ))}
          </select>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            style={{ padding: '8px 10px', fontSize: '12px' }}
          >
            <option value="">All Genders</option>
            <option value="MALE">Boys Only</option>
            <option value="FEMALE">Girls Only</option>
          </select>
        </div>
      </div>

      {/* Students Count & Table */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          TOTAL: {students.length} STUDENTS
        </span>
        <button
          onClick={fetchStudents}
          className="btn-secondary"
          style={{ padding: '4px 10px', fontSize: '11px', minHeight: 'auto' }}
        >
          <span>Refresh List</span>
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="desktop-table-view">
        <div className="table-responsive">
          <table className="app-table">
            <thead>
              <tr>
                <th>Register No</th>
                <th>Student Name</th>
                <th>Gender</th>
                <th>Bus Stop</th>
                <th>Dept</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No students found matching filters.
                  </td>
                </tr>
              ) : (
                students.map((stu) => (
                  <tr key={stu.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{stu.register_number}</td>
                    <td style={{ fontWeight: 600 }}>{stu.name}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: stu.gender === 'MALE' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                          color: stu.gender === 'MALE' ? '#60a5fa' : '#f472b6',
                          fontWeight: 600
                        }}
                      >
                        {stu.gender === 'MALE' ? 'BOY' : 'GIRL'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{stu.stop_name}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {stu.department} - {stu.year}
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenProfile(stu)}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px', minHeight: 'auto' }}
                        title="View Complete History"
                      >
                        <Eye size={13} />
                        <span>History</span>
                      </button>
                    </td>
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
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No students found matching filters.
          </div>
        ) : (
          students.map((stu) => (
            <div
              key={stu.id}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '12px',
                      padding: '2px 7px',
                      backgroundColor: 'var(--bg-app)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {stu.register_number}
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: stu.gender === 'MALE' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(236, 72, 153, 0.12)',
                      color: stu.gender === 'MALE' ? '#2563eb' : '#db2777',
                      fontWeight: 700
                    }}
                  >
                    {stu.gender === 'MALE' ? 'BOY' : 'GIRL'}
                  </span>
                </div>

                <button
                  onClick={() => handleOpenProfile(stu)}
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '11.5px', minHeight: 'auto', gap: '4px' }}
                >
                  <Eye size={13} />
                  <span>History</span>
                </button>
              </div>

              <div>
                <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stu.name}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {stu.department} &bull; Year {stu.year}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                <MapPin size={12} color="var(--primary)" />
                <span>Stop: <strong style={{ color: 'var(--text-secondary)' }}>{stu.stop_name}</strong></span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Complete Student Attendance History Modal */}
      {profileStudent && (
        <div className="modal-overlay" onClick={() => setProfileStudent(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">STUDENT ATTENDANCE PROFILE</span>
              <button onClick={() => setProfileStudent(null)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Profile Overview Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-app)',
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {profileStudent.name.toUpperCase()}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Register Number: <strong style={{ color: 'var(--text-primary)' }}>{profileStudent.register_number}</strong> &bull; {profileStudent.department} - {profileStudent.year}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div>Gender: <strong style={{ color: 'var(--text-primary)' }}>{profileStudent.gender}</strong></div>
                <div>Bus: <strong style={{ color: 'var(--text-primary)' }}>{profileStudent.bus_number}</strong></div>
                <div>Stop: <strong style={{ color: 'var(--text-primary)' }}>{profileStudent.stop_name}</strong></div>
              </div>

              {profileStats && (
                <div
                  style={{
                    marginTop: '6px',
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px'
                  }}
                >
                  <span>Attendance: <strong>{profileStats.attendance_percentage}%</strong></span>
                  <span style={{ color: 'var(--status-present)' }}>Present: {profileStats.present_days} days</span>
                  <span style={{ color: 'var(--status-absent)' }}>Absent: {profileStats.absent_days} days</span>
                </div>
              )}
            </div>

            {/* Complete Date-by-Date Attendance Log */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="section-label">ATTENDANCE HISTORY</span>
              {profileLoading ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                  Loading attendance timeline...
                </div>
              ) : profileHistory.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                  No historical records found for this student.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                  {profileHistory.map((rec) => {
                    const isPres = rec.status === 'PRESENT';
                    return (
                      <div
                        key={rec.id}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-app)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={13} color="var(--text-muted)" />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {rec.attendance_date}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {rec.marked_at} by {rec.marked_by_name || rec.marked_by_user_id}
                          </span>
                          <span
                            className={`student-status-badge ${rec.status.toLowerCase()}`}
                            style={{ padding: '2px 8px', fontSize: '10px' }}
                          >
                            {rec.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button onClick={() => setProfileStudent(null)} className="btn-secondary" style={{ width: '100%' }}>
              <span>Close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

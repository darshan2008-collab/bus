import React from 'react';
import { MapPin, Check, X, Users } from 'lucide-react';

export default function AttendanceRegisterTable({
  stopGroups = {},
  attendanceMap = {},
  onMark,
  activeSession = 'MORNING'
}) {
  const stopNames = Object.keys(stopGroups);

  if (stopNames.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '36px 16px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-muted)'
        }}
      >
        <Users size={32} style={{ margin: '0 auto 10px', color: 'var(--text-muted)' }} />
        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
          No students match current search or filters
        </div>
      </div>
    );
  }

  let globalSerial = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {stopNames.map((stopName) => {
        const students = stopGroups[stopName] || [];
        if (students.length === 0) return null;

        return (
          <div
            key={stopName}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {/* Stop Section Heading Banner */}
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
                <MapPin size={15} color="var(--primary)" />
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: 'var(--text-primary)',
                    textTransform: 'uppercase'
                  }}
                >
                  STOP: {stopName}
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
                {students.length} Students
              </span>
            </div>

            {/* Attendance Register Table */}
            <div className="table-responsive" style={{ margin: 0 }}>
              <table className="app-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <th style={{ width: '45px', textAlign: 'center' }}>S.No</th>
                    <th style={{ width: '100px' }}>AD.No</th>
                    <th>Student Name</th>
                    <th>Department / College</th>
                    <th style={{ width: '55px', textAlign: 'center' }}>Year</th>
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
                  {students.map((stu) => {
                    globalSerial += 1;
                    const rec = attendanceMap[stu.id] || {};
                    const mStatus = rec.morning_status || stu.morning_status || 'UNMARKED';
                    const eStatus = rec.evening_status || stu.evening_status || 'UNMARKED';

                    const isMorningPresent = mStatus === 'PRESENT';
                    const isMorningAbsent = mStatus === 'ABSENT';

                    const isEveningPresent = eStatus === 'PRESENT';
                    const isEveningAbsent = eStatus === 'ABSENT';

                    return (
                      <tr key={stu.id} className="register-row">
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11.5px', fontWeight: 600 }}>
                          {globalSerial}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px' }}>
                          {stu.register_number}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {stu.name}
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
                            {stu.department || 'DSEC'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '12px' }}>
                          {stu.year || 'I'}
                        </td>

                        {/* Morning Toggle Buttons [ P ] [ A ] */}
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
                              onClick={() => onMark(stu.id, isMorningPresent ? 'UNMARKED' : 'PRESENT', 'MORNING', stu.stop_id)}
                              className={`reg-btn p ${isMorningPresent ? 'active' : ''}`}
                              title={`Mark ${stu.name} Morning Present`}
                              aria-label={`Mark ${stu.name} Morning Present`}
                            >
                              <Check size={13} strokeWidth={2.8} />
                              <span>P</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onMark(stu.id, isMorningAbsent ? 'UNMARKED' : 'ABSENT', 'MORNING', stu.stop_id)}
                              className={`reg-btn a ${isMorningAbsent ? 'active' : ''}`}
                              title={`Mark ${stu.name} Morning Absent`}
                              aria-label={`Mark ${stu.name} Morning Absent`}
                            >
                              <X size={13} strokeWidth={2.8} />
                              <span>A</span>
                            </button>
                          </div>
                        </td>

                        {/* Evening Toggle Buttons [ P ] [ A ] */}
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
                              onClick={() => onMark(stu.id, isEveningPresent ? 'UNMARKED' : 'PRESENT', 'EVENING', stu.stop_id)}
                              className={`reg-btn p ${isEveningPresent ? 'active' : ''}`}
                              title={`Mark ${stu.name} Evening Present`}
                              aria-label={`Mark ${stu.name} Evening Present`}
                            >
                              <Check size={13} strokeWidth={2.8} />
                              <span>P</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onMark(stu.id, isEveningAbsent ? 'UNMARKED' : 'ABSENT', 'EVENING', stu.stop_id)}
                              className={`reg-btn a ${isEveningAbsent ? 'active' : ''}`}
                              title={`Mark ${stu.name} Evening Absent`}
                              aria-label={`Mark ${stu.name} Evening Absent`}
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
        );
      })}
    </div>
  );
}

import React from 'react';
import { Check, X, Clock, UserCheck } from 'lucide-react';

export default function StudentAttendanceCard({
  student,
  currentStatus,
  markedBy,
  markedAt,
  onMark
}) {
  const isPresent = currentStatus === 'PRESENT';
  const isAbsent = currentStatus === 'ABSENT';
  const isUnmarked = !currentStatus || currentStatus === 'UNMARKED';

  const cardStatusClass = isPresent
    ? 'marked-present'
    : isAbsent
    ? 'marked-absent'
    : '';

  return (
    <div className={`student-card ${cardStatusClass}`}>
      <div className="student-info-row">
        <div className="student-name-group">
          <span className="student-name">{student.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
            <span className="student-reg">{student.register_number}</span>
            <span className="student-dept-tag">{student.department || 'CSE'} - {student.year || 'II'}</span>
            {student.stop_name && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  backgroundColor: 'rgba(0, 122, 255, 0.08)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  border: '1px solid rgba(0, 122, 255, 0.2)'
                }}
              >
                📍 {student.stop_name}
              </span>
            )}
          </div>
        </div>

        <div>
          {isPresent && <span className="student-status-badge present">PRESENT</span>}
          {isAbsent && <span className="student-status-badge absent">ABSENT</span>}
          {isUnmarked && <span className="student-status-badge unmarked">UNMARKED</span>}
        </div>
      </div>

      {/* Large finger-tap attendance toggle controls */}
      <div className="attendance-actions-row">
        <button
          type="button"
          onClick={() => onMark(student.id, isPresent ? 'UNMARKED' : 'PRESENT')}
          className={`attendance-toggle-btn btn-present ${isPresent ? 'selected' : ''}`}
          aria-label={`Mark ${student.name} Present`}
        >
          <Check size={18} strokeWidth={2.4} />
          <span>PRESENT</span>
        </button>

        <button
          type="button"
          onClick={() => onMark(student.id, isAbsent ? 'UNMARKED' : 'ABSENT')}
          className={`attendance-toggle-btn btn-absent ${isAbsent ? 'selected' : ''}`}
          aria-label={`Mark ${student.name} Absent`}
        >
          <X size={18} strokeWidth={2.4} />
          <span>ABSENT</span>
        </button>
      </div>

      {/* Audit & submission attribution */}
      {markedBy && !isUnmarked && (
        <div className="marked-by-footer">
          <Clock size={11} />
          <span>
            {markedAt ? `${markedAt} by ` : 'Marked by '}
            <strong>{markedBy}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

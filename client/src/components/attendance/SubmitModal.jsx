import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function SubmitModal({
  isOpen,
  onClose,
  onSubmit,
  stopName,
  busName,
  date,
  counts,
  loading,
  isSubmitted,
  session
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="modal-title">
              {isSubmitted ? 'ATTENDANCE SUBMITTED' : 'SUBMIT ATTENDANCE'}
            </span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Header context box */}
          <div
            style={{
              backgroundColor: 'var(--bg-app)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stopName?.toUpperCase()} &bull; {busName}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Date: <strong>{date}</strong>
            </div>
          </div>

          {/* Counts summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <div
              style={{
                backgroundColor: 'var(--bg-app)',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Total Students
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {counts.total}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {counts.boys} Boys &bull; {counts.girls} Girls
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--status-present-bg)',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--status-present-border)'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--status-present)', textTransform: 'uppercase', fontWeight: 700 }}>
                Present
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--status-present)' }}>
                {counts.present}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--status-present)' }}>
                {counts.total > 0 ? `${Math.round((counts.present / counts.total) * 100)}%` : '0%'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--status-absent-bg)',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--status-absent-border)'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--status-absent)', textTransform: 'uppercase', fontWeight: 700 }}>
                Absent
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--status-absent)' }}>
                {counts.absent}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--status-absent)' }}>
                {counts.total > 0 ? `${Math.round((counts.absent / counts.total) * 100)}%` : '0%'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--status-unmarked-bg)',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--status-unmarked-border)'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                Unmarked
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {counts.unmarked}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {counts.unmarked > 0 ? 'Action required' : 'All marked'}
              </div>
            </div>
          </div>

          {/* Unmarked alert warning if any */}
          {counts.unmarked > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid #f59e0b',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: '#f59e0b'
              }}
            >
              <AlertCircle size={16} flexShrink={0} />
              <span>
                {counts.unmarked} student{counts.unmarked > 1 ? 's are' : ' is'} still unmarked. Submitting now will record the current counts.
              </span>
            </div>
          )}

          {isSubmitted && session && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px',
                backgroundColor: 'var(--status-present-bg)',
                border: '1px solid var(--status-present-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: 'var(--status-present)'
              }}
            >
              <CheckCircle2 size={16} flexShrink={0} />
              <span>
                Submitted on {date} at {session.submitted_at} by {session.submitted_by}.
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              <span>Close</span>
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="btn-primary"
              style={{ flex: 2 }}
            >
              <span>{loading ? 'Submitting...' : isSubmitted ? 'Re-Submit Updates' : 'CONFIRM & SUBMIT'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

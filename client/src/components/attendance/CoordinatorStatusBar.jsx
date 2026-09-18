import React from 'react';
import { useSync } from '../../context/SyncContext';
import { UserCheck, Activity } from 'lucide-react';

export default function CoordinatorStatusBar() {
  const { coordinators, syncStatus } = useSync();

  const coord = (coordinators && coordinators.length > 0)
    ? coordinators[0]
    : { user_id: 'coord1_bus07', title: 'Coordinator 1', name: 'Coordinator 1', status: 'OFFLINE', marked_count: 0 };

  const isOnline = coord.status === 'ONLINE';

  return (
    <div className="coordinator-bar-card">
      <div className="coordinator-bar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={14} color="var(--primary)" />
          <span className="section-label">ASSIGNED COORDINATOR</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Bus 07 Handler
        </span>
      </div>

      <div className="coordinator-single-card">
        <div className="coord-avatar-col">
          <div className="coord-avatar">
            <UserCheck size={18} color="var(--primary)" />
          </div>
          <div className="coord-info-text">
            <div className="coord-name-main">{coord.name || 'Coordinator 1'}</div>
            <div className="coord-sub-role">Student Attendance Coordinator</div>
          </div>
        </div>

        <div className="coord-status-col">
          <span className={`coord-status-badge ${isOnline ? 'online' : 'offline'}`}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isOnline ? 'var(--status-present)' : 'var(--text-muted)'
              }}
            />
            {coord.status}
          </span>
          <span className="coord-marked-tag">
            Marked: <strong>{coord.marked_count || 0}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

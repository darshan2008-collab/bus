import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import { Bus, User, LogOut, RefreshCw, Menu } from 'lucide-react';

export default function Header({ onOpenUserModal, onOpenMenu }) {
  const { user, selectedBusId, changeBus, logout, activeSession, toggleSession } = useAuth();
  const [buses, setBuses] = useState([]);

  useEffect(() => {
    apiRequest('/buses')
      .then((res) => {
        if (res && res.buses) setBuses(res.buses);
      })
      .catch((err) => console.warn('Could not load buses:', err.message));
  }, []);

  return (
    <header className="app-header">
      <div className="header-brand">
        <img
          src="/dsu_logo_hd.png?v=4"
          alt="DSU Official Emblem"
          style={{
            width: '32px',
            height: '32px',
            minWidth: '32px',
            minHeight: '32px',
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            objectFit: 'cover',
            clipPath: 'circle(47% at 50% 49%)',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
            flexShrink: 0
          }}
        />
        <div className="header-brand-text">
          <span className="header-title">DSU BUS 16</span>
          <span className="header-subtitle desktop-only">DHANALAKSHMI SRINIVASAN UNIVERSITY</span>
        </div>
      </div>

      <div className="header-actions">
        {/* Active Bus Badge / Selector */}
        <div className="header-bus-badge" title="Bus Number 16">
          <span className="bus-badge-dot"></span>
          <span>BUS 16</span>
        </div>

        {/* Morning (M) / Evening (E) Dual-Session Switcher */}
        <div className="header-session-toggle" title="Attendance Session: Morning (M) or Evening (E)">
          <button
            type="button"
            className={`session-pill-btn ${activeSession === 'MORNING' ? 'active' : ''}`}
            onClick={() => toggleSession('MORNING')}
            aria-label="Morning Session"
          >
            <span className="desktop-only">Morning (M)</span>
            <span className="mobile-only">M</span>
          </button>
          <button
            type="button"
            className={`session-pill-btn ${activeSession === 'EVENING' ? 'active' : ''}`}
            onClick={() => toggleSession('EVENING')}
            aria-label="Evening Session"
          >
            <span className="desktop-only">Evening (E)</span>
            <span className="mobile-only">E</span>
          </button>
        </div>


        {/* User profile button */}
        {user && (
          <button
            onClick={onOpenUserModal}
            className="header-user-btn"
            title={`${user.name} (${user.role}) - Click to switch account`}
            aria-label="User Account"
          >
            <User size={14} />
            <span className="header-user-name">
              {user.name.replace('Coordinator', 'Coord')}
            </span>
          </button>
        )}

        {/* Hamburger menu — mobile only, always at the far right */}
        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            className="mobile-only"
            aria-label="Open Navigation Menu"
            style={{
              alignItems: 'center',
              padding: '6px 8px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-subtle)',
              flexShrink: 0
            }}
          >
            <Menu size={19} />
          </button>
        )}
      </div>
    </header>
  );
}

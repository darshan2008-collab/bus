import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  GraduationCap,
  MapPin,
  History,
  FileBarChart,
  FileSpreadsheet,
  Settings,
  LogOut,
  X,
  Bus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MoreMenuModal({ isOpen, onClose, onSelectPage, onOpenAccounts }) {
  const { user, logout, selectedBusId } = useAuth();

  const allItems = [
    { id: 'dashboard',  label: 'Dashboard',           icon: LayoutDashboard, section: 'main' },
    { id: 'attendance', label: 'Today Attendance',     icon: CheckSquare,     section: 'main' },
    { id: 'students',   label: 'Students',             icon: Users,           section: 'main' },
    { id: 'history',    label: 'Attendance History',   icon: History,         section: 'main' },
    { id: 'faculty',    label: 'Faculty Attendance',   icon: GraduationCap,   section: 'more' },
    { id: 'stops',      label: 'Bus Stops',            icon: MapPin,          section: 'more' },
    { id: 'reports',    label: 'Reports & Export',     icon: FileBarChart,    section: 'more' },
    { id: 'import',     label: 'Import Excel / CSV',   icon: FileSpreadsheet, section: 'more' },
    { id: 'settings',   label: 'Settings & Audit',     icon: Settings,        section: 'more' },
  ];

  const handleItemClick = (id) => {
    onSelectPage(id);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease'
        }}
      />

      {/* Slide-in Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '78vw',
          maxWidth: '300px',
          zIndex: 95,
          backgroundColor: 'var(--bg-surface)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.18)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.32, 0, 0.15, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'   /* outer container does NOT scroll */
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #071739 0%, #0f2d5e 100%)',
            padding: '18px 16px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bus size={20} color="#fbbf24" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>
                CAMPUS TRANSPORT
              </div>
              <div style={{
                fontSize: '10px',
                color: '#fbbf24',
                fontWeight: 700,
                letterSpacing: '0.06em',
                marginTop: '2px'
              }}>
                BUS 16 ACTIVE
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              color: 'rgba(255,255,255,0.7)',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '14px',
              flexShrink: 0
            }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {user.role?.replace('_', ' ')}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items — this section SCROLLS if content is too tall */}
        <nav style={{ flex: 1, padding: '10px 10px 0', overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', padding: '8px 8px 4px' }}>
            MAIN
          </div>
          {allItems.filter(i => i.section === 'main').map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 10px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  marginBottom: '2px'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', padding: '12px 8px 4px', marginTop: '4px', borderTop: '1px solid var(--border-color)' }}>
            MORE
          </div>
          {allItems.filter(i => i.section === 'more').map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 10px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  marginBottom: '2px'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Actions — ALWAYS pinned to bottom, never scrolls */}
        <div style={{
          padding: '12px 10px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flexShrink: 0,           /* NEVER shrink — always stays at bottom */
          backgroundColor: 'var(--bg-surface)'  /* opaque so content doesn't bleed through */
        }}>
          <button
            onClick={() => { onClose(); onOpenAccounts(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)'
            }}
          >
            <Users size={16} />
            <span>Switch Role / Account</span>
          </button>
          <button
            onClick={() => { logout(); onClose(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--status-absent)',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'var(--status-absent-bg)',
              border: '1px solid var(--status-absent-border)'
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}

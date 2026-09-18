import React from 'react';
import { useAuth } from '../../context/AuthContext';
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
  Bus
} from 'lucide-react';

export default function DesktopSidebar({ activeTab, setActiveTab }) {
  const { user, logout, selectedBusId } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Today Attendance', icon: CheckSquare },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'faculty', label: 'Faculty Attendance', icon: GraduationCap },
    { id: 'stops', label: 'Bus Stops', icon: MapPin },
    { id: 'history', label: 'Attendance History', icon: History },
    { id: 'reports', label: 'Reports & Export', icon: FileBarChart },
    { id: 'import', label: 'Import Excel / CSV', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings & Audit', icon: Settings }
  ];

  return (
    <aside className="desktop-sidebar">
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#071739', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/dsu_seal.png"
            alt="DSU Official Seal"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              objectFit: 'cover',
              clipPath: 'circle(47% at 50% 49%)',
              flexShrink: 0
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.05em' }}>
            CAMPUS TRANSPORT
          </span>
        </div>
        <span className="overview-bus-pill" style={{ fontSize: '10px', padding: '2px 8px' }}>
          BUS 16
        </span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {user && (
        <div className="sidebar-footer">
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {user.role.replace('_', ' ')}
            </div>
          </div>
          <button
            onClick={logout}
            className="btn-secondary"
            style={{ width: '100%', padding: '8px 12px', fontSize: '12px', minHeight: 'auto' }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
}

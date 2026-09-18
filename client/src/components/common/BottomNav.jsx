import React from 'react';
import { LayoutDashboard, CheckSquare, Users, History, MoreHorizontal } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, onOpenMore }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'history', label: 'History', icon: History },
    { id: 'more', label: 'More', icon: MoreHorizontal }
  ];

  const handleNavClick = (id) => {
    if (id === 'more') {
      onOpenMore();
    } else {
      setActiveTab(id);
    }
  };

  return (
    <nav className="bottom-nav menu" role="navigation" aria-label="Mobile Navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            aria-label={item.label}
          >
            <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

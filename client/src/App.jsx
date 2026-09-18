import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Header from './components/common/Header';
import BottomNav from './components/common/BottomNav';
import DesktopSidebar from './components/common/DesktopSidebar';
import MoreMenuModal from './components/common/MoreMenuModal';
import UserSwitcherModal from './components/common/UserSwitcherModal';
import { Send } from 'lucide-react';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import StopCoordinatorPage from './pages/StopCoordinatorPage';
import StudentsPage from './pages/StudentsPage';
import FacultyPage from './pages/FacultyPage';
import BusStopsPage from './pages/BusStopsPage';
import HistoryPage from './pages/HistoryPage';
import ReportsPage from './pages/ReportsPage';
import ImportPage from './pages/ImportPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStopForAttendance, setSelectedStopForAttendance] = useState(null);
  const attendanceRef = useRef(null);

  // Reliable mobile detection via JS — avoids CSS class display bugs
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modals
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-secondary)'
        }}
      >
        Initializing College Transport Portal...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleNavigateToAttendance = (stopId = null) => {
    if (stopId) setSelectedStopForAttendance(stopId);
    setActiveTab('attendance');
  };

  return (
    <div className="app-layout">
      {/* Desktop Responsive Sidebar */}
      <DesktopSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main App Content Area */}
      <div className="main-content">
        {/* Sticky App Header */}
        <Header
          onOpenUserModal={() => setIsUserSwitcherOpen(true)}
          onOpenMenu={isMobile ? () => setIsMoreOpen(true) : undefined}
        />

        {/* Page Content Switching */}
        {activeTab === 'dashboard' && (
          <DashboardPage
            onNavigateToAttendance={() => handleNavigateToAttendance()}
            onSelectStop={(sId) => handleNavigateToAttendance(sId)}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendancePage ref={attendanceRef} defaultStopId={selectedStopForAttendance} />
        )}

        {activeTab === 'stop-coord' && <StopCoordinatorPage />}

        {activeTab === 'students' && <StudentsPage />}

        {activeTab === 'faculty' && <FacultyPage onNavigateToImport={() => setActiveTab('import')} />}

        {activeTab === 'stops' && (
          <BusStopsPage onSelectStop={(sId) => handleNavigateToAttendance(sId)} />
        )}

        {activeTab === 'history' && <HistoryPage />}

        {activeTab === 'reports' && <ReportsPage />}

        {activeTab === 'import' && <ImportPage onNavigateToFaculty={() => setActiveTab('faculty')} />}

        {activeTab === 'settings' && <SettingsPage />}

        {/* Mobile Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenMore={() => setIsMoreOpen(true)}
        />
      </div>



      {/* Mobile More Navigation Drawer */}
      <MoreMenuModal
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        onSelectPage={(pageId) => setActiveTab(pageId)}
        onOpenAccounts={() => setIsUserSwitcherOpen(true)}
      />

      {/* Instant Role / Coordinator Switcher Modal */}
      <UserSwitcherModal
        isOpen={isUserSwitcherOpen}
        onClose={() => setIsUserSwitcherOpen(false)}
      />
    </div>
  );
}

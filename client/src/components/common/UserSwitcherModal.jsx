import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import { User, Shield, UserCheck, ShieldCheck, X, LogOut, Check, Award } from 'lucide-react';

export default function UserSwitcherModal({ isOpen, onClose }) {
  const { user, login, logout } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      apiRequest('/auth/demo-accounts')
        .then((res) => {
          if (res && res.accounts) setAccounts(res.accounts);
        })
        .catch((err) => console.warn('Could not load accounts:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickSwitch = async (acc) => {
    setLoadingId(acc.user_id);
    try {
      const password = acc.role === 'ADMIN' ? 'admin123' : 'password123';
      await login(acc.user_id, password);
      onClose();
    } catch (err) {
      alert('Login failed: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN':
        return <Shield size={16} color="#3b82f6" />;
      case 'STOP_COORDINATOR':
        return <ShieldCheck size={16} color="#10b981" />;
      case 'STUDENT_COORDINATOR':
        return <UserCheck size={16} color="#8b5cf6" />;
      case 'FACULTY':
        return <Award size={16} color="#b45309" />;
      default:
        return <User size={16} color="var(--text-secondary)" />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">COORDINATOR ACCOUNTS</span>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Switch between authorized attendance handlers or administrator to verify simultaneous multi-user coordination:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
          {accounts.map((acc) => {
            const isCurrent = user?.user_id === acc.user_id;
            return (
              <div
                key={acc.id}
                onClick={() => !isCurrent && handleQuickSwitch(acc)}
                style={{
                  padding: '10px 12px',
                  backgroundColor: isCurrent ? 'var(--primary-subtle)' : 'var(--bg-app)',
                  border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: isCurrent ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  transition: 'background-color var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {getRoleIcon(acc.role)}
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{acc.name}</span>
                      {acc.role === 'FACULTY' && (
                        <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#92400e', backgroundColor: '#fef3c7', padding: '1px 6px', borderRadius: '4px', border: '1px solid #fcd34d' }}>
                          FACULTY COORD
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {acc.register_number ? `Reg: ${acc.register_number} • ` : `ID: ${acc.user_id} • `}
                      {acc.role === 'FACULTY' ? 'Faculty In-Charge' : acc.role.replace('_', ' ')}
                      {acc.stop_name ? ` (${acc.stop_name})` : acc.bus_number ? ` (${acc.bus_number})` : ''}
                    </div>
                  </div>
                </div>

                <div>
                  {isCurrent ? (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Check size={14} /> ACTIVE
                    </span>
                  ) : (
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '11px', minHeight: 'auto' }}
                      disabled={loadingId === acc.user_id}
                    >
                      {loadingId === acc.user_id ? 'Switching...' : 'Switch'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="btn-secondary"
            style={{ width: '100%' }}
          >
            <LogOut size={16} />
            <span>Sign Out Current Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import DSUBanner from '../components/common/DSUBanner';

export default function LoginPage() {
  const { login } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim()) {
      setError('Please enter User ID / Register Number and Password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(userId.trim(), password.trim());
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: '#f2ede4',
        backgroundImage: "url('/cashmere_bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div
        style={{
          maxWidth: '440px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
      >
        {/* Dhanalakshmi Srinivasan University Institutional Banner */}
        <DSUBanner />

        {/* Elevated Luxury Silk Ivory Login Card */}
        <div
          style={{
            backgroundColor: '#faf7f2',
            borderRadius: '16px',
            padding: '26px 22px',
            boxShadow: '0 20px 40px -5px rgba(35, 28, 20, 0.12), 0 8px 16px -6px rgba(35, 28, 20, 0.06)',
            border: '1.5px solid #d6ccbc'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#181e28', letterSpacing: '-0.01em', margin: '0 0 4px 0' }}>
              Coordinator & Admin Login
            </h2>
            <p style={{ fontSize: '12px', color: '#4e5868', margin: 0 }}>
              Sign in to record & synchronize bus attendance
            </p>
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                marginBottom: '16px',
                backgroundColor: '#faebeb',
                border: '1px solid #f1aeb5',
                borderRadius: 'var(--radius-sm)',
                color: '#a82828',
                fontSize: '13px'
              }}
            >
              <AlertCircle size={16} flexShrink={0} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                USER ID / REGISTER NUMBER
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7b8594' }} />
                <input
                  type="text"
                  placeholder="e.g. 202520205 / deepika / admin"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 38px',
                    fontSize: '13.5px',
                    backgroundColor: '#f2ede4',
                    border: '1.5px solid #d6ccbc',
                    borderRadius: '8px',
                    color: '#181e28'
                  }}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7b8594' }} />
                <input
                  type="password"
                  placeholder="Enter secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 38px',
                    fontSize: '13.5px',
                    backgroundColor: '#f2ede4',
                    border: '1.5px solid #d6ccbc',
                    borderRadius: '8px',
                    color: '#181e28'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                marginTop: '12px',
                height: '48px',
                fontSize: '14.5px',
                fontWeight: 700,
                borderRadius: '10px',
                boxShadow: '0 6px 20px rgba(27, 54, 93, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to DSU Transport</span>
                  <ArrowRight size={18} strokeWidth={2.4} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

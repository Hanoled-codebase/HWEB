import React, { useState } from 'react';
import { HanoledLogo } from '../../ui/HanoledLogo';
import { api } from '../../../services/api';
import { Mail, Hash, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (data: any) => void;
  onNavigateRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNavigateRegister }) => {
  const [tab, setTab] = useState<'EMAIL' | 'ADMISSION_NUMBER'>('EMAIL');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [orgSlug, setOrgSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({
        identifierType: tab,
        identifier,
        password,
        organizationSlugOrId: tab === 'ADMISSION_NUMBER' ? orgSlug : undefined,
        audience: 'hcore-api',
      });
      onLoginSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0B1220 0%, #1447E6 100%)',
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.5rem',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <HanoledLogo size="lg" variant="blue" />
        </div>

        <h2 style={{ fontSize: '1.35rem', textAlign: 'center', marginBottom: '0.25rem' }}>
          Sign in to Hanoled Suite
        </h2>
        <p style={{ textAlign: 'center', marginBottom: '1.75rem', fontSize: '0.875rem' }}>
          One account for School Management, CBT, and Platform Admin.
        </p>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.375rem',
            background: 'var(--bg-primary)',
            padding: '0.375rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
          }}
        >
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setTab('EMAIL');
              setError(null);
            }}
            style={{
              backgroundColor: tab === 'EMAIL' ? '#FFFFFF' : 'transparent',
              color: tab === 'EMAIL' ? 'var(--hanoled-blue)' : 'var(--text-muted)',
              boxShadow: tab === 'EMAIL' ? 'var(--shadow-sm)' : 'none',
              fontWeight: tab === 'EMAIL' ? 600 : 500,
            }}
          >
            <Mail size={14} /> Email / Staff
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setTab('ADMISSION_NUMBER');
              setError(null);
            }}
            style={{
              backgroundColor: tab === 'ADMISSION_NUMBER' ? '#FFFFFF' : 'transparent',
              color: tab === 'ADMISSION_NUMBER' ? 'var(--hanoled-blue)' : 'var(--text-muted)',
              boxShadow: tab === 'ADMISSION_NUMBER' ? 'var(--shadow-sm)' : 'none',
              fontWeight: tab === 'ADMISSION_NUMBER' ? 600 : 500,
            }}
          >
            <Hash size={14} /> Student / Admission
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--status-alert-bg)',
              color: 'var(--status-alert)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {tab === 'ADMISSION_NUMBER' && (
            <div className="form-group">
              <label>School Slug or Code</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. greenwood-academy"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>{tab === 'EMAIL' ? 'Email Address' : 'Admission Number'}</label>
            <input
              type={tab === 'EMAIL' ? 'email' : 'text'}
              className="form-control"
              placeholder={tab === 'EMAIL' ? 'admin@school.com' : 'e.g. STU/2026/001'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.75rem', paddingTop: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8125rem' }}>
            New school or organization?{' '}
            <button
              type="button"
              onClick={onNavigateRegister}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--hanoled-blue)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Register your school
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

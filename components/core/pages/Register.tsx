import React, { useState } from 'react';
import { HanoledLogo } from '../../ui/HanoledLogo';
import { api } from '../../../services/api';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

interface RegisterProps {
  onRegisterSuccess: (data: any) => void;
  onNavigateLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onNavigateLogin }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOrgNameChange = (name: string) => {
    setOrganizationName(name);
    // Auto-generate slug
    const generatedSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setOrganizationSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.register({
        displayName,
        email,
        password,
        organizationName,
        organizationSlug,
      });
      onRegisterSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
          maxWidth: '520px',
          padding: '2.5rem',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <HanoledLogo size="lg" variant="blue" />
        </div>

        <h2 style={{ fontSize: '1.35rem', textAlign: 'center', marginBottom: '0.25rem' }}>
          Register Your School
        </h2>
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Creates unified HCORE identity and activates 30-day full access to HSMS and HCBT.
        </p>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--status-alert-bg)',
              color: 'var(--status-alert)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Your Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Dr. Samuel Adeleke"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Work Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="principal@school.edu.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>School / Institution Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Crown Heights College"
              value={organizationName}
              onChange={(e) => handleOrgNameChange(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Organization Unique Identifier (Slug)</label>
            <input
              type="text"
              className="form-control"
              placeholder="crown-heights-college"
              value={organizationSlug}
              onChange={(e) => setOrganizationSlug(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Students will use this slug to sign in (e.g. {organizationSlug || 'your-school'}.hanoled.com)
            </span>
          </div>

          <div className="form-group">
            <label>Secure Password (min 8 characters)</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
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
            {loading ? 'Creating School...' : 'Complete Registration'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8125rem' }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={onNavigateLogin}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--hanoled-blue)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

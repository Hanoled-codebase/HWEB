import React from 'react';
import { GraduationCap, FileCheck2, Settings, ArrowUpRight, ShieldCheck } from 'lucide-react';

interface ProductChooserProps {
  contexts: any;
  currentOrg: any;
  onSelectProduct: (productCode: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const ProductChooser: React.FC<ProductChooserProps> = ({
  contexts,
  currentOrg,
  onSelectProduct,
  onNavigateTab,
}) => {
  const products = currentOrg?.products || {};
  const hsmsInfo = products.HSMS;
  const hcbtInfo = products.HCBT;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
              Welcome back, {contexts?.principal?.displayName || 'Administrator'}
            </h1>
            <p>
              Hanoled Suite Single Sign-On for <strong>{currentOrg?.name || 'Your School'}</strong> ({currentOrg?.slug})
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab('subscriptions')}>
              Manage Subscriptions
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab('directory')}>
              School Directory
            </button>
          </div>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* Hanoled SMS Card */}
        <div
          className="card"
          style={{
            borderTop: '4px solid var(--hanoled-blue)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'var(--hanoled-blue-subtle)',
                  color: 'var(--hanoled-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GraduationCap size={26} />
              </div>
              {hsmsInfo ? (
                <span className={`badge ${hsmsInfo.status === 'ACTIVE' ? 'badge-active' : 'badge-trial'}`}>
                  {hsmsInfo.status}
                </span>
              ) : (
                <span className="badge badge-warning">Available to Upgrade</span>
              )}
            </div>

            <h3 style={{ marginBottom: '0.5rem' }}>Hanoled SMS</h3>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Complete school operations: attendance, continuous assessment, report cards, fee tracking, and parent communication.
            </p>

            {hsmsInfo && (
              <div style={{ marginBottom: '1.25rem', background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  YOUR EFFECTIVE ROLES
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {hsmsInfo.roles?.map((r: string) => (
                    <span key={r} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            {hsmsInfo ? (
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => onSelectProduct('HSMS')}
              >
                Launch Hanoled SMS <ArrowUpRight size={16} />
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => onNavigateTab('subscriptions')}
              >
                Activate Subscription
              </button>
            )}
          </div>
        </div>

        {/* Hanoled CBT Card */}
        <div
          className="card"
          style={{
            borderTop: '4px solid var(--growth-gold)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'var(--growth-gold-subtle)',
                  color: 'var(--growth-gold-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileCheck2 size={26} />
              </div>
              {hcbtInfo ? (
                <span className={`badge ${hcbtInfo.status === 'ACTIVE' ? 'badge-active' : 'badge-trial'}`}>
                  {hcbtInfo.status}
                </span>
              ) : (
                <span className="badge badge-warning">Available to Upgrade</span>
              )}
            </div>

            <h3 style={{ marginBottom: '0.5rem' }}>Hanoled CBT</h3>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Computer-based testing engine: question banks, timed exams, automated grading, anti-cheat proctoring, and instant analytics.
            </p>

            {hcbtInfo && (
              <div style={{ marginBottom: '1.25rem', background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  YOUR EFFECTIVE ROLES
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {hcbtInfo.roles?.map((r: string) => (
                    <span key={r} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            {hcbtInfo ? (
              <button
                className="btn btn-gold"
                style={{ width: '100%' }}
                onClick={() => onSelectProduct('HCBT')}
              >
                Launch Hanoled CBT <ArrowUpRight size={16} />
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => onNavigateTab('subscriptions')}
              >
                Activate Subscription
              </button>
            )}
          </div>
        </div>

        {/* HCORE Central Platform Card */}
        <div
          className="card"
          style={{
            borderTop: '4px solid var(--deep-ink)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#F1F5F9',
                  color: 'var(--deep-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Settings size={26} />
              </div>
              <span className="badge badge-active">PLATFORM CORE</span>
            </div>

            <h3 style={{ marginBottom: '0.5rem' }}>HCORE Management</h3>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Central identity, shared school roster directory, organization affiliations, and security tokens.
            </p>

            <div style={{ marginBottom: '1.25rem', background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                ARCHITECTURE PROTOCOL
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                OIDC / JWKS Asymmetric Verification Active
              </span>
            </div>
          </div>

          <div>
            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={() => onNavigateTab('directory')}
            >
              Open Directory & Settings <ArrowUpRight size={16} />
            </button>
          </div>
        </div>

      </div>

      {/* Suite Architecture Metrics & Trust Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #EEF3FF 0%, #FFFFFF 100%)',
          borderColor: 'var(--hanoled-blue-light)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <ShieldCheck size={22} color="var(--hanoled-blue)" />
          <h4 style={{ margin: 0, color: 'var(--hanoled-blue)' }}>Suite Isolation & Cross-Product Security</h4>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          HCORE securely signs tokens using RS256 with key rotation. HSMS and HCBT communicate over decoupled event contracts without direct database queries or shared signing keys.
        </p>
      </div>
    </div>
  );
};

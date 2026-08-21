import React from 'react';
import { HanoledLogo } from './HanoledLogo';
import { School, LogOut } from 'lucide-react';

interface NavbarProps {
  principal: any;
  organizations: any[];
  currentOrg: any;
  onSelectOrg: (orgId: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  principal,
  organizations,
  currentOrg,
  onSelectOrg,
  onLogout,
}) => {
  return (
    <header
      style={{
        height: '64px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <HanoledLogo size={28} />

        {/* Organization Switcher */}
        {organizations && organizations.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F8FAFC', padding: '4px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <School size={16} color="var(--hanoled-blue)" />
            <select
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'inherit',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--deep-ink)',
                cursor: 'pointer',
                outline: 'none',
              }}
              value={currentOrg?.id || ''}
              onChange={(e) => onSelectOrg(e.target.value)}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.slug})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--deep-ink)' }}>
            {principal?.displayName || 'Administrator'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {principal?.primaryEmail || 'SSO User'}
          </span>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onLogout}
          style={{ padding: '0.375rem 0.625rem' }}
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};

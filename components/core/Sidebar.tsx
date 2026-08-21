import React from 'react';
import { LayoutGrid, Users, CreditCard, Shield } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentOrg: any;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, currentOrg }) => {
  const navItems = [
    { id: 'products', label: 'Suite Hub & Products', icon: LayoutGrid },
    { id: 'directory', label: 'School Directory', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions & Plans', icon: CreditCard },
    { id: 'sessions', label: 'Sessions & Devices', icon: Shield },
  ];

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid var(--border-color)',
        minHeight: 'calc(100vh - 64px)',
        padding: '1.25rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ padding: '0 0.75rem 1rem 0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            HCORE PLATFORM
          </span>
          <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--hanoled-blue)' }}>
            {currentOrg?.name || 'Central Portal'}
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: isActive ? 'var(--hanoled-blue-subtle)' : 'transparent',
                  color: isActive ? 'var(--hanoled-blue)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 150ms ease',
                  width: '100%',
                }}
              >
                <Icon size={18} color={isActive ? 'var(--hanoled-blue)' : 'var(--text-muted)'} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--deep-ink)', display: 'block', marginBottom: '0.25rem' }}>
          OIDC / JWKS Ready
        </span>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>
          Issuer: auth.hanoled.com
        </p>
      </div>
    </aside>
  );
};

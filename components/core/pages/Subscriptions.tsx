import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CheckCircle2, ArrowRight, RefreshCw, XCircle } from 'lucide-react';

interface SubscriptionsProps {
  currentOrg: any;
  onRefreshContext: () => void;
}

export const Subscriptions: React.FC<SubscriptionsProps> = ({ currentOrg, onRefreshContext }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [orgSubs, setOrgSubs] = useState<any[]>([]);

  const orgId = currentOrg?.id;

  const loadData = async () => {
    if (!orgId) return;
    try {
      const [prodRes, subRes] = await Promise.all([
        api.getProducts(),
        api.getOrgSubscriptions(orgId),
      ]);
      setProducts(prodRes);
      setOrgSubs(subRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const handleActivate = async (productCode: string, planCode: string) => {
    try {
      await api.activateSubscription(orgId, { productCode, planCode, status: 'ACTIVE' });
      await loadData();
      onRefreshContext();
      alert(`Subscription for ${productCode} successfully activated!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancel = async (productCode: string) => {
    if (!confirm(`Are you sure you want to cancel ${productCode}?`)) return;
    try {
      await api.cancelSubscription(orgId, productCode);
      await loadData();
      onRefreshContext();
      alert(`Subscription for ${productCode} canceled.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Products & Subscriptions</h1>
        <p>
          Manage licensed products and seat entitlements for <strong>{currentOrg?.name}</strong>.
        </p>
      </div>

      {/* Active Subscriptions Overview */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Active Subscriptions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {orgSubs.map((sub) => (
            <div key={sub.id} className="card" style={{ borderColor: sub.status === 'ACTIVE' ? 'var(--status-success)' : 'var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--deep-ink)' }}>{sub.productCode}</span>
                <span className={`badge ${sub.status === 'ACTIVE' ? 'badge-active' : sub.status === 'TRIALING' ? 'badge-trial' : 'badge-danger'}`}>
                  {sub.status}
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Plan: <strong>{sub.plan?.name || sub.planId}</strong>
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Period Ends: {new Date(sub.currentPeriodEnd || Date.now()).toLocaleDateString()}
              </p>

              {/* Entitlements */}
              {sub.plan?.entitlements && sub.plan.entitlements.length > 0 && (
                <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.375rem' }}>
                    INCLUDED ENTITLEMENTS
                  </span>
                  {sub.plan.entitlements.map((ent: any) => (
                    <div key={ent.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span>{ent.entitlementCode}</span>
                      <strong>{ent.limitValue ? `${ent.limitValue} max` : 'Unlimited'}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {sub.status !== 'CANCELED' ? (
                  <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={() => handleCancel(sub.productCode)}>
                    <XCircle size={14} /> Cancel Plan
                  </button>
                ) : (
                  <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => handleActivate(sub.productCode, sub.plan?.planCode)}>
                    <RefreshCw size={14} /> Reactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Catalog & Upgrade Plans */}
      <div>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Suite Product Catalog</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {products.map((prod) => (
            <div key={prod.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ marginBottom: '0.25rem' }}>{prod.name}</h3>
                <span className="badge badge-blue" style={{ marginBottom: '1rem' }}>
                  {prod.code}
                </span>

                <div style={{ marginTop: '1rem' }}>
                  {prod.plans?.map((p: any) => (
                    <div key={p.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--hanoled-blue)' }}>
                          ₦{p.price?.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>/{p.billingInterval.toLowerCase()}</span>
                        </span>
                      </div>

                      <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 1rem 0', fontSize: '0.8125rem' }}>
                        {p.entitlements?.map((ent: any) => (
                          <li key={ent.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                            <CheckCircle2 size={14} color="var(--status-success)" />
                            {ent.entitlementCode}: {ent.limitValue || 'Unlimited'}
                          </li>
                        ))}
                      </ul>

                      <button
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%' }}
                        onClick={() => handleActivate(prod.code, p.planCode)}
                      >
                        Subscribe / Activate <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Laptop, Smartphone, Trash2 } from 'lucide-react';

export const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);

  const loadSessions = async () => {
    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevoke = async (id: string) => {
    try {
      await api.revokeSession(id);
      loadSessions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Active Sessions & Devices</h1>
        <p>Manage authenticated SSO devices and sessions linked to your HCORE principal.</p>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Device / User Agent</th>
              <th>IP Address</th>
              <th>Created At</th>
              <th>Last Active</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                  No active session records found.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                    {s.userAgent?.includes('Mobile') ? <Smartphone size={18} /> : <Laptop size={18} />}
                    <span style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.userAgent || 'Unknown Browser'}
                    </span>
                  </td>
                  <td>{s.ipAddress || '127.0.0.1'}</td>
                  <td>{new Date(s.createdAt).toLocaleString()}</td>
                  <td>{new Date(s.lastUsedAt).toLocaleString()}</td>
                  <td>
                    {s.revokedAt ? (
                      <span className="badge badge-danger">Revoked</span>
                    ) : (
                      <span className="badge badge-active">Active</span>
                    )}
                  </td>
                  <td>
                    {!s.revokedAt && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleRevoke(s.id)}>
                        <Trash2 size={14} /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

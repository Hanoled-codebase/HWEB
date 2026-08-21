import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, Layers, BookOpen, UploadCloud, Plus } from 'lucide-react';

interface DirectoryProps {
  currentOrg: any;
}

export const Directory: React.FC<DirectoryProps> = ({ currentOrg }) => {
  const [tab, setTab] = useState<'learners' | 'classes' | 'subjects'>('learners');
  const [learners, setLearners] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Modals
  const [showLearnerModal, setShowLearnerModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Forms
  const [learnerForm, setLearnerForm] = useState({
    givenName: '',
    familyName: '',
    admissionNumber: '',
    classGroupId: '',
    gender: 'Male',
    enableLogin: true,
  });

  const [classForm, setClassForm] = useState({
    name: '',
    level: '1',
    academicYear: '2026/2027',
  });

  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
  });

  const [rosterJson, setRosterJson] = useState(
    JSON.stringify(
      [
        { admissionNumber: 'STU/2026/001', givenName: 'Chidi', familyName: 'Nwosu', className: 'JSS 1A', gender: 'Male' },
        { admissionNumber: 'STU/2026/002', givenName: 'Amina', familyName: 'Bello', className: 'JSS 1A', gender: 'Female' },
        { admissionNumber: 'STU/2026/003', givenName: 'Tunde', familyName: 'Bakare', className: 'SS 2 Science', gender: 'Male' },
      ],
      null,
      2
    )
  );

  const orgId = currentOrg?.id;

  const loadData = async () => {
    if (!orgId) return;
    try {
      const [lRes, cRes, sRes] = await Promise.all([
        api.getLearners(orgId),
        api.getClasses(orgId),
        api.getSubjects(orgId),
      ]);
      setLearners(lRes);
      setClasses(cRes);
      setSubjects(sRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const handleCreateLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLearner(orgId, learnerForm);
      setShowLearnerModal(false);
      setLearnerForm({ givenName: '', familyName: '', admissionNumber: '', classGroupId: '', gender: 'Male', enableLogin: true });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createClass(orgId, classForm);
      setShowClassModal(false);
      setClassForm({ name: '', level: '1', academicYear: '2026/2027' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSubject(orgId, subjectForm);
      setShowSubjectModal(false);
      setSubjectForm({ name: '', code: '' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleImportRoster = async () => {
    try {
      const parsed = JSON.parse(rosterJson);
      await api.importRoster(orgId, { learners: parsed, academicYear: '2026/2027' });
      setShowImportModal(false);
      loadData();
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    }
  };

  const filteredLearners = learners.filter(
    (l) =>
      l.admissionNumber.toLowerCase().includes(search.toLowerCase()) ||
      l.person.givenName.toLowerCase().includes(search.toLowerCase()) ||
      l.person.familyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Shared School Directory</h1>
          <p>
            Canonical roster & academic directory. Synchronized into HSMS & HCBT via versioned event contracts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowImportModal(true)}>
            <UploadCloud size={16} /> Bulk Roster Import
          </button>
          {tab === 'learners' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowLearnerModal(true)}>
              <Plus size={16} /> Add Learner
            </button>
          )}
          {tab === 'classes' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowClassModal(true)}>
              <Plus size={16} /> Add Class
            </button>
          )}
          {tab === 'subjects' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowSubjectModal(true)}>
              <Plus size={16} /> Add Subject
            </button>
          )}
        </div>
      </div>

      {/* Directory Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
        }}
      >
        <button
          className="btn btn-sm"
          onClick={() => setTab('learners')}
          style={{
            borderBottom: tab === 'learners' ? '2px solid var(--hanoled-blue)' : 'none',
            borderRadius: 0,
            color: tab === 'learners' ? 'var(--hanoled-blue)' : 'var(--text-secondary)',
            fontWeight: tab === 'learners' ? 600 : 400,
          }}
        >
          <Users size={16} /> Learners ({learners.length})
        </button>
        <button
          className="btn btn-sm"
          onClick={() => setTab('classes')}
          style={{
            borderBottom: tab === 'classes' ? '2px solid var(--hanoled-blue)' : 'none',
            borderRadius: 0,
            color: tab === 'classes' ? 'var(--hanoled-blue)' : 'var(--text-secondary)',
            fontWeight: tab === 'classes' ? 600 : 400,
          }}
        >
          <Layers size={16} /> Class Groups ({classes.length})
        </button>
        <button
          className="btn btn-sm"
          onClick={() => setTab('subjects')}
          style={{
            borderBottom: tab === 'subjects' ? '2px solid var(--hanoled-blue)' : 'none',
            borderRadius: 0,
            color: tab === 'subjects' ? 'var(--hanoled-blue)' : 'var(--text-secondary)',
            fontWeight: tab === 'subjects' ? 600 : 400,
          }}
        >
          <BookOpen size={16} /> Subjects ({subjects.length})
        </button>
      </div>

      {/* Learners View */}
      {tab === 'learners' && (
        <div>
          <div style={{ marginBottom: '1rem', maxWidth: '360px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search admission number or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Admission No.</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Gender</th>
                  <th>Login Identity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLearners.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      No learners registered yet. Click "Add Learner" or "Bulk Roster Import".
                    </td>
                  </tr>
                ) : (
                  filteredLearners.map((learner) => (
                    <tr key={learner.id}>
                      <td style={{ fontWeight: 600, color: 'var(--hanoled-blue)' }}>{learner.admissionNumber}</td>
                      <td>
                        {learner.person.givenName} {learner.person.familyName}
                      </td>
                      <td>{learner.currentClass?.name || 'Unassigned'}</td>
                      <td>{learner.person.gender || '—'}</td>
                      <td>
                        {learner.person.linkedPrincipalId ? (
                          <span className="badge badge-active">Active SSO</span>
                        ) : (
                          <span className="badge badge-trial">Roster Only</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-active">{learner.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Classes View */}
      {tab === 'classes' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Level</th>
                <th>Academic Year</th>
                <th>Enrolled Learners</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    No class groups created yet.
                  </td>
                </tr>
              ) : (
                classes.map((cls) => (
                  <tr key={cls.id}>
                    <td style={{ fontWeight: 600 }}>{cls.name}</td>
                    <td>Level {cls.level}</td>
                    <td>{cls.academicYear}</td>
                    <td>{cls._count?.learnersInClass || 0}</td>
                    <td>
                      <span className="badge badge-active">{cls.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Subjects View */}
      {tab === 'subjects' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Subject Code</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                    No subjects registered yet.
                  </td>
                </tr>
              ) : (
                subjects.map((subj) => (
                  <tr key={subj.id}>
                    <td style={{ fontWeight: 600 }}>{subj.name}</td>
                    <td>
                      <span className="badge badge-blue">{subj.code}</span>
                    </td>
                    <td>
                      <span className="badge badge-active">{subj.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Learner Modal */}
      {showLearnerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem' }}>Register New Learner</h3>
            <form onSubmit={handleCreateLearner}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={learnerForm.givenName}
                    onChange={(e) => setLearnerForm({ ...learnerForm, givenName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={learnerForm.familyName}
                    onChange={(e) => setLearnerForm({ ...learnerForm, familyName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Admission Number (Unique in School)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. STU/2026/045"
                  value={learnerForm.admissionNumber}
                  onChange={(e) => setLearnerForm({ ...learnerForm, admissionNumber: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Class</label>
                  <select
                    className="form-control"
                    value={learnerForm.classGroupId}
                    onChange={(e) => setLearnerForm({ ...learnerForm, classGroupId: e.target.value })}
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    className="form-control"
                    value={learnerForm.gender}
                    onChange={(e) => setLearnerForm({ ...learnerForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="enableLogin"
                  checked={learnerForm.enableLogin}
                  onChange={(e) => setLearnerForm({ ...learnerForm, enableLogin: e.target.checked })}
                />
                <label htmlFor="enableLogin" style={{ fontSize: '0.8125rem', cursor: 'pointer' }}>
                  Enable Student SSO login (Default password equals admission number)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLearnerModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Learner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showClassModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem' }}>Create Class Group</h3>
            <form onSubmit={handleCreateClass}>
              <div className="form-group">
                <label>Class Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. JSS 1 Gold"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Level</label>
                  <input
                    type="text"
                    className="form-control"
                    value={classForm.level}
                    onChange={(e) => setClassForm({ ...classForm, level: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Academic Year</label>
                  <input
                    type="text"
                    className="form-control"
                    value={classForm.academicYear}
                    onChange={(e) => setClassForm({ ...classForm, academicYear: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowClassModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showSubjectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1rem' }}>Add Subject</h3>
            <form onSubmit={handleCreateSubject}>
              <div className="form-group">
                <label>Subject Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. General Mathematics"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Subject Code</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. MTH"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSubjectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roster Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Bulk Roster Import</h3>
            <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              Paste or edit JSON student list. Classes will be auto-created if missing.
            </p>

            <div className="form-group">
              <textarea
                className="form-control"
                rows={10}
                style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                value={rosterJson}
                onChange={(e) => setRosterJson(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowImportModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleImportRoster}>
                Run Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

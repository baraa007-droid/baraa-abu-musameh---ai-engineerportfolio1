import React, { useState } from 'react';
import { GraduationCap, Award, Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { Education, Certificate } from '../../../types';

interface EducationTabProps {
  education: Education[];
  certificates: Certificate[];
  onUpdateEducation: (edu: Education[]) => void;
  onUpdateCertificates: (certs: Certificate[]) => void;
}

const emptyEdu = (): Education => ({
  id: `edu-${Date.now()}`,
  degree: '',
  institution: '',
  field_of_study: '',
  start_year: '',
  end_year: '',
  grade: '',
  description: '',
  achievements: [],
  order: 99,
  published: true
});

const emptyCert = (): Certificate => ({
  id: `cert-${Date.now()}`,
  name: '',
  issuer: '',
  issue_date: '',
  credential_url: '',
  credential_id: '',
  description: '',
  badge_image: '',
  order: 99,
  published: true
});

export const EducationTab: React.FC<EducationTabProps> = ({
  education,
  certificates,
  onUpdateEducation,
  onUpdateCertificates
}) => {
  const [eduItems, setEduItems] = useState<Education[]>(education);
  const [certItems, setCertItems] = useState<Certificate[]>(certificates);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);

  const sortByOrder = <T extends { order?: number }>(list: T[]): T[] =>
    [...list].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  const saveEdu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEdu?.institution || !editingEdu?.degree) return;
    const exists = eduItems.some(i => i.id === editingEdu.id);
    const updated = exists
      ? eduItems.map(i => (i.id === editingEdu.id ? editingEdu : i))
      : [...eduItems, editingEdu];
    try {
      await onUpdateEducation(updated);
    } catch {
      return; // not saved: keep the form open and the list unchanged (the dashboard shows the error)
    }
    setEduItems(updated);
    setEditingEdu(null);
  };

  const saveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCert?.name || !editingCert?.issuer) return;
    const exists = certItems.some(i => i.id === editingCert.id);
    const updated = exists
      ? certItems.map(i => (i.id === editingCert.id ? editingCert : i))
      : [...certItems, editingCert];
    try {
      await onUpdateCertificates(updated);
    } catch {
      return; // not saved: keep the form open and the list unchanged (the dashboard shows the error)
    }
    setCertItems(updated);
    setEditingCert(null);
  };

  const removeEdu = async (id: string) => {
    if (!confirm('Delete this education entry?')) return;
    const updated = eduItems.filter(i => i.id !== id);
    try {
      await onUpdateEducation(updated);
    } catch {
      return; // not saved: list unchanged (the dashboard shows the error)
    }
    setEduItems(updated);
  };

  const removeCert = async (id: string) => {
    if (!confirm('Delete this certificate entry?')) return;
    const updated = certItems.filter(i => i.id !== id);
    try {
      await onUpdateCertificates(updated);
    } catch {
      return; // not saved: list unchanged (the dashboard shows the error)
    }
    setCertItems(updated);
  };

  const toggleEduPublished = async (id: string) => {
    const updated = eduItems.map(i => (i.id === id ? { ...i, published: i.published === false } : i));
    try {
      await onUpdateEducation(updated);
    } catch {
      return; // not saved: list unchanged (the dashboard shows the error)
    }
    setEduItems(updated);
  };

  const toggleCertPublished = async (id: string) => {
    const updated = certItems.map(i => (i.id === id ? { ...i, published: i.published === false } : i));
    try {
      await onUpdateCertificates(updated);
    } catch {
      return; // not saved: list unchanged (the dashboard shows the error)
    }
    setCertItems(updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Education Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-amber-500" />
              Academic Degrees & Education
            </h2>
            <p className="text-xs text-zinc-500">University credentials, degree titles, and focus areas.</p>
          </div>
          <button
            onClick={() => setEditingEdu(emptyEdu())}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Education
          </button>
        </div>

        <div className="space-y-3">
          {sortByOrder(eduItems).map((edu) => (
            <div
              key={edu.id}
              className={`p-5 rounded-2xl bg-white dark:bg-zinc-900 border ${
                edu.published === false ? 'border-dashed opacity-60' : ''
              } border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4`}
            >
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  {edu.degree || '(untitled)'} {!edu.published && <span className="text-[10px] text-zinc-400 font-mono">(hidden)</span>}
                </h3>
                <p className="text-xs text-amber-500 font-semibold">{edu.institution} • {edu.field_of_study}</p>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{edu.start_year} – {edu.end_year}{edu.grade ? ` | Grade: ${edu.grade}` : ''} | order: {edu.order ?? 99}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleEduPublished(edu.id)}
                  title={edu.published === false ? 'Publish' : 'Unpublish'}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    edu.published === false
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {edu.published === false ? 'Show' : 'Hide'}
                </button>
                <button
                  onClick={() => setEditingEdu(edu)}
                  className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeEdu(edu.id)}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Certificates Section */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Professional Certifications
            </h2>
            <p className="text-xs text-zinc-500">Industry certificates, verified badges, and credential URLs.</p>
          </div>
          <button
            onClick={() => setEditingCert(emptyCert())}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Certificate
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortByOrder(certItems).map((cert) => (
            <div
              key={cert.id}
              className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border ${
                cert.published === false ? 'border-dashed opacity-60' : ''
              } border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3`}
            >
              <div className="min-w-0">
                <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                  {cert.name || '(untitled)'} {!cert.published && <span className="text-[10px] text-zinc-400 font-mono">(hidden)</span>}
                </h3>
                <p className="text-[11px] text-amber-500">{cert.issuer} • {cert.issue_date} • order: {cert.order ?? 99}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleCertPublished(cert.id)}
                  title={cert.published === false ? 'Publish' : 'Unpublish'}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    cert.published === false
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {cert.published === false ? 'Show' : 'Hide'}
                </button>
                {cert.credential_url && (
                  <a href={cert.credential_url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-zinc-100">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => setEditingCert(cert)}
                  className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeCert(cert.id)}
                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit/Add Edu Modal */}
      {editingEdu && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              {eduItems.some(i => i.id === editingEdu.id) ? 'Edit Education' : 'Add Education'}
            </h3>
            <form onSubmit={saveEdu} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Degree *</label>
                <input
                  type="text"
                  required
                  value={editingEdu.degree}
                  onChange={(e) => setEditingEdu({ ...editingEdu, degree: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  placeholder="e.g. B.Sc. in Software Engineering"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Institution *</label>
                <input
                  type="text"
                  required
                  value={editingEdu.institution}
                  onChange={(e) => setEditingEdu({ ...editingEdu, institution: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  placeholder="e.g. Islamic University of Gaza"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Field of Study</label>
                <input
                  type="text"
                  value={editingEdu.field_of_study || ''}
                  onChange={(e) => setEditingEdu({ ...editingEdu, field_of_study: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Start Year</label>
                  <input
                    type="text"
                    value={editingEdu.start_year}
                    onChange={(e) => setEditingEdu({ ...editingEdu, start_year: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                    placeholder="2021"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">End Year</label>
                  <input
                    type="text"
                    value={editingEdu.end_year}
                    onChange={(e) => setEditingEdu({ ...editingEdu, end_year: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                    placeholder="2025"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Grade</label>
                  <input
                    type="text"
                    value={editingEdu.grade || ''}
                    onChange={(e) => setEditingEdu({ ...editingEdu, grade: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Description</label>
                <textarea
                  rows={3}
                  value={editingEdu.description || ''}
                  onChange={(e) => setEditingEdu({ ...editingEdu, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editingEdu.published !== false}
                    onChange={(e) => setEditingEdu({ ...editingEdu, published: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  Published
                </label>
                <div className="flex items-center gap-2">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Order</label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={editingEdu.order ?? 99}
                    onChange={(e) => setEditingEdu({ ...editingEdu, order: parseInt(e.target.value, 10) || 0 })}
                    className="w-20 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingEdu(null)} className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Add Cert Modal */}
      {editingCert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              {certItems.some(i => i.id === editingCert.id) ? 'Edit Certificate' : 'Add Certificate'}
            </h3>
            <form onSubmit={saveCert} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Certificate Name *</label>
                <input
                  type="text"
                  required
                  value={editingCert.name}
                  onChange={(e) => setEditingCert({ ...editingCert, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  placeholder="e.g. Deep Learning Specialization"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Issuer *</label>
                <input
                  type="text"
                  required
                  value={editingCert.issuer}
                  onChange={(e) => setEditingCert({ ...editingCert, issuer: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  placeholder="e.g. DeepLearning.AI"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Issue Date</label>
                  <input
                    type="month"
                    value={editingCert.issue_date || ''}
                    onChange={(e) => setEditingCert({ ...editingCert, issue_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Credential ID</label>
                  <input
                    type="text"
                    value={editingCert.credential_id || ''}
                    onChange={(e) => setEditingCert({ ...editingCert, credential_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Credential URL</label>
                <input
                  type="url"
                  value={editingCert.credential_url || ''}
                  onChange={(e) => setEditingCert({ ...editingCert, credential_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Description</label>
                <textarea
                  rows={2}
                  value={editingCert.description || ''}
                  onChange={(e) => setEditingCert({ ...editingCert, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  placeholder="What this certification verifies..."
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Badge Image URL</label>
                <input
                  type="url"
                  value={editingCert.badge_image || ''}
                  onChange={(e) => setEditingCert({ ...editingCert, badge_image: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={editingCert.published !== false}
                    onChange={(e) => setEditingCert({ ...editingCert, published: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  Published
                </label>
                <div className="flex items-center gap-2">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Order</label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={editingCert.order ?? 99}
                    onChange={(e) => setEditingCert({ ...editingCert, order: parseInt(e.target.value, 10) || 0 })}
                    className="w-20 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingCert(null)} className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

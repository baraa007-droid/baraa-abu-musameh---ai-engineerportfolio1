import React, { useEffect, useState } from 'react';
import {
  Users,
  Sparkles,
  Trash2,
  Mail,
  Calendar,
  DollarSign
} from 'lucide-react';
import { ProjectLead } from '../../../types';
import { safeUrl } from '../../../lib/content';

interface LeadsTabProps {
  leads: ProjectLead[];
  onUpdateLeadStatus: (id: string, status: ProjectLead['status']) => void;
  onUpdateLeadNotes: (id: string, notes: string) => Promise<void> | void;
  onDeleteLead: (id: string) => void;
}

export const LeadsTab: React.FC<LeadsTabProps> = ({
  leads,
  onUpdateLeadStatus,
  onUpdateLeadNotes,
  onDeleteLead
}) => {
  // Keep only the id: the lead object is always read from the latest props, so status/notes
  // changes are reflected immediately instead of showing a stale copy.
  const [selectedId, setSelectedId] = useState<string | null>(leads[0]?.id ?? null);
  const selectedLead = leads.find((l) => l.id === selectedId) || null;
  const setSelectedLead = (lead: ProjectLead | null) => setSelectedId(lead ? lead.id : null);
  const [editingNotes, setEditingNotes] = useState<string>(selectedLead?.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | ProjectLead['status']>('all');

  useEffect(() => {
    setEditingNotes(selectedLead?.notes || '');
    // Re-sync the editor only when another lead is selected (not on every leads refresh, which
    // would overwrite notes the admin is typing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const saveNotes = async () => {
    if (!selectedLead) return;
    setSavingNotes(true);
    try {
      await onUpdateLeadNotes(selectedLead.id, editingNotes);
    } catch {
      /* the dashboard shows the error */
    } finally {
      setSavingNotes(false);
    }
  };

  const referenceLinks = (lead: ProjectLead): string[] =>
    (Array.isArray(lead.reference_links) ? lead.reference_links : String(lead.reference_links || '').split(/[s,]+/))
      .map((u) => safeUrl(u))
      .filter((u): u is string => Boolean(u));

  const filteredLeads = leads.filter(l => {
    if (activeFilter === 'all') return true;
    return l.status === activeFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Inbound Project Intake & Leads
          </h2>
          <p className="text-xs text-zinc-500">
            Real-time project inquiries with automated AI qualification, scope scoring, and priority tiering.
          </p>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          {(['all', 'new', 'qualified', 'contacted', 'in_discussion', 'won', 'lost', 'archived'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                activeFilter === filter
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {filter} ({filter === 'all' ? leads.length : leads.filter(l => l.status === filter).length})
            </button>
          ))}
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs">
          No leads matching filter "{activeFilter}".
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Leads List */}
          <div className="lg:col-span-5 space-y-3">
            {filteredLeads.map((lead) => {
              const isSelected = selectedLead?.id === lead.id;
              return (
                <div
                  key={lead.id}
                  onClick={() => {
                    setSelectedLead(lead);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-xs'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{lead.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      Fit: {lead.ai_score || 80}/100
                    </span>
                  </div>

                  <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <span>{lead.email}</span>
                    {lead.company && <span>• {lead.company}</span>}
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {lead.ai_summary || lead.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-zinc-400">
                    <span>{lead.project_type}</span>
                    <span className="capitalize text-amber-500 font-semibold">{lead.status}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Lead Inspector */}
          {selectedLead && (
            <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedLead.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase">
                      {selectedLead.priority || 'Medium'} Priority
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono">
                    Received {new Date(selectedLead.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Status Selector */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedLead.status}
                    onChange={(e) => onUpdateLeadStatus(selectedLead.id, e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="new">Status: New</option>
                    <option value="qualified">Status: Qualified</option>
                    <option value="contacted">Status: Contacted</option>
                    <option value="in_discussion">Status: In Discussion</option>
                    <option value="won">Status: Won (Contracted)</option>
                    <option value="lost">Status: Lost</option>
                    <option value="archived">Status: Archived</option>
                  </select>

                  <a
                    href={`mailto:${selectedLead.email}?subject=Regarding Your Project Inquiry: ${encodeURIComponent(selectedLead.project_type)}`}
                    className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 transition-colors"
                    title="Send Email"
                  >
                    <Mail className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => {
                      if (confirm(`Delete lead from ${selectedLead.name}?`)) {
                        onDeleteLead(selectedLead.id);
                        setSelectedLead(null);
                      }
                    }}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-colors"
                    title="Delete Lead"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* AI Qualification Panel */}
              <div className="p-4 rounded-2xl bg-emerald-950/10 dark:bg-emerald-950/30 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs font-mono">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Lead Qualification Score</span>
                  </div>
                  <span className="text-base font-extrabold font-mono text-emerald-500">
                    {typeof selectedLead.ai_score === 'number' ? `${selectedLead.ai_score}/100` : 'Not scored'}
                  </span>
                </div>

                <p className="text-xs text-zinc-700 dark:text-zinc-300">
                  {selectedLead.ai_summary || 'No AI qualification is available for this lead.'}
                  {selectedLead.scored_by === 'fallback' && (
                    <span className="block mt-1 text-[10px] font-mono text-amber-600 dark:text-amber-400">
                      Scored by the rule-based fallback (AI model unavailable) — treat the numbers as rough.
                    </span>
                  )}
                </p>

                {selectedLead.ai_breakdown && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-500/20 text-[11px] font-mono">
                    <div className="p-2 rounded-lg bg-white/60 dark:bg-zinc-900/60">
                      <span className="text-zinc-400 block text-[10px]">Clarity</span>
                      <span className="font-bold text-emerald-500">{selectedLead.ai_breakdown.clarity}%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/60 dark:bg-zinc-900/60">
                      <span className="text-zinc-400 block text-[10px]">Feasibility</span>
                      <span className="font-bold text-emerald-500">{selectedLead.ai_breakdown.feasibility}%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/60 dark:bg-zinc-900/60">
                      <span className="text-zinc-400 block text-[10px]">Budget Fit</span>
                      <span className="font-bold text-emerald-500">{selectedLead.ai_breakdown.budget_fit}%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/60 dark:bg-zinc-900/60">
                      <span className="text-zinc-400 block text-[10px]">Timeline</span>
                      <span className="font-bold text-emerald-500">{selectedLead.ai_breakdown.timeline_realism}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Project Scope Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Budget Target
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedLead.budget_range}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Target Deadline
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedLead.deadline}</span>
                </div>
              </div>

              {/* Client Project Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Client Description & Scope</label>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {selectedLead.description}
                </div>
              </div>

              {/* Required Features Tags */}
              {selectedLead.required_features && selectedLead.required_features.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Requested Features</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLead.required_features.map((feat, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reference links */}
              {referenceLinks(selectedLead).length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">References / Inspirations:</span>
                  <ul className="text-xs font-mono break-all space-y-0.5">
                    {referenceLinks(selectedLead).map((u) => (
                      <li key={u}>
                        <a href={u} target="_blank" rel="noopener noreferrer nofollow" className="text-amber-600 dark:text-amber-400 hover:underline">{u}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Private admin notes */}
              <div className="space-y-2">
                <label htmlFor="lead-notes" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Private Notes</label>
                <textarea
                  id="lead-notes"
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  maxLength={5000}
                  rows={4}
                  placeholder="Call notes, next steps, quotes sent…"
                  className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={saveNotes}
                  disabled={savingNotes || editingNotes === (selectedLead.notes || '')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-zinc-950 text-xs font-bold"
                >
                  {savingNotes ? 'Saving…' : 'Save Notes'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

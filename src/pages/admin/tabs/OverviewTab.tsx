import React from 'react';
import {
  Sparkles,
  Activity,
  Server
} from 'lucide-react';
import { ProjectLead, ContactMessage, KnowledgeChunk, AIEvent } from '../../../types';

interface OverviewTabProps {
  analytics: any;
  leads: ProjectLead[];
  messages: ContactMessage[];
  chunks: KnowledgeChunk[];
  setActiveTab: (tab: any) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  analytics,
  leads,
  messages,
  chunks,
  setActiveTab
}) => {
  const telemetry = analytics?.systemTelemetry;
  const embeddedChunksCount = chunks.filter(c => c.embedding && c.embedding.length > 0).length;

  const formatUptime = (seconds: number) => {
    if (!seconds) return 'Active';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* System Telemetry Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 text-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono font-bold text-white flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-blue-400" />
            Live System Telemetry
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-6 font-mono text-[11px] text-slate-400">
          <div>
            Uptime: <span className="text-slate-200">{formatUptime(telemetry?.uptimeSeconds || 0)}</span>
          </div>
          <div>
            Memory RSS: <span className="text-slate-200">{telemetry?.memoryUsageMB || 48} MB</span>
          </div>
          <div>
            Vector Embeddings: <span className="text-emerald-400 font-bold">{embeddedChunksCount} / {chunks.length} active</span>
          </div>
          <div>
            Runtime: <span className="text-slate-200">Node {telemetry?.nodeVersion || 'v20+'}</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
          <span className="text-xs text-slate-500 font-mono">Inbound Project Leads</span>
          <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{leads.length}</div>
          <span className="text-[10px] text-slate-400">{leads.filter(l => (l.ai_score || 0) >= 80).length} High Qualification</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
          <span className="text-xs text-slate-500 font-mono">AI Chat Interactions</span>
          <div className="text-2xl font-extrabold font-mono text-blue-600 dark:text-blue-400">{analytics?.summary?.totalAIChats || 0}</div>
          <span className="text-[10px] text-slate-400">Grounded via RAG Pipeline</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
          <span className="text-xs text-slate-500 font-mono">Contact Messages</span>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{messages.length}</div>
          <span className="text-[10px] text-slate-400">{messages.filter(m => m.status === 'new').length} Unread inquiries</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-xs">
          <span className="text-xs text-slate-500 font-mono">Knowledge Chunks</span>
          <div className="text-2xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">{chunks.length}</div>
          <span className="text-[10px] text-slate-400">{embeddedChunksCount} 768-dim Vector Embedded</span>
        </div>
      </div>

      {/* AI Lead Qualification & Insights */}
      {analytics?.insights && analytics.insights.length > 0 && (
        <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 space-y-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-xs font-mono">
            <Sparkles className="w-4 h-4" />
            <span>AI Automated Lead Intelligence & Inbound Trend Diagnostics</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {analytics.insights.map((ins: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-900/60 text-xs space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white block">{ins.title}</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">{ins.description}</p>
                {ins.actionable_recommendation && (
                  <p className="text-blue-600 dark:text-blue-400 font-medium text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                    Action: {ins.actionable_recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inbound Leads Quick Action */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Recent Inbound Project Leads
          </h3>
          <button
            onClick={() => setActiveTab('leads')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-colors cursor-pointer"
          >
            View all ({leads.length}) →
          </button>
        </div>

        {leads.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
            No inbound leads yet. As visitors use the "Start a Project" planner, their submissions and AI scores will appear here.
          </div>
        ) : (
          <div className="space-y-3">
            {leads.slice(0, 4).map((lead) => (
              <div
                key={lead.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{lead.name}</span>
                    <span className="text-slate-500">({lead.email})</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-mono font-bold text-[10px]">
                      {lead.project_type}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[10px]">
                      Fit {lead.ai_score || 80}/100
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 line-clamp-1">
                    {lead.ai_summary || lead.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {lead.status}
                  </span>
                  <button
                    onClick={() => setActiveTab('leads')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Telemetry Events Log */}
      {analytics?.recentEvents && analytics.recentEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            Live Client Events Log
          </h3>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono text-[11px]">
            <table className="w-full text-left">
              <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="p-2.5">Event</th>
                  <th className="p-2.5">Path</th>
                  <th className="p-2.5">Session</th>
                  <th className="p-2.5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {analytics.recentEvents.slice(0, 15).map((evt: AIEvent) => (
                  <tr key={evt.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{evt.event_type}</td>
                    <td className="p-2.5 text-slate-500">{evt.path}</td>
                    <td className="p-2.5 text-slate-500 truncate max-w-[120px]">{evt.session_id}</td>
                    <td className="p-2.5 text-slate-500">{new Date(evt.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

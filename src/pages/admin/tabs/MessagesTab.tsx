import React, { useState } from 'react';
import {
  Mail,
  Trash2,
  Reply
} from 'lucide-react';
import { ContactMessage } from '../../../types';

interface MessagesTabProps {
  messages: ContactMessage[];
  onUpdateMessageStatus: (id: string, status: ContactMessage['status']) => void;
  onDeleteMessage: (id: string) => void;
}

export const MessagesTab: React.FC<MessagesTabProps> = ({
  messages,
  onUpdateMessageStatus,
  onDeleteMessage
}) => {
  // Track the id only; the message itself always comes from the latest props (no stale status).
  const [selectedId, setSelectedId] = useState<string | null>(messages[0]?.id ?? null);
  const selectedMessage = messages.find((m) => m.id === selectedId) || null;
  const setSelectedMessage = (m: ContactMessage | null) => setSelectedId(m ? m.id : null);
  const [filter, setFilter] = useState<'all' | 'new' | 'read' | 'replied' | 'archived'>('all');

  const filtered = messages.filter(m => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-500" />
            Contact Messages & Direct Inquiries
          </h2>
          <p className="text-xs text-zinc-500">
            Messages sent through the public contact form with automated status tracking.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono">
          {(['all', 'new', 'read', 'replied', 'archived'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                filter === f
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {f} ({f === 'all' ? messages.length : messages.filter(m => m.status === f).length})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs">
          No messages matching filter "{filter}".
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Messages List */}
          <div className="lg:col-span-5 space-y-2.5">
            {filtered.map((msg) => {
              const isSelected = selectedMessage?.id === msg.id;
              const isNew = msg.status === 'new';
              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg);
                    if (msg.status === 'new') {
                      onUpdateMessageStatus(msg.id, 'read');
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-xs'
                      : isNew
                      ? 'bg-amber-500/5 dark:bg-amber-500/5 border-amber-500/20'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm ${isNew ? 'font-black text-amber-600 dark:text-amber-400' : 'font-bold text-zinc-900 dark:text-zinc-100'}`}>
                      {msg.name}
                    </span>
                    {isNew && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </div>

                  <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {msg.subject || 'General Inquiry'}
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    {msg.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-zinc-400">
                    <span>{new Date(msg.created_at).toLocaleDateString()}</span>
                    <span className="capitalize text-zinc-500">{msg.status}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message Inspector */}
          {selectedMessage && (
            <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedMessage.subject || 'Inquiry'}
                  </h3>
                  <div className="text-xs text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
                    <span>From: {selectedMessage.name} &lt;{selectedMessage.email}&gt;</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Received: {new Date(selectedMessage.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedMessage.status}
                    onChange={(e) => onUpdateMessageStatus(selectedMessage.id, e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="new">Status: New</option>
                    <option value="read">Status: Read</option>
                    <option value="replied">Status: Replied</option>
                    <option value="archived">Status: Archived</option>
                  </select>

                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject || 'Inquiry')}`}
                    onClick={() => onUpdateMessageStatus(selectedMessage.id, 'replied')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </a>

                  <button
                    onClick={() => {
                      if (confirm(`Delete message from ${selectedMessage.name}?`)) {
                        onDeleteMessage(selectedMessage.id);
                        setSelectedMessage(null);
                      }
                    }}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message Content */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Message Body</label>
                <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.message}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Database,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Code2,
  Search
} from 'lucide-react';
import { KnowledgeDoc, KnowledgeChunk } from '../../../types';
import { errorText } from '../../../lib/content';

interface KnowledgeTabProps {
  knowledge: {
    documents: KnowledgeDoc[];
    chunks: KnowledgeChunk[];
    totalChunks?: number;
    embeddedChunks?: number;
    embeddingModel?: string;
    embeddingProviderConfigured?: boolean;
    embeddingPassRunning?: boolean;
    retrievalMode?: 'hybrid' | 'keyword';
  };
  onReindex: () => Promise<any>;
  onCreateDoc: (doc: Partial<KnowledgeDoc>) => Promise<any>;
  onDeleteDoc: (id: string) => Promise<any>;
}

export const KnowledgeTab: React.FC<KnowledgeTabProps> = ({
  knowledge,
  onReindex,
  onCreateDoc,
  onDeleteDoc
}) => {
  const [reindexing, setReindexing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedType, setSelectedType] = useState('custom');
  const [notice, setNotice] = useState<string | null>(null);

  const handleReindex = async () => {
    setReindexing(true);
    setNotice(null);
    try {
      const res = await onReindex();
      const base = `Re-indexed ${res.chunksCount} chunks (${res.alreadyEmbedded} already embedded).`;
      setNotice(
        res.embeddingQueued
          ? `${base} ${res.missingEmbeddings} chunk(s) are being embedded in the background — refresh later to see the count update.`
          : res.missingEmbeddings === 0
            ? `${base} All chunks have embeddings.`
            : res.embeddingProvider
              ? `${base} An embedding pass is already running.`
              : `${base} No embedding provider is configured (GEMINI_API_KEY), so retrieval uses keyword matching only.`
      );
    } catch (e) {
      setNotice(`Reindex failed: ${errorText(e) || 'Error'}`);
    } finally {
      setReindexing(false);
    }
  };

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;
    try {
      await onCreateDoc({
        title: newTitle,
        content: newContent,
        source_type: selectedType
      });
      setNewTitle('');
      setNewContent('');
      setNotice('Knowledge document added and indexed.');
    } catch (e) {
      setNotice(`Failed to add doc: ${errorText(e)}`);
    }
  };

  const filteredChunks = knowledge.chunks.filter(c =>
    c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.metadata?.type && c.metadata.type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isEmbedded = (c: KnowledgeChunk) => Boolean(c.embedded || (c.embedding && c.embedding.length > 0));
  const totalChunks = knowledge.totalChunks ?? knowledge.chunks.length;
  const embeddedChunksCount = knowledge.embeddedChunks ?? knowledge.chunks.filter(isEmbedded).length;
  const dimensions = knowledge.chunks.find((c) => c.dimensions)?.dimensions;
  const retrievalMode = knowledge.retrievalMode ?? (embeddedChunksCount > 0 ? 'hybrid' : 'keyword');

  const handleDeleteDoc = async (doc: KnowledgeDoc) => {
    if (!confirm(`Delete knowledge document "${doc.title}"? Its chunks are removed from the assistant.`)) return;
    try {
      await onDeleteDoc(doc.id);
      setNotice(`Deleted "${doc.title}".`);
    } catch (e) {
      setNotice(`Delete failed: ${errorText(e)}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-500" />
            AI RAG Vector Knowledge Base & Retrieval Index
          </h2>
          <p className="text-xs text-zinc-500">
            Grounding store powering Baraa's conversational AI assistant and semantic search engine.
          </p>
        </div>

        <button
          onClick={handleReindex}
          disabled={reindexing}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          {reindexing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Re-indexing...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>Rebuild Vector Index</span>
            </>
          )}
        </button>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* RAG Architecture Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase">Total Chunks</span>
          <div className="text-xl font-extrabold font-mono text-zinc-900 dark:text-zinc-100">{totalChunks}</div>
          <span className="text-[10px] text-zinc-500">Extracted from portfolio data</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase">Dense Vector Embeddings</span>
          <div className="text-xl font-extrabold font-mono text-emerald-500">{embeddedChunksCount} / {totalChunks}</div>
          <span className="text-[10px] text-zinc-500">{dimensions ? `${dimensions}-dimensional vectors` : 'No vectors stored yet'}{knowledge.embeddingPassRunning ? ' · embedding in progress' : ''}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase">Embedding Model</span>
          <div className="text-sm font-bold font-mono text-amber-500">{knowledge.embeddingModel || '—'}</div>
          <span className="text-[10px] text-zinc-500">{knowledge.embeddingProviderConfigured === false ? 'Provider not configured' : 'Configured provider'}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase">Retrieval Strategy</span>
          <div className="text-sm font-bold font-mono text-purple-500">{retrievalMode === 'hybrid' ? 'Hybrid (vector + keyword)' : 'Keyword only'}</div>
          <span className="text-[10px] text-zinc-500">{retrievalMode === 'hybrid' ? 'Cosine similarity blended with keyword score' : 'Bilingual keyword matching (no vectors)'}</span>
        </div>
      </div>

      {/* Add Custom Grounding Document */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Plus className="w-4 h-4 text-amber-500" />
          Add Custom Grounding Document
        </h3>
        <form onSubmit={handleCreateDoc} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                required
                placeholder="Document Title (e.g. Preferred Architecture Patterns & Pricing Guidelines)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
              />
            </div>
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono"
              >
                <option value="custom">Custom Knowledge</option>
                <option value="faq">FAQ Grounding</option>
                <option value="pricing">Pricing Policy</option>
                <option value="architecture">Engineering Principles</option>
              </select>
            </div>
          </div>

          <textarea
            rows={3}
            required
            placeholder="Document Content for the AI assistant to reference during user queries..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold"
            >
              Add Document & Re-index
            </button>
          </div>
        </form>
      </div>

      {/* Grounding documents (custom knowledge) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Knowledge Documents ({knowledge.documents.length})</h3>
        {knowledge.documents.length === 0 ? (
          <p className="text-xs text-zinc-500">No custom documents yet. Profile, projects, services, blog posts and experience are indexed automatically.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {knowledge.documents.map((doc) => (
              <li key={doc.id} className="py-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{doc.title}</p>
                  <p className="text-[10px] font-mono text-zinc-500">
                    {doc.source_type} · {doc.status} · {doc.chunks_count} chunk(s){doc.last_indexed_at ? ` · ${new Date(doc.last_indexed_at).toLocaleString()}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteDoc(doc)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-colors shrink-0"
                  title="Delete document"
                  aria-label={`Delete ${doc.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Chunks Explorer */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-zinc-400" />
            Index Chunks Explorer ({filteredChunks.length})
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter chunks by keyword..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredChunks.map((chunk) => (
            <div
              key={chunk.id}
              className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
                <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-amber-600 dark:text-amber-400 font-semibold">
                  {chunk.metadata?.type || 'chunk'}
                </span>
                <span className={isEmbedded(chunk) ? 'text-emerald-500 font-bold' : 'text-zinc-500'}>
                  {isEmbedded(chunk) ? `✓ Vector embedded${chunk.dimensions ? ` (${chunk.dimensions}-dim)` : ''}` : 'Keyword indexed'}
                </span>
              </div>

              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-mono text-[11px] line-clamp-3">
                {chunk.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

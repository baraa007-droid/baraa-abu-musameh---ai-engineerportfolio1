import { db } from '../server/db';
import { KnowledgeDocument, KnowledgeChunk } from '../src/types';

async function runRAGCleanupRegressionTests() {
  console.log('====================================================');
  console.log('RAG Document Deletion & Chunk Cleanup Regression Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${details ? ': ' + details : ''}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------
  // TEST 1: Create document with multiple chunks -> delete -> doc & all chunks gone
  // -----------------------------------------------------------------
  console.log('[TEST 1] Create document with multiple chunks, then delete');
  const multiChunkContent = [
    'Section 1: Advanced deep learning architecture optimization and pruning techniques.',
    'Section 2: High throughput model quantization using INT8 and FP8 precision formats.',
    'Section 3: Distributed inference serving with vLLM and TensorRT-LLM on GPU clusters.'
  ].join('\n\n');

  const doc1 = db.createKnowledgeDoc({
    title: 'Distributed Inference Optimization Guide',
    source_type: 'custom',
    content: multiChunkContent,
    status: 'indexed'
  });

  const doc1Id = doc1.id;
  const initialChunksDoc1 = db.getChunks().filter(c => c.document_id === doc1Id);
  assert(initialChunksDoc1.length >= 3, `Doc 1 created with multiple chunks (found ${initialChunksDoc1.length} chunks)`);
  assert(
    db.getKnowledgeDocs().some(d => d.id === doc1Id),
    'Doc 1 is present in knowledge docs list'
  );

  // Now delete doc 1
  const deleteResult1 = db.deleteKnowledgeDoc(doc1Id);
  assert(deleteResult1 === true, 'deleteKnowledgeDoc returned true for doc 1');

  const doc1AfterDelete = db.getKnowledgeDocs().find(d => d.id === doc1Id);
  assert(!doc1AfterDelete, 'Doc 1 is completely removed from knowledge documents');

  const chunks1AfterDelete = db.getChunks().filter(c => c.document_id === doc1Id);
  assert(
    chunks1AfterDelete.length === 0,
    `All chunks belonging to Doc 1 are completely removed (found ${chunks1AfterDelete.length})`
  );

  // -----------------------------------------------------------------
  // TEST 2: Create Doc A + chunks, Doc B + chunks -> delete A -> A gone, B intact
  // -----------------------------------------------------------------
  console.log('\n[TEST 2] Two documents isolation: delete Doc A, verify Doc B chunks persist');
  const docA = db.createKnowledgeDoc({
    title: 'Document Alpha - Autonomous Agents',
    source_type: 'custom',
    content: 'Agent Alpha specializes in task decomposition.\n\nAgent Alpha executes sub-tasks in parallel.',
    status: 'indexed'
  });

  const docB = db.createKnowledgeDoc({
    title: 'Document Beta - Vector Databases',
    source_type: 'custom',
    content: 'Vector DB Beta indexes embeddings using Hierarchical Navigable Small World graphs.\n\nVector DB Beta supports hybrid filtering.',
    status: 'indexed'
  });

  const chunksA = db.getChunks().filter(c => c.document_id === docA.id);
  const chunksB = db.getChunks().filter(c => c.document_id === docB.id);
  assert(chunksA.length >= 2, `Doc A has ${chunksA.length} chunks before deletion`);
  assert(chunksB.length >= 2, `Doc B has ${chunksB.length} chunks before deletion`);

  // Delete Doc A
  const deleteAResult = db.deleteKnowledgeDoc(docA.id);
  assert(deleteAResult === true, 'Doc A deleted successfully');

  // Verify Doc A is gone and Doc A's chunks are gone
  assert(!db.getKnowledgeDocs().some(d => d.id === docA.id), 'Doc A is not in knowledge docs');
  assert(
    db.getChunks().filter(c => c.document_id === docA.id).length === 0,
    'All chunks for Doc A are completely deleted'
  );

  // Verify Doc B and its chunks are completely intact
  assert(db.getKnowledgeDocs().some(d => d.id === docB.id), 'Doc B still exists in knowledge docs');
  const chunksBAfter = db.getChunks().filter(c => c.document_id === docB.id);
  assert(
    chunksBAfter.length === chunksB.length,
    `Doc B chunks remain intact (${chunksBAfter.length}/${chunksB.length} chunks preserved)`
  );

  // Clean up Doc B
  db.deleteKnowledgeDoc(docB.id);
  assert(
    db.getChunks().filter(c => c.document_id === docB.id).length === 0,
    'Doc B chunks cleaned up after test'
  );

  // -----------------------------------------------------------------
  // TEST 3: Delete document without chunks -> no crash
  // -----------------------------------------------------------------
  console.log('\n[TEST 3] Delete document without chunks (empty content or pending status)');
  let docWithoutChunks: KnowledgeDocument;
  try {
    docWithoutChunks = db.createKnowledgeDoc({
      title: 'Empty Draft Knowledge Document',
      source_type: 'custom',
      content: '', // Empty content produces 0 chunks
      status: 'pending' // Not indexed
    });
  } catch (e: any) {
    console.error('Failed to create doc without chunks:', e);
    docWithoutChunks = {
      id: `know-empty-${Date.now()}`,
      title: 'Empty Draft Knowledge Document',
      source_type: 'custom',
      content: '',
      status: 'pending',
      chunks_count: 0,
      last_indexed_at: new Date().toISOString()
    };
    (db as any).data.knowledge.push(docWithoutChunks);
  }

  const chunksBeforeDelete = db.getChunks().filter(c => c.document_id === docWithoutChunks.id);
  assert(chunksBeforeDelete.length === 0, 'Document has 0 chunks before delete');

  let test3Passed = false;
  try {
    const deleteEmptyResult = db.deleteKnowledgeDoc(docWithoutChunks.id);
    test3Passed = deleteEmptyResult === true;
    assert(test3Passed, 'db.deleteKnowledgeDoc executed without crash on 0-chunk doc');
    assert(
      !db.getKnowledgeDocs().some(d => d.id === docWithoutChunks.id),
      'Document without chunks is cleanly removed'
    );
  } catch (err: any) {
    assert(false, 'db.deleteKnowledgeDoc crashed on 0-chunk doc', err.message);
  }

  // Also test deleting a completely non-existent ID
  try {
    const nonExistentResult = db.deleteKnowledgeDoc('know-non-existent-id-999999');
    assert(
      nonExistentResult === false,
      'db.deleteKnowledgeDoc handles non-existent ID gracefully without crash'
    );
  } catch (err: any) {
    assert(false, 'db.deleteKnowledgeDoc crashed on non-existent ID', err.message);
  }

  // -----------------------------------------------------------------
  // TEST 4: Reindexing / document lifecycle produces zero orphan chunks
  // -----------------------------------------------------------------
  console.log('\n[TEST 4] Reindexing lifecycle integrity (no orphan chunks)');

  // Run a complete reindexing cycle
  const reindexedChunks = db.reindexAllKnowledge();
  assert(Array.isArray(reindexedChunks) && reindexedChunks.length > 0, 'Reindex completed successfully');

  // Verify that EVERY chunk points to a valid, existing entity
  const validDocIds = new Set<string>([
    'know-1', // Profile, skills, experience, education
    'know-2', // Services
    'know-3', // Projects
    ...db.getBlogPosts(false).map(b => b.id),
    ...db.getKnowledgeDocs().map(d => d.id)
  ]);

  const orphanChunks = reindexedChunks.filter(chunk => {
    return !validDocIds.has(chunk.document_id);
  });

  assert(
    orphanChunks.length === 0,
    `Zero orphan chunks detected after full reindexing (orphans found: ${orphanChunks.length})`
  );

  if (orphanChunks.length > 0) {
    console.error('Orphan chunks details:', orphanChunks.map(c => ({ id: c.id, doc_id: c.document_id })));
  }

  console.log('\n====================================================');
  console.log(`RAG Cleanup Regression Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRAGCleanupRegressionTests().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});

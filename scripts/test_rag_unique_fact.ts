import { db } from '../server/db';
import { retrieveRelevantContext, chatWithBaraaAI } from '../server/ai';

async function runUniqueFactTest() {
  console.log('====================================================');
  console.log('RAG Unique Fact Verification Test: PROJECT_AUDIT_UNIQUE_FACT_84721');
  console.log('====================================================\n');

  const UNIQUE_FACT_ID = 'know-test-84721';
  const UNIQUE_FACT_TEXT = 'Baraa Abu Musameh won the 2026 Global AI Innovation Trophy for PROJECT_AUDIT_UNIQUE_FACT_84721.';

  // Step 1 & 2: Create knowledge document & index
  console.log('[Step 1 & 2] Creating and Indexing Knowledge Document...');
  const newDoc = db.createKnowledgeDoc({
    title: 'Unique Audit Fact Document 84721',
    source_type: 'custom',
    content: UNIQUE_FACT_TEXT,
    status: 'indexed'
  });
  console.log(`Created doc ID: ${newDoc.id}`);

  // Step 3: Verify chunk creation
  const chunks = db.getChunks();
  const foundChunk = chunks.find(c => c.content.includes('PROJECT_AUDIT_UNIQUE_FACT_84721'));
  console.log(`Chunk created? ${!!foundChunk}`);
  if (foundChunk) {
    console.log(`Chunk ID: ${foundChunk.id}`);
    console.log(`Chunk Content: "${foundChunk.content}"`);
  }

  // Step 4 & 5 & 6: Retrieval & Context Verification
  const query = 'What trophy did Baraa win for PROJECT_AUDIT_UNIQUE_FACT_84721?';
  console.log(`\n[Step 4-6] Querying RAG retrieval engine: "${query}"`);
  const retrieval = await retrieveRelevantContext(query, 5);

  const factInContext = retrieval.contextText.includes('PROJECT_AUDIT_UNIQUE_FACT_84721');
  console.log(`Fact present in retrieved context? ${factInContext}`);
  console.log(`Retrieved context snippet: \n"""\n${retrieval.contextText.slice(0, 300)}...\n"""`);

  // Step 7: Chat Agent Response Test
  console.log('\n[Step 7] Calling Chat Assistant with query...');
  const chatResponse = await chatWithBaraaAI({ message: query });
  console.log(`Retrieval Method: ${chatResponse.retrieval_method}`);
  console.log(`Chat Response: "${chatResponse.text}"`);
  const factInResponse = chatResponse.text.includes('84721') || chatResponse.text.includes('Trophy') || chatResponse.text.includes('PROJECT_AUDIT_UNIQUE_FACT_84721') || chatResponse.text.includes('2026');
  console.log(`Fact present in chat response? ${factInResponse}`);

  // Step 8 & 9: Delete document & Reindex
  console.log('\n[Step 8 & 9] Deleting test document and reindexing...');
  db.deleteKnowledgeDoc(newDoc.id);
  const updatedChunks = db.getChunks();
  const chunkAfterDelete = updatedChunks.find(c => c.content.includes('PROJECT_AUDIT_UNIQUE_FACT_84721'));
  console.log(`Chunk still exists after delete? ${!!chunkAfterDelete}`);

  // Step 10: Query again post-deletion
  console.log('\n[Step 10] Querying post-deletion...');
  const postDeleteRetrieval = await retrieveRelevantContext(query, 5);
  const factInPostContext = postDeleteRetrieval.contextText.includes('PROJECT_AUDIT_UNIQUE_FACT_84721');
  console.log(`Fact present in post-deletion context? ${factInPostContext}`);

  console.log('\n====================================================');
  console.log('RAG Unique Fact Test Results:');
  console.log(`- Document Creation & Indexing: ${newDoc ? 'SUCCESS' : 'FAIL'}`);
  console.log(`- Chunking: ${foundChunk ? 'SUCCESS' : 'FAIL'}`);
  console.log(`- Context Retrieval: ${factInContext ? 'SUCCESS' : 'FAIL'}`);
  console.log(`- Deletion Clean-up: ${!chunkAfterDelete && !factInPostContext ? 'SUCCESS' : 'FAIL'}`);
  console.log('====================================================');
}

runUniqueFactTest().catch(console.error);

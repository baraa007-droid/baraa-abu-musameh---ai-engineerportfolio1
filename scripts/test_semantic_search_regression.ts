import { semanticPortfolioSearch } from '../server/ai';
import { db } from '../server/db';
import { Project, Service, BlogPost } from '../src/types';

async function runSemanticSearchRegressionTests() {
  console.log('====================================================');
  console.log('Semantic Search Regression Test Suite');
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

  // Backup existing data
  const originalProjects = [...db.getProjects()];
  const originalServices = [...db.getServices()];
  const originalBlog = [...db.getBlogPosts(true)];

  try {
    // -----------------------------------------------------------------
    // TEST 1: Project with undefined technologies, features, results, tags
    // -----------------------------------------------------------------
    console.log('[Test Group 1] Incomplete Project Data (undefined arrays)');
    const legacyProject: Project = {
      id: 'proj-legacy-test',
      slug: 'legacy-project-test',
      title: 'Legacy Autonomous Robotic Arm',
      category: 'AI Solutions',
      featured: true,
      cover_image: '/images/projects/arm.webp',
      short_description: 'An early AI robotic control prototype without structured tech array.',
      full_description: 'Detailed description of robotic arm.',
      status: 'completed',
      // Simulating undefined array fields from legacy data stores
      technologies: undefined as unknown as string[],
      features: undefined as unknown as string[],
      results: undefined as unknown as string[],
      tags: undefined as unknown as string[]
    };

    // Temporarily inject legacy project
    (db as any).data.projects.push(legacyProject);

    let test1Result;
    try {
      test1Result = await semanticPortfolioSearch('Robotic Arm');
      assert(true, 'Search does not crash when project.technologies/features/tags are undefined');
      assert(
        test1Result.projects.some(p => p.id === 'proj-legacy-test'),
        'Legacy project is matched and retrieved by title/description keywords'
      );
    } catch (err: any) {
      assert(false, 'Search does not crash when project arrays are undefined', err.message);
    }

    // -----------------------------------------------------------------
    // TEST 2: Service with undefined features, technologies, deliverables
    // -----------------------------------------------------------------
    console.log('\n[Test Group 2] Incomplete Service Data (undefined arrays)');
    const legacyService: Service = {
      id: 'srv-legacy-test',
      slug: 'legacy-service-test',
      title: 'Legacy Quantum Algorithm Consulting',
      category: 'AI Solutions',
      active: true,
      short_description: 'Advisory on quantum machine learning architectures.',
      full_description: 'Full description of quantum consulting.',
      starting_price: '$5,000',
      timeline: '2 weeks',
      // Simulating undefined array fields
      features: undefined as unknown as string[],
      technologies: undefined as unknown as string[],
      deliverables: undefined as unknown as string[]
    };

    (db as any).data.services.push(legacyService);

    let test2Result;
    try {
      test2Result = await semanticPortfolioSearch('Quantum Algorithm');
      assert(true, 'Search does not crash when service.features/technologies are undefined');
      assert(
        test2Result.services.some(s => s.id === 'srv-legacy-test'),
        'Legacy service is matched and retrieved by title/description keywords'
      );
    } catch (err: any) {
      assert(false, 'Search does not crash when service arrays are undefined', err.message);
    }

    // -----------------------------------------------------------------
    // TEST 3: BlogPost with undefined tags
    // -----------------------------------------------------------------
    console.log('\n[Test Group 3] Incomplete BlogPost Data (undefined tags)');
    const legacyPost: BlogPost = {
      id: 'post-legacy-test',
      slug: 'legacy-post-test',
      title: 'Deep Dive into Neuromorphic Chips',
      category: 'Hardware AI',
      excerpt: 'Exploring brain-inspired neuromorphic computing architectures.',
      content: 'Detailed discussion on spiking neural networks and synaptic weights.',
      read_time: '6 min',
      cover_image: '/images/blog/chips.webp',
      published: true,
      published_at: new Date().toISOString(),
      views_count: 10,
      tags: undefined as unknown as string[]
    };

    (db as any).data.blog.push(legacyPost);

    let test3Result;
    try {
      test3Result = await semanticPortfolioSearch('Neuromorphic');
      assert(true, 'Search does not crash when blog.tags is undefined');
      assert(
        test3Result.blogPosts.some(b => b.id === 'post-legacy-test'),
        'Legacy blog post is matched and retrieved by title/excerpt keywords'
      );
    } catch (err: any) {
      assert(false, 'Search does not crash when blog tags are undefined', err.message);
    }

    // -----------------------------------------------------------------
    // TEST 4: Normal case with complete arrays and bilingual search
    // -----------------------------------------------------------------
    console.log('\n[Test Group 4] Standard Normal Case (complete arrays & bilingual)');
    const standardProject: Project = {
      id: 'proj-standard-test',
      slug: 'standard-rag-system',
      title: 'NeuralVector Engine',
      category: 'AI Solutions',
      featured: true,
      cover_image: '/images/projects/vector.webp',
      short_description: 'High performance vector database indexing system.',
      full_description: 'A custom vector store implementation.',
      technologies: ['VectorDB', 'HNSW', 'Rust', 'TypeScript'],
      features: ['Sub-millisecond latency', 'Hybrid BM25 search', 'Auto-chunking'],
      results: ['10x speedup over brute-force search'],
      tags: ['vector-search', 'rag', 'embeddings'],
      status: 'completed'
    };

    (db as any).data.projects.push(standardProject);

    const normalResult = await semanticPortfolioSearch('HNSW hybrid BM25');
    assert(
      normalResult.projects.some(p => p.id === 'proj-standard-test'),
      'Standard project matches successfully on technologies and features arrays'
    );
    assert(
      typeof normalResult.aiSummary === 'string' && normalResult.aiSummary.length > 0,
      'Search generates AI summary without throwing'
    );

    // Bilingual Arabic query test
    const arabicResult = await semanticPortfolioSearch('نظام ذكاء اصطناعي وبحث دلالي');
    assert(
      arabicResult.projects.length > 0 || arabicResult.services.length > 0,
      'Arabic semantic query returns matching results safely'
    );

  } finally {
    // Restore original state
    (db as any).data.projects = originalProjects;
    (db as any).data.services = originalServices;
    (db as any).data.blog = originalBlog;
  }

  console.log('\n====================================================');
  console.log(`Semantic Search Regression Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSemanticSearchRegressionTests().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});

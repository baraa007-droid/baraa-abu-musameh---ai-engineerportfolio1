/**
 * Render smoke tests: every public page and the main admin tabs must render on the server
 * (no `window` access during render, no crash on empty or partial data).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LanguageProvider } from '../../src/context/LanguageContext';
import { ThemeProvider } from '../../src/context/ThemeContext';
import { HomePage } from '../../src/pages/HomePage';
import { AboutPage } from '../../src/pages/AboutPage';
import { ProjectsPage } from '../../src/pages/ProjectsPage';
import { ServicesPage } from '../../src/pages/ServicesPage';
import { BlogPage } from '../../src/pages/BlogPage';
import { ContactPage } from '../../src/pages/ContactPage';
import { Footer } from '../../src/components/layout/Footer';
import { GlobalCTA } from '../../src/components/cta/GlobalCTA';
import { LeadsTab } from '../../src/pages/admin/tabs/LeadsTab';
import { MessagesTab } from '../../src/pages/admin/tabs/MessagesTab';
import { KnowledgeTab } from '../../src/pages/admin/tabs/KnowledgeTab';

const noop = () => {};
const wrap = (node: React.ReactNode) =>
  renderToString(
    <LanguageProvider>
      <ThemeProvider>{node}</ThemeProvider>
    </LanguageProvider>
  );

const profile: any = {
  name: 'Test Person', title: 'Engineer', headline: 'h', bio: 'b', email: 'person@example.com',
  github_url: 'javascript:alert(1)', linkedin_url: 'https://linkedin.example/in/x', available_for_freelance: false
};
const project: any = { id: 'p1', slug: 'p1', title: 'Project One', category: 'AI', short_description: 's', technologies: ['TS'], gallery: ['https://img.example/1.png'] };
const service: any = { id: 's1', slug: 's1', title: 'Service One', category: 'Web', short_description: 's', features: [], technologies: [], active: true };

test('public pages render with empty data', () => {
  const html = wrap(
    <>
      <HomePage profile={null} projects={[]} services={[]} skills={[]} blogPosts={[]} testimonials={[]} navigate={noop} openAIAssistantWithQuery={noop} openAdvisorModal={noop} />
      <AboutPage profile={null} experience={[]} education={[]} certificates={[]} courses={[]} skills={[]} navigate={noop} openAdvisorModal={noop} />
      <ProjectsPage projects={[]} navigate={noop} openAdvisorModal={noop} />
      <ServicesPage services={[]} navigate={noop} openAdvisorModal={noop} />
      <BlogPage blogPosts={[]} navigate={noop} />
      <ContactPage profile={null} settings={null} navigate={noop} openAIAssistantWithQuery={noop} />
      <Footer profile={null} settings={null} navigate={noop} openAIAssistant={noop} />
    </>
  );
  assert.ok(html.length > 1000);
  assert.doesNotMatch(html, /baraamusameh/, 'no guessed social profile links');
});

test('pages render real-shaped data and drop unsafe links', () => {
  const html = wrap(
    <>
      <HomePage profile={profile} projects={[project]} services={[service]} skills={[]} blogPosts={[]} testimonials={[{ id: 't', name: 'N', position: 'CTO', company: 'C', content: 'x', rating: 5, published: true } as any]} navigate={noop} openAIAssistantWithQuery={noop} openAdvisorModal={noop} />
      <ProjectsPage projects={[project]} navigate={noop} openAdvisorModal={noop} />
      <AboutPage profile={profile} experience={[{ id: 'e1', role: 'Past Role', company: 'Old Co', start_date: '2020-01', end_date: '2021-01', current: false, description: '', technologies: [] } as any]} education={[]} certificates={[]} courses={[]} skills={[]} navigate={noop} openAdvisorModal={noop} />
      <Footer profile={profile} settings={{ social_links: { kaggle: 'https://kaggle.example/x' } } as any} navigate={noop} openAIAssistant={noop} />
    </>
  );
  assert.match(html, /https:\/\/img\.example\/1\.png/, 'project image taken from gallery');
  assert.match(html, /CTO/, 'testimonial position shown');
  assert.match(html, /Past Role/, 'past experience is listed');
  assert.match(html, /kaggle\.example/, 'social links from settings rendered');
  assert.doesNotMatch(html, /javascript:alert/, 'javascript: URL never rendered');
});

test('markdown (blog posts, chat answers) neutralises script URLs and raw HTML', async () => {
  const { default: Markdown } = await import('react-markdown');
  const html = renderToString(<Markdown>{'[x](javascript:alert(1)) <img src=x onerror=alert(1)> <script>alert(2)</script>'}</Markdown>);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.doesNotMatch(html, /<img|<script/);
});

test('global CTA renders without crashing for hostile URLs', () => {
  const html = wrap(<GlobalCTA settings={{ cta_enabled: true, cta_banner_enabled: true, cta_title: 'T', cta_primary_url: 'javascript:alert(1)' } as any} navigate={noop} />);
  assert.doesNotMatch(html, /javascript:alert/);
});

test('admin tabs render with partial records', () => {
  const html = wrap(
    <>
      <LeadsTab leads={[{ id: 'l1', name: 'Lead', email: 'l@example.com', project_type: 'x', budget_range: 'Not specified', deadline: 'Not specified', description: 'd', required_features: [], communication_pref: 'Email', priority: 'medium', status: 'new', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), scored_by: 'pending', reference_links: ['javascript:x', 'https://ref.example'] } as any]} onUpdateLeadStatus={noop} onUpdateLeadNotes={noop} onDeleteLead={noop} />
      <MessagesTab messages={[]} onUpdateMessageStatus={noop} onDeleteMessage={noop} />
      <KnowledgeTab knowledge={{ documents: [], chunks: [], totalChunks: 0, embeddedChunks: 0, retrievalMode: 'keyword' } as any} onReindex={async () => ({})} onCreateDoc={async () => ({})} onDeleteDoc={async () => ({})} />
    </>
  );
  assert.match(html, /Not scored/, 'unscored lead is not shown with a made-up score');
  assert.match(html, /Keyword only/, 'retrieval mode reflects reality');
  assert.match(html, /ref\.example/);
  assert.doesNotMatch(html, /javascript:x/);
});

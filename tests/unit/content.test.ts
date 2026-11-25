import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeUrl, safeImageSrc, slugify, getProjectImage, getProjectGallery, getTestimonialRole, isServiceActive } from '../../src/lib/content';
import { storageGet, storageSet, takePrefill } from '../../src/lib/storage';

test('safeUrl accepts http(s) and same-site paths only', () => {
  assert.equal(safeUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(safeUrl('/projects/x'), '/projects/x');
  assert.equal(safeUrl('javascript:alert(1)'), undefined);
  assert.equal(safeUrl('JAVASCRIPT:alert(1)'), undefined);
  assert.equal(safeUrl('data:text/html,<script>'), undefined);
  assert.equal(safeUrl('//evil.example/x'), undefined);
  assert.equal(safeUrl(''), undefined);
  assert.equal(safeUrl(42), undefined);
  assert.equal(safeUrl('mailto:a@b.co'), undefined);
  assert.equal(safeUrl('mailto:a@b.co', { allowMailto: true }), 'mailto:a@b.co');
});

test('safeImageSrc allows inline base64 images but not other data: URLs', () => {
  assert.ok(safeImageSrc('data:image/webp;base64,AAAA'));
  assert.equal(safeImageSrc('data:image/svg+xml;base64,AAAA'), undefined);
  assert.equal(safeImageSrc('data:text/html;base64,AAAA'), undefined);
});

test('slugify keeps Arabic letters and never returns an empty slug', () => {
  assert.equal(slugify('Hello World!'), 'hello-world');
  assert.equal(slugify('منصة ذكاء اصطناعي'), 'منصة-ذكاء-اصطناعي');
  assert.match(slugify('!!!', 'post'), /^post-[a-z0-9]+$/);
});

test('getProjectImage prefers the admin field, then the seed cover, then the gallery', () => {
  assert.equal(getProjectImage({ image_url: 'https://a/1.png', cover_image: 'https://a/2.png' } as any), 'https://a/1.png');
  assert.equal(getProjectImage({ cover_image: 'https://a/2.png' } as any), 'https://a/2.png');
  assert.equal(getProjectImage({ gallery: ['javascript:x', 'https://a/3.png'] } as any), undefined);
  assert.equal(getProjectImage({ gallery: ['https://a/3.png'] } as any), 'https://a/3.png');
  assert.deepEqual(getProjectGallery({ gallery: ['https://a/3.png', 'javascript:x', 'https://a/3.png'] } as any), ['https://a/3.png']);
});

test('testimonial role and service visibility helpers', () => {
  assert.equal(getTestimonialRole({ position: 'CTO' } as any), 'CTO');
  assert.equal(getTestimonialRole({ role: 'Founder' } as any), 'Founder');
  assert.equal(isServiceActive({ active: false } as any), false);
  assert.equal(isServiceActive({} as any), true);
});

test('storage helpers never throw without a browser and prefill is one-shot', () => {
  assert.equal(storageGet('local', 'x'), null);
  assert.doesNotThrow(() => storageSet('session', 'x', 'y'));
  assert.equal(takePrefill(), null);
});

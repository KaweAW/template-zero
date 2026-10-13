import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildClientFiles, leadSchema, loadBaseData, slugify } from '../../lib/lead';
import { contentSchema, siteConfigSchema } from '../../lib/schemas';

const lead = leadSchema.parse({
  name: 'Chez Éric & Fils',
  cuisine: ['française'],
  address: { street: '1 rue X', postalCode: '69002', city: 'Lyon' },
  phone: '+33 4 00 00 00 00',
  email: 'a@b.example',
  locales: ['fr', 'en'],
  reviews: { rating: 4.6, count: 120 },
});

describe('slugify', () => {
  it('removes accents and symbols', () =>
    assert.equal(slugify('Chez Éric & Fils'), 'chez-eric-fils'));
  it('never returns an empty slug', () => assert.equal(slugify('!!!'), 'client'));
});

describe('leadSchema', () => {
  it('applies French defaults', () => {
    assert.deepEqual(lead.address.country, 'FR');
    assert.equal(lead.timezone, 'Europe/Paris');
  });
  it('rejects a missing e-mail', () => {
    assert.equal(leadSchema.safeParse({ ...lead, email: undefined }).success, false);
  });
});

describe('buildClientFiles', () => {
  const result = buildClientFiles(lead, loadBaseData());
  it('produces a valid, noindex preview config', () => {
    const config = siteConfigSchema.parse(result.files['config.json']);
    assert.equal(config.preview?.enabled, true);
    assert.equal(config.name, 'Chez Éric & Fils');
    assert.deepEqual(config.locales, ['fr', 'en']);
    assert.equal(config.features.caseStudy, false);
  });
  it('writes content and menu for exactly the chosen languages', () => {
    assert.ok(result.files['content.fr.json'] && result.files['content.en.json']);
    assert.equal(result.files['content.de.json'], undefined);
    contentSchema.parse(result.files['content.fr.json']);
  });
  it('warns about missing hours and legal notices', () => {
    assert.ok(result.warnings.some((w) => w.includes('opening hours')));
    assert.ok(result.warnings.some((w) => w.includes('mentions légales')));
  });
  it('uses the form only when there is no WhatsApp number', () => {
    const config = siteConfigSchema.parse(result.files['config.json']);
    assert.equal(config.reservation.mode, 'form');
  });
});

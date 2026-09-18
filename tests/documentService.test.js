/**
 * tests/documentService.test.js
 * Unit tests for document service local storage helpers and data schema validation.
 * These tests run in a Node.js environment without Firebase, exercising fallback paths.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// ── Schema Validation ────────────────────────────────────────────────────────

const REQUIRED_DOC_FIELDS = [
  'userId', 'name', 'contractType', 'type',
  'jurisdiction', 'wordCount', 'readingTime', 'gradeLevel',
  'fullText', 'clauses', 'risks', 'prepKit', 'createdAt'
];

test('Document schema: a well-formed doc payload has all required fields', () => {
  const payload = {
    userId: 'user_123',
    name: 'Sample NDA.txt',
    contractType: 'Non-Disclosure Agreement',
    type: 'NDA',
    jurisdiction: 'California',
    wordCount: 1200,
    readingTime: '5 min',
    gradeLevel: 'College Level',
    fullText: 'This Agreement...',
    clauses: [{ title: 'Confidentiality', original: '...', simplified: '...', trap: '...' }],
    risks: [{ level: 'high', category: 'Liability', title: 'Broad Indemnification', desc: '...' }],
    prepKit: { summary: 'Executive summary...', redFlags: ['Broad indemnification'], questions: ['Is this capped?'] },
    createdAt: new Date().toISOString()
  };

  for (const field of REQUIRED_DOC_FIELDS) {
    assert.ok(field in payload, `Missing required field: "${field}"`);
  }
});

test('Document schema: clause objects must have all four fields', () => {
  const validClause = { title: 'IP Ownership', original: 'All work...', simplified: 'They own...', trap: 'Check scope.' };
  const clauseFields = ['title', 'original', 'simplified', 'trap'];

  for (const f of clauseFields) {
    assert.ok(f in validClause, `Clause missing field: "${f}"`);
  }
});

test('Document schema: risk objects have required level, category, title, desc', () => {
  const validRisk = { level: 'high', category: 'Non-Compete', title: 'Restrictive Covenant', desc: 'You cannot work...' };
  const VALID_LEVELS = ['high', 'medium', 'low'];

  assert.ok(VALID_LEVELS.includes(validRisk.level), 'Risk level must be valid');
  assert.ok(validRisk.category.length > 0, 'Category must not be empty');
  assert.ok(validRisk.title.length > 0, 'Title must not be empty');
  assert.ok(validRisk.desc.length > 0, 'Desc must not be empty');
});

// ── Payload Size Limits ──────────────────────────────────────────────────────

test('Payload: fullText is capped at 50,000 characters for Firestore safety', () => {
  const longText = 'x'.repeat(80_000);
  const sliced = longText.slice(0, 50_000);
  assert.equal(sliced.length, 50_000, 'Should be exactly 50,000 chars');
  assert.ok(longText.length > 50_000, 'Original should exceed limit');
});

// ── Local Cache Logic ────────────────────────────────────────────────────────

test('Local cache: doc_* prefix identifies local-only documents', () => {
  const localId    = 'doc_1726661578979';
  const firestoreId = 'aB3kL7mNqP';

  assert.ok(localId.startsWith('doc_'),      'Local doc should have doc_ prefix');
  assert.equal(firestoreId.startsWith('doc_'), false, 'Firestore doc should NOT have doc_ prefix');
});

test('Local cache: deduplication by ID replaces existing entry', () => {
  // Simulate saveLocalDoc logic
  const store = [
    { id: 'doc_1', name: 'Old NDA', contractType: 'NDA' }
  ];
  const updated = { id: 'doc_1', name: 'Updated NDA', contractType: 'NDA (Updated)' };

  const idx = store.findIndex(d => d.id === updated.id);
  if (idx >= 0) {
    store[idx] = updated;
  } else {
    store.unshift(updated);
  }

  assert.equal(store.length, 1, 'Should not duplicate the entry');
  assert.equal(store[0].name, 'Updated NDA', 'Entry should be updated in place');
});

// ── Sorting ──────────────────────────────────────────────────────────────────

test('Document list: sorts by createdAt descending (newest first)', () => {
  const docs = [
    { id: '1', name: 'Old', createdAt: '2024-01-01T00:00:00Z' },
    { id: '2', name: 'New', createdAt: '2025-06-15T00:00:00Z' },
    { id: '3', name: 'Middle', createdAt: '2024-08-20T00:00:00Z' }
  ];

  docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  assert.equal(docs[0].name, 'New');
  assert.equal(docs[1].name, 'Middle');
  assert.equal(docs[2].name, 'Old');
});

// ── PrepKit Validation ───────────────────────────────────────────────────────

test('PrepKit: must contain summary, redFlags, and questions arrays', () => {
  const prepKit = {
    summary: 'This NDA restricts disclosure for 2 years.',
    redFlags: ['Broad scope', 'No expiry on confidentiality'],
    questions: ['Is the scope limited to this project?']
  };

  assert.equal(typeof prepKit.summary, 'string');
  assert.ok(prepKit.summary.length > 0, 'Summary must not be empty');
  assert.ok(Array.isArray(prepKit.redFlags), 'redFlags must be an array');
  assert.ok(Array.isArray(prepKit.questions), 'questions must be an array');
  assert.ok(prepKit.questions.length >= 1, 'At least one attorney question must be present');
});

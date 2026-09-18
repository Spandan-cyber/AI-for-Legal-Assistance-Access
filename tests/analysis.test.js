/**
 * tests/analysis.test.js
 * Unit tests for contract analysis engine (heuristic fallback path).
 * All tests run without a Gemini API key, exercising the rule-based analyzer.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeContractWithGemini } from '../js/geminiService.js';
import { SAMPLES } from '../js/sampleData.js';

// ── Sample Data Integrity ────────────────────────────────────────────────────

test('Sample contract data: required keys exist on all samples', () => {
  const requiredKeys = ['name', 'wordCount', 'readingTime', 'clauses', 'risks', 'prepKit'];
  for (const [key, sample] of Object.entries(SAMPLES)) {
    for (const rk of requiredKeys) {
      assert.ok(rk in sample, `Sample "${key}" is missing required key "${rk}"`);
    }
  }
});

test('Sample contract data: lease sample has correct structure', () => {
  assert.ok(SAMPLES.lease, 'Lease sample must exist');
  assert.equal(typeof SAMPLES.lease.name, 'string');
  assert.ok(SAMPLES.lease.wordCount > 0, 'Word count must be positive');
  assert.ok(Array.isArray(SAMPLES.lease.clauses), 'Clauses must be an array');
  assert.ok(Array.isArray(SAMPLES.lease.risks), 'Risks must be an array');
  assert.ok(SAMPLES.lease.prepKit.summary.length > 0, 'Prep kit summary must not be empty');
});

test('Sample contract data: NDA and employment samples exist', () => {
  assert.ok(SAMPLES.nda, 'NDA sample must exist');
  assert.ok(SAMPLES.employment, 'Employment sample must exist');
});

// ── Risk Classification ──────────────────────────────────────────────────────

test('Risk distribution: lease sample has high and medium risks', () => {
  const lease = SAMPLES.lease;
  const highRisks = lease.risks.filter(r => r.level === 'high');
  const medRisks  = lease.risks.filter(r => r.level === 'medium');
  assert.ok(highRisks.length >= 1, 'Should have at least one high risk clause');
  assert.ok(medRisks.length  >= 1, 'Should have at least one medium risk clause');
});

test('Risk objects: all risks have required fields', () => {
  for (const [sampleKey, sample] of Object.entries(SAMPLES)) {
    for (const risk of sample.risks) {
      assert.ok(['high', 'medium', 'low'].includes(risk.level),
        `Risk level must be high/medium/low in sample "${sampleKey}"`);
      assert.ok(risk.title?.length > 0, `Risk must have a title in sample "${sampleKey}"`);
      assert.ok(risk.desc?.length > 0, `Risk must have a desc in sample "${sampleKey}"`);
    }
  }
});

// ── Heuristic Fallback (no API key) ─────────────────────────────────────────

test('Heuristic analyzer: MSA contract with indemnification and non-compete', async () => {
  const text = `
    MASTER SERVICES AGREEMENT
    Contractor agrees to indemnify, defend, and hold harmless the Client against all claims.
    Either party may terminate upon 30 days written notice.
    Contractor shall not engage in any competing services for 12 months after termination.
    All disputes shall be resolved by binding arbitration under AAA rules.
  `;

  const result = await analyzeContractWithGemini(text, 'MSA_Draft.txt');

  assert.ok(result, 'Result must exist');
  assert.equal(result.name, 'MSA_Draft.txt');
  assert.ok(result.wordCount > 0, 'Word count must be positive');
  assert.ok(Array.isArray(result.clauses), 'Clauses must be an array');
  assert.ok(result.clauses.length > 0, 'Should extract at least one clause');
  assert.ok(Array.isArray(result.risks), 'Risks must be an array');
  assert.ok(result.risks.length > 0, 'Should detect at least one risk');
  assert.ok(result.prepKit?.summary?.length > 0, 'Prep kit summary must not be empty');
  assert.ok(Array.isArray(result.prepKit.questions), 'Questions must be an array');
  assert.ok(result.prepKit.questions.length > 0, 'Should have attorney questions');
});

test('Heuristic analyzer: employment contract type detection', async () => {
  const text = 'This Employment Agreement governs the Employee relationship. Annual Salary: $80,000.';
  const result = await analyzeContractWithGemini(text, 'Employment.txt');
  assert.ok(result.contractType.toLowerCase().includes('employment'),
    `Expected employment contract type, got: "${result.contractType}"`);
});

test('Heuristic analyzer: NDA type detection', async () => {
  const text = 'This Non-Disclosure Agreement covers all confidential and proprietary information disclosed.';
  const result = await analyzeContractWithGemini(text, 'NDA.txt');
  assert.ok(
    result.contractType.toLowerCase().includes('nda') ||
    result.contractType.toLowerCase().includes('disclosure'),
    `Expected NDA type, got: "${result.contractType}"`
  );
});

test('Heuristic analyzer: word count computed correctly', async () => {
  const words = Array.from({ length: 50 }, (_, i) => `word${i}`).join(' ');
  const result = await analyzeContractWithGemini(words, 'Short.txt');
  assert.ok(result.wordCount >= 40 && result.wordCount <= 60,
    `Expected ~50 words, got ${result.wordCount}`);
});

test('Heuristic analyzer: minimum risk items generated for unknown contract', async () => {
  const text = 'This is a standard agreement between two parties regarding a service.';
  const result = await analyzeContractWithGemini(text, 'Unknown.txt');
  assert.ok(result.risks.length >= 1, 'Should generate at least one risk item for any contract');
  assert.ok(result.prepKit.questions.length >= 1, 'Should generate at least one attorney question');
});

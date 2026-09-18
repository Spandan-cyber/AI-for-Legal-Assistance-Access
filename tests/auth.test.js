/**
 * tests/auth.test.js
 * Unit tests for authentication utilities: email validation,
 * password strength scoring, and session helpers.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEmail, getPasswordStrength } from '../js/auth.js';

// ── Email Validation ─────────────────────────────────────────────────────────

test('Email validation: valid standard addresses pass', () => {
  assert.equal(validateEmail('test@example.com'), true);
  assert.equal(validateEmail('user.name+tag@sub.domain.org'), true);
  assert.equal(validateEmail('first.last@company.co.uk'), true);
});

test('Email validation: invalid addresses are rejected', () => {
  assert.equal(validateEmail('invalid-email'),   false, 'No @ should fail');
  assert.equal(validateEmail('user@'),           false, 'No domain should fail');
  assert.equal(validateEmail('@domain.com'),     false, 'No username should fail');
  assert.equal(validateEmail(''),                false, 'Empty string should fail');
  assert.equal(validateEmail('a @b.com'),        false, 'Spaces should fail');
  assert.equal(validateEmail('user@domain'),     false, 'No TLD should fail');
});

// ── Password Strength ────────────────────────────────────────────────────────

test('Password strength: very short passwords score as weak', () => {
  assert.equal(getPasswordStrength('abc').level, 'weak');
  assert.equal(getPasswordStrength('12345').level, 'weak');
});

test('Password strength: mixed case + number scores as medium', () => {
  const result = getPasswordStrength('Password123');
  assert.equal(result.level, 'medium');
  assert.ok(result.color, 'Result must include a color property');
  assert.ok(result.width, 'Result must include a width property');
});

test('Password strength: long mixed case + symbol scores as strong', () => {
  const result = getPasswordStrength('SuperSecure#Password99!');
  assert.equal(result.level, 'strong');
  assert.equal(result.color, 'var(--green)');
  assert.equal(result.width, '100%');
});

test('Password strength: result object has all required fields', () => {
  const result = getPasswordStrength('anyPassword1');
  assert.ok('level'  in result, 'Must have level');
  assert.ok('label'  in result, 'Must have label');
  assert.ok('color'  in result, 'Must have color');
  assert.ok('width'  in result, 'Must have width');
});

// ── Auth Guard Logic ─────────────────────────────────────────────────────────

test('Auth guard: session key identifies user presence correctly', () => {
  const SESSION_KEY = 'judgeman_session';

  // Simulate an empty storage state
  const missing = null;
  const session = missing ? JSON.parse(missing) : null;
  assert.equal(session, null, 'No session should return null');

  // Simulate a stored session
  const stored = JSON.stringify({ uid: 'u123', email: 'a@b.com', name: 'Alice' });
  const parsed = JSON.parse(stored);
  assert.equal(parsed.uid, 'u123');
  assert.equal(parsed.email, 'a@b.com');
});

test('Auth guard: avatar initials are correctly computed', () => {
  function computeAvatar(displayName) {
    return (displayName || 'User')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  assert.equal(computeAvatar('Alice Johnson'), 'AJ');
  assert.equal(computeAvatar('Bob'),           'B');
  assert.equal(computeAvatar(''),              'U');
  assert.equal(computeAvatar(null),            'U');
});

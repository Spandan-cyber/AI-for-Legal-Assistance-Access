import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEmail, getPasswordStrength } from '../js/auth.js';

test('Email validation tests', () => {
  assert.equal(validateEmail('test@example.com'), true, 'Valid email should pass');
  assert.equal(validateEmail('user.name+tag@sub.domain.org'), true, 'Complex valid email should pass');
  assert.equal(validateEmail('invalid-email'), false, 'Email without @ should fail');
  assert.equal(validateEmail('user@'), false, 'Email without domain should fail');
  assert.equal(validateEmail('@domain.com'), false, 'Email without username should fail');
  assert.equal(validateEmail(''), false, 'Empty email should fail');
});

test('Password strength scoring tests', () => {
  const weak = getPasswordStrength('12345');
  assert.equal(weak.level, 'weak');

  const medium = getPasswordStrength('Password123');
  assert.equal(medium.level, 'medium');

  const strong = getPasswordStrength('SuperSecure#Password99!');
  assert.equal(strong.level, 'strong');
});

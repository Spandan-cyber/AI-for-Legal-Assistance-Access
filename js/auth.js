// js/auth.js — Authentication Engine for Judgeman (Firebase Auth + Firestore Sync + Local Fallback)

import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db, isFirebaseConfigured } from './firebaseConfig.js';

const USERS_KEY = 'judgeman_users';
const SESSION_KEY = 'judgeman_session';

/* ── Local Storage Helpers ───────────────────────────────── */
function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function setSession(user) {
  const sessionData = {
    uid: user.uid || `local_${Date.now()}`,
    name: user.displayName || user.name || 'User',
    email: user.email,
    photoURL: user.photoURL || null,
    avatar: (user.displayName || user.name || 'User')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
    loginAt: Date.now()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  return sessionData;
}

export function getSession() {
  const s = localStorage.getItem(SESSION_KEY);
  return s ? JSON.parse(s) : null;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}

/* ── Firestore Sync Helper ───────────────────────────────── */
async function syncUserToFirestore(user, additionalData = {}) {
  if (!db || !user?.uid) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName || additionalData.name || 'User',
      email: user.email,
      photoURL: user.photoURL || null,
      lastLoginAt: serverTimestamp(),
      ...additionalData
    }, { merge: true });
  } catch (err) {
    console.warn('[Judgeman] Failed to sync user to Firestore:', err.message);
  }
}

/* ── Real Google Sign-In ─────────────────────────────────── */
export async function signInWithGoogle() {
  if (isFirebaseConfigured() && auth && googleProvider) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await syncUserToFirestore(user);
      setSession(user);
      return { ok: true, user };
    } catch (err) {
      console.error('[Judgeman] Google Sign-In error:', err);
      // Handle closed popup or user cancellation gracefully
      if (err.code === 'auth/popup-closed-by-user') {
        return { ok: false, error: 'Sign-in cancelled (popup closed).' };
      }
      return { ok: false, error: err.message || 'Google Sign-In failed.' };
    }
  }

  // Fallback demo simulation if Firebase is not yet configured in .env
  console.info('[Judgeman] Using demo Google sign-in (configure .env for live Firebase).');
  const demoUser = {
    uid: 'google_demo_' + Date.now(),
    name: 'Alex Mercer (Google)',
    email: 'alex.mercer@gmail.com',
    photoURL: null
  };
  setSession(demoUser);
  return { ok: true, user: demoUser, isDemo: true };
}

/* ── Sign Up ─────────────────────────────────────────────── */
export async function signUp({ name, email, password }) {
  if (isFirebaseConfigured() && auth) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: name });
      await syncUserToFirestore(user, { createdAt: serverTimestamp() });
      setSession({ ...user, displayName: name });
      return { ok: true, user };
    } catch (err) {
      console.error('[Judgeman] Sign-up error:', err);
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      return { ok: false, error: msg };
    }
  }

  // Local fallback
  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  const localUser = {
    uid: 'local_' + Date.now(),
    name,
    email,
    passwordHash: simpleHash(password),
    createdAt: Date.now()
  };
  users.push(localUser);
  saveUsers(users);
  setSession(localUser);
  return { ok: true, user: localUser };
}

/* ── Login ───────────────────────────────────────────────── */
export async function login({ email, password }) {
  if (isFirebaseConfigured() && auth) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await syncUserToFirestore(user);
      setSession(user);
      return { ok: true, user };
    } catch (err) {
      console.error('[Judgeman] Login error:', err);
      let msg = 'Invalid email or password.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Incorrect email or password. Please try again.';
      }
      return { ok: false, error: msg };
    }
  }

  // Local fallback
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return { ok: false, error: 'No account found with this email.' };
  if (user.passwordHash !== simpleHash(password)) {
    return { ok: false, error: 'Incorrect password. Please try again.' };
  }
  setSession(user);
  return { ok: true, user };
}

/* ── Logout ──────────────────────────────────────────────── */
export async function logout() {
  if (isFirebaseConfigured() && auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('[Judgeman] Sign out error:', err);
    }
  }
  clearSession();
}

/* ── Validation Helpers ──────────────────────────────────── */
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { level: 'weak', label: 'Weak', color: 'var(--red)', width: '20%' };
  if (score <= 3) return { level: 'medium', label: 'Fair', color: 'var(--amber)', width: '55%' };
  return { level: 'strong', label: 'Strong', color: 'var(--green)', width: '100%' };
}

/* ── Auth Guard ──────────────────────────────────────────── */
export function requireAuth(redirectTo = 'auth.html?mode=login') {
  const session = getSession();
  if (!session) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

/* ── Observe Auth State ──────────────────────────────────── */
export function subscribeAuthState(callback) {
  if (isFirebaseConfigured() && auth) {
    return onAuthStateChanged(auth, user => {
      if (user) {
        setSession(user);
      } else {
        clearSession();
      }
      if (callback) callback(user);
    });
  }
  // If local, trigger once with current session
  if (callback) callback(getSession());
  return () => {};
}

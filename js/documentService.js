/**
 * js/documentService.js — Cloud Firestore Document Persistence & Real-time Sync
 *
 * Provides CRUD operations and a real-time Firestore listener for the user's
 * legal document library. Falls back to localStorage for offline/demo mode.
 */

import {
  collection,
  addDoc,
  doc,
  getDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseConfig.js';

const LOCAL_DOCS_KEY = 'judgeman_local_documents';

function getLocalDocs(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_DOCS_KEY) || '[]');
    return userId ? all.filter(d => d.userId === userId) : all;
  } catch {
    return [];
  }
}

function saveLocalDoc(docData) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_DOCS_KEY) || '[]');
    const existingIdx = all.findIndex(d => d.id === docData.id);
    if (existingIdx >= 0) {
      all[existingIdx] = docData;
    } else {
      all.unshift(docData);
    }
    localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('[Judgeman] Local document cache write failed:', err);
  }
}

/**
 * Save an uploaded legal document and its AI analysis to Cloud Firestore.
 * Falls back to localStorage if Firebase is not configured or the write fails.
 * @param {string} userId - Authenticated user UID or 'guest'
 * @param {object} contractData - Structured analysis result from geminiService
 * @returns {Promise<object>} Saved document with a Firestore-assigned `id`
 */
export async function saveDocumentToFirestore(userId, contractData) {
  if (!contractData?.name) {
    throw new Error('[Judgeman] Cannot save document without a name.');
  }

  const docPayload = {
    userId: userId || 'anonymous',
    name: contractData.name || 'Untitled Document',
    contractType: contractData.contractType || 'Legal Document',
    type: contractData.type || 'Custom Contract',
    jurisdiction: contractData.jurisdiction || 'General',
    wordCount: contractData.wordCount || 0,
    readingTime: contractData.readingTime || '1 min',
    gradeLevel: contractData.gradeLevel || 'College Level',
    // Truncate to 50 KB to stay within Firestore's 1 MB document limit
    fullText: (contractData.fullText || '').slice(0, 50000),
    clauses: contractData.clauses || [],
    risks: contractData.risks || [],
    prepKit: contractData.prepKit || { summary: '', redFlags: [], questions: [] },
    createdAt: new Date().toISOString()
  };

  if (isFirebaseConfigured() && db) {
    try {
      const docRef = await addDoc(collection(db, 'documents'), {
        ...docPayload,
        serverCreatedAt: serverTimestamp()
      });
      const savedDoc = { id: docRef.id, ...docPayload };
      saveLocalDoc(savedDoc);
      return savedDoc;
    } catch (err) {
      console.error('[Judgeman] Error saving document to Firestore, falling back to local:', err.message);
    }
  }

  // Local storage fallback
  const localDoc = { id: 'doc_' + Date.now(), ...docPayload };
  saveLocalDoc(localDoc);
  return localDoc;
}

/**
 * Subscribe to real-time updates of the user's document library from Firestore.
 * Documents are returned sorted by creation date (newest first).
 * Falls back to localStorage if Firebase is unavailable.
 * @param {string} userId - Authenticated user UID
 * @param {Function} callback - Called with an array of document objects
 * @returns {Function} Unsubscribe function to cancel the listener
 */
export function subscribeToUserDocuments(userId, callback) {
  if (!userId || userId.trim() === '') {
    callback([]);
    return () => {};
  }

  if (isFirebaseConfigured() && db) {
    try {
      // NOTE: We sort client-side to avoid requiring a Firestore composite index.
      // A composite index on (userId ASC, createdAt DESC) would enable server-side
      // sorting but requires `firebase deploy --only firestore:indexes` first.
      const q = query(
        collection(db, 'documents'),
        where('userId', '==', userId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort newest first on the client side
        docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        callback(docs);
      }, (error) => {
        console.warn('[Judgeman] Firestore snapshot error, falling back to local cache:', error.message);
        callback(getLocalDocs(userId));
      });

      return unsubscribe;
    } catch (err) {
      console.warn('[Judgeman] Firestore query setup error:', err.message);
    }
  }

  // Local storage fallback for demo / offline mode
  callback(getLocalDocs(userId));
  return () => {};
}

/**
 * Delete a document from both Firestore and local cache.
 * Local documents (prefixed with 'doc_') are only removed from localStorage.
 * @param {string} docId - Document ID to delete
 * @param {string} userId - Owner UID (unused currently, kept for future ACL checks)
 */
export async function deleteDocumentFromFirestore(docId, userId) {
  if (!docId) return;

  // Only attempt Firestore delete for cloud documents (not local-only 'doc_' prefixed IDs)
  if (isFirebaseConfigured() && db && !docId.startsWith('doc_')) {
    try {
      await deleteDoc(doc(db, 'documents', docId));
    } catch (err) {
      console.warn('[Judgeman] Error deleting document from Firestore:', err.message);
    }
  }

  // Always clean local cache
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_DOCS_KEY) || '[]');
    const filtered = all.filter(d => d.id !== docId);
    localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(filtered));
  } catch (cacheErr) {
    console.warn('[Judgeman] Local cache cleanup failed:', cacheErr);
  }
}

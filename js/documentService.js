// js/documentService.js — Cloud Firestore Document Persistence & Real-time Sync

import {
  collection,
  addDoc,
  doc,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
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
 * Save an uploaded legal document and its AI analysis to Cloud Firestore
 */
export async function saveDocumentToFirestore(userId, contractData) {
  const docPayload = {
    userId: userId || 'anonymous',
    name: contractData.name || 'Untitled Document',
    contractType: contractData.contractType || 'Legal Document',
    type: contractData.type || 'Custom Contract',
    jurisdiction: contractData.jurisdiction || 'General',
    wordCount: contractData.wordCount || 0,
    readingTime: contractData.readingTime || '1 min',
    gradeLevel: contractData.gradeLevel || 'College Level',
    fullText: (contractData.fullText || '').slice(0, 50000), // Protect payload size
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
      console.error('[Judgeman] Error saving document to Firestore:', err);
      // Fallback to local storage
    }
  }

  const localDoc = {
    id: 'doc_' + Date.now(),
    ...docPayload
  };
  saveLocalDoc(localDoc);
  return localDoc;
}

/**
 * Real-time listener for all contracts belonging to the current user
 */
export function subscribeToUserDocuments(userId, callback) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  if (isFirebaseConfigured() && db) {
    try {
      const q = query(
        collection(db, 'documents'),
        where('userId', '==', userId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() });
        });
        // Sort descending by date
        docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        callback(docs);
      }, (error) => {
        console.warn('[Judgeman] Firestore snapshot error, falling back to cache:', error);
        callback(getLocalDocs(userId));
      });

      return unsubscribe;
    } catch (err) {
      console.warn('[Judgeman] Firestore query setup error:', err);
    }
  }

  // Local fallback
  callback(getLocalDocs(userId));
  return () => {};
}

/**
 * Delete a document from Firestore
 */
export async function deleteDocumentFromFirestore(docId, userId) {
  if (isFirebaseConfigured() && db && docId && !docId.startsWith('doc_')) {
    try {
      await deleteDoc(doc(db, 'documents', docId));
    } catch (err) {
      console.warn('[Judgeman] Error deleting document from Firestore:', err);
    }
  }

  // Clean local cache
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_DOCS_KEY) || '[]');
    const filtered = all.filter(d => d.id !== docId);
    localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(filtered));
  } catch {}
}

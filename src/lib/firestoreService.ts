import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { UserInteraction, AcademicDocument, ExtractedDocumentData } from "../types";
import { sanitizePayload } from "./sanitizer";

/**
 * Returns reference to a user's isolated interactions subcollection
 * Path: /users/{userId}/interactions
 */
export function getInteractionsCollection(userId: string) {
  if (!userId) {
    throw new Error("Cannot access interactions without an authenticated userId.");
  }
  return collection(db, "users", userId, "interactions");
}

/**
 * Returns reference to a user's isolated academic documents subcollection
 * Path: /users/{userId}/documents
 */
export function getDocumentsCollection(userId: string) {
  if (!userId) {
    throw new Error("Cannot access academic documents without an authenticated userId.");
  }
  return collection(db, "users", userId, "documents");
}

/**
 * Saves or updates a journal interaction in Firestore with strict undefined stripping.
 */
export async function saveInteraction(
  userId: string,
  interaction: UserInteraction
): Promise<void> {
  if (!userId) {
    throw new Error("Authentication required to save journal reflection.");
  }

  const sanitized = sanitizePayload(interaction);
  const docRef = doc(db, "users", userId, "interactions", interaction.id);

  try {
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error: any) {
    console.error(`Failed to save interaction ${interaction.id}:`, error);
    throw new Error(
      error?.message || "Failed to persist journal entry to Firestore."
    );
  }
}

/**
 * Deletes a journal interaction document.
 */
export async function deleteInteraction(
  userId: string,
  interactionId: string
): Promise<void> {
  if (!userId || !interactionId) {
    throw new Error("Missing parameters for deletion.");
  }

  const docRef = doc(db, "users", userId, "interactions", interactionId);
  try {
    await deleteDoc(docRef);
  } catch (error: any) {
    console.error(`Failed to delete interaction ${interactionId}:`, error);
    throw new Error(error?.message || "Failed to delete interaction from Firestore.");
  }
}

/**
 * Subscribes to real-time updates for a user's journal interactions.
 */
export function subscribeToUserInteractions(
  userId: string,
  onUpdate: (interactions: UserInteraction[]) => void,
  onError: (error: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const interactionsRef = getInteractionsCollection(userId);
  const q = query(interactionsRef, orderBy("updatedAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: UserInteraction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserInteraction;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });
      onUpdate(items);
    },
    (err) => {
      console.error("Firestore subscription error:", err);
      onError(new Error(err?.message || "Failed to sync entries with Firestore."));
    }
  );

  return unsubscribe;
}

/**
 * Saves or updates an academic document in Firestore with strict undefined stripping.
 * Target path: /users/{userId}/documents/{documentId}
 */
export async function saveAcademicDocument(
  userId: string,
  document: ExtractedDocumentData | AcademicDocument
): Promise<AcademicDocument> {
  if (!userId) {
    throw new Error("Authentication required to save document to Academic Vault.");
  }

  const docId =
    "id" in document && document.id
      ? document.id
      : "doc-" + Math.random().toString(36).substring(2, 11);

  const now = new Date().toISOString();
  const fullDocument: AcademicDocument = {
    ...document,
    id: docId,
    userId,
    createdAt: ("createdAt" in document && document.createdAt) ? document.createdAt : now,
    updatedAt: now,
  };

  const sanitized = sanitizePayload(fullDocument);
  const docRef = doc(db, "users", userId, "documents", docId);

  try {
    await setDoc(docRef, sanitized, { merge: true });
    return fullDocument;
  } catch (error: any) {
    console.error(`Failed to save academic document ${docId}:`, error);
    throw new Error(
      error?.message || "Failed to persist document metadata to Firestore."
    );
  }
}

/**
 * Deletes an academic document from the user's vault.
 */
export async function deleteAcademicDocument(
  userId: string,
  documentId: string
): Promise<void> {
  if (!userId || !documentId) {
    throw new Error("Missing parameters for document deletion.");
  }

  const docRef = doc(db, "users", userId, "documents", documentId);
  try {
    await deleteDoc(docRef);
  } catch (error: any) {
    console.error(`Failed to delete academic document ${documentId}:`, error);
    throw new Error(error?.message || "Failed to delete document from Academic Vault.");
  }
}

/**
 * Subscribes to real-time updates for a user's Academic Vault documents.
 */
export function subscribeToUserDocuments(
  userId: string,
  onUpdate: (docs: AcademicDocument[]) => void,
  onError: (error: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const documentsRef = getDocumentsCollection(userId);
  const q = query(documentsRef, orderBy("createdAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: AcademicDocument[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AcademicDocument;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });
      onUpdate(items);
    },
    (err) => {
      console.error("Firestore academic documents subscription error:", err);
      onError(new Error(err?.message || "Failed to sync documents with Academic Vault."));
    }
  );

  return unsubscribe;
}

/**
 * Fetches interactions once (useful for fallback or export).
 */
export async function fetchUserInteractions(
  userId: string
): Promise<UserInteraction[]> {
  if (!userId) return [];
  const interactionsRef = getInteractionsCollection(userId);
  const q = query(interactionsRef, orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);

  const items: UserInteraction[] = [];
  snapshot.forEach((docSnap) => {
    items.push({
      ...(docSnap.data() as UserInteraction),
      id: docSnap.id,
    });
  });
  return items;
}


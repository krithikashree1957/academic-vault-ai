/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { User } from "firebase/auth";
import { auth, signInWithGoogle, logOut, onAuthStateChanged } from "./firebase";
import {
  UserInteraction,
  ChatMessage,
  ReflectionMode,
  AcademicDocument,
  ExtractedDocumentData,
} from "./types";
import {
  saveInteraction,
  deleteInteraction,
  subscribeToUserInteractions,
  saveAcademicDocument,
  deleteAcademicDocument,
  subscribeToUserDocuments,
} from "./lib/firestoreService";
import {
  generateReflection,
  summarizeReflection,
  extractDocumentMetadata,
} from "./lib/geminiApi";
import { Navbar } from "./components/Navbar";
import { AuthLanding } from "./components/AuthLanding";
import { HistorySidebar } from "./components/HistorySidebar";
import { ReflectionWorkspace } from "./components/ReflectionWorkspace";
import { DocumentConfirmationModal } from "./components/DocumentConfirmationModal";
import { AcademicVaultModal } from "./components/AcademicVaultModal";
import { DocumentDetailModal } from "./components/DocumentDetailModal";
import { Loader2 } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Firestore interactions state
  const [interactions, setInteractions] = useState<UserInteraction[]>([]);
  const [activeInteraction, setActiveInteraction] = useState<UserInteraction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Academic Vault documents state
  const [vaultDocuments, setVaultDocuments] = useState<AcademicDocument[]>([]);
  const [extractedPendingData, setExtractedPendingData] = useState<ExtractedDocumentData | null>(null);
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [selectedDocForDetail, setSelectedDocForDetail] = useState<AcademicDocument | null>(null);

  // AI Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [activeModel, setActiveModel] = useState("gemini-3.6-flash");

  // Mobile sidebar open state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Hidden global input ref for triggering uploads from sidebar or vault modal
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Helper to create a blank reflection
  const createNewReflection = useCallback((): UserInteraction => {
    const now = new Date().toISOString();
    return {
      id: "entry-" + Math.random().toString(36).substring(2, 11),
      userId: currentUser?.uid || "",
      title: "New Reflection",
      reflectionMode: "deep-reflection",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  }, [currentUser]);

  // Subscribe to real-time Firestore interactions for current authenticated user
  useEffect(() => {
    if (!currentUser?.uid) {
      setInteractions([]);
      setActiveInteraction(null);
      return;
    }

    const unsubscribe = subscribeToUserInteractions(
      currentUser.uid,
      (list) => {
        setInteractions(list);
        setActiveInteraction((prev) => {
          if (!prev) {
            return list.length > 0 ? list[0] : createNewReflection();
          }
          const found = list.find((item) => item.id === prev.id);
          return found || prev;
        });
      },
      (err) => {
        console.error("Firestore sync subscription error:", err);
        setSaveError("Firestore synchronization issue: " + err.message);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, createNewReflection]);

  // Subscribe to real-time Firestore Academic Vault documents for current user
  useEffect(() => {
    if (!currentUser?.uid) {
      setVaultDocuments([]);
      return;
    }

    const unsubscribe = subscribeToUserDocuments(
      currentUser.uid,
      (docs) => {
        setVaultDocuments(docs);
      },
      (err) => {
        console.error("Firestore documents sync error:", err);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Handle Google Sign-In
  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login failed:", err);
      throw err;
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle Sign-Out
  const handleSignOut = async () => {
    try {
      await logOut();
      setActiveInteraction(null);
      setInteractions([]);
      setVaultDocuments([]);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Handle updating an existing interaction (e.g. title or mode change)
  const handleUpdateInteraction = async (updated: UserInteraction) => {
    setActiveInteraction(updated);
    if (!currentUser?.uid) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      await saveInteraction(currentUser.uid, updated);
    } catch (err: any) {
      console.error("Failed to save interaction:", err);
      setSaveError(err.message || "Failed to save changes to Firestore.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle prompt submission to Gemini + Firestore persistence (with Academic Vault RAG)
  const handleSendPrompt = async (
    promptText: string,
    mode: ReflectionMode,
    customFocus?: string
  ) => {
    if (!currentUser?.uid) return;

    let current = activeInteraction;
    if (!current) {
      current = createNewReflection();
    }

    const userMessage: ChatMessage = {
      id: "msg-" + Math.random().toString(36).substring(2, 9),
      role: "user",
      content: promptText,
      timestamp: new Date().toISOString(),
    };

    // Auto-generate a title from first prompt if untitled
    let updatedTitle = current.title;
    if (
      (!current.title || current.title === "New Reflection" || current.title === "Untitled Reflection") &&
      current.messages.length === 0
    ) {
      updatedTitle =
        promptText.slice(0, 36).trim() + (promptText.length > 36 ? "..." : "");
    }

    const updatedWithUser: UserInteraction = {
      ...current,
      userId: currentUser.uid,
      title: updatedTitle,
      reflectionMode: mode,
      messages: [...current.messages, userMessage],
      updatedAt: new Date().toISOString(),
    };

    // Immediate UI update
    setActiveInteraction(updatedWithUser);

    // Persist user turn to Firestore
    try {
      setIsSaving(true);
      setSaveError(null);
      await saveInteraction(currentUser.uid, updatedWithUser);
    } catch (err: any) {
      console.error("Failed to persist user prompt:", err);
      setSaveError(
        "Failed to save your prompt to Firestore. You can retry below."
      );
    } finally {
      setIsSaving(false);
    }

    // Call Gemini API via server route, passing the user's Academic Vault documents for grounded RAG citations
    try {
      setIsGenerating(true);
      const conversationHistory = updatedWithUser.messages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await generateReflection({
        prompt: promptText,
        history: conversationHistory,
        reflectionMode: mode,
        customFocus,
        vaultDocuments: vaultDocuments,
      });

      if (result.modelUsed) {
        setActiveModel(result.modelUsed);
      }

      const modelMessage: ChatMessage = {
        id: "msg-" + Math.random().toString(36).substring(2, 9),
        role: "model",
        content: result.text,
        timestamp: new Date().toISOString(),
        modelUsed: result.modelUsed,
      };

      const finalInteraction: UserInteraction = {
        ...updatedWithUser,
        messages: [...updatedWithUser.messages, modelMessage],
        updatedAt: new Date().toISOString(),
      };

      setActiveInteraction(finalInteraction);

      // Persist full multi-turn interaction to Firestore
      try {
        setIsSaving(true);
        await saveInteraction(currentUser.uid, finalInteraction);
      } catch (err: any) {
        console.error("Failed to persist Gemini reflection:", err);
        setSaveError("Failed to save Gemini's reflection to Firestore.");
      } finally {
        setIsSaving(false);
      }
    } catch (err: any) {
      console.error("Gemini generation error:", err);
      setSaveError(err?.message || "Gemini reflection generation failed. Please try again.");
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle summarizing the active interaction
  const handleSummarize = async () => {
    if (!currentUser?.uid || !activeInteraction || activeInteraction.messages.length === 0) {
      return;
    }

    try {
      setIsSummarizing(true);
      setSaveError(null);

      const dialogueText = activeInteraction.messages
        .map((m) => `${m.role === "user" ? "User" : "Gemini"}: ${m.content}`)
        .join("\n\n");

      const summaryResult = await summarizeReflection(
        dialogueText,
        activeInteraction.title
      );

      if (summaryResult.modelUsed) {
        setActiveModel(summaryResult.modelUsed);
      }

      const updated: UserInteraction = {
        ...activeInteraction,
        title: summaryResult.title || activeInteraction.title,
        summary: {
          title: summaryResult.title,
          sentiment: summaryResult.sentiment,
          keyTakeaways: summaryResult.keyTakeaways,
          actionStep: summaryResult.actionStep,
        },
        updatedAt: new Date().toISOString(),
      };

      setActiveInteraction(updated);
      setIsSaving(true);
      await saveInteraction(currentUser.uid, updated);
    } catch (err: any) {
      console.error("Summarization error:", err);
      setSaveError(err?.message || "Failed to summarize reflection.");
    } finally {
      setIsSummarizing(false);
      setIsSaving(false);
    }
  };

  // Handle deleting an interaction
  const handleDeleteInteraction = async (id: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteInteraction(currentUser.uid, id);
      if (activeInteraction?.id === id) {
        const remaining = interactions.filter((item) => item.id !== id);
        if (remaining.length > 0) {
          setActiveInteraction(remaining[0]);
        } else {
          setActiveInteraction(createNewReflection());
        }
      }
    } catch (err: any) {
      console.error("Delete failed:", err);
      setSaveError(err?.message || "Failed to delete interaction.");
    }
  };

  // Handle Document Upload & Structured Extraction
  const handleUploadDocument = async (file: File) => {
    if (!currentUser?.uid) return;

    try {
      setIsExtractingDoc(true);
      setSaveError(null);

      // Convert file to Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip data URL scheme (e.g. data:application/pdf;base64,)
          const base64String = result.split(",")[1] || result;
          resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });

      // Call Gemini structured extraction endpoint
      const response = await extractDocumentMetadata({
        fileBase64: base64Data,
        mimeType: file.type || "application/pdf",
        fileName: file.name,
      });

      if (response.modelUsed) {
        setActiveModel(response.modelUsed);
      }

      // Show the editable confirmation modal before saving to Firestore
      setExtractedPendingData(response.data);
    } catch (err: any) {
      console.error("Document extraction failed:", err);
      setSaveError(
        err?.message ||
          "Failed to parse document with Gemini. Please verify the image/PDF format and try again."
      );
    } finally {
      setIsExtractingDoc(false);
    }
  };

  // Handle Confirmation of Extracted Metadata and Save to Firestore (/users/{userId}/documents)
  const handleConfirmDocumentSave = async (confirmedData: ExtractedDocumentData) => {
    if (!currentUser?.uid) return;

    try {
      setIsSavingDoc(true);
      setSaveError(null);

      const savedDoc = await saveAcademicDocument(currentUser.uid, confirmedData);
      setExtractedPendingData(null);

      // Insert an informative system note in current reflection session
      if (activeInteraction) {
        const docCitation = `[Doc: ${savedDoc.issuingInstitution} ${savedDoc.documentType}](#doc:${savedDoc.id})`;
        const confirmationMessage: ChatMessage = {
          id: "msg-" + Math.random().toString(36).substring(2, 9),
          role: "model",
          content: `✅ **Credential Archived to Academic Vault:** Verified ${savedDoc.documentType} from **${savedDoc.issuingInstitution}** has been cataloged in your private collection (${docCitation}). You can now ask questions about your grades, coursework, or overall academic trajectory.`,
          timestamp: new Date().toISOString(),
          modelUsed: activeModel,
        };

        const updatedInteraction: UserInteraction = {
          ...activeInteraction,
          messages: [...activeInteraction.messages, confirmationMessage],
          updatedAt: new Date().toISOString(),
        };

        setActiveInteraction(updatedInteraction);
        await saveInteraction(currentUser.uid, updatedInteraction);
      }
    } catch (err: any) {
      console.error("Failed to archive document:", err);
      setSaveError(err?.message || "Failed to save document to your vault.");
    } finally {
      setIsSavingDoc(false);
    }
  };

  // Handle Deleting a Document from the Vault
  const handleDeleteDocument = async (docId: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteAcademicDocument(currentUser.uid, docId);
      if (selectedDocForDetail?.id === docId) {
        setSelectedDocForDetail(null);
      }
    } catch (err: any) {
      console.error("Failed to delete document:", err);
      setSaveError(err?.message || "Failed to remove document.");
    }
  };

  // Handle opening document details when a citation link is clicked (e.g. #doc:abc123)
  const handleOpenDocumentById = (docId: string) => {
    const found = vaultDocuments.find((d) => d.id === docId);
    if (found) {
      setSelectedDocForDetail(found);
    } else {
      setIsVaultModalOpen(true);
    }
  };

  // Retry save
  const handleRetrySave = async () => {
    if (!currentUser?.uid || !activeInteraction) return;
    try {
      setIsSaving(true);
      setSaveError(null);
      await saveInteraction(currentUser.uid, activeInteraction);
    } catch (err: any) {
      setSaveError("Retry failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] flex flex-col items-center justify-center space-y-3 text-[#2C2C2C]">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B735B]" />
        <p className="text-xs font-mono text-[#736E68]">
          Initializing Academic Vault AI...
        </p>
      </div>
    );
  }

  return (
    <div id="app-root" className="min-h-screen flex flex-col bg-[#F8F6F2] text-[#2C2C2C] font-sans">
      {/* Hidden global input for triggering file upload from sidebar or vault modal */}
      <input
        ref={globalFileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleUploadDocument(file);
          }
          if (globalFileInputRef.current) {
            globalFileInputRef.current.value = "";
          }
        }}
      />

      <Navbar
        user={currentUser}
        onSignOut={handleSignOut}
        activeModel={activeModel}
        isSyncing={isSaving || isSavingDoc}
      />

      {!currentUser ? (
        <AuthLanding onSignIn={handleSignIn} isLoading={isSigningIn} />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <HistorySidebar
            interactions={interactions}
            selectedId={activeInteraction?.id || null}
            onSelect={(item) => setActiveInteraction(item)}
            onNew={() => setActiveInteraction(createNewReflection())}
            onDelete={handleDeleteInteraction}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onOpenVault={() => setIsVaultModalOpen(true)}
            vaultCount={vaultDocuments.length}
            onTriggerUpload={() => globalFileInputRef.current?.click()}
          />

          {activeInteraction ? (
            <ReflectionWorkspace
              interaction={activeInteraction}
              onUpdateInteraction={handleUpdateInteraction}
              onSendPrompt={handleSendPrompt}
              onSummarize={handleSummarize}
              onUploadDocument={handleUploadDocument}
              onOpenDocumentById={handleOpenDocumentById}
              onOpenVault={() => setIsVaultModalOpen(true)}
              vaultDocumentCount={vaultDocuments.length}
              isGenerating={isGenerating}
              isSummarizing={isSummarizing}
              isSaving={isSaving}
              isExtractingDoc={isExtractingDoc}
              saveError={saveError}
              onRetrySave={handleRetrySave}
              onClearSaveError={() => setSaveError(null)}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              activeModel={activeModel}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#736E68]">
              <Loader2 className="w-6 h-6 animate-spin text-[#8B735B]" />
            </div>
          )}
        </div>
      )}

      {/* Editable Confirmation Modal (Review extracted metadata before saving to Firestore) */}
      {extractedPendingData && (
        <DocumentConfirmationModal
          data={extractedPendingData}
          onConfirm={handleConfirmDocumentSave}
          onCancel={() => setExtractedPendingData(null)}
          isSaving={isSavingDoc}
        />
      )}

      {/* Academic Vault Modal (Browse all verified credentials) */}
      <AcademicVaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        documents={vaultDocuments}
        onSelectDocument={(doc) => setSelectedDocForDetail(doc)}
        onDeleteDocument={handleDeleteDocument}
        onTriggerUpload={() => globalFileInputRef.current?.click()}
      />

      {/* Document Detail Modal (Full breakdown + citation links) */}
      {selectedDocForDetail && (
        <DocumentDetailModal
          document={selectedDocForDetail}
          onClose={() => setSelectedDocForDetail(null)}
          onAskGemini={(prompt) => {
            handleSendPrompt(prompt, "deep-reflection");
          }}
          onDelete={handleDeleteDocument}
        />
      )}
    </div>
  );
}

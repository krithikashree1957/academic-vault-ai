import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import {
  UserInteraction,
  ChatMessage,
  ReflectionMode,
} from "../types";
import { SummaryCard } from "./SummaryCard";
import { ErrorBanner } from "./ErrorBanner";
import {
  Send,
  Sparkles,
  Menu,
  Clock,
  Copy,
  Check,
  Download,
  Loader2,
  Lightbulb,
  BookOpen,
  Compass,
  CheckCircle,
  Paperclip,
  Award,
  UploadCloud,
  FileText,
} from "lucide-react";

interface ReflectionWorkspaceProps {
  interaction: UserInteraction;
  onUpdateInteraction: (updated: UserInteraction) => Promise<void>;
  onSendPrompt: (
    promptText: string,
    mode: ReflectionMode,
    customFocus?: string
  ) => Promise<void>;
  onSummarize: () => Promise<void>;
  onUploadDocument: (file: File) => Promise<void>;
  onOpenDocumentById: (docId: string) => void;
  onOpenVault: () => void;
  vaultDocumentCount: number;
  isGenerating: boolean;
  isSummarizing: boolean;
  isSaving: boolean;
  isExtractingDoc: boolean;
  saveError: string | null;
  onRetrySave: () => void;
  onClearSaveError: () => void;
  onToggleSidebar: () => void;
  activeModel: string;
}

const STARTER_PROMPTS = [
  {
    title: "Document Query",
    text: "Review my academic credentials in the vault and summarize my cumulative GPA, key honors, and subject strengths.",
    mode: "deep-reflection" as ReflectionMode,
  },
  {
    title: "Daily Review",
    text: "Here is what challenged me today and what went well with my studies...",
    mode: "deep-reflection" as ReflectionMode,
  },
  {
    title: "Academic Brainstorming",
    text: "I am planning my next academic semester and need course advice based on my marks...",
    mode: "brainstorm" as ReflectionMode,
  },
  {
    title: "Structured Summary",
    text: "Please synthesize my academic milestones and distill key insights...",
    mode: "summary" as ReflectionMode,
  },
];

export const ReflectionWorkspace: React.FC<ReflectionWorkspaceProps> = ({
  interaction,
  onUpdateInteraction,
  onSendPrompt,
  onSummarize,
  onUploadDocument,
  onOpenDocumentById,
  onOpenVault,
  vaultDocumentCount,
  isGenerating,
  isSummarizing,
  isSaving,
  isExtractingDoc,
  saveError,
  onRetrySave,
  onClearSaveError,
  onToggleSidebar,
  activeModel,
}) => {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(interaction.title);
  const [customFocus, setCustomFocus] = useState("");
  const [showFocusInput, setShowFocusInput] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync title when interaction changes
  useEffect(() => {
    setTitleInput(interaction.title);
  }, [interaction.id, interaction.title]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interaction.messages.length, isGenerating]);

  const handleTitleSubmit = async () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && titleInput !== interaction.title) {
      await onUpdateInteraction({
        ...interaction,
        title: titleInput.trim(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      setTitleInput(interaction.title);
    }
  };

  const handleModeChange = async (newMode: ReflectionMode) => {
    await onUpdateInteraction({
      ...interaction,
      reflectionMode: newMode,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isGenerating) return;

    const originalInput = inputText;
    setInputText("");

    try {
      await onSendPrompt(text, interaction.reflectionMode, customFocus || undefined);
    } catch {
      setInputText(originalInput);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUploadDocument(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await onUploadDocument(file);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    const lines: string[] = [];
    lines.push(`# ${interaction.title || "Reflective Journal Entry"}`);
    lines.push(`**Date:** ${new Date(interaction.createdAt).toLocaleString()}`);
    lines.push(`**Mode:** ${interaction.reflectionMode}`);
    if (interaction.summary?.sentiment) {
      lines.push(`**Sentiment:** ${interaction.summary.sentiment}`);
    }
    lines.push("\n---\n");

    if (interaction.summary) {
      lines.push(`## Gemini Summary & Insights\n`);
      if (interaction.summary.keyTakeaways?.length) {
        lines.push(`### Key Realizations`);
        interaction.summary.keyTakeaways.forEach((k) => lines.push(`- ${k}`));
        lines.push("");
      }
      if (interaction.summary.actionStep) {
        lines.push(`### Recommended Action\n${interaction.summary.actionStep}\n`);
      }
      lines.push("\n---\n");
    }

    lines.push(`## Dialogue & Reflections\n`);
    interaction.messages.forEach((m) => {
      const sender = m.role === "user" ? "Me (Reflection)" : "Gemini 3.6 Flash";
      lines.push(`### ${sender} (${new Date(m.timestamp).toLocaleTimeString()})\n`);
      lines.push(m.content);
      lines.push("\n");
    });

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(interaction.title || "journal-reflection").toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main
      id="workspace-main"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-[calc(100vh-61px)] bg-[#F8F6F2] overflow-hidden relative"
    >
      {/* Hidden File Input for document upload */}
      <input
        ref={fileInputRef}
        type="file"
        id="hidden-document-file-input"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-30 bg-[#FAF8F5]/90 border-2 border-dashed border-[#8B735B] flex flex-col items-center justify-center space-y-3 pointer-events-none backdrop-blur-xs">
          <UploadCloud className="w-12 h-12 text-[#8B735B] animate-bounce" />
          <p className="text-base font-serif font-bold text-[#2C2C2C]">
            Drop your Academic Document here
          </p>
          <p className="text-xs text-[#736E68]">
            Supports Marksheets, Degrees, Certificates in PDF, PNG, or JPEG
          </p>
        </div>
      )}

      {/* Top Workspace Toolbar */}
      <div
        id="workspace-toolbar"
        className="bg-white border-b border-[#E8E4DF] px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shadow-[0_1px_2px_rgba(44,44,44,0.02)] shrink-0"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-[#736E68] hover:text-[#2C2C2C] hover:bg-[#F5F2EC] lg:hidden cursor-pointer"
            title="Toggle journal history"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Title Editor */}
          <div className="min-w-0 flex-1">
            {isEditingTitle ? (
              <input
                id="edit-title-input"
                type="text"
                value={titleInput}
                autoFocus
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit();
                  if (e.key === "Escape") {
                    setIsEditingTitle(false);
                    setTitleInput(interaction.title);
                  }
                }}
                className="w-full max-w-md px-2 py-1 text-sm sm:text-base font-serif font-semibold text-[#2C2C2C] border border-[#8B735B] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#8B735B]"
              />
            ) : (
              <div
                id="reflection-title-display"
                onClick={() => setIsEditingTitle(true)}
                className="cursor-pointer group flex items-center gap-2 max-w-lg"
                title="Click to rename entry"
              >
                <h2 className="text-base sm:text-lg font-serif font-semibold text-[#2C2C2C] truncate">
                  {interaction.title || "Untitled Reflection"}
                </h2>
                <span className="text-[10px] text-[#A39D95] group-hover:text-[#8B735B] underline decoration-[#E8E4DF]">
                  Edit
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[11px] text-[#736E68] mt-0.5">
              <span>{new Date(interaction.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-[#8B735B]" />
                <span>{isSaving ? "Saving to Firestore..." : "Firestore Synced"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Academic Vault Shortcut Button */}
          <button
            id="open-vault-btn"
            onClick={onOpenVault}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FAF8F5] hover:bg-[#F2EFE9] text-[#2C2C2C] border border-[#E8E4DF] transition cursor-pointer shadow-2xs"
            title="Browse all documents in your Academic Vault"
          >
            <Award className="w-3.5 h-3.5 text-[#8B735B]" />
            <span className="hidden sm:inline">Academic Vault</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#8B735B] text-white font-mono text-[10px] font-semibold">
              {vaultDocumentCount}
            </span>
          </button>

          {/* Summarize Action */}
          <button
            id="summarize-btn"
            onClick={onSummarize}
            disabled={isSummarizing || interaction.messages.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#8B735B]/10 hover:bg-[#8B735B]/20 text-[#755F4A] border border-[#8B735B]/30 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
            title="Ask Gemini to synthesize your thoughts and produce structured takeaways"
          >
            {isSummarizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#755F4A]" />
                <span>Summarizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#8B735B]" />
                <span>Summarize</span>
              </>
            )}
          </button>

          {/* Export Action */}
          <button
            id="export-btn"
            onClick={handleExport}
            className="p-1.5 rounded-lg text-[#736E68] hover:text-[#2C2C2C] hover:bg-[#F5F2EC] border border-[#E8E4DF] transition cursor-pointer shadow-2xs"
            title="Download reflection as Markdown (.md)"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Selector Ribbon */}
      <div
        id="mode-selector-ribbon"
        className="bg-[#FAF8F5] border-b border-[#E8E4DF] px-4 py-2 sm:px-6 flex items-center justify-between gap-3 text-xs overflow-x-auto shrink-0"
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-semibold text-[#736E68] uppercase tracking-widest mr-1 font-sans">
            Focus:
          </span>

          {[
            { id: "deep-reflection", label: "Deep Reflection", icon: BookOpen },
            { id: "brainstorm", label: "Brainstorm", icon: Lightbulb },
            { id: "summary", label: "Structured Summary", icon: Compass },
            { id: "philosophical", label: "Mindful / Socratic", icon: Sparkles },
          ].map((mode) => {
            const isSelected = interaction.reflectionMode === mode.id;
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id as ReflectionMode)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium text-xs transition cursor-pointer ${
                  isSelected
                    ? "bg-white text-[#8B735B] border border-[#8B735B]/40 shadow-2xs"
                    : "text-[#736E68] hover:text-[#2C2C2C] hover:bg-white/60"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Focus Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {showFocusInput ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Specific guidance topic..."
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
                className="px-2 py-0.5 rounded bg-white border border-[#E8E4DF] text-xs text-[#2C2C2C] focus:outline-none focus:border-[#8B735B]"
              />
              <button
                onClick={() => setShowFocusInput(false)}
                className="text-xs text-[#736E68] hover:text-[#2C2C2C]"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowFocusInput(true)}
              className="text-[11px] text-[#736E68] hover:text-[#8B735B] underline decoration-dotted cursor-pointer"
            >
              + Add Topic Focus
            </button>
          )}
        </div>
      </div>

      {/* Save Error Alert */}
      {saveError && (
        <ErrorBanner
          message={saveError}
          onRetry={onRetrySave}
          onDismiss={onClearSaveError}
        />
      )}

      {/* Extraction in progress banner */}
      {isExtractingDoc && (
        <div
          id="extraction-banner"
          className="bg-[#8B735B]/10 border-b border-[#8B735B]/30 px-4 py-2.5 flex items-center justify-between text-xs text-[#755F4A] animate-pulse shrink-0"
        >
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#8B735B]" />
            <span className="font-medium">
              Extracting structured academic metadata with Gemini 3.6 Flash...
            </span>
          </div>
          <span className="text-[11px] font-mono">
            responseSchema JSON validation
          </span>
        </div>
      )}

      {/* Scrollable Conversation Content */}
      <div
        id="messages-scroll-area"
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
      >
        {/* Gemini Summary Card if available */}
        {interaction.summary && (
          <div className="max-w-3xl mx-auto">
            <SummaryCard summary={interaction.summary} />
          </div>
        )}

        {/* Empty State / Welcome */}
        {interaction.messages.length === 0 ? (
          <div className="max-w-xl mx-auto text-center py-8 px-4 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-[#F4EFEB] border border-[#E8E4DF] text-[#8B735B] shadow-2xs mb-2">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#2C2C2C]">
                Welcome to Academic Vault AI
              </h3>
              <p className="text-xs text-[#736E68] leading-relaxed max-w-md mx-auto">
                Upload your transcripts, marksheets, or certificates for structured extraction.
                Or write freely to reflect on your academic journey and career aspirations.
              </p>
            </div>

            {/* Quick Upload Action */}
            <div className="p-4 rounded-2xl bg-white border border-[#E8E4DF] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#8B735B]/10 text-[#8B735B]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-serif font-semibold text-[#2C2C2C]">
                    Extract Academic Document
                  </h4>
                  <p className="text-[11px] text-[#736E68]">
                    Upload image or PDF to extract GPA, courses &amp; credentials
                  </p>
                </div>
              </div>
              <button
                id="empty-state-upload-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtractingDoc}
                className="px-3.5 py-1.5 rounded-xl bg-[#8B735B] hover:bg-[#755F4A] text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </button>
            </div>

            {/* Suggested Reflection Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
              {STARTER_PROMPTS.map((starter, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(starter.text);
                    handleModeChange(starter.mode);
                    textareaRef.current?.focus();
                  }}
                  className="p-3.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#E8E4DF] hover:border-[#8B735B]/50 shadow-2xs transition text-left space-y-1.5 cursor-pointer"
                >
                  <p className="text-xs font-serif font-semibold text-[#2C2C2C] flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#8B735B]" />
                    <span>{starter.title}</span>
                  </p>
                  <p className="text-xs text-[#736E68] line-clamp-2 leading-relaxed">
                    {starter.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {interaction.messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  id={`chat-message-${message.id}`}
                  className={`flex flex-col ${
                    isUser ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-[#736E68]">
                    <span className="font-semibold text-[#2C2C2C]">
                      {isUser ? "My Reflection" : "Gemini 3.6 Flash"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-[#8B735B]" />
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {!isUser && message.modelUsed && (
                      <span className="px-1.5 py-0.2 rounded bg-[#EAE5DE] text-[#755F4A] font-mono text-[10px] border border-[#D4CEC7]">
                        {message.modelUsed}
                      </span>
                    )}
                  </div>

                  <div
                    className={`relative p-4.5 rounded-2xl max-w-[90%] sm:max-w-[85%] text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? "bg-[#2C2C2C] text-[#F8F6F2] rounded-br-xs shadow-xs"
                        : "bg-white text-[#2C2C2C] border border-[#E8E4DF] rounded-bl-xs shadow-xs"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap font-sans">{message.content}</p>
                    ) : (
                      <div className="prose prose-stone prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-semibold prose-headings:text-[#2C2C2C]">
                        <Markdown
                          components={{
                            a: ({ href, children }) => {
                              if (href && href.startsWith("#doc:")) {
                                const docId = href.replace("#doc:", "");
                                return (
                                  <button
                                    type="button"
                                    onClick={() => onOpenDocumentById(docId)}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#8B735B]/10 hover:bg-[#8B735B]/20 text-[#755F4A] border border-[#8B735B]/30 font-semibold text-xs my-0.5 cursor-pointer transition shadow-2xs"
                                    title="Click to view verified source document in your Academic Vault"
                                  >
                                    <Award className="w-3.5 h-3.5 text-[#8B735B]" />
                                    <span>{children}</span>
                                  </button>
                                );
                              }
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#8B735B] underline hover:text-[#755F4A]"
                                >
                                  {children}
                                </a>
                              );
                            },
                          }}
                        >
                          {message.content}
                        </Markdown>
                      </div>
                    )}

                    {/* Copy message button */}
                    <button
                      onClick={() => handleCopy(message.id, message.content)}
                      className={`absolute top-2.5 right-2.5 p-1 rounded transition opacity-0 hover:opacity-100 focus:opacity-100 cursor-pointer ${
                        isUser
                          ? "text-stone-400 hover:text-white bg-stone-800"
                          : "text-[#A39D95] hover:text-[#2C2C2C] bg-[#F5F2EC]"
                      }`}
                      title="Copy text"
                    >
                      {copiedId === message.id ? (
                        <Check className="w-3 h-3 text-[#8B735B]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Generating response indicator */}
            {isGenerating && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-[#736E68]">
                  <span className="font-semibold text-[#2C2C2C]">Gemini 3.6 Flash</span>
                  <span>•</span>
                  <span>Consulting Academic Vault &amp; Contemplating...</span>
                </div>
                <div className="p-4 rounded-2xl rounded-bl-xs bg-white border border-[#E8E4DF] shadow-xs flex items-center gap-2.5 text-xs text-[#736E68]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#8B735B]" />
                  <span>Synthesizing response with {activeModel}...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Input Composer */}
      <div
        id="input-composer-area"
        className="bg-white border-t border-[#E8E4DF] p-3 sm:p-4 shadow-[0_-2px_10px_rgba(44,44,44,0.03)] shrink-0"
      >
        <div className="max-w-3xl mx-auto space-y-2">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              id="reflection-prompt-input"
              ref={textareaRef}
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your academic history, verify grades, or write a reflection... (Press Cmd+Enter to send)"
              disabled={isGenerating || isExtractingDoc}
              className="w-full resize-none p-3 pr-24 text-xs sm:text-sm text-[#2C2C2C] bg-[#FAF8F5] border border-[#E8E4DF] rounded-xl focus:bg-white focus:outline-none focus:border-[#8B735B] focus:ring-1 focus:ring-[#8B735B] placeholder-[#A39D95] transition leading-relaxed"
            />

            {/* Action buttons inside composer */}
            <div className="absolute right-2.5 bottom-3.5 flex items-center gap-1.5">
              {/* File Upload Button */}
              <button
                id="composer-upload-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtractingDoc || isGenerating}
                className="p-2.5 rounded-lg bg-[#FAF8F5] hover:bg-[#EAE5DE] text-[#736E68] hover:text-[#2C2C2C] border border-[#E8E4DF] transition cursor-pointer shadow-2xs disabled:opacity-40"
                title="Upload Academic Document (PDF or Image) for structured extraction"
              >
                {isExtractingDoc ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#8B735B]" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>

              {/* Send prompt button */}
              <button
                id="send-prompt-btn"
                type="submit"
                disabled={!inputText.trim() || isGenerating || isExtractingDoc}
                className="p-2.5 rounded-lg bg-[#8B735B] text-white hover:bg-[#755F4A] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
                title="Send reflection (Cmd/Ctrl + Enter)"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between text-[11px] text-[#736E68] px-1">
            <span className="hidden sm:flex items-center gap-2">
              <span>
                <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-[#E8E4DF] text-[#2C2C2C] font-mono text-[10px]">⌘ / Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-[#E8E4DF] text-[#2C2C2C] font-mono text-[10px]">Enter</kbd> to submit.
              </span>
              <span>•</span>
              <span className="text-[#8B735B]">
                Drag &amp; drop PDF or images anywhere to extract
              </span>
            </span>
            <span className="text-[10px] text-[#A39D95]">
              {inputText.length} characters
            </span>
          </div>
        </div>
      </div>
    </main>
  );
};

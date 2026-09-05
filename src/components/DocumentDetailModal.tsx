import React, { useState } from "react";
import { AcademicDocument } from "../types";
import {
  Award,
  Building,
  Calendar,
  MapPin,
  Sparkles,
  X,
  Copy,
  Check,
  Trash2,
  BookOpen,
  MessageSquare,
} from "lucide-react";

interface DocumentDetailModalProps {
  document: AcademicDocument;
  onClose: () => void;
  onAskGemini: (prompt: string) => void;
  onDelete?: (documentId: string) => Promise<void>;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  onClose,
  onAskGemini,
  onDelete,
}) => {
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const citationString = `[Doc: ${document.issuingInstitution} ${document.documentType}](#doc:${document.id})`;

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(citationString);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const handlePromptClick = () => {
    const prompt = `Based on my verified ${document.documentType} from ${document.issuingInstitution} (issued: ${document.dateOfIssuance || "N/A"}), can you provide a comprehensive review of my academic standing and subject competencies?`;
    onAskGemini(prompt);
    onClose();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(document.id);
      onClose();
    } catch (err) {
      console.error("Failed to delete document:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      id="document-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2C2C2C]/50 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E8E4DF] overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#FAF8F5] border-b border-[#E8E4DF] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#8B735B]/10 text-[#8B735B] border border-[#8B735B]/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EAE5DE] text-[#755F4A] border border-[#D4CEC7]">
                  {document.documentType}
                </span>
                <span className="text-[10px] text-[#A39D95] font-mono">
                  ID: {document.id}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#2C2C2C] mt-0.5">
                {document.issuingInstitution}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#736E68] hover:text-[#2C2C2C] hover:bg-[#EAE5DE] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-[#2C2C2C]">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#8B735B] shrink-0" />
              <div>
                <p className="text-[10px] text-[#736E68]">Date of Issuance</p>
                <p className="font-medium text-[#2C2C2C]">
                  {document.dateOfIssuance || "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#8B735B] shrink-0" />
              <div>
                <p className="text-[10px] text-[#736E68]">Location / Campus</p>
                <p className="font-medium text-[#2C2C2C]">
                  {document.awardLocation || "Not specified"}
                </p>
              </div>
            </div>
          </div>

          {/* Academic Performance Highlights */}
          <div className="space-y-2">
            <h4 className="text-xs font-serif font-bold text-[#2C2C2C] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8B735B]" />
              Performance &amp; Metrics
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white border border-[#E8E4DF] shadow-2xs text-center">
                <span className="text-[10px] text-[#736E68] block">GPA / CGPA</span>
                <span className="text-sm sm:text-base font-serif font-bold text-[#8B735B]">
                  {document.keyMetrics?.gpa || "—"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E8E4DF] shadow-2xs text-center">
                <span className="text-[10px] text-[#736E68] block">Score / Total</span>
                <span className="text-sm sm:text-base font-serif font-bold text-[#2C2C2C]">
                  {document.keyMetrics?.totalScore || "—"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E8E4DF] shadow-2xs text-center">
                <span className="text-[10px] text-[#736E68] block">Honors</span>
                <span className="text-xs sm:text-sm font-serif font-bold text-[#755F4A] truncate block">
                  {document.keyMetrics?.honors || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Summary */}
          {document.summary && (
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] space-y-1">
              <h5 className="text-[11px] font-semibold text-[#736E68] flex items-center gap-1 font-sans">
                <BookOpen className="w-3 h-3 text-[#8B735B]" />
                Summary
              </h5>
              <p className="text-xs text-[#2C2C2C] leading-relaxed">
                {document.summary}
              </p>
            </div>
          )}

          {/* Subject Breakdown */}
          {Array.isArray(document.keyMetrics?.subjects) &&
            document.keyMetrics.subjects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-serif font-bold text-[#2C2C2C]">
                  Extracted Subjects &amp; Grades ({document.keyMetrics.subjects.length})
                </h4>
                <div className="border border-[#E8E4DF] rounded-xl overflow-hidden divide-y divide-[#E8E4DF]">
                  {document.keyMetrics.subjects.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 flex items-center justify-between text-xs hover:bg-[#FAF8F5] transition"
                    >
                      <span className="font-medium text-[#2C2C2C]">
                        {item.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-[#F4EFEB] text-[#755F4A] border border-[#E8E4DF]">
                        {item.grade}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Citation Helper */}
          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="text-[10px] text-[#736E68] block">
                Markdown Citation Link:
              </span>
              <code className="text-[11px] font-mono text-[#8B735B] truncate block">
                {citationString}
              </code>
            </div>
            <button
              onClick={handleCopyCitation}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#EAE5DE] text-[#2C2C2C] border border-[#E8E4DF] text-xs font-medium flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs transition"
            >
              {copiedCitation ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#8B735B]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#FAF8F5] border-t border-[#E8E4DF] flex items-center justify-between shrink-0">
          {onDelete && (
            <button
              disabled={isDeleting}
              onClick={handleDelete}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? "Deleting..." : "Delete Record"}</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handlePromptClick}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#8B735B] hover:bg-[#755F4A] text-white flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask Gemini About This</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

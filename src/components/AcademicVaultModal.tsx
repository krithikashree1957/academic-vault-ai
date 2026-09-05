import React, { useState } from "react";
import { AcademicDocument, DocumentType } from "../types";
import {
  Award,
  Building,
  Calendar,
  MapPin,
  Search,
  Sparkles,
  X,
  Plus,
  Trash2,
  ExternalLink,
  BookOpen,
} from "lucide-react";

interface AcademicVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: AcademicDocument[];
  onSelectDocument: (doc: AcademicDocument) => void;
  onDeleteDocument: (docId: string) => Promise<void>;
  onTriggerUpload: () => void;
}

export const AcademicVaultModal: React.FC<AcademicVaultModalProps> = ({
  isOpen,
  onClose,
  documents,
  onSelectDocument,
  onDeleteDocument,
  onTriggerUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = documents.filter((doc) => {
    const matchesSearch =
      doc.issuingInstitution.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.awardLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.keyMetrics?.honors &&
        doc.keyMetrics.honors.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.keyMetrics?.subjects &&
        doc.keyMetrics.subjects.some((s) =>
          s.subject.toLowerCase().includes(searchQuery.toLowerCase())
        ));

    const matchesType =
      filterType === "all" || doc.documentType === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div
      id="academic-vault-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2C2C2C]/50 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#E8E4DF] overflow-hidden my-auto max-h-[90vh] flex flex-col"
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
                <h3 className="text-base sm:text-lg font-serif font-bold text-[#2C2C2C]">
                  Academic Vault
                </h3>
                <span className="text-[11px] font-mono bg-[#8B735B] text-white px-2 py-0.5 rounded-full font-medium">
                  {documents.length} verified {documents.length === 1 ? "record" : "records"}
                </span>
              </div>
              <p className="text-xs text-[#736E68]">
                Private Firestore collection (/users/{`{userId}`}/documents) indexed for citation-backed Gemini dialogue.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#736E68] hover:text-[#2C2C2C] hover:bg-[#EAE5DE] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-[#F5F2EC] border-b border-[#E8E4DF] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A39D95]" />
            <input
              type="text"
              placeholder="Search by university, degree, subject, or honors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 rounded-lg bg-white border border-[#E8E4DF] text-xs text-[#2C2C2C] placeholder-[#A39D95] focus:outline-none focus:border-[#8B735B] shadow-2xs"
            />
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
            {["all", "Marksheet", "Degree", "Certificate", "Other"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-md transition text-[11px] shrink-0 ${
                  filterType === t
                    ? "bg-[#8B735B] text-white font-medium shadow-2xs"
                    : "bg-white text-[#736E68] hover:text-[#2C2C2C] border border-[#E8E4DF]"
                }`}
              >
                {t === "all" ? "All Credentials" : t}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              onClose();
              onTriggerUpload();
            }}
            className="px-3 py-1.5 rounded-lg bg-[#8B735B] hover:bg-[#755F4A] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload New</span>
          </button>
        </div>

        {/* Document Grid */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <Award className="w-10 h-10 mx-auto text-[#8B735B]/40" />
              <p className="text-sm font-serif font-semibold text-[#2C2C2C]">
                {searchQuery
                  ? "No matching academic records found"
                  : "No credentials in your vault yet"}
              </p>
              <p className="text-xs text-[#736E68] max-w-md mx-auto leading-relaxed">
                Upload your transcripts, degrees, diplomas, or course certificates.
                Gemini extracts structured metadata, allowing you to converse with your academic history.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onTriggerUpload();
                }}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B735B] text-white text-xs font-medium hover:bg-[#755F4A] transition shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Document (PDF / Image)</span>
              </button>
            </div>
          ) : (
            filtered.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#E8E4DF] hover:border-[#8B735B]/40 shadow-2xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F4EFEB] text-[#755F4A] border border-[#E8E4DF]">
                      {doc.documentType}
                    </span>
                    <h4 className="text-sm font-serif font-bold text-[#2C2C2C] truncate">
                      {doc.issuingInstitution}
                    </h4>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#736E68] flex-wrap">
                    {doc.dateOfIssuance && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#8B735B]" />
                        {doc.dateOfIssuance}
                      </span>
                    )}
                    {doc.awardLocation && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#8B735B]" />
                        {doc.awardLocation}
                      </span>
                    )}
                    {doc.keyMetrics?.gpa && (
                      <span className="font-mono text-[#8B735B] font-semibold">
                        GPA: {doc.keyMetrics.gpa}
                      </span>
                    )}
                    {doc.keyMetrics?.honors && (
                      <span className="text-[#755F4A] font-serif italic">
                        {doc.keyMetrics.honors}
                      </span>
                    )}
                  </div>

                  {doc.summary && (
                    <p className="text-xs text-[#736E68] line-clamp-2 leading-relaxed">
                      {doc.summary}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8E4DF]">
                  <button
                    onClick={() => {
                      onSelectDocument(doc);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#EAE5DE] text-[#2C2C2C] border border-[#E8E4DF] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (deletingId === doc.id) {
                        await onDeleteDocument(doc.id);
                        setDeletingId(null);
                      } else {
                        setDeletingId(doc.id);
                      }
                    }}
                    className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                      deletingId === doc.id
                        ? "bg-red-600 text-white border-red-700"
                        : "text-[#A39D95] hover:text-red-600 border-transparent hover:border-[#E8E4DF]"
                    }`}
                    title={deletingId === doc.id ? "Click again to confirm delete" : "Delete record"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#FAF8F5] border-t border-[#E8E4DF] text-xs text-[#736E68] flex items-center justify-between shrink-0">
          <span>
            Citation Syntax: <code className="font-mono text-[#8B735B]">[Doc: Title](#doc:ID)</code>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#EAE5DE] hover:bg-[#D4CEC7] text-[#2C2C2C] font-medium text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

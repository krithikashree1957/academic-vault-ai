import React, { useState } from "react";
import {
  ExtractedDocumentData,
  DocumentType,
  SubjectGrade,
  KeyMetrics,
} from "../types";
import {
  FileText,
  Check,
  X,
  Plus,
  Trash2,
  Building,
  Calendar,
  MapPin,
  Award,
  BookOpen,
  Sparkles,
  Loader2,
} from "lucide-react";

interface DocumentConfirmationModalProps {
  data: ExtractedDocumentData;
  onConfirm: (confirmedData: ExtractedDocumentData) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const DOCUMENT_TYPES: DocumentType[] = [
  "Marksheet",
  "Degree",
  "Certificate",
  "Other",
];

export const DocumentConfirmationModal: React.FC<
  DocumentConfirmationModalProps
> = ({ data, onConfirm, onCancel, isSaving }) => {
  const [documentType, setDocumentType] = useState<DocumentType>(
    data.documentType || "Other"
  );
  const [issuingInstitution, setIssuingInstitution] = useState(
    data.issuingInstitution || ""
  );
  const [dateOfIssuance, setDateOfIssuance] = useState(
    data.dateOfIssuance || ""
  );
  const [awardLocation, setAwardLocation] = useState(
    data.awardLocation || ""
  );
  const [summary, setSummary] = useState(data.summary || "");

  // Key metrics
  const [gpa, setGpa] = useState(data.keyMetrics?.gpa || "");
  const [totalScore, setTotalScore] = useState(
    data.keyMetrics?.totalScore || ""
  );
  const [honors, setHonors] = useState(data.keyMetrics?.honors || "");
  const [subjects, setSubjects] = useState<SubjectGrade[]>(
    Array.isArray(data.keyMetrics?.subjects) ? data.keyMetrics.subjects : []
  );

  // New subject inputs
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectGrade, setNewSubjectGrade] = useState("");

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    setSubjects((prev) => [
      ...prev,
      {
        subject: newSubjectName.trim(),
        grade: newSubjectGrade.trim() || "Passed",
      },
    ]);
    setNewSubjectName("");
    setNewSubjectGrade("");
  };

  const handleRemoveSubject = (index: number) => {
    setSubjects((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubjectChange = (
    index: number,
    field: "subject" | "grade",
    val: string
  ) => {
    setSubjects((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuingInstitution.trim()) return;

    const keyMetrics: KeyMetrics = {
      gpa: gpa.trim(),
      totalScore: totalScore.trim(),
      honors: honors.trim(),
      subjects: subjects.filter((s) => s.subject.trim().length > 0),
    };

    const confirmed: ExtractedDocumentData = {
      ...data,
      documentType,
      issuingInstitution: issuingInstitution.trim(),
      dateOfIssuance: dateOfIssuance.trim(),
      awardLocation: awardLocation.trim(),
      summary: summary.trim(),
      keyMetrics,
    };

    await onConfirm(confirmed);
  };

  return (
    <div
      id="document-confirmation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2C2C2C]/50 backdrop-blur-xs overflow-y-auto"
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E8E4DF] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#FAF8F5] border-b border-[#E8E4DF] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#8B735B]/10 text-[#8B735B] border border-[#8B735B]/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-serif font-bold text-[#2C2C2C]">
                  Review Extracted Credential
                </h3>
                <span className="text-[10px] font-mono bg-[#8B735B] text-white px-2 py-0.5 rounded-full font-medium">
                  Structured JSON
                </span>
              </div>
              <p className="text-xs text-[#736E68]">
                Gemini 3.6 Flash structured extraction. Review and edit fields before saving to your Academic Vault.
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-[#736E68] hover:text-[#2C2C2C] hover:bg-[#EAE5DE] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Document File Banner */}
        <div className="px-5 py-2.5 bg-[#F4EFEB] border-b border-[#E8E4DF] flex items-center justify-between text-xs text-[#736E68] shrink-0">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 text-[#8B735B] shrink-0" />
            <span className="font-medium text-[#2C2C2C] truncate">
              {data.fileName || "Uploaded Document"}
            </span>
            <span className="text-[11px] text-[#A39D95]">
              ({data.fileType || "Document"})
            </span>
          </div>
          <span className="text-[11px] text-[#8B735B] font-medium shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Ready for Vault
          </span>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4.5 text-xs text-[#2C2C2C]"
        >
          {/* Classification & Institution */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#736E68] mb-1 font-sans">
                Document Type *
              </label>
              <select
                id="doc-type-select"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] text-xs font-medium text-[#2C2C2C] focus:bg-white focus:outline-none focus:border-[#8B735B]"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-[#736E68] mb-1 font-sans flex items-center gap-1">
                <Building className="w-3 h-3 text-[#8B735B]" />
                Issuing Institution / University *
              </label>
              <input
                id="doc-institution-input"
                type="text"
                required
                value={issuingInstitution}
                onChange={(e) => setIssuingInstitution(e.target.value)}
                placeholder="e.g. Stanford University, MIT, State Board..."
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] text-xs text-[#2C2C2C] focus:bg-white focus:outline-none focus:border-[#8B735B]"
              />
            </div>
          </div>

          {/* Date and Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#736E68] mb-1 font-sans flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#8B735B]" />
                Date of Issuance
              </label>
              <input
                id="doc-date-input"
                type="text"
                value={dateOfIssuance}
                onChange={(e) => setDateOfIssuance(e.target.value)}
                placeholder="e.g. May 2024, 2023-06-15"
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] text-xs text-[#2C2C2C] focus:bg-white focus:outline-none focus:border-[#8B735B]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#736E68] mb-1 font-sans flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#8B735B]" />
                Award / Campus Location
              </label>
              <input
                id="doc-location-input"
                type="text"
                value={awardLocation}
                onChange={(e) => setAwardLocation(e.target.value)}
                placeholder="e.g. Stanford, CA, USA"
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] text-xs text-[#2C2C2C] focus:bg-white focus:outline-none focus:border-[#8B735B]"
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-[11px] font-semibold text-[#736E68] mb-1 font-sans flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-[#8B735B]" />
              Credential Summary
            </label>
            <textarea
              id="doc-summary-input"
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of credential or achievement..."
              className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] text-xs text-[#2C2C2C] focus:bg-white focus:outline-none focus:border-[#8B735B] resize-none leading-relaxed"
            />
          </div>

          {/* Key Metrics Section */}
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] space-y-3">
            <h4 className="text-xs font-serif font-bold text-[#2C2C2C] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8B735B]" />
              Academic Performance &amp; Key Metrics
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-medium text-[#736E68] mb-1">
                  GPA / CGPA
                </label>
                <input
                  id="doc-gpa-input"
                  type="text"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  placeholder="e.g. 3.92 / 4.0"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E8E4DF] text-xs font-mono text-[#2C2C2C] focus:outline-none focus:border-[#8B735B]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-[#736E68] mb-1">
                  Total Score / Percentage
                </label>
                <input
                  id="doc-score-input"
                  type="text"
                  value={totalScore}
                  onChange={(e) => setTotalScore(e.target.value)}
                  placeholder="e.g. 94%, 850/1000"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E8E4DF] text-xs font-mono text-[#2C2C2C] focus:outline-none focus:border-[#8B735B]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-[#736E68] mb-1">
                  Honors / Distinction
                </label>
                <input
                  id="doc-honors-input"
                  type="text"
                  value={honors}
                  onChange={(e) => setHonors(e.target.value)}
                  placeholder="e.g. Magna Cum Laude"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E8E4DF] text-xs text-[#2C2C2C] focus:outline-none focus:border-[#8B735B]"
                />
              </div>
            </div>

            {/* Subjects & Grades Table */}
            <div className="space-y-2 pt-1 border-t border-[#E8E4DF]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#736E68]">
                  Individual Subjects &amp; Grades ({subjects.length})
                </span>
              </div>

              {subjects.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {subjects.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-[#E8E4DF] text-xs"
                    >
                      <input
                        type="text"
                        value={item.subject}
                        onChange={(e) =>
                          handleSubjectChange(idx, "subject", e.target.value)
                        }
                        placeholder="Subject Name"
                        className="flex-1 px-2 py-1 bg-transparent text-xs text-[#2C2C2C] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={item.grade}
                        onChange={(e) =>
                          handleSubjectChange(idx, "grade", e.target.value)
                        }
                        placeholder="Grade / Score"
                        className="w-24 px-2 py-1 bg-[#FAF8F5] border border-[#E8E4DF] rounded text-xs font-mono text-center text-[#2C2C2C] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(idx)}
                        className="p-1 text-[#A39D95] hover:text-red-600 transition rounded"
                        title="Remove subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#A39D95] italic">
                  No individual subjects extracted. You can add them below.
                </p>
              )}

              {/* Add subject row */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubject();
                    }
                  }}
                  placeholder="Add subject (e.g. Advanced Calculus)"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#E8E4DF] text-xs text-[#2C2C2C] focus:outline-none focus:border-[#8B735B]"
                />
                <input
                  type="text"
                  value={newSubjectGrade}
                  onChange={(e) => setNewSubjectGrade(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubject();
                    }
                  }}
                  placeholder="Grade (e.g. A+)"
                  className="w-24 px-2.5 py-1.5 rounded-lg bg-white border border-[#E8E4DF] text-xs text-[#2C2C2C] focus:outline-none focus:border-[#8B735B]"
                />
                <button
                  type="button"
                  onClick={handleAddSubject}
                  className="px-2.5 py-1.5 rounded-lg bg-[#EAE5DE] hover:bg-[#D4CEC7] text-[#2C2C2C] font-medium text-xs flex items-center gap-1 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-[#E8E4DF] flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              disabled={isSaving}
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#736E68] hover:text-[#2C2C2C] hover:bg-[#FAF8F5] border border-[#E8E4DF] transition cursor-pointer"
            >
              Discard
            </button>

            <button
              id="confirm-save-document-btn"
              type="submit"
              disabled={isSaving || !issuingInstitution.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#8B735B] hover:bg-[#755F4A] text-white transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Archiving to Firestore...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Confirm &amp; Save to Academic Vault</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

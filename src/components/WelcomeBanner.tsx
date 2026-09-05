import React, { useState, useEffect } from "react";
import {
  Award,
  UploadCloud,
  FileCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  FileText,
} from "lucide-react";

interface WelcomeBannerProps {
  onTriggerUpload: () => void;
  onOpenVault: () => void;
  vaultCount: number;
  onSelectStarterPrompt?: (text: string) => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  onTriggerUpload,
  onOpenVault,
  vaultCount,
  onSelectStarterPrompt,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (isDismissed) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-2">
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white border border-[#E8E4DF] text-xs text-[#736E68] shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <Award className="w-4 h-4 text-[#8B735B] shrink-0" />
            <span className="font-medium text-[#2C2C2C] shrink-0">Academic Vault AI</span>
            <span className="hidden sm:inline text-[#A39D95]">•</span>
            <span className="truncate hidden sm:inline">Verified credential archive &amp; grounded academic reflections</span>
          </div>
          <button
            onClick={() => setIsDismissed(false)}
            className="text-xs font-medium text-[#8B735B] hover:text-[#755F4A] hover:underline cursor-pointer ml-3 shrink-0"
          >
            Show Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="academic-vault-welcome-banner" className="w-full max-w-4xl mx-auto mb-4">
      <div className="rounded-2xl bg-white border border-[#E8E4DF] shadow-[0_2px_8px_rgba(44,44,44,0.03)] overflow-hidden transition-all duration-200">
        {/* Banner Top Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-[#F0ECE6] bg-[#FAF8F5]">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#8B735B]/10 text-[#8B735B] shrink-0 mt-0.5">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-serif font-bold text-[#2C2C2C] tracking-tight">
                  Academic Vault AI
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[#8B735B]/15 text-[#755F4A] text-[11px] font-medium font-sans">
                  Gemini 2.5 Flash &bull; Cloud Firestore
                </span>
              </div>
              <p className="text-xs text-[#736E68] mt-1 leading-relaxed max-w-2xl">
                A private, high-fidelity academic archive and reflective advisor. Securely digitize marksheets, degrees, and transcripts with structured schema extraction, and converse with citation-grounded intelligence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-[#736E68] hover:text-[#2C2C2C] hover:bg-[#F2EFE9] transition cursor-pointer"
              title={isExpanded ? "Collapse overview" : "Expand overview"}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg text-[#736E68] hover:text-[#2C2C2C] hover:bg-[#F2EFE9] transition cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Feature Overview & Steps */}
        {isExpanded && (
          <div className="p-5 space-y-5">
            {/* 4-Step Process Guide */}
            <div>
              <h2 className="text-xs font-semibold text-[#2C2C2C] uppercase tracking-wider mb-3">
                How to Use Academic Vault AI
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-left">
                {/* Step 1 */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#8B735B] text-white text-[11px] font-bold flex items-center justify-center font-mono shrink-0">
                      1
                    </span>
                    <span className="text-xs font-serif font-semibold text-[#2C2C2C]">
                      Upload Credentials
                    </span>
                  </div>
                  <p className="text-[11px] text-[#736E68] leading-relaxed">
                    Attach marksheets, degrees, or certificates in PDF or image format via the paperclip or drag-and-drop.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#8B735B] text-white text-[11px] font-bold flex items-center justify-center font-mono shrink-0">
                      2
                    </span>
                    <span className="text-xs font-serif font-semibold text-[#2C2C2C]">
                      Verify &amp; Archive
                    </span>
                  </div>
                  <p className="text-[11px] text-[#736E68] leading-relaxed">
                    Inspect extracted GPA, coursework, and honors in the verification modal before saving to your private vault.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#8B735B] text-white text-[11px] font-bold flex items-center justify-center font-mono shrink-0">
                      3
                    </span>
                    <span className="text-xs font-serif font-semibold text-[#2C2C2C]">
                      Grounded Inquiries
                    </span>
                  </div>
                  <p className="text-[11px] text-[#736E68] leading-relaxed">
                    Ask questions about coursework strengths or career goals. Gemini answers with clickable citation badges.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E4DF] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#8B735B] text-white text-[11px] font-bold flex items-center justify-center font-mono shrink-0">
                      4
                    </span>
                    <span className="text-xs font-serif font-semibold text-[#2C2C2C]">
                      Summarize &amp; Export
                    </span>
                  </div>
                  <p className="text-[11px] text-[#736E68] leading-relaxed">
                    Generate structured takeaways, sentiment assessments, and export complete dialogue records to Markdown.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons & Status */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0ECE6]">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  id="banner-upload-btn"
                  onClick={onTriggerUpload}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B735B] hover:bg-[#755F4A] text-white text-xs font-medium transition cursor-pointer shadow-2xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Academic Document</span>
                </button>

                <button
                  id="banner-open-vault-btn"
                  onClick={onOpenVault}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-[#FAF8F5] text-[#2C2C2C] border border-[#E8E4DF] text-xs font-medium transition cursor-pointer shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-[#8B735B]" />
                  <span>Browse Vault</span>
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#8B735B]/15 text-[#755F4A] font-mono text-[10px] font-semibold">
                    {vaultCount} saved
                  </span>
                </button>

                {onSelectStarterPrompt && (
                  <button
                    id="banner-starter-query-btn"
                    onClick={() =>
                      onSelectStarterPrompt(
                        "Review my academic records in the vault: what is my cumulative GPA, and which specific courses or areas demonstrate my highest performance?"
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE9] text-[#736E68] hover:text-[#2C2C2C] border border-[#E8E4DF] text-xs font-medium transition cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#8B735B]" />
                    <span>Try Academic Audit Inquiry</span>
                  </button>
                )}
              </div>

              {/* Security Pill */}
              <div className="flex items-center gap-1.5 text-[11px] text-[#736E68] bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#E8E4DF]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#8B735B]" />
                <span>Owner-Isolated Cloud Firestore Persistence</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

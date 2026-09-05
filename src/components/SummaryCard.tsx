import React from "react";
import { ReflectionSummary } from "../types";
import { Sparkles, CheckCircle2, Compass, HeartHandshake } from "lucide-react";

interface SummaryCardProps {
  summary: ReflectionSummary;
  modelUsed?: string;
  onClose?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  summary,
  modelUsed = "gemini-3.6-flash",
}) => {
  return (
    <div
      id="reflection-summary-card"
      className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E8E4DF] space-y-3.5 shadow-xs"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#F4EFEB] text-[#8B735B] border border-[#E8E4DF]">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-sm font-serif font-semibold text-[#2C2C2C] tracking-tight">
            Gemini Reflection Insights
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAE5DE] text-[#755F4A] font-mono border border-[#D4CEC7]">
            {modelUsed}
          </span>
        </div>

        {summary.sentiment && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white text-[#736E68] border border-[#E8E4DF]">
            <HeartHandshake className="w-3.5 h-3.5 text-[#8B735B]" />
            <span>Tone: {summary.sentiment}</span>
          </div>
        )}
      </div>

      {/* Key Takeaways */}
      {summary.keyTakeaways && summary.keyTakeaways.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[10px] font-semibold text-[#736E68] uppercase tracking-widest font-sans">
            Key Realizations
          </p>
          <ul className="space-y-1.5">
            {summary.keyTakeaways.map((point, index) => (
              <li
                key={index}
                className="flex items-start gap-2.5 text-xs text-[#2C2C2C]"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#8B735B] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Step */}
      {summary.actionStep && (
        <div className="pt-2.5 border-t border-[#E8E4DF] flex items-start gap-2.5 text-xs text-[#2C2C2C]">
          <Compass className="w-3.5 h-3.5 text-[#8B735B] shrink-0 mt-0.5" />
          <div>
            <span className="font-serif font-semibold text-[#2C2C2C]">Recommended Micro-Action: </span>
            <span className="text-[#736E68]">{summary.actionStep}</span>
          </div>
        </div>
      )}
    </div>
  );
};

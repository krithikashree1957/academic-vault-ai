import React, { useState } from "react";
import { UserInteraction, ReflectionMode } from "../types";
import {
  Plus,
  Search,
  BookOpen,
  Calendar,
  Trash2,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Smile,
  X,
  Award,
  UploadCloud,
} from "lucide-react";

interface HistorySidebarProps {
  interactions: UserInteraction[];
  selectedId: string | null;
  onSelect: (interaction: UserInteraction) => void;
  onNew: () => void;
  onDelete: (id: string) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
  onOpenVault: () => void;
  vaultCount: number;
  onTriggerUpload: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  interactions,
  selectedId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onClose,
  onOpenVault,
  vaultCount,
  onTriggerUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredInteractions = interactions.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.messages.some((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      (item.summary?.sentiment &&
        item.summary.sentiment.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMode =
      filterMode === "all" || item.reflectionMode === filterMode;

    return matchesSearch && matchesMode;
  });

  const handleDeleteConfirm = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsDeleting(true);
      await onDelete(id);
      setDeletingId(null);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-[#2C2C2C]/30 z-30 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        id="history-sidebar"
        className={`fixed lg:static inset-y-0 left-0 z-40 w-80 sm:w-88 bg-[#F5F2EC] text-[#2C2C2C] border-r border-[#E8E4DF] flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Header & New Button */}
        <div className="p-4 border-b border-[#E8E4DF] space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#8B735B]" />
              <h2 className="text-xs font-semibold text-[#2C2C2C] uppercase tracking-widest font-sans">
                Reflections &amp; Vault
              </h2>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md text-[#736E68] hover:text-[#2C2C2C]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Academic Vault Quick Access Box */}
          <div className="p-2.5 rounded-xl bg-white border border-[#E8E4DF] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#8B735B]/10 text-[#8B735B]">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-serif font-bold text-[#2C2C2C] block">
                    Academic Vault
                  </span>
                  <span className="text-[10px] text-[#736E68]">
                    {vaultCount} verified credentials
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  onOpenVault();
                  onClose();
                }}
                className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#EAE5DE] text-[#755F4A] border border-[#E8E4DF] text-[11px] font-medium transition cursor-pointer"
              >
                View
              </button>
            </div>

            <button
              onClick={() => {
                onClose();
                onTriggerUpload();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F2EFE9] text-[#2C2C2C] text-[11px] font-medium border border-[#E8E4DF] transition cursor-pointer"
            >
              <UploadCloud className="w-3 h-3 text-[#8B735B]" />
              <span>Upload Document (PDF / Img)</span>
            </button>
          </div>

          <button
            id="new-reflection-btn"
            onClick={() => {
              onNew();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#8B735B] hover:bg-[#755F4A] text-white font-medium text-xs transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Reflection</span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A39D95]" />
            <input
              id="search-interactions-input"
              type="text"
              placeholder="Search past reflections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 rounded-lg bg-white border border-[#E8E4DF] text-xs text-[#2C2C2C] placeholder-[#A39D95] focus:outline-none focus:border-[#8B735B] focus:ring-1 focus:ring-[#8B735B] shadow-2xs"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            {[
              { id: "all", label: "All" },
              { id: "deep-reflection", label: "Reflections" },
              { id: "brainstorm", label: "Brainstorm" },
              { id: "summary", label: "Summaries" },
              { id: "philosophical", label: "Mindful" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterMode(tab.id)}
                className={`px-2.5 py-0.5 rounded-md shrink-0 transition text-[11px] ${
                  filterMode === tab.id
                    ? "bg-[#EAE5DE] text-[#755F4A] font-semibold border border-[#D4CEC7]"
                    : "text-[#736E68] hover:text-[#2C2C2C]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List of Interactions */}
        <div
          id="interactions-history-list"
          className="flex-1 overflow-y-auto p-3 space-y-2"
        >
          {filteredInteractions.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-[#A39D95]" />
              <p className="text-xs font-medium text-[#736E68]">
                {searchQuery
                  ? "No reflections match your query"
                  : "No saved reflections yet"}
              </p>
              <p className="text-[11px] text-[#A39D95]">
                Start writing in the canvas to automatically sync to your private collection.
              </p>
            </div>
          ) : (
            filteredInteractions.map((item) => {
              const isSelected = item.id === selectedId;
              const lastMessage =
                item.messages.length > 0
                  ? item.messages[item.messages.length - 1]
                  : null;

              return (
                <div
                  key={item.id}
                  id={`history-entry-${item.id}`}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`group relative p-3 rounded-xl transition cursor-pointer border ${
                    isSelected
                      ? "bg-white border-[#8B735B] shadow-xs"
                      : "bg-[#FAF8F5] hover:bg-white border-[#E8E4DF] hover:border-[#D4CEC7]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-serif font-bold text-[#2C2C2C] truncate flex-1">
                      {item.title || "Untitled Reflection"}
                    </h3>

                    {/* Delete button */}
                    <div className="shrink-0 flex items-center">
                      {deletingId === item.id ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            disabled={isDeleting}
                            onClick={(e) => handleDeleteConfirm(item.id, e)}
                            className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-medium transition cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            disabled={isDeleting}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(null);
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#EAE5DE] text-[#2C2C2C] text-[10px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(item.id);
                          }}
                          className="p-1 rounded text-[#A39D95] hover:text-red-600 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Delete reflection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Snippet */}
                  <p className="text-[11px] text-[#736E68] line-clamp-2 mt-1 leading-relaxed">
                    {lastMessage?.content ||
                      item.summary?.keyTakeaways?.[0] ||
                      "No message content yet..."}
                  </p>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E8E4DF]/80 text-[10px] text-[#736E68]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#8B735B]" />
                      {formatDate(item.updatedAt)}
                    </span>

                    <div className="flex items-center gap-2">
                      {item.summary?.sentiment && (
                        <span className="inline-flex items-center gap-0.5 text-[#755F4A] font-medium bg-[#F4EFEB] px-1.5 py-0.5 rounded border border-[#E8E4DF]">
                          <Smile className="w-2.5 h-2.5 text-[#8B735B]" />
                          <span className="truncate max-w-[80px]">
                            {item.summary.sentiment}
                          </span>
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-[#736E68]">
                        <MessageSquare className="w-2.5 h-2.5" />
                        {item.messages.length}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info: Firestore User Isolation */}
        <div className="p-3 border-t border-[#E8E4DF] text-[11px] text-[#736E68] flex items-center justify-between bg-[#FAF8F5] shrink-0">
          <span className="flex items-center gap-1.5 text-[#2C2C2C] font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#8B735B]" />
            <span>{interactions.length} {interactions.length === 1 ? "entry" : "entries"} saved</span>
          </span>
          <span className="text-[10px] text-[#8B735B] bg-[#F4EFEB] px-1.5 py-0.5 rounded border border-[#E8E4DF] font-medium">
            Owner-bound DB
          </span>
        </div>
      </aside>
    </>
  );
};

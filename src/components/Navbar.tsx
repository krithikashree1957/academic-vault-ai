import React from "react";
import { User } from "firebase/auth";
import { Sparkles, LogOut, ShieldCheck, Database, Award } from "lucide-react";

interface NavbarProps {
  user: User | null;
  onSignOut: () => void;
  activeModel?: string;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  activeModel = "gemini-3.6-flash",
  isSyncing = false,
}) => {
  return (
    <header
      id="app-navbar"
      className="bg-[#FAF8F5] text-[#2C2C2C] border-b border-[#E8E4DF] px-4 py-3 sm:px-6 flex items-center justify-between shadow-[0_1px_3px_rgba(44,44,44,0.03)] select-none"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[#F4EFEB] border border-[#E8E4DF] flex items-center justify-center text-[#8B735B] shadow-2xs">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-serif font-semibold tracking-tight text-[#2C2C2C]">
              Academic Vault AI
            </h1>
            <span
              id="model-badge"
              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F2EFE9] text-[#736E68] border border-[#E8E4DF] hidden sm:inline-flex items-center gap-1.5"
              title="Active AI model"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B735B] animate-pulse" />
              {activeModel}
            </span>
          </div>
          <p className="text-xs text-[#736E68] hidden sm:block">
            Intelligent Credential Archive &amp; Citation-Grounded AI Advisory
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Firestore sync status */}
        <div
          id="firestore-status-indicator"
          className="flex items-center gap-1.5 text-xs text-[#736E68] bg-[#F2EFE9] border border-[#E8E4DF] px-2.5 py-1 rounded-lg"
          title="Cloud Firestore User Isolation Active"
        >
          <Database className="w-3.5 h-3.5 text-[#8B735B]" />
          <span className="hidden md:inline">Firestore:</span>
          <span className="font-mono text-[11px] text-[#755F4A] font-medium">
            {isSyncing ? "Saving..." : "Encrypted /users/{uid}"}
          </span>
        </div>

        {user && (
          <div className="flex items-center gap-3 pl-2 border-l border-[#E8E4DF]">
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-8 h-8 rounded-full border border-[#E8E4DF] object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#EAE5DE] border border-[#E8E4DF] flex items-center justify-center text-xs font-semibold text-[#755F4A]">
                  {user.displayName?.[0] || user.email?.[0] || "U"}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium text-[#2C2C2C] truncate max-w-[140px]">
                  {user.displayName || user.email}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-[#8B735B] font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Authenticated</span>
                </div>
              </div>
            </div>

            <button
              id="signout-button"
              onClick={onSignOut}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F2EFE9] hover:bg-[#EAE5DE] text-[#2C2C2C] border border-[#E8E4DF] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 text-[#736E68]" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

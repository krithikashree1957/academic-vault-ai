import React, { useState } from "react";
import { Sparkles, Shield, Lock, Cpu, Database, ArrowRight, AlertCircle } from "lucide-react";

interface AuthLandingProps {
  onSignIn: () => Promise<void>;
  isLoading: boolean;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onSignIn, isLoading }) => {
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignInClick = async () => {
    try {
      setAuthError(null);
      await onSignIn();
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") {
        setAuthError("Sign-in window was closed before completion. Please try again.");
      } else if (err?.code === "auth/popup-blocked") {
        setAuthError("Pop-up was blocked by browser. Please allow pop-ups for this domain to sign in.");
      } else {
        setAuthError(err?.message || "Failed to authenticate with Google. Please try again.");
      }
    }
  };

  return (
    <div
      id="landing-container"
      className="min-h-[calc(100vh-61px)] bg-[#F8F6F2] text-[#2C2C2C] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="w-full max-w-xl mx-auto space-y-8 text-center">
        {/* Emblem & Branding */}
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#F4EFEB] border border-[#E8E4DF] text-[#8B735B] shadow-xs mb-2">
          <Sparkles className="w-8 h-8" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-[#2C2C2C]">
            Private Reflective Journaling
          </h1>
          <p className="text-base sm:text-lg text-[#736E68] max-w-lg mx-auto font-sans leading-relaxed">
            A sanctuary for your daily thoughts, reflections, and deep inquiry with Gemini 3.6 Flash.
            Securely isolated and persisted in Cloud Firestore.
          </p>
        </div>

        {/* Security / Architecture Highlights */}
        <div
          id="security-guarantees-grid"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2"
        >
          <div className="p-4 rounded-xl bg-white border border-[#E8E4DF] shadow-xs space-y-1.5">
            <div className="flex items-center gap-2 text-[#2C2C2C] font-serif font-semibold text-sm">
              <Shield className="w-4 h-4 text-[#8B735B]" />
              <span>User Isolation</span>
            </div>
            <p className="text-xs text-[#736E68] leading-relaxed">
              Rules strictly restrict entries to <code className="text-[11px] bg-[#F4EFEB] border border-[#E8E4DF] px-1 py-0.5 rounded font-mono text-[#755F4A]">/users/&#123;uid&#125;</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E8E4DF] shadow-xs space-y-1.5">
            <div className="flex items-center gap-2 text-[#2C2C2C] font-serif font-semibold text-sm">
              <Cpu className="w-4 h-4 text-[#8B735B]" />
              <span>Gemini 3.6 Flash</span>
            </div>
            <p className="text-xs text-[#736E68] leading-relaxed">
              Resilient AI reflection partner with automatic high-availability fallback.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E8E4DF] shadow-xs space-y-1.5">
            <div className="flex items-center gap-2 text-[#2C2C2C] font-serif font-semibold text-sm">
              <Database className="w-4 h-4 text-[#8B735B]" />
              <span>Cloud Firestore</span>
            </div>
            <p className="text-xs text-[#736E68] leading-relaxed">
              Zero-crash payload sanitation and durable real-time multi-turn persistence.
            </p>
          </div>
        </div>

        {/* Error notification if login failed */}
        {authError && (
          <div
            id="auth-error-banner"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 text-left shadow-2xs"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-xs">Sign-In Notice</p>
              <p className="text-xs text-red-600 mt-0.5">{authError}</p>
            </div>
          </div>
        )}

        {/* Action Button: Google Federated Sign-In */}
        <div className="pt-2 flex flex-col items-center gap-3">
          <button
            id="google-signin-btn"
            onClick={handleSignInClick}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[260px] inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-sm font-medium bg-[#2C2C2C] text-[#F8F6F2] hover:bg-[#1A1A1A] active:scale-[0.99] transition shadow-xs hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border border-[#1A1A1A]"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.36 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Sign in with Google</span>
                <ArrowRight className="w-4 h-4 text-[#A39D95] ml-1" />
              </>
            )}
          </button>

          <p className="text-xs text-[#736E68] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#8B735B]" />
            <span>Federated Authentication via Firebase Auth. No passwords stored.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

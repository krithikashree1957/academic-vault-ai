import React from "react";
import { AlertCircle, RefreshCw, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  onDismiss,
  retryLabel = "Retry",
}) => {
  return (
    <div
      id="error-feedback-banner"
      role="alert"
      className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between gap-3 text-xs shadow-xs"
    >
      <div className="flex items-center gap-2 flex-1">
        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
        <span className="font-medium leading-relaxed">{message}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            id="retry-save-btn"
            onClick={onRetry}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{retryLabel}</span>
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded text-red-500 hover:text-red-700"
            title="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

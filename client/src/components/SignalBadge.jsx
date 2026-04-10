import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Activity,
} from "lucide-react";

function normalizeSignal(rawSignal) {
  const value = String(rawSignal || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (
    value === "BUY" ||
    value === "STRONG_BUY" ||
    value === "BULLISH" ||
    value === "LONG"
  ) {
    return {
      key: "BUY",
      label: value === "STRONG_BUY" ? "Strong Buy" : "Buy",
      icon: TrendingUp,
      className:
        "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm",
      dot: "bg-emerald-500",
      glow: "shadow-emerald-100",
    };
  }

  if (
    value === "SELL" ||
    value === "STRONG_SELL" ||
    value === "BEARISH" ||
    value === "SHORT"
  ) {
    return {
      key: "SELL",
      label: value === "STRONG_SELL" ? "Strong Sell" : "Sell",
      icon: TrendingDown,
      className:
        "bg-rose-50 text-rose-700 border border-rose-200 shadow-sm",
      dot: "bg-rose-500",
      glow: "shadow-rose-100",
    };
  }

  if (value === "HOLD" || value === "NEUTRAL" || value === "WAIT") {
    return {
      key: "HOLD",
      label: "Hold",
      icon: Minus,
      className:
        "bg-amber-50 text-amber-700 border border-amber-200 shadow-sm",
      dot: "bg-amber-500",
      glow: "shadow-amber-100",
    };
  }

  if (value === "NO_SIGNAL" || value === "NONE" || value === "NA") {
    return {
      key: "NO_SIGNAL",
      label: "No Signal",
      icon: AlertCircle,
      className:
        "bg-slate-50 text-slate-700 border border-slate-200 shadow-sm",
      dot: "bg-slate-400",
      glow: "shadow-slate-100",
    };
  }

  return {
    key: "ANALYZING",
    label: "Analyzing",
    icon: Activity,
    className:
      "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm",
    dot: "bg-blue-500",
    glow: "shadow-blue-100",
  };
}

export default function SignalBadge({
  signal,
  confidence,
  compact = false,
  className = "",
}) {
  const meta = normalizeSignal(signal);
  const Icon = meta.icon;

  const safeConfidence = Number(confidence);
  const showConfidence = Number.isFinite(safeConfidence);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${meta.className} ${className}`}
      >
        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
        <Icon size={14} />
        <span>{meta.label}</span>
        {showConfidence && <span className="opacity-75">({safeConfidence}%)</span>}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-3 ${meta.className} ${meta.glow} transition-all duration-200 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70">
            <Icon size={18} />
          </div>

          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] opacity-70">
              ML Signal
            </div>
            <div className="truncate text-sm font-semibold">{meta.label}</div>
          </div>
        </div>

        <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
      </div>

      {showConfidence && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] opacity-75">
            <span>Confidence</span>
            <span>{safeConfidence}%</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-current transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, safeConfidence))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
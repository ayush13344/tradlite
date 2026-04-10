const fs = require("fs");
const path = require("path");

const filePath = path.resolve(__dirname, "src/pages/Charts.jsx"); // change if your file path is different
let code = fs.readFileSync(filePath, "utf8");

const mlBlock = `
const ML_API_BASE = "http://127.0.0.1:8000";

function mlSignalClasses(signal) {
  if (signal === "BUY") {
    return {
      badge: "bg-green-100 text-green-700 border-green-200",
      bar: "bg-green-500",
      subtle: "bg-green-50 border-green-100",
    };
  }
  if (signal === "SELL") {
    return {
      badge: "bg-red-100 text-red-700 border-red-200",
      bar: "bg-red-500",
      subtle: "bg-red-50 border-red-100",
    };
  }
  return {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    bar: "bg-amber-500",
    subtle: "bg-amber-50 border-amber-100",
  };
}

function MlSignalCard({ symbol, isCrypto, displayCurrency }) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [signalData, setSignalData] = React.useState(null);

  const loadSignal = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const cleanSymbol = String(symbol || "")
        .trim()
        .toUpperCase()
        .replace(/\\.NS$/i, "")
        .replace(/-INR$/i, "");

      const res = await fetch(\`\${ML_API_BASE}/predict/signal/\${encodeURIComponent(cleanSymbol)}\`);
      const text = await res.text();

      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Invalid ML API response");
      }

      if (!res.ok) {
        throw new Error(json?.detail || \`ML API error (\${res.status})\`);
      }

      setSignalData(json);
    } catch (err) {
      setError(err?.message || "Failed to load ML signal");
      setSignalData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  React.useEffect(() => {
    loadSignal();
  }, [loadSignal]);

  const tone = mlSignalClasses(signalData?.signal);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">ML Signal</div>
          <div className="mt-1 text-xs text-gray-500">
            {isCrypto ? "Crypto model output" : "Stock model output"} for{" "}
            <span className="font-semibold text-gray-700">{symbol}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={loadSignal}
          className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          Loading ML signal...
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && signalData && (
        <div className="mt-4 space-y-4">
          <div className={\`rounded-2xl border p-4 \${tone.subtle}\`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-gray-500">Current Signal</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={\`rounded-full border px-3 py-1 text-xs font-bold \${tone.badge}\`}>
                    {signalData.signal}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {signalData.confidence}%
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-gray-500">Probability Up</div>
                <div className="mt-1 text-lg font-bold text-gray-900">
                  {signalData.probability_up}%
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                <span>Confidence</span>
                <span>{signalData.confidence}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={\`h-full rounded-full \${tone.bar}\`}
                  style={{ width: \`\${Math.max(0, Math.min(100, Number(signalData.confidence || 0)))}%\` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Price" value={formatCurrency(signalData.price, displayCurrency)} />
            <Stat label="Threshold" value={\`\${signalData.threshold}%\`} />
            <Stat label="Probability Up" value={\`\${signalData.probability_up}%\`} />
            <Stat label="Signal Date" value={signalData.date || "--"} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-semibold text-gray-700">Reasons</div>
            <div className="mt-3 space-y-2">
              {Array.isArray(signalData.reasons) && signalData.reasons.length > 0 ? (
                signalData.reasons.map((reason, index) => (
                  <div
                    key={\`\${reason}_\${index}\`}
                    className="rounded-xl bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
                  >
                    {reason}
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-white px-3 py-2 text-sm text-gray-500 shadow-sm">
                  No model reasons available.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-xs font-semibold text-gray-700">Indicators</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">RSI 14</div>
                <div className="mt-1 font-semibold text-gray-900">{formatNum(signalData?.indicators?.rsi_14)}</div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">Volume Ratio</div>
                <div className="mt-1 font-semibold text-gray-900">{formatNum(signalData?.indicators?.volume_ratio)}</div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">EMA 10</div>
                <div className="mt-1 font-semibold text-gray-900">{formatCurrency(signalData?.indicators?.ema_10, displayCurrency)}</div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">EMA 20</div>
                <div className="mt-1 font-semibold text-gray-900">{formatCurrency(signalData?.indicators?.ema_20, displayCurrency)}</div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">Trend Strength</div>
                <div className="mt-1 font-semibold text-gray-900">{formatNum(signalData?.indicators?.trend_strength)}</div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-gray-500">Price vs SMA20</div>
                <div className="mt-1 font-semibold text-gray-900">{formatNum(signalData?.indicators?.price_vs_sma20)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

if (!code.includes('const ML_API_BASE = "http://127.0.0.1:8000";')) {
  code = code.replace(
    /function FundamentalBarChart\(/,
    `${mlBlock}\n\nfunction FundamentalBarChart(`
  );
}

code = code.replace(
  /\["overview","fundamentals","positions","journal","news","about"\]/g,
  '["overview","ml","fundamentals","positions","journal","news","about"]'
);

if (!code.includes('{/* ── ML Tab ── */}')) {
  code = code.replace(
    /(\{\/\* ── Fundamentals Tab ── \*\/\})/,
    `          {/* ── ML Tab ── */}
          {activeTab === "ml" && (
            <div className="space-y-4">
              <MlSignalCard
                symbol={symbol}
                isCrypto={isCrypto}
                displayCurrency={displayCurrency}
              />
            </div>
          )}

$1`
  );
}

fs.writeFileSync(filePath, code, "utf8");
console.log("Charts.jsx patched successfully.");
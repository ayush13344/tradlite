import React, { useEffect, useState } from "react";
import { getRisk } from "../../services/mlApi";

export default function RiskScoreCard({ symbol }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    getRisk(symbol).then(setData).catch(console.error);
  }, [symbol]);

  if (!data) return <div className="rounded-xl p-4 shadow bg-white">Loading Risk...</div>;

  return (
    <div className="rounded-xl p-4 shadow bg-white">
      <h3 className="text-lg font-semibold mb-2">Risk Score</h3>
      <p className="text-2xl font-bold">{data.riskScore}</p>
      <p>{data.riskLabel} Risk</p>
      <p>Suggested Stop Loss: ₹{data.stopLossSuggestion}</p>
      <p>Suggested Target: ₹{data.targetSuggestion}</p>
      <p>Volatility: {data.volatility}%</p>
    </div>
  );
}
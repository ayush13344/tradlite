import React, { useEffect, useState } from "react";
import { getPortfolioInsights } from "../../services/mlApi";

export default function PortfolioInsightsCard({ userId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!userId) return;
    getPortfolioInsights(userId).then(setData).catch(console.error);
  }, [userId]);

  if (!data) return <div className="rounded-xl p-4 shadow bg-white">Loading Portfolio Insights...</div>;

  return (
    <div className="rounded-xl p-4 shadow bg-white">
      <h3 className="text-lg font-semibold mb-2">Portfolio ML Insights</h3>
      <p>Risk Score: {data.riskScore}</p>
      <p>Diversification Score: {data.diversificationScore}</p>
      <ul className="mt-2 list-disc list-inside text-sm">
        {data.warnings?.map((w, i) => <li key={i}>{w}</li>)}
      </ul>
    </div>
  );
}
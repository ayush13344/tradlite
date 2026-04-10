import React, { useEffect, useState } from "react";
import { getJournalInsights } from "../../services/mlApi";

export default function JournalInsightsCard({ userId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!userId) return;
    getJournalInsights(userId).then(setData).catch(console.error);
  }, [userId]);

  if (!data) return <div className="rounded-xl p-4 shadow bg-white">Loading Journal Insights...</div>;

  return (
    <div className="rounded-xl p-4 shadow bg-white">
      <h3 className="text-lg font-semibold mb-2">Trade Journal Insights</h3>
      <p>Win Rate: {data.winRate}%</p>
      <p>Best Sector: {data.bestSector}</p>
      <p>Worst Sector: {data.worstSector}</p>
      <p>Best Trading Window: {data.bestTradingWindow}</p>

      <ul className="mt-2 list-disc list-inside text-sm">
        {data.insights?.map((item, idx) => <li key={idx}>{item}</li>)}
      </ul>
    </div>
  );
}
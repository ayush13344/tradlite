import React, { useEffect, useState } from "react";
import { getSignal } from "../../services/mlApi";

export default function SignalCard({ symbol }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    getSignal(symbol).then(setData).catch(console.error);
  }, [symbol]);

  if (!data) return <div className="rounded-xl p-4 shadow bg-white">Loading ML Signal...</div>;

  return (
    <div className="rounded-xl p-4 shadow bg-white">
      <h3 className="text-lg font-semibold mb-2">ML Signal</h3>
      <p className="text-2xl font-bold">{data.signal}</p>
      <p>Confidence: {(data.confidence * 100).toFixed(0)}%</p>
      <ul className="mt-2 list-disc list-inside text-sm text-gray-600">
        {data.reason?.map((item, idx) => <li key={idx}>{item}</li>)}
      </ul>
    </div>
  );
}
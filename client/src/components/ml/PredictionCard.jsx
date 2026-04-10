import React, { useEffect, useState } from "react";
import { getPrediction } from "../../services/mlApi";

export default function PredictionCard({ symbol }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    getPrediction(symbol).then(setData).catch(console.error);
  }, [symbol]);

  if (!data) return <div className="rounded-xl p-4 shadow bg-white">Loading Prediction...</div>;

  return (
    <div className="rounded-xl p-4 shadow bg-white">
      <h3 className="text-lg font-semibold mb-2">Price Prediction</h3>
      <p>Current: ₹{data.currentPrice}</p>
      <p>Predicted: ₹{data.predictedPrice}</p>
      <p>Direction: {data.direction}</p>
      <p>Confidence: {(data.confidence * 100).toFixed(0)}%</p>
      <p>Timeframe: {data.timeframe}</p>
    </div>
  );
}
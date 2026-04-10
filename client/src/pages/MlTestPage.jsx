import React from "react";
import SignalCard from "../components/ml/SignalCard";
import PredictionCard from "../components/ml/PredictionCard";
import RiskScoreCard from "../components/ml/RiskScoreCard";
import PortfolioInsightsCard from "../components/ml/PortfolioInsightsCard";
import JournalInsightsCard from "../components/ml/JournalInsightsCard";

export default function MlTestPage() {
  const symbol = "TCS";
  const userId = "testuser123";

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">ML Test Page</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SignalCard symbol={symbol} />
        <PredictionCard symbol={symbol} />
        <RiskScoreCard symbol={symbol} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PortfolioInsightsCard userId={userId} />
        <JournalInsightsCard userId={userId} />
      </div>
    </div>
  );
}
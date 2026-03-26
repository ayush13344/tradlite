import { useEffect, useState } from "react";
import { TrendingUp, Crown } from "lucide-react";

function AnimatedCounter({ value }) {
  const numericValue = parseFloat(value.replace("%", ""));
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const increment = numericValue / (duration / 16);

    const counter = setInterval(() => {
      start += increment;
      if (start >= numericValue) {
        setCount(numericValue);
        clearInterval(counter);
      } else {
        setCount(start);
      }
    }, 16);

    return () => clearInterval(counter);
  }, [numericValue]);

  return (
    <span className="text-green-600 font-semibold">
      +{count.toFixed(1)}%
    </span>
  );
}

function MiniGraph() {
  return (
    <svg
      viewBox="0 0 100 40"
      className="w-full h-16 mt-4"
      fill="none"
    >
      <path
        d="M0 30 L15 28 L25 25 L40 27 L55 18 L70 20 L85 10 L100 15"
        stroke="#16a34a"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

export default function Leaderboard() {
  const traders = [
    {
      name: "AlphaTrader",
      profit: "42.8%",
      winRate: "82%",
      trades: 64
    },
    {
      name: "MarketKing",
      profit: "36.5%",
      winRate: "78%",
      trades: 51
    },
    {
      name: "CryptoVision",
      profit: "29.3%",
      winRate: "74%",
      trades: 47
    }
  ];

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-14">
          <h2 className="text-4xl font-bold text-slate-900">
            Top Performing Traders
          </h2>
          <p className="text-slate-600 mt-3">
            Ranked by weekly performance & consistency
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-8">

          {traders.map((trader, index) => (
            <div
              key={index}
              className="relative border border-slate-200 rounded-3xl p-6 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >

              {/* Crown for Rank 1 */}
              {index === 0 && (
                <div className="absolute -top-5 left-6 bg-indigo-600 text-white p-2 rounded-full shadow-md">
                  <Crown size={18} />
                </div>
              )}

              {/* Rank Label */}
              <div className="text-xs font-medium text-indigo-600 mb-4">
                Rank #{index + 1}
              </div>

              {/* Profile */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center">
                  <TrendingUp size={22} className="text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-slate-900">
                    {trader.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {trader.trades} Trades
                  </p>
                </div>
              </div>

              {/* Mini Graph */}
              <MiniGraph />

              {/* Stats */}
              <div className="mt-6 space-y-3 text-sm">

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Weekly Profit</span>
                  <AnimatedCounter value={trader.profit} />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Win Rate</span>
                  <span className="font-semibold text-slate-900">
                    {trader.winRate}
                  </span>
                </div>

              </div>

              {/* Follow Button */}
              <button className="mt-8 w-full py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition shadow-sm">
                Follow Trader
              </button>

            </div>
          ))}

        </div>
      </div>
    </section>
  );
}
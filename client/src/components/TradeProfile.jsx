import { useState } from "react";

export default function TraderProfile() {
  const [active, setActive] = useState("gainers");

  const data = {
    gainers: [
      { symbol: "AAPL", price: "189.44", change: "+3.24%", volume: "42M" },
      { symbol: "TSLA", price: "248.31", change: "+2.81%", volume: "36M" },
      { symbol: "NVDA", price: "722.18", change: "+4.10%", volume: "28M" }
    ],
    losers: [
      { symbol: "META", price: "312.44", change: "-2.14%", volume: "18M" },
      { symbol: "NFLX", price: "402.12", change: "-1.90%", volume: "12M" },
      { symbol: "AMD", price: "166.08", change: "-3.02%", volume: "25M" }
    ],
    active: [
      { symbol: "BTCUSD", price: "44,210", change: "+1.82%", volume: "88B" },
      { symbol: "ETHUSD", price: "2,340", change: "+2.14%", volume: "41B" },
      { symbol: "SOLUSD", price: "102.21", change: "+5.33%", volume: "9B" }
    ]
  };

  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-slate-900">
            Market Movers
          </h2>
          <p className="text-slate-600 mt-2">
            See what’s moving the markets today
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-10">
          {["gainers", "losers", "active"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className={`px-6 py-2 rounded-full text-sm font-medium capitalize transition-all duration-300 ${
                active === tab
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
              }`}
            >
              {tab === "active" ? "Most Active" : tab}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">

          {/* Header Row */}
          <div className="grid grid-cols-4 bg-indigo-50 px-6 py-4 text-sm font-semibold text-indigo-700">
            <span>Symbol</span>
            <span>Price</span>
            <span>Change</span>
            <span>Volume</span>
          </div>

          {/* Data Rows */}
          {data[active].map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-4 px-6 py-4 text-sm border-t border-slate-200 hover:bg-indigo-50 transition-all duration-200"
            >
              <span className="font-semibold text-slate-900">
                {item.symbol}
              </span>

              <span className="text-slate-700">
                ${item.price}
              </span>

              {/* GREEN for positive, RED for negative */}
              <span
                className={`font-semibold ${
                  item.change.startsWith("+")
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {item.change}
              </span>

              <span className="text-slate-600">
                {item.volume}
              </span>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}
import { useState, useEffect } from "react";
import { ArrowRight, TrendingUp } from "lucide-react";

export default function Hero() {
  const stocks = [
    {
      symbol: "AAPL",
      company: "Apple Inc · NASDAQ",
      price: "$192.34",
      change: "+2.34%",
      color: "text-green-600",
    },
    {
      symbol: "TSLA",
      company: "Tesla Inc · NASDAQ",
      price: "$248.91",
      change: "-1.12%",
      color: "text-red-600",
    },
    {
      symbol: "NVDA",
      company: "NVIDIA Corp · NASDAQ",
      price: "$721.44",
      change: "+3.88%",
      color: "text-green-600",
    },
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % stocks.length);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const stock = stocks[index];

  return (
    <section className="relative bg-white overflow-hidden">

      {/* Soft Indigo Background Accent */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-indigo-100 rounded-full blur-3xl opacity-40 -translate-y-1/3 translate-x-1/3" />

      <div className="relative max-w-7xl mx-auto px-6 py-28 grid md:grid-cols-2 gap-16 items-center">

        {/* LEFT SIDE */}
        <div>
          <span className="inline-flex items-center gap-2 px-4 py-1 mb-6 text-xs rounded-full bg-indigo-50 text-indigo-600 font-medium">
            <TrendingUp size={14} />
            Built for serious traders
          </span>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight tracking-tight">
            Trade Smarter.
            <br />
            <span className="text-indigo-600">Move Faster.</span>
          </h1>

          <p className="mt-6 text-lg text-slate-500 max-w-lg">
            Advanced charting tools, real-time market data, and professional
            indicators — built for traders who demand precision.
          </p>

          <div className="mt-10 flex gap-4">
            <button className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all flex items-center gap-2">
              Start Trading
              <ArrowRight size={18} />
            </button>

            <button className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 transition">
              Live Preview
            </button>
          </div>

          {/* Mini Stats */}
          <div className="mt-12 grid grid-cols-3 gap-8 text-sm">
            <div>
              <p className="text-slate-900 font-semibold text-lg">120K+</p>
              <p className="text-slate-500">Active Traders</p>
            </div>
            <div>
              <p className="text-slate-900 font-semibold text-lg">1M+</p>
              <p className="text-slate-500">Daily Trades</p>
            </div>
            <div>
              <p className="text-slate-900 font-semibold text-lg">99.99%</p>
              <p className="text-slate-500">Uptime</p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - CHART CARD */}
        <div className="relative">

          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 transition-all duration-700">

            {/* Chart Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">
                  {stock.symbol}
                </h3>
                <p className="text-sm text-slate-500">
                  {stock.company}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-slate-900">
                  {stock.price}
                </p>
                <p className={`${stock.color} text-sm font-medium`}>
                  {stock.change}
                </p>
              </div>
            </div>

            {/* Candlestick Mock */}
            <div className="h-64 bg-gradient-to-t from-indigo-50 via-white to-white rounded-xl p-6 flex items-end justify-between transition-all duration-700">

              {[40, 70, 55, 90, 65, 110, 80, 130, 95].map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-3 rounded-sm ${
                      i % 2 === 0 ? "bg-green-500" : "bg-red-500"
                    }`}
                    style={{ height: `${h + index * 8}px` }}
                  />
                  <div className="w-[2px] h-6 bg-slate-300" />
                </div>
              ))}

            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {stocks.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === index
                      ? "bg-indigo-600 w-6"
                      : "bg-slate-300 w-2"
                  }`}
                />
              ))}
            </div>

          </div>

          {/* Floating Volume Card */}
          <div className="absolute -bottom-6 -left-6 bg-white border border-slate-200 shadow-xl rounded-2xl px-6 py-4">
            <p className="text-sm text-slate-500">Volume</p>
            <p className="font-semibold text-slate-900 text-lg">
              {index === 0 ? "3.2M" : index === 1 ? "5.1M" : "8.7M"}
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
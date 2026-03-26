import { useState } from "react";

export default function CreateIdea() {
  const [title, setTitle] = useState("");

  return (
    <div className="relative min-h-screen pt-28 pb-24 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 overflow-hidden">

      {/* Background Glow Effects */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-300 opacity-20 blur-3xl rounded-full -translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400 opacity-20 blur-3xl rounded-full translate-x-1/3 translate-y-1/3"></div>

      <div className="relative max-w-4xl mx-auto px-6">

        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-slate-200 p-10 space-y-8">

          <h2 className="text-3xl font-bold text-slate-900">
            Publish Trade Idea
          </h2>

          {/* Symbol */}
          <div>
            <label className="block text-sm text-slate-600 mb-2">
              Symbol
            </label>
            <input
              placeholder="BTCUSD"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm text-slate-600 mb-2">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bitcoin Breakout Setup"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-slate-600 mb-2">
              Analysis
            </label>
            <textarea
              rows="6"
              placeholder="Describe your analysis..."
              className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Entry / SL / Target */}
          <div className="grid md:grid-cols-3 gap-4">
            <input
              placeholder="Entry"
              className="border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <input
              placeholder="Stop Loss"
              className="border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <input
              placeholder="Target"
              className="border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <button className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-md">
            Publish Idea
          </button>

        </div>
      </div>
    </div>
  );
}
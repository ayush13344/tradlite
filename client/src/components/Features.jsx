import { useState } from "react";

export default function Features() {
  const [active, setActive] = useState("charts");

  const tabs = [
    { id: "charts", label: "Supercharts" },
    { id: "screeners", label: "Screeners" },
    { id: "ideas", label: "Trade Ideas" },
    { id: "news", label: "Market News" }
  ];

  const content = {
    charts: {
      title: "Advanced Supercharts",
      desc: "Professional-grade charts with 100+ indicators, drawing tools, and real-time data for serious traders.",
      img: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?q=80&w=1400&auto=format&fit=crop" // trading chart screen
    },
    screeners: {
      title: "Powerful Market Screeners",
      desc: "Scan stocks, crypto, and forex markets with customizable filters and technical conditions.",
      img: "https://images.unsplash.com/photo-1559526324-593bc073d938?q=80&w=1400&auto=format&fit=crop" // analytics dashboard
    },
    ideas: {
      title: "Community Trade Ideas",
      desc: "Explore trading strategies shared by top traders and publish your own analysis.",
      img: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1400&auto=format&fit=crop" // trader workspace
    },
    news: {
      title: "Real-Time Market News",
      desc: "Stay updated with breaking financial news and macroeconomic updates.",
      img: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1400&auto=format&fit=crop" // financial news
    }
  };

  return (
    <section className="bg-white py-28 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-5xl font-bold text-slate-900">
            Everything You Need in One Platform
          </h2>
          <p className="mt-6 text-slate-600 text-lg">
            Powerful tools designed for traders, investors, and market enthusiasts.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-6 flex-wrap mb-16">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                active === tab.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Section */}
        <div className="grid md:grid-cols-2 gap-20 items-center">

          {/* Text */}
          <div>
            <h3 className="text-4xl font-semibold text-slate-900">
              {content[active].title}
            </h3>

            <p className="mt-6 text-slate-600 leading-relaxed text-lg">
              {content[active].desc}
            </p>

            <button className="mt-10 px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md">
              Explore Now
            </button>
          </div>

          {/* Image */}
          <div className="bg-indigo-50 p-6 rounded-3xl shadow-xl border border-slate-200">
            <img
              key={content[active].img}
              src={content[active].img}
              alt={content[active].title}
              className="rounded-2xl transition-all duration-500"
            />
          </div>

        </div>
      </div>
    </section>
  );
}
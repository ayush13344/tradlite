import { TrendingUp, TrendingDown } from "lucide-react";

export default function MarketPreview() {
  const data = [
    { s: "AAPL", c: "+1.24%" },
    { s: "TSLA", c: "-0.82%" },
    { s: "NIFTY 50", c: "+0.44%" },
    { s: "BTC/USD", c: "+2.10%" },
    { s: "ETH/USD", c: "-0.56%" },
    { s: "NVDA", c: "+3.12%" },
  ];

  return (
    <div className="w-full border-y border-gray-200 bg-white overflow-hidden">
      
      <div className="relative flex gap-12 py-3 whitespace-nowrap animate-marquee">
        {data.concat(data).map((d, index) => {
          const positive = d.c.startsWith("+");

          return (
            <div
              key={index}
              className="flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <span className="font-semibold text-gray-900">{d.s}</span>

              <span
                className={`flex items-center gap-1 ${
                  positive ? "text-green-600" : "text-red-600"
                }`}
              >
                {positive ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                {d.c}
              </span>
            </div>
          );
        })}
      </div>

      {/* Animation Style */}
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }

          .animate-marquee {
            animation: marquee 20s linear infinite;
          }
        `}
      </style>
    </div>
  );
}

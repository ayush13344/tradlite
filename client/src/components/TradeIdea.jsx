import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";

export default function TradeIdea() {
  return (
    <div className="bg-white min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-4 gap-12">

        {/* ================= LEFT MAIN CONTENT ================= */}
        <div className="lg:col-span-3 space-y-10">

          {/* Symbol + Title */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="px-4 py-1 bg-gray-100 rounded-full font-medium">
                BTCUSD
              </span>
              <span className="text-gray-500">1H Chart</span>
              <span className="text-green-600 font-medium">Long Idea</span>
            </div>

            <h1 className="text-4xl font-bold leading-tight">
              Bitcoin Consolidating Before Potential Breakout
            </h1>

            <p className="text-gray-600 text-lg max-w-3xl">
              Price is forming a clean ascending structure with compression near resistance.
              A confirmed breakout above the key level could trigger a strong upside move.
            </p>
          </div>

          {/* Chart Preview */}
          <div className="rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1600"
              alt="chart"
              className="w-full h-[520px] object-cover"
            />
          </div>

          {/* Author & Actions */}
          <div className="flex items-center justify-between border-y py-6">

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-200"></div>
              <div>
                <p className="font-semibold">CryptoVision</p>
                <p className="text-sm text-gray-500">18.2K Followers</p>
              </div>
            </div>

            <button className="px-6 py-2 bg-black text-white rounded-full hover:opacity-90 transition">
              Follow
            </button>
          </div>

          {/* Interaction Bar */}
          <div className="flex gap-10 text-gray-600 text-sm border-b pb-6">

            <button className="flex items-center gap-2 hover:text-red-500 transition">
              <Heart size={18} />
              245 Likes
            </button>

            <button className="flex items-center gap-2 hover:text-blue-600 transition">
              <MessageCircle size={18} />
              64 Comments
            </button>

            <button className="flex items-center gap-2 hover:text-black transition">
              <Share2 size={18} />
              Share
            </button>

            <button className="flex items-center gap-2 hover:text-black transition">
              <Bookmark size={18} />
              Save
            </button>
          </div>

          {/* Analysis Section */}
          <div className="space-y-6 text-gray-700 leading-relaxed text-lg">
            <h2 className="text-2xl font-semibold text-black">
              Analysis
            </h2>

            <p>
              BTC has been forming higher lows over the past sessions,
              suggesting accumulation. Volatility is tightening,
              and volume profile shows strong support below current price.
            </p>

            <p>
              A breakout above resistance with strong confirmation could
              lead to a quick expansion toward the next liquidity zone.
            </p>

            <div className="bg-gray-50 p-6 rounded-2xl border">
              <p><strong>Entry:</strong> Above 44,200</p>
              <p><strong>Stop Loss:</strong> 42,800</p>
              <p><strong>Targets:</strong> 45,500 → 46,200</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-3 pt-6 border-t">
            {["Bitcoin", "Crypto", "Breakout", "TechnicalAnalysis"].map((tag, i) => (
              <span
                key={i}
                className="px-4 py-1 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-black hover:text-white cursor-pointer transition"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Comments */}
          <div className="pt-12 space-y-6">
            <h2 className="text-2xl font-semibold">
              Discussion
            </h2>

            <div className="space-y-4">
              <div className="p-4 border rounded-xl">
                <p className="font-semibold">TraderOne</p>
                <p className="text-gray-600 text-sm mt-1">
                  Watching volume closely — looks promising.
                </p>
              </div>

              <div className="p-4 border rounded-xl">
                <p className="font-semibold">MarketAlpha</p>
                <p className="text-gray-600 text-sm mt-1">
                  Risk/reward ratio looks solid here.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-6">
              <textarea
                placeholder="Write your comment..."
                className="w-full border rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-black"
                rows={4}
              />
              <button className="px-6 py-2 bg-black text-white rounded-full hover:opacity-90 transition">
                Post Comment
              </button>
            </div>
          </div>

        </div>

        {/* ================= RIGHT SIDEBAR ================= */}
        <div className="space-y-8 sticky top-28 h-fit">

          <div>
            <h3 className="text-lg font-semibold mb-4">
              Related Ideas
            </h3>

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="mb-6 border rounded-2xl overflow-hidden hover:shadow-md transition"
              >
                <img
                  src="https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=600"
                  alt="related"
                  className="h-28 w-full object-cover"
                />
                <div className="p-4">
                  <p className="font-medium text-sm">
                    ETH Testing Key Resistance
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    by ChartMaster
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl border">
            <h4 className="font-semibold mb-3">
              Market Stats
            </h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>24h Volume: $28.4B</p>
              <p>Market Cap: $840B</p>
              <p>Volatility: Medium</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

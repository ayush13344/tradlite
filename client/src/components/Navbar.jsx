import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function Navbar() {
  const [active, setActive] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // search state
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [openSug, setOpenSug] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const abortRef = useRef(null);
  const boxRef = useRef(null);
  const compact = scrolled && !active;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // close suggestions when clicked outside
  useEffect(() => {
    const onDown = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) {
        setOpenSug(false);
        setHighlight(-1);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const trimmed = useMemo(() => query.trim(), [query]);

  // fetch suggestions (debounced)
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();

    if (!trimmed || trimmed.length < 1) {
      setSuggestions([]);
      setOpenSug(false);
      setHighlight(-1);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const t = setTimeout(async () => {
      try {
        // ✅ You can implement this endpoint OR replace with a static list for now
        // Expected response: [{ symbol: "RELIANCE", name: "Reliance Industries" }, ...]
        const res = await fetch(
          `http://localhost:3000/api/stocks/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );

        // If you don't have /search endpoint yet, this will 404; we'll fallback gracefully.
        if (!res.ok) {
          setSuggestions([]);
          setOpenSug(true); // still show "Press Enter to open"
          return;
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(data.slice(0, 8));
          setOpenSug(true);
          setHighlight(-1);
        } else {
          setSuggestions([]);
          setOpenSug(true);
        }
      } catch (e) {
        if (e.name === "AbortError") return;
        setSuggestions([]);
        setOpenSug(true);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [trimmed]);

  const goToChart = (sym) => {
    const symbol = (sym || "").toUpperCase().trim();
    if (!symbol) return;

    setOpenSug(false);
    setHighlight(-1);
    setQuery("");

    // ✅ change "/charts" if your chart route is different
    navigate("/charts", { state: { symbol } });
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      if (openSug && highlight >= 0 && suggestions[highlight]) {
        goToChart(suggestions[highlight].symbol);
      } else {
        goToChart(trimmed);
      }
    }

    if (!openSug) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    }
    if (e.key === "Escape") {
      setOpenSug(false);
      setHighlight(-1);
    }
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className={`
          flex items-center justify-between
          px-6
          rounded-full border
          bg-white/90 backdrop-blur-xl
          border-slate-200
          transition-all duration-500 ease-out
          overflow-hidden
          ${compact ? "w-[420px] py-2 shadow-md" : ""}
          ${!compact && !active ? "w-[760px] py-3 shadow-xl" : ""}
          ${active ? "w-[920px] py-3 shadow-xl" : ""}
        `}
      >
        {/* Logo */}
        <Link to="/" className="font-semibold text-slate-900 whitespace-nowrap">
          Trade<span className="text-indigo-600">Lite</span>
        </Link>

        {/* CENTER NAV */}
        {!compact && (
          <div
            onMouseEnter={() => setActive(true)}
            onMouseLeave={() => setActive(false)}
            className="flex items-center gap-6 px-4 transition-all duration-300"
          >
            {!user ? (
              <>
                <Link
                  to="/markets"
                  className="text-sm text-slate-600 hover:text-indigo-600 transition"
                >
                  Markets
                </Link>
                <Link
                  to="/watchlist"
                  className="text-sm text-slate-600 hover:text-indigo-600 transition"
                >
                  Watchlist
                </Link>
                <Link
                  to="/ideas"
                  className="text-sm text-slate-600 hover:text-indigo-600 transition"
                >
                  Trade Ideas
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/holdings"
                  className="text-sm text-slate-600 hover:text-indigo-600 transition"
                >
                  Holdings
                </Link>
                <Link
                  to="/positions"
                  className="text-sm text-slate-600 hover:text-indigo-600 transition"
                >
                  Positions
                </Link>
                <Link
                  to="/orders"
                  className="text-sm text-slate-600 hover:text-indigo-600 transition"
                >
                  Orders
                </Link>
              </>
            )}

            {/* Expanding Search */}
            <div className="relative" ref={boxRef}>
              <div
                className={`
                  flex items-center gap-2
                  px-4
                  rounded-full
                  border border-slate-200
                  transition-all duration-500 ease-in-out
                  ${active ? "w-80 py-2 shadow-md bg-indigo-50" : "w-44 py-1.5 bg-slate-100"}
                `}
                onClick={() => setOpenSug(true)}
              >
                <Search size={16} className="text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setOpenSug(true);
                  }}
                  onFocus={() => setOpenSug(true)}
                  onKeyDown={onKeyDown}
                  placeholder="Search stocks..."
                  className="bg-transparent text-sm outline-none text-slate-900 w-full placeholder:text-slate-400"
                />
              </div>

              {/* Suggestions dropdown */}
              {openSug && active && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                  {suggestions.length > 0 ? (
                    <div className="py-2">
                      {suggestions.map((s, idx) => (
                        <button
                          key={`${s.symbol}-${idx}`}
                          type="button"
                          onMouseEnter={() => setHighlight(idx)}
                          onClick={() => goToChart(s.symbol)}
                          className={`
                            w-full text-left px-4 py-2 flex items-center justify-between
                            ${highlight === idx ? "bg-indigo-50" : "hover:bg-slate-50"}
                          `}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">
                              {s.symbol}
                            </span>
                            <span className="text-xs text-slate-500">
                              {s.name || "—"}
                            </span>
                          </div>
                          <span className="text-xs text-indigo-600 font-medium">
                            Open chart →
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3">
                      <div className="text-sm text-slate-700 font-medium">
                        {trimmed ? `Press Enter to open chart for "${trimmed.toUpperCase()}"` : "Type a symbol…"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Example: RELIANCE, TCS, INFY
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3 whitespace-nowrap">
          {!user ? (
            <>
              <Link
                to="/auth"
                state={{ mode: "login" }}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition"
              >
                Login
              </Link>
              <Link
                to="/auth"
                state={{ mode: "signup" }}
                className="px-4 py-1.5 rounded-full text-sm font-medium
                           bg-indigo-600 text-white hover:bg-indigo-700
                           transition shadow-md"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3 ml-3">
              <span className="text-sm font-medium text-slate-800">
                {user.name || "User"}
              </span>
              <div
                className="w-9 h-9 rounded-full bg-indigo-600 text-white 
                           flex items-center justify-center 
                           text-sm font-semibold shadow-md"
              >
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
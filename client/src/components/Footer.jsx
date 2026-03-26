import { Link } from "react-router-dom";
import {
  Twitter,
  Github,
  Linkedin,
  Mail,
  Shield,
  FileText,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative bg-indigo-950 text-indigo-100 mt-32 overflow-hidden">

      {/* Background Image Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1600&auto=format&fit=crop')] bg-cover bg-center" />

      {/* Top Glow Line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

      <div className="relative max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-12">

        {/* Brand Section */}
        <div>
          <h2 className="text-white text-2xl font-bold tracking-wide mb-4">
            TradeX
          </h2>
          <p className="text-sm leading-relaxed text-indigo-200">
            Advanced charting, real-time analytics, and professional trading
            tools — built for serious traders.
          </p>
        </div>

        {/* Platform */}
        <div>
          <h3 className="text-white font-semibold mb-4">Platform</h3>
          <ul className="space-y-3 text-sm">
            <li>
              <Link to="/dashboard" className="hover:text-white transition">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/" className="hover:text-white transition">
                Markets
              </Link>
            </li>
            <li>
              <Link to="/" className="hover:text-white transition">
                Watchlist
              </Link>
            </li>
            <li>
              <Link to="/" className="hover:text-white transition">
                Analytics
              </Link>
            </li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h3 className="text-white font-semibold mb-4">Resources</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <FileText size={16} />
              <Link to="/" className="hover:text-white transition">
                Documentation
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <Shield size={16} />
              <Link to="/" className="hover:text-white transition">
                Privacy Policy
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={16} />
              <Link to="/" className="hover:text-white transition">
                Support
              </Link>
            </li>
          </ul>
        </div>

        {/* Social */}
        <div>
          <h3 className="text-white font-semibold mb-4">Connect</h3>
          <div className="flex space-x-5">
            <a href="#" className="hover:text-indigo-400 transition">
              <Twitter size={20} />
            </a>
            <a href="#" className="hover:text-white transition">
              <Github size={20} />
            </a>
            <a href="#" className="hover:text-indigo-300 transition">
              <Linkedin size={20} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Strip */}
      <div className="relative border-t border-indigo-800 text-center py-6 text-xs text-indigo-300">
        © {new Date().getFullYear()} TradeX. All rights reserved.
        <span className="mx-2">|</span>
        Built with precision for modern markets.
      </div>
    </footer>
  );
}
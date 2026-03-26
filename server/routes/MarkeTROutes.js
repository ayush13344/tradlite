import express from "express";
import {
  fetchDashboard,
  fetchOverview,
  fetchBreadth,
  fetchSectors,
  fetchTopGainers,
  fetchTopLosers,
  fetchHighVolume,
  fetchCapMovers,
} from "../controller/MarketController.js";

const router = express.Router();

/* ================= CORE DASHBOARD ================= */

// Complete market dashboard (recommended for frontend)
router.get("/dashboard", fetchDashboard);

/* ================= INDICES ================= */

router.get("/overview", fetchOverview);

/* ================= MOVERS ================= */

router.get("/gainers", fetchTopGainers);
router.get("/losers", fetchTopLosers);
router.get("/volume", fetchHighVolume);

/* ================= MARKET CAP MOVERS ================= */

// Example:
// /market/cap?cap=large&type=gainers
router.get("/cap", fetchCapMovers);

/* ================= MARKET ANALYTICS ================= */

router.get("/breadth", fetchBreadth);
router.get("/sectors", fetchSectors);

export default router;
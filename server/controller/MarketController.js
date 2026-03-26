import {
  getFullMarketDashboard,
  getMarketOverview,
  getMarketBreadth,
  getSectorPerformance,
  getTopGainers,
  getTopLosers,
  getHighVolume,
  getCapMovers,
} from "../services/marketServices.js";

/* ================= DASHBOARD ================= */

export const fetchDashboard = async (req, res) => {
  try {
    const data = await getFullMarketDashboard();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= OVERVIEW ================= */

export const fetchOverview = async (req, res) => {
  try {
    const data = await getMarketOverview();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GAINERS ================= */

export const fetchTopGainers = async (req, res) => {
  try {
    const data = await getTopGainers();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= LOSERS ================= */

export const fetchTopLosers = async (req, res) => {
  try {
    const data = await getTopLosers();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= VOLUME ================= */

export const fetchHighVolume = async (req, res) => {
  try {
    const data = await getHighVolume();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= CAP MOVERS ================= */

export const fetchCapMovers = async (req, res) => {
  try {
    const { cap, type } = req.query;

    if (!cap || !type) {
      return res.status(400).json({
        success: false,
        message: "Query params required: cap & type",
      });
    }

    const data = await getCapMovers(cap, type);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= BREADTH ================= */

export const fetchBreadth = async (req, res) => {
  try {
    const data = await getMarketBreadth();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= SECTORS ================= */

export const fetchSectors = async (req, res) => {
  try {
    const data = await getSectorPerformance();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
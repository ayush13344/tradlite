import express from "express";
import {
  getStocks,
  getStockHistory,
  searchStocks,
  getStockOverview,
  getStockAbout,
  getStockFundamentals,
  getStockNews,
  getStockTechnicals,
} from "../controller/StockController.js";

const router = express.Router();

router.get("/", getStocks);
router.get("/history", getStockHistory);
router.get("/search", searchStocks);
router.get("/overview", getStockOverview);

// ✅ NEW
router.get("/about", getStockAbout);
router.get("/fundamentals", getStockFundamentals);
router.get("/news", getStockNews);
router.get("/technicals", getStockTechnicals);

export default router;
import express from "express";
import {
  getTopCryptos,
  getTrendingCryptos,
  getCryptoByIds,
  getCryptoMarket,
  getCryptoChart,
  getCryptoGlobalData,
  searchCryptoCoins,
} from "../controller/CryptoController.js";

const router = express.Router();

router.get("/top", getTopCryptos);
router.get("/trending", getTrendingCryptos);
router.get("/list", getCryptoByIds);
router.get("/market", getCryptoMarket); // added
router.get("/global", getCryptoGlobalData);
router.get("/search", searchCryptoCoins);
router.get("/chart/:id", getCryptoChart);

export default router;
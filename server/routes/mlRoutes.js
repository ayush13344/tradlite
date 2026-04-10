import express from "express";
import {
  getSignal,
  getPricePrediction,
  getRiskScore,
  getPortfolioInsights,
  getJournalInsights,
  getRecommendations,
  getSentiment,
  getAnomaly,
  getRegime,
} from "../controller/mlController.js";

const router = express.Router();

router.get("/signal/:symbol", getSignal);
router.get("/predict/:symbol", getPricePrediction);
router.get("/risk/:symbol", getRiskScore);
router.get("/portfolio/:userId", getPortfolioInsights);
router.get("/journal/:userId", getJournalInsights);
router.get("/recommendations/:userId", getRecommendations);
router.get("/sentiment/:symbol", getSentiment);
router.get("/anomaly/:symbol", getAnomaly);
router.get("/regime/:symbol", getRegime);

export default router;
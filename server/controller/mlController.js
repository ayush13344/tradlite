import {
  fetchSignal,
  fetchPrediction,
  fetchRiskScore,
  fetchPortfolioInsights,
  fetchJournalInsights,
  fetchRecommendations,
  fetchSentiment,
  fetchAnomaly,
  fetchRegime,
} from "../services/mlProxyService.js";

export const getSignal = async (req, res) => {
  try {
    const data = await fetchSignal(req.params.symbol);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch signal", error: err.message });
  }
};

export const getPricePrediction = async (req, res) => {
  try {
    const data = await fetchPrediction(req.params.symbol);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch prediction", error: err.message });
  }
};

export const getRiskScore = async (req, res) => {
  try {
    const data = await fetchRiskScore(req.params.symbol);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch risk score", error: err.message });
  }
};

export const getPortfolioInsights = async (req, res) => {
  try {
    const data = await fetchPortfolioInsights(req.params.userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch portfolio insights", error: err.message });
  }
};

export const getJournalInsights = async (req, res) => {
  try {
    const data = await fetchJournalInsights(req.params.userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch journal insights", error: err.message });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const data = await fetchRecommendations(req.params.userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch recommendations", error: err.message });
  }
};

export const getSentiment = async (req, res) => {
  try {
    const data = await fetchSentiment(req.params.symbol);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch sentiment", error: err.message });
  }
};

export const getAnomaly = async (req, res) => {
  try {
    const data = await fetchAnomaly(req.params.symbol);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch anomaly", error: err.message });
  }
};

export const getRegime = async (req, res) => {
  try {
    const data = await fetchRegime(req.params.symbol);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch regime", error: err.message });
  }
};
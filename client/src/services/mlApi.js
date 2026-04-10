import api from "../api/axios.js";

export const getSignal = async (symbol) => {
  const { data } = await api.get(`/ml/signal/${symbol}`);
  return data;
};

export const getPrediction = async (symbol) => {
  const { data } = await api.get(`/ml/predict/${symbol}`);
  return data;
};

export const getRisk = async (symbol) => {
  const { data } = await api.get(`/ml/risk/${symbol}`);
  return data;
};

export const getPortfolioInsights = async (userId) => {
  const { data } = await api.get(`/ml/portfolio/${userId}`);
  return data;
};

export const getJournalInsights = async (userId) => {
  const { data } = await api.get(`/ml/journal/${userId}`);
  return data;
};

export const getRecommendations = async (userId) => {
  const { data } = await api.get(`/ml/recommendations/${userId}`);
  return data;
};

export const getSentiment = async (symbol) => {
  const { data } = await api.get(`/ml/sentiment/${symbol}`);
  return data;
};

export const getAnomaly = async (symbol) => {
  const { data } = await api.get(`/ml/anomaly/${symbol}`);
  return data;
};

export const getRegime = async (symbol) => {
  const { data } = await api.get(`/ml/regime/${symbol}`);
  return data;
};
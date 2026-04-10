import axios from "axios";

const ML_BASE_URL = "http://127.0.0.1:8000";

export const fetchSignal = async (symbol) => {
  const { data } = await axios.get(`${ML_BASE_URL}/signal/${symbol}`);
  return data;
};

export const fetchPrediction = async (symbol) => {
  const { data } = await axios.get(`${ML_BASE_URL}/predict/${symbol}`);
  return data;
};

export const fetchRiskScore = async (symbol) => {
  const { data } = await axios.get(`${ML_BASE_URL}/risk/${symbol}`);
  return data;
};

export const fetchPortfolioInsights = async (userId) => {
  const { data } = await axios.get(`${ML_BASE_URL}/portfolio/${userId}`);
  return data;
};

export const fetchJournalInsights = async (userId) => {
  const { data } = await axios.get(`${ML_BASE_URL}/journal/${userId}`);
  return data;
};

export const fetchRecommendations = async (userId) => {
  const { data } = await axios.get(`${ML_BASE_URL}/recommendations/${userId}`);
  return data;
};

export const fetchSentiment = async (symbol) => {
  const { data } = await axios.get(`${ML_BASE_URL}/sentiment/${symbol}`);
  return data;
};

export const fetchAnomaly = async (symbol) => {
  const { data } = await axios.get(`${ML_BASE_URL}/anomaly/${symbol}`);
  return data;
};

export const fetchRegime = async (symbol) => {
  const { data } = await axios.get(`${ML_BASE_URL}/regime/${symbol}`);
  return data;
};
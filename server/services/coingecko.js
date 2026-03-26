import axios from "axios";

const BASE_URL = "https://api.coingecko.com/api/v3";

export const coingecko = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    accept: "application/json",
    "x-cg-demo-api-key": process.env.COINGECKO_API_KEY,
  },
});
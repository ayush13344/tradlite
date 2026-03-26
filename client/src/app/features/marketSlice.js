import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";

// 🔥 Fetch all market stocks
export const fetchMarkets = createAsyncThunk(
  "market/fetchMarkets",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/market");
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Error fetching markets");
    }
  }
);

// 🔥 Fetch single stock details
export const fetchStockBySymbol = createAsyncThunk(
  "market/fetchStockBySymbol",
  async (symbol, thunkAPI) => {
    try {
      const res = await api.get(`/market/${symbol}`);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Error fetching stock");
    }
  }
);

// 🔥 Fetch candle data (for chart)
export const fetchCandleData = createAsyncThunk(
  "market/fetchCandleData",
  async ({ symbol, interval }, thunkAPI) => {
    try {
      const res = await api.get(`/market/${symbol}/candles?interval=${interval}`);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Error fetching candles");
    }
  }
);

const marketSlice = createSlice({
  name: "market",
  initialState: {
    stocks: [],
    selectedStock: null,
    candles: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearSelectedStock: (state) => {
      state.selectedStock = null;
      state.candles = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch markets
      .addCase(fetchMarkets.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMarkets.fulfilled, (state, action) => {
        state.loading = false;
        state.stocks = action.payload;
      })
      .addCase(fetchMarkets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // fetch stock
      .addCase(fetchStockBySymbol.fulfilled, (state, action) => {
        state.selectedStock = action.payload;
      })

      // fetch candles
      .addCase(fetchCandleData.fulfilled, (state, action) => {
        state.candles = action.payload;
      });
  },
});

export const { clearSelectedStock } = marketSlice.actions;
export default marketSlice.reducer;
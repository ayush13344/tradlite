import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";

export const fetchPortfolio = createAsyncThunk(
  "portfolio/fetch",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/portfolio");
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response.data);
    }
  }
);

const portfolioSlice = createSlice({
  name: "portfolio",
  initialState: {
    balance: 0,
    holdings: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPortfolio.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPortfolio.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload.balance;
        state.holdings = action.payload.holdings;
      })
      .addCase(fetchPortfolio.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default portfolioSlice.reducer;
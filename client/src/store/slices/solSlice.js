import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// Async Thunks
export const fetchSols = createAsyncThunk(
  'sols/fetchSols',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/sols`, getAuthHeaders());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la récupération des sols');
    }
  }
);

export const fetchSol = createAsyncThunk(
  'sols/fetchSol',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/sols/${id}`, getAuthHeaders());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la récupération du sol');
    }
  }
);

export const createSol = createAsyncThunk(
  'sols/createSol',
  async (solData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/sols`, solData, getAuthHeaders());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la création du sol');
    }
  }
);

export const updateSol = createAsyncThunk(
  'sols/updateSol',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/sols/${id}`, updates, getAuthHeaders());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la mise à jour du sol');
    }
  }
);

export const deleteSol = createAsyncThunk(
  'sols/deleteSol',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}/sols/${id}`, getAuthHeaders());
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la suppression du sol');
    }
  }
);

export const contributeSol = createAsyncThunk(
  'sols/contributeSol',
  async ({ id, accountId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/sols/${id}/contribute`,
        { accountId },
        getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la contribution au sol');
    }
  }
);

export const moveToNextRecipient = createAsyncThunk(
  'sols/moveToNextRecipient',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/sols/${id}/next-recipient`,
        {},
        getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du passage au bénéficiaire suivant');
    }
  }
);

export const fetchSolStats = createAsyncThunk(
  'sols/fetchSolStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/sols/stats`, getAuthHeaders());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la récupération des statistiques');
    }
  }
);

// Initial state
const initialState = {
  sols: [],
  currentSol: null,
  stats: null,
  loading: false,
  error: null,
};

// Slice
const solSlice = createSlice({
  name: 'sols',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentSol: (state) => {
      state.currentSol = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Sols
      .addCase(fetchSols.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSols.fulfilled, (state, action) => {
        state.loading = false;
        state.sols = action.payload;
      })
      .addCase(fetchSols.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Sol
      .addCase(fetchSol.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSol.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSol = action.payload;
      })
      .addCase(fetchSol.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Sol
      .addCase(createSol.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSol.fulfilled, (state, action) => {
        state.loading = false;
        state.sols.unshift(action.payload);
      })
      .addCase(createSol.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Sol
      .addCase(updateSol.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSol.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.sols.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) {
          state.sols[index] = action.payload;
        }
        if (state.currentSol?._id === action.payload._id) {
          state.currentSol = action.payload;
        }
      })
      .addCase(updateSol.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete Sol
      .addCase(deleteSol.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSol.fulfilled, (state, action) => {
        state.loading = false;
        state.sols = state.sols.filter((s) => s._id !== action.payload);
      })
      .addCase(deleteSol.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Contribute Sol
      .addCase(contributeSol.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(contributeSol.fulfilled, (state, action) => {
        state.loading = false;
        // Update the Sol in the array with the returned sol data
        const index = state.sols.findIndex((s) => s._id === action.payload.sol._id);
        if (index !== -1) {
          state.sols[index] = action.payload.sol;
        }
        // Update currentSol if it's the same
        if (state.currentSol?._id === action.payload.sol._id) {
          state.currentSol = action.payload.sol;
        }
      })
      .addCase(contributeSol.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Move To Next Recipient
      .addCase(moveToNextRecipient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(moveToNextRecipient.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.sols.findIndex((s) => s._id === action.payload._id);
        if (index !== -1) {
          state.sols[index] = action.payload;
        }
        if (state.currentSol?._id === action.payload._id) {
          state.currentSol = action.payload;
        }
      })
      .addCase(moveToNextRecipient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Sol Stats
      .addCase(fetchSolStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSolStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchSolStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentSol } = solSlice.actions;
export default solSlice.reducer;

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
export const fetchBudgets = createAsyncThunk(
  'budgets/fetchBudgets',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/budgets`, getAuthHeaders());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la récupération des budgets');
    }
  }
);

export const fetchBudgetById = createAsyncThunk(
  'budgets/fetchBudgetById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/budgets/${id}`, getAuthHeaders());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la récupération du budget');
    }
  }
);

export const createBudget = createAsyncThunk(
  'budgets/createBudget',
  async (budgetData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/budgets`, budgetData, getAuthHeaders());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la création du budget');
    }
  }
);

export const updateBudget = createAsyncThunk(
  'budgets/updateBudget',
  async ({ id, budgetData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/budgets/${id}`, budgetData, getAuthHeaders());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la mise à jour du budget');
    }
  }
);

export const deleteBudget = createAsyncThunk(
  'budgets/deleteBudget',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}/budgets/${id}`, getAuthHeaders());
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la suppression du budget');
    }
  }
);

export const fetchBudgetStats = createAsyncThunk(
  'budgets/fetchBudgetStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/budgets/stats`, getAuthHeaders());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la récupération des statistiques');
    }
  }
);

// Allouer un budget
export const allocateBudget = createAsyncThunk(
  'budgets/allocate',
  async ({ budgetId, accountId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/budgets/${budgetId}/allocate`,
        { accountId },
        getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de l\'allocation du budget');
    }
  }
);

// Retourner les fonds non utilisés d'un budget
export const returnBudgetFunds = createAsyncThunk(
  'budgets/return',
  async (budgetId, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/budgets/${budgetId}/return`,
        {},
        getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du retour des fonds du budget');
    }
  }
);

// Retourner tous les fonds des budgets expirés
export const returnAllExpiredBudgets = createAsyncThunk(
  'budgets/returnAllExpired',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/budgets/return-all-expired`,
        {},
        getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du retour des fonds des budgets expirés');
    }
  }
);

// Initial state
const initialState = {
  budgets: [],
  currentBudget: null,
  stats: null,
  loading: false,
  error: null,
};

// Slice
const budgetSlice = createSlice({
  name: 'budgets',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentBudget: (state) => {
      state.currentBudget = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Budgets
      .addCase(fetchBudgets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.loading = false;
        state.budgets = action.payload;
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Budget By Id
      .addCase(fetchBudgetById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBudgetById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBudget = action.payload;
      })
      .addCase(fetchBudgetById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Budget
      .addCase(createBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBudget.fulfilled, (state, action) => {
        state.loading = false;
        state.budgets.unshift(action.payload);
      })
      .addCase(createBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Budget
      .addCase(updateBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBudget.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.budgets.findIndex((b) => b._id === action.payload._id);
        if (index !== -1) {
          state.budgets[index] = action.payload;
        }
        if (state.currentBudget?._id === action.payload._id) {
          state.currentBudget = action.payload;
        }
      })
      .addCase(updateBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete Budget
      .addCase(deleteBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBudget.fulfilled, (state, action) => {
        state.loading = false;
        state.budgets = state.budgets.filter((b) => b._id !== action.payload);
      })
      .addCase(deleteBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Budget Stats
      .addCase(fetchBudgetStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBudgetStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchBudgetStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Allocate budget
      .addCase(allocateBudget.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(allocateBudget.fulfilled, (state, action) => {
        state.loading = false;
        // Mettre à jour le budget dans la liste
        const index = state.budgets.findIndex(b => b._id === action.payload._id);
        if (index !== -1) {
          state.budgets[index] = action.payload;
        }
        // Mettre à jour le budget courant si c'est le même
        if (state.currentBudget?._id === action.payload._id) {
          state.currentBudget = action.payload;
        }
      })
      .addCase(allocateBudget.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Return budget funds
      .addCase(returnBudgetFunds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(returnBudgetFunds.fulfilled, (state, action) => {
        state.loading = false;
        // Mettre à jour le budget dans la liste
        const index = state.budgets.findIndex(b => b._id === action.payload._id);
        if (index !== -1) {
          state.budgets[index] = action.payload;
        }
        // Mettre à jour le budget courant si c'est le même
        if (state.currentBudget?._id === action.payload._id) {
          state.currentBudget = action.payload;
        }
      })
      .addCase(returnBudgetFunds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Return all expired budgets
      .addCase(returnAllExpiredBudgets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(returnAllExpiredBudgets.fulfilled, (state, action) => {
        state.loading = false;
        // Note: Le composant doit appeler fetchBudgets() après cette action
        // pour obtenir la liste à jour des budgets après le traitement des budgets expirés
      })
      .addCase(returnAllExpiredBudgets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentBudget } = budgetSlice.actions;
export default budgetSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { accountService } from '../../services/accountService';

// Async Thunks
export const fetchAccounts = createAsyncThunk(
  'accounts/fetchAccounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await accountService.getAccounts();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur de chargement');
    }
  }
);

export const createAccount = createAsyncThunk(
  'accounts/createAccount',
  async (accountData, { rejectWithValue }) => {
    try {
      const response = await accountService.createAccount(accountData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur de création');
    }
  }
);

export const updateAccount = createAsyncThunk(
  'accounts/updateAccount',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await accountService.updateAccount(id, data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur de mise à jour');
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'accounts/deleteAccount',
  async (id, { rejectWithValue }) => {
    try {
      await accountService.deleteAccount(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur de suppression');
    }
  }
);

// Initial state
const initialState = {
  accounts: [],
  totals: { HTG: 0, USD: 0 },
  loading: false,
  error: null,
};

// Slice
const accountSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    clearAccountError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Accounts
      .addCase(fetchAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = action.payload.data;
        state.totals = action.payload.totals;
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Account
      .addCase(createAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts.unshift(action.payload.data);
        // Update totals
        const account = action.payload.data;
        if (account.includeInTotal) {
          state.totals[account.currency] += account.balance;
        }
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Account
      .addCase(updateAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.accounts.findIndex(a => a._id === action.payload.data._id);
        if (index !== -1) {
          state.accounts[index] = action.payload.data;
        }
      })
      .addCase(updateAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete Account
      .addCase(deleteAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.loading = false;
        const account = state.accounts.find(a => a._id === action.payload);
        if (account && account.includeInTotal) {
          state.totals[account.currency] -= account.balance;
        }
        state.accounts = state.accounts.filter(a => a._id !== action.payload);
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAccountError } = accountSlice.actions;
export default accountSlice.reducer;

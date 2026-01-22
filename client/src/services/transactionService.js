import api from './api';

export const transactionService = {
  getTransactions: async (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.type) params.append('type', filters.type);
    if (filters.category) params.append('category', filters.category);
    if (filters.account) params.append('account', filters.account);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/transactions?${params.toString()}`);
    return response.data;
  },

  getTransaction: async (id) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },

  createTransaction: async (transactionData) => {
    const response = await api.post('/transactions', transactionData);
    return response.data;
  },

  updateTransaction: async (id, transactionData) => {
    const response = await api.put(`/transactions/${id}`, transactionData);
    return response.data;
  },

  deleteTransaction: async (id) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },

  getStats: async (period = 'month') => {
    const response = await api.get(`/transactions/stats?period=${period}`);
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/transactions/categories');
    return response.data;
  },
};

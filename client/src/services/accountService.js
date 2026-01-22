import api from './api';

export const accountService = {
  // Get all accounts
  async getAccounts() {
    const response = await api.get('/accounts');
    return response.data;
  },

  // Get single account
  async getAccount(id) {
    const response = await api.get(`/accounts/${id}`);
    return response.data;
  },

  // Create account
  async createAccount(accountData) {
    const response = await api.post('/accounts', accountData);
    return response.data;
  },

  // Update account
  async updateAccount(id, accountData) {
    const response = await api.put(`/accounts/${id}`, accountData);
    return response.data;
  },

  // Delete account
  async deleteAccount(id) {
    const response = await api.delete(`/accounts/${id}`);
    return response.data;
  },
};

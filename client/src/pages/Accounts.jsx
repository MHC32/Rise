import { useState, useEffect } from 'react';
import { accountService } from '../services/accountService';

const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Compte Bancaire', icon: '🏦' },
  { value: 'mobile_money', label: 'Mobile Money', icon: '📱' },
  { value: 'cash', label: 'Argent de poche', icon: '💵' },
];

const PROVIDERS = [
  { value: 'moncash', label: 'Moncash' },
  { value: 'natcash', label: 'Natcash' },
  { value: 'other', label: 'Autre' },
];

const BANKS = [
  'BUH', 'Sogebank', 'Unibank', 'Capital Bank', 'BNC', 'Autre'
];

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'
];

function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [totals, setTotals] = useState({ HTG: 0, USD: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await accountService.getAccounts();
      if (response.success) {
        setAccounts(response.data);
        setTotals(response.totals);
      }
    } catch (err) {
      setError('Erreur lors du chargement des comptes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    setEditingAccount(null);
    setShowModal(true);
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setShowModal(true);
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce compte ?')) {
      return;
    }
    try {
      await accountService.deleteAccount(id);
      fetchAccounts();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  const handleSaveAccount = async (accountData) => {
    try {
      if (editingAccount) {
        await accountService.updateAccount(editingAccount._id, accountData);
      } else {
        await accountService.createAccount(accountData);
      }
      setShowModal(false);
      fetchAccounts();
    } catch (err) {
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes Comptes</h1>
          <p className="text-gray-600">Gérez vos comptes bancaires et portefeuilles</p>
        </div>
        <button
          onClick={handleCreateAccount}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Nouveau compte
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500">Total en Gourdes</p>
          <p className="text-2xl font-bold text-gray-900">
            {totals.HTG.toLocaleString()} HTG
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500">Total en Dollars</p>
          <p className="text-2xl font-bold text-gray-900">
            ${totals.USD.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-gray-500 mb-4">Aucun compte créé</p>
          <button
            onClick={handleCreateAccount}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Créer votre premier compte
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account._id}
              account={account}
              onEdit={() => handleEditAccount(account)}
              onDelete={() => handleDeleteAccount(account._id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AccountModal
          account={editingAccount}
          onClose={() => setShowModal(false)}
          onSave={handleSaveAccount}
        />
      )}
    </div>
  );
}

function AccountCard({ account, onEdit, onDelete }) {
  const typeInfo = ACCOUNT_TYPES.find(t => t.value === account.type);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div
        className="h-2"
        style={{ backgroundColor: account.color || '#3B82F6' }}
      />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{account.icon || typeInfo?.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{account.name}</h3>
              <p className="text-sm text-gray-500">
                {typeInfo?.label}
                {account.institution && ` • ${account.institution}`}
                {account.provider && ` • ${account.provider}`}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-2xl font-bold text-gray-900">
            {account.currency === 'USD' ? '$' : ''}
            {account.balance.toLocaleString()}
            {account.currency === 'HTG' ? ' HTG' : ''}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            Modifier
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountModal({ account, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: account?.name || '',
    type: account?.type || 'bank',
    institution: account?.institution || '',
    provider: account?.provider || '',
    currency: account?.currency || 'HTG',
    initialBalance: account?.initialBalance || 0,
    color: account?.color || '#3B82F6',
    icon: account?.icon || '💳',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onSave(formData);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {account ? 'Modifier le compte' : 'Nouveau compte'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du compte
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Compte BUH Principal"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de compte
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ACCOUNT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Institution (for bank) */}
            {formData.type === 'bank' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banque
                </label>
                <select
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner une banque</option>
                  {BANKS.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Provider (for mobile money) */}
            {formData.type === 'mobile_money' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider
                </label>
                <select
                  name="provider"
                  value={formData.provider}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner</option>
                  {PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Devise
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="HTG">Gourde (HTG)</option>
                <option value="USD">Dollar (USD)</option>
              </select>
            </div>

            {/* Initial Balance (only for new accounts) */}
            {!account && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Solde initial
                </label>
                <input
                  type="number"
                  name="initialBalance"
                  value={formData.initialBalance}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            )}

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur
              </label>
              <div className="flex gap-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full ${formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Accounts;

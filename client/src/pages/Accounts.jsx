import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../store/slices/accountSlice';

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

const BANKS = ['BUH', 'Sogebank', 'Unibank', 'Capital Bank', 'BNC', 'Autre'];

const COLORS = [
  '#667eea', '#f093fb', '#f5576c', '#10b981', '#ffd876', '#3b82f6', '#8b5cf6'
];

function Accounts() {
  const dispatch = useDispatch();
  const { accounts, totals, loading, error } = useSelector((state) => state.accounts);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  useEffect(() => {
    dispatch(fetchAccounts());
  }, [dispatch]);

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
    dispatch(deleteAccount(id));
  };

  const handleSaveAccount = async (accountData) => {
    if (editingAccount) {
      await dispatch(updateAccount({ id: editingAccount._id, data: accountData })).unwrap();
    } else {
      await dispatch(createAccount(accountData)).unwrap();
    }
    setShowModal(false);
  };

  return (
    <div>
      {/* Header */}
      <header className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Mes Comptes 💳
          </h1>
          <p className="text-white/80 mt-1">Gère tous tes comptes en un seul endroit</p>
        </div>
        <button
          onClick={handleCreateAccount}
          className="px-6 py-3 bg-gradient-to-r from-pink-400 to-red-400 text-white rounded-2xl font-semibold hover:scale-105 transition shadow-lg shadow-pink-500/30"
        >
          + Nouveau compte
        </button>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-400/50 text-white rounded-xl">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center text-2xl mb-4">
            💰
          </div>
          <p className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-1">Solde Total HTG</p>
          <p className="text-2xl font-extrabold text-gray-800">{totals.HTG.toLocaleString()} HTG</p>
        </div>

        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
          <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center text-2xl mb-4">
            💵
          </div>
          <p className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-1">Solde Total USD</p>
          <p className="text-2xl font-extrabold text-gray-800">${totals.USD.toLocaleString()}</p>
        </div>

        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
          <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-red-400 rounded-2xl flex items-center justify-center text-2xl mb-4">
            💳
          </div>
          <p className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-1">Comptes Actifs</p>
          <p className="text-2xl font-extrabold text-gray-800">{accounts.length} comptes</p>
        </div>
      </div>

      {/* Accounts List */}
      <section className="bg-white/95 rounded-3xl p-6 sm:p-8 shadow-lg">
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent mb-6">
          Tous les Comptes
        </h2>

        {loading && accounts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Aucun compte créé</p>
            <button
              onClick={handleCreateAccount}
              className="text-purple-500 font-semibold hover:text-purple-600"
            >
              Créer votre premier compte →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
      </section>

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
  const typeInfo = ACCOUNT_TYPES.find((t) => t.value === account.type);

  return (
    <div
      className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition"
      style={{ borderColor: `${account.color}40` }}
    >
      <div className="h-1.5" style={{ backgroundColor: account.color || '#667eea' }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{account.icon || typeInfo?.icon}</span>
            <div>
              <h3 className="font-bold text-gray-800">{account.name}</h3>
              <p className="text-sm text-gray-400">
                {typeInfo?.label}
                {account.institution && ` • ${account.institution}`}
                {account.provider && ` • ${account.provider}`}
              </p>
            </div>
          </div>
        </div>

        <p className="text-2xl font-extrabold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
          {account.currency === 'USD' ? '$' : ''}
          {account.balance.toLocaleString()}
          {account.currency === 'HTG' ? ' HTG' : ''}
        </p>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-xl transition font-medium"
          >
            Modifier
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition font-medium"
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
    color: account?.color || '#667eea',
    icon: account?.icon || '💳',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
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
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-6">
            {account ? 'Modifier le compte' : 'Nouveau compte'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom du compte
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                placeholder="Ex: Compte NatCash Principal"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Type de compte
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Institution (for bank) */}
            {formData.type === 'bank' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Banque
                </label>
                <select
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                >
                  <option value="">Sélectionner une banque</option>
                  {BANKS.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Provider (for mobile money) */}
            {formData.type === 'mobile_money' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Provider
                </label>
                <select
                  name="provider"
                  value={formData.provider}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                >
                  <option value="">Sélectionner</option>
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Currency */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Devise
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              >
                <option value="HTG">Gourde (HTG)</option>
                <option value="USD">Dollar (USD)</option>
              </select>
            </div>

            {/* Initial Balance (only for new accounts) */}
            {!account && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Solde initial
                </label>
                <input
                  type="number"
                  name="initialBalance"
                  value={formData.initialBalance}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="0"
                />
              </div>
            )}

            {/* Color */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Couleur
              </label>
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    className={`w-10 h-10 rounded-xl transition ${
                      formData.color === color
                        ? 'ring-4 ring-offset-2 ring-purple-500 scale-110'
                        : 'hover:scale-105'
                    }`}
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
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:from-pink-600 hover:to-purple-700 transition font-semibold disabled:opacity-50"
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

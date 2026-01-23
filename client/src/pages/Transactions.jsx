import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTransactions,
  createTransaction,
  deleteTransaction,
} from '../store/slices/transactionSlice';
import { fetchAccounts } from '../store/slices/accountSlice';

const EXPENSE_CATEGORIES = [
  { value: 'nourriture', label: 'Nourriture', icon: '🍔' },
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'abonnements', label: 'Abonnements', icon: '📺' },
  { value: 'personnel', label: 'Personnel', icon: '🧴' },
  { value: 'loisirs', label: 'Loisirs', icon: '🎮' },
  { value: 'famille', label: 'Famille', icon: '👨‍👩‍👧' },
  { value: 'travail', label: 'Travail', icon: '💼' },
  { value: 'sante', label: 'Santé', icon: '🏥' },
  { value: 'communication', label: 'Communication', icon: '📱' },
  { value: 'loyer', label: 'Loyer', icon: '🏠' },
  { value: 'paris_sportifs', label: 'Paris sportifs', icon: '⚽' },
  { value: 'sol', label: 'Sol/Tontine', icon: '🤝' },
  { value: 'investissement', label: 'Investissement', icon: '📈' },
  { value: 'remboursement_dette', label: 'Remboursement dette', icon: '💸' },
  { value: 'pret_accorde', label: 'Prêt accordé', icon: '🤲' },
  { value: 'autre', label: 'Autre', icon: '📦' },
];

const INCOME_CATEGORIES = [
  { value: 'salaire', label: 'Salaire', icon: '💼' },
  { value: 'freelance', label: 'Freelance', icon: '💻' },
  { value: 'famille', label: 'Famille', icon: '👨‍👩‍👧' },
  { value: 'paris_sportifs', label: 'Paris sportifs', icon: '⚽' },
  { value: 'cadeaux', label: 'Cadeaux', icon: '🎁' },
  { value: 'remboursement_recu', label: 'Remboursement reçu', icon: '💵' },
  { value: 'vente_investissement', label: 'Vente investissement', icon: '📈' },
  { value: 'pot_sol', label: 'Pot de Sol', icon: '🤝' },
  { value: 'autre', label: 'Autre', icon: '📦' },
];

function Transactions() {
  const dispatch = useDispatch();
  const { transactions, stats, loading, pagination } = useSelector((state) => state.transactions);
  const { accounts } = useSelector((state) => state.accounts);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({ type: '', category: '', account: '' });

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchAccounts());
  }, [dispatch]);

  const handleCreateTransaction = () => {
    setShowModal(true);
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      return;
    }
    await dispatch(deleteTransaction(id));
    dispatch(fetchAccounts()); // Refresh account balances
  };

  const handleSaveTransaction = async (data) => {
    await dispatch(createTransaction(data)).unwrap();
    setShowModal(false);
    dispatch(fetchAccounts()); // Refresh account balances
  };

  const handleFilterChange = (key, value) => {
    const newFilter = { ...filter, [key]: value };
    setFilter(newFilter);
    dispatch(fetchTransactions(newFilter));
  };

  const getCategoryInfo = (category, type) => {
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return categories.find((c) => c.value === category) || { label: category, icon: '📦' };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Group transactions by month
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    if (!groups[monthKey]) {
      groups[monthKey] = { label: monthLabel, transactions: [] };
    }
    groups[monthKey].transactions.push(transaction);
    return groups;
  }, {});

  return (
    <div>
      {/* Header */}
      <header className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Transactions 📊
          </h1>
          <p className="text-white/80 mt-1">Historique complet de tes finances</p>
        </div>
        <button
          onClick={handleCreateTransaction}
          className="px-6 py-3 bg-gradient-to-r from-pink-400 to-red-400 text-white rounded-2xl font-semibold hover:scale-105 transition shadow-lg shadow-pink-custom/50"
        >
          + Nouvelle transaction
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
          <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center text-2xl mb-4">
            📈
          </div>
          <p className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-1">Revenus ce mois</p>
          <p className="text-2xl font-extrabold text-green-500">
            +{(stats?.totalIncome || 0).toLocaleString()} HTG
          </p>
        </div>

        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
          <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-red-400 rounded-2xl flex items-center justify-center text-2xl mb-4">
            📉
          </div>
          <p className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-1">Dépenses ce mois</p>
          <p className="text-2xl font-extrabold text-red-500">
            -{(stats?.totalExpense || 0).toLocaleString()} HTG
          </p>
        </div>

        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-start to-purple-mid rounded-2xl flex items-center justify-center text-2xl mb-4">
            ⚖️
          </div>
          <p className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-1">Balance</p>
          <p className={`text-2xl font-extrabold ${(stats?.balance || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {(stats?.balance || 0) >= 0 ? '+' : ''}
            {(stats?.balance || 0).toLocaleString()} HTG
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/95 rounded-2xl p-4 shadow-lg mb-6 flex flex-wrap gap-4">
        <select
          value={filter.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-start focus:border-purple-start outline-none"
        >
          <option value="">Tous les types</option>
          <option value="expense">Dépenses</option>
          <option value="income">Revenus</option>
          <option value="transfer">Transferts</option>
        </select>

        <select
          value={filter.account}
          onChange={(e) => handleFilterChange('account', e.target.value)}
          className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-start focus:border-purple-start outline-none"
        >
          <option value="">Tous les comptes</option>
          {accounts.map((account) => (
            <option key={account._id} value={account._id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      {/* Transactions List */}
      <section className="bg-white/95 rounded-3xl p-6 sm:p-8 shadow-lg">
        {loading && transactions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-purple-start/20 border-t-purple-start rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Aucune transaction</p>
            <button
              onClick={handleCreateTransaction}
              className="text-purple-start font-semibold hover:text-purple-mid"
            >
              Ajouter votre première transaction →
            </button>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([monthKey, group]) => (
            <div key={monthKey} className="mb-8 last:mb-0">
              <h3 className="text-lg font-bold text-gray-700 mb-4 capitalize">
                {group.label}
              </h3>
              {group.transactions.map((transaction) => {
                const categoryInfo = getCategoryInfo(transaction.category, transaction.type);
                const isExpense = transaction.type === 'expense';
                const isIncome = transaction.type === 'income';
                const isTransfer = transaction.type === 'transfer';

                return (
                  <div
                    key={transaction._id}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-purple-50 transition mb-3 group"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                        isIncome
                          ? 'bg-gradient-to-br from-green-400 to-blue-500'
                          : isTransfer
                          ? 'bg-gradient-to-br from-purple-start to-purple-mid'
                          : 'bg-gradient-to-br from-pink-400 to-red-400'
                      }`}
                    >
                      {isTransfer ? '↔️' : categoryInfo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {isTransfer
                          ? `Transfert vers ${transaction.toAccount?.name || 'compte'}`
                          : transaction.description || categoryInfo.label}
                      </p>
                      <p className="text-sm text-gray-400">
                        {formatDate(transaction.date)} • {transaction.account?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p
                        className={`text-lg font-bold ${
                          isExpense ? 'text-red-500' : isIncome ? 'text-green-500' : 'text-purple-start'
                        }`}
                      >
                        {isExpense ? '-' : isIncome ? '+' : ''}
                        {transaction.amount.toLocaleString()} {transaction.currency}
                      </p>
                      <button
                        onClick={() => handleDeleteTransaction(transaction._id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition p-2"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => dispatch(fetchTransactions({ ...filter, page }))}
                className={`w-10 h-10 rounded-xl font-semibold transition ${
                  pagination.page === page
                    ? 'bg-gradient-to-r from-purple-start to-pink-custom text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Modal */}
      {showModal && (
        <TransactionModal
          accounts={accounts}
          onClose={() => setShowModal(false)}
          onSave={handleSaveTransaction}
        />
      )}
    </div>
  );
}

function TransactionModal({ accounts, onClose, onSave }) {
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    account: accounts[0]?._id || '',
    toAccount: '',
    category: 'nourriture',
    description: '',
    date: new Date().toISOString().split('T')[0],
    fees: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Reset category when type changes
    if (name === 'type') {
      const newCategories = value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        category: newCategories[0]?.value || '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        fees: formData.type === 'transfer' ? parseFloat(formData.fees) || 0 : 0,
      };

      // Get currency from selected account
      const selectedAccount = accounts.find((a) => a._id === formData.account);
      if (selectedAccount) {
        payload.currency = selectedAccount.currency;
      }

      await onSave(payload);
    } catch (err) {
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-purple-start to-pink-custom bg-clip-text text-transparent mb-6">
            Nouvelle transaction
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'expense', label: 'Dépense', icon: '📉', color: 'from-pink-400 to-red-400' },
                { value: 'income', label: 'Revenu', icon: '📈', color: 'from-green-400 to-blue-500' },
                { value: 'transfer', label: 'Transfert', icon: '↔️', color: 'from-purple-start to-purple-mid' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleChange({ target: { name: 'type', value: type.value } })}
                  className={`p-3 rounded-xl font-semibold transition flex flex-col items-center gap-1 ${
                    formData.type === type.value
                      ? `bg-gradient-to-br ${type.color} text-white shadow-lg`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-xl">{type.icon}</span>
                  <span className="text-xs">{type.label}</span>
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Montant
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-start focus:border-purple-start outline-none transition text-2xl font-bold"
                placeholder="0"
              />
            </div>

            {/* Account */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {formData.type === 'transfer' ? 'Compte source' : 'Compte'}
              </label>
              <select
                name="account"
                value={formData.account}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-start focus:border-purple-start outline-none transition"
              >
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.icon} {account.name} ({account.balance.toLocaleString()} {account.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* To Account (for transfers) */}
            {formData.type === 'transfer' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Compte destination
                  </label>
                  <select
                    name="toAccount"
                    value={formData.toAccount}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-start focus:border-purple-start outline-none transition"
                  >
                    <option value="">Sélectionner</option>
                    {accounts
                      .filter((a) => a._id !== formData.account)
                      .map((account) => (
                        <option key={account._id} value={account._id}>
                          {account.icon} {account.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Frais de transfert (optionnel)
                  </label>
                  <input
                    type="number"
                    name="fees"
                    value={formData.fees}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-start focus:border-purple-start outline-none transition"
                    placeholder="0"
                  />
                </div>
              </>
            )}

            {/* Category (not for transfers) */}
            {formData.type !== 'transfer' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Catégorie
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, category: cat.value }))}
                      className={`p-2 rounded-xl transition flex flex-col items-center gap-1 ${
                        formData.category === cat.value
                          ? 'bg-purple-100 border-2 border-purple-start'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-xs text-gray-600 truncate w-full text-center">
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description (optionnel)
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                maxLength={200}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-start focus:border-purple-start outline-none transition"
                placeholder="Ex: Déjeuner au resto"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-start focus:border-purple-start outline-none transition"
              />
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
                disabled={loading || !formData.amount || !formData.account}
                className="flex-1 px-4 py-3 bg-gradient-primary text-white rounded-xl transition font-semibold disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Transactions;

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBudgets, createBudget, updateBudget, deleteBudget, clearError, returnBudgetFunds, returnAllExpiredBudgets } from '../store/slices/budgetSlice';
import AllocateBudgetModal from '../components/budgets/AllocateBudgetModal';

function Budgets() {
  const dispatch = useDispatch();
  const { budgets, loading, error } = useSelector((state) => state.budgets);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentBudget, setCurrentBudget] = useState(null);
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [selectedBudgetForAllocation, setSelectedBudgetForAllocation] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'transport',
    amount: '',
    period: 'monthly',
    startDate: '',
    endDate: '',
    icon: '🎯',
    color: '#667eea',
    alertThreshold: 80,
  });

  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  useEffect(() => {
    // Set default dates to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setFormData(prev => ({
      ...prev,
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0],
    }));
  }, []);

  useEffect(() => {
    if (error) {
      setTimeout(() => dispatch(clearError()), 5000);
    }
  }, [error, dispatch]);

  const handleOpenModal = (budget = null) => {
    if (budget) {
      setEditMode(true);
      setCurrentBudget(budget);
      setFormData({
        name: budget.name,
        category: budget.category,
        amount: budget.amount,
        period: budget.period,
        startDate: budget.startDate.split('T')[0],
        endDate: budget.endDate.split('T')[0],
        icon: budget.icon || '🎯',
        color: budget.color || '#667eea',
        alertThreshold: budget.alertThreshold || 80,
      });
    } else {
      setEditMode(false);
      setCurrentBudget(null);
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFormData({
        name: '',
        category: 'transport',
        amount: '',
        period: 'monthly',
        startDate: firstDay.toISOString().split('T')[0],
        endDate: lastDay.toISOString().split('T')[0],
        icon: '🎯',
        color: '#667eea',
        alertThreshold: 80,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentBudget(null);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) dispatch(clearError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editMode && currentBudget) {
      await dispatch(updateBudget({ id: currentBudget._id, budgetData: formData }));
    } else {
      await dispatch(createBudget(formData));
    }

    handleCloseModal();
    dispatch(fetchBudgets());
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce budget?')) {
      await dispatch(deleteBudget(id));
    }
  };

  const handleAllocate = (budget) => {
    setSelectedBudgetForAllocation(budget);
    setAllocateModalOpen(true);
  };

  const handleReturn = async (budgetId) => {
    if (window.confirm('Voulez-vous vraiment retourner les fonds non utilisés?')) {
      try {
        await dispatch(returnBudgetFunds(budgetId)).unwrap();
        dispatch(fetchBudgets());
      } catch (error) {
        console.error('Erreur lors du retour des fonds:', error);
      }
    }
  };

  const handleReturnAllExpired = async () => {
    if (window.confirm('Retourner tous les fonds des budgets expirés?')) {
      try {
        await dispatch(returnAllExpiredBudgets()).unwrap();
        dispatch(fetchBudgets());
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'exceeded':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-500';
      default:
        return 'text-green-600';
    }
  };

  const getProgressGradient = (percentage) => {
    if (percentage >= 100) return 'from-red-500 to-red-600';
    if (percentage >= 80) return 'from-orange-400 to-orange-500';
    return 'from-green-400 to-blue-500';
  };

  const categoryOptions = [
    { value: 'nourriture', label: '🍔 Nourriture', icon: '🍔' },
    { value: 'transport', label: '🚗 Transport', icon: '🚗' },
    { value: 'abonnements', label: '📱 Abonnements', icon: '📱' },
    { value: 'personnel', label: '👕 Personnel', icon: '👕' },
    { value: 'loisirs', label: '🎮 Loisirs', icon: '🎮' },
    { value: 'communication', label: '📞 Communication', icon: '📞' },
    { value: 'sante', label: '💊 Santé', icon: '💊' },
    { value: 'autre', label: '🎯 Autre', icon: '🎯' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 bg-clip-text text-transparent">
            Budgets 🎯
          </h1>
          <p className="text-white/80 mt-2">Garde le contrôle de tes dépenses</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReturnAllExpired}
            className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl hover:scale-105 transition-all shadow-lg"
          >
            Retourner Budgets Expirés
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold rounded-xl transition transform hover:scale-105 shadow-lg shadow-purple-500/30"
          >
            + Nouveau budget
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && budgets.length === 0 ? (
        <div className="text-center text-white py-12">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          Chargement...
        </div>
      ) : (
        <>
          {/* Budgets List */}
          {budgets.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-12 text-center">
              <p className="text-gray-500 text-lg mb-4">Aucun budget créé</p>
              <button
                onClick={() => handleOpenModal()}
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                Créer votre premier budget →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {budgets.map((budget) => (
                <div
                  key={budget._id}
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-lg hover:shadow-xl transition"
                >
                  {/* Budget Header */}
                  <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{budget.icon}</span>
                      <span className="font-bold text-lg text-gray-800">{budget.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-2xl font-extrabold ${getStatusColor(budget.status)}`}>
                        {budget.percentage}%
                      </span>

                      {/* Allocation and Return Buttons */}
                      {budget.status === 'draft' && (
                        <button
                          onClick={() => handleAllocate(budget)}
                          className="px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg hover:scale-105 transition-all"
                        >
                          Allouer
                        </button>
                      )}

                      {(budget.status === 'allocated' || budget.status === 'active') && !budget.returnedAt && (
                        <button
                          onClick={() => handleReturn(budget._id)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-lg hover:scale-105 transition-all"
                        >
                          Retourner
                        </button>
                      )}

                      {/* Existing Edit and Delete Buttons */}
                      <button
                        onClick={() => handleOpenModal(budget)}
                        className="text-purple-600 hover:text-purple-700 p-2"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(budget._id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="bg-gray-200 h-3 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full bg-gradient-to-r ${getProgressGradient(budget.percentage)} transition-all duration-500`}
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    />
                  </div>

                  {/* Budget Info */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-semibold">
                      {budget._spent?.toLocaleString()} / {budget.amount.toLocaleString()} {budget.currency}
                    </span>
                    {budget.status === 'exceeded' ? (
                      <span className="text-red-600 font-bold">⚠️ Limite dépassée!</span>
                    ) : budget.status === 'warning' ? (
                      <span className="text-orange-500 font-bold">🟠 Proche limite</span>
                    ) : (
                      <span className="text-gray-600">{budget.remaining.toLocaleString()} {budget.currency} restants</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-6">
              {editMode ? 'Modifier le budget' : 'Nouveau budget'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom du budget
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="Ex: Transport"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Catégorie
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
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
                  min="1"
                  step="0.01"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="10000"
                />
              </div>

              {/* Period */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Période
                </label>
                <select
                  name="period"
                  value={formData.period}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                >
                  <option value="monthly">Mensuel</option>
                  <option value="yearly">Annuel</option>
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date début
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date fin
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Icône (emoji)
                </label>
                <input
                  type="text"
                  name="icon"
                  value={formData.icon}
                  onChange={handleChange}
                  maxLength="2"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition text-2xl"
                  placeholder="🎯"
                />
              </div>

              {/* Alert Threshold */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Seuil d'alerte (%)
                </label>
                <input
                  type="number"
                  name="alertThreshold"
                  value={formData.alertThreshold}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold rounded-xl transition disabled:opacity-50"
                >
                  {editMode ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate Budget Modal */}
      {allocateModalOpen && selectedBudgetForAllocation && (
        <AllocateBudgetModal
          budget={selectedBudgetForAllocation}
          isOpen={allocateModalOpen}
          onClose={() => {
            setAllocateModalOpen(false);
            setSelectedBudgetForAllocation(null);
            dispatch(fetchBudgets());
          }}
        />
      )}
    </div>
  );
}

export default Budgets;

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { allocateBudget } from '../../store/slices/budgetSlice';
import { fetchAccounts } from '../../store/slices/accountSlice';

const AllocateBudgetModal = ({ budget, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { accounts } = useSelector((state) => state.accounts);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchAccounts());
    }
  }, [isOpen, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedAccount) {
      setError('Veuillez sélectionner un compte');
      return;
    }

    try {
      await dispatch(
        allocateBudget({
          budgetId: budget._id,
          accountId: selectedAccount
        })
      ).unwrap();
      setSelectedAccount('');
      setError('');
      onClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : err.message || 'Une erreur est survenue');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 max-w-md w-full mx-4 border-2 border-white/20 shadow-xl">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-start via-pink-custom to-yellow-custom bg-clip-text text-transparent">
          Allouer le Budget
        </h2>

        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            Budget: <span className="font-semibold">{budget.name}</span>
          </p>
          <p className="text-gray-600">
            Montant: <span className="font-semibold">{budget.amount} {budget.currency}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2 font-medium">
              Compte Source
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-start focus:outline-none focus:ring-2 focus:ring-purple-start transition-all"
              required
            >
              <option value="">Sélectionner un compte</option>
              {accounts
                .filter(account => account.currency === budget.currency && account.isActive)
                .map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.icon} {account.name} - {account.balance} {account.currency}
                  </option>
                ))}
            </select>
            <p className="text-sm text-gray-500 mt-2">
              Ce montant sera déduit du compte sélectionné
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setSelectedAccount('');
                setError('');
                onClose();
              }}
              className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-primary text-white hover:scale-105 transition-all shadow-lg hover:shadow-pink-custom/50"
            >
              Allouer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AllocateBudgetModal;

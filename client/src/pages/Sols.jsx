import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSols, deleteSol, contributeSol, moveToNextRecipient } from '../store/slices/solSlice';
import { fetchAccounts } from '../store/slices/accountSlice';

function Sols() {
  const dispatch = useDispatch();
  const { sols, loading, error } = useSelector((state) => state.sols);
  const { accounts } = useSelector((state) => state.accounts);

  const [showModal, setShowModal] = useState(false);
  const [editingSol, setEditingSol] = useState(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedSol, setSelectedSol] = useState(null);

  useEffect(() => {
    dispatch(fetchSols());
    dispatch(fetchAccounts());
  }, [dispatch]);

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce sol?')) {
      await dispatch(deleteSol(id));
    }
  };

  const handleContribute = (sol) => {
    setSelectedSol(sol);
    setShowContributeModal(true);
  };

  const handleMoveToNext = async (id) => {
    if (window.confirm('Voulez-vous vraiment passer au bénéficiaire suivant?')) {
      await dispatch(moveToNextRecipient(id));
    }
  };

  const getNextPaymentColor = (nextPaymentDate) => {
    const now = new Date();
    const paymentDate = new Date(nextPaymentDate);
    const diffTime = paymentDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'text-red-600';
    if (diffDays <= 3) return 'text-orange-500';
    return 'text-green-600';
  };

  const getProgressPercentage = (sol) => {
    if (sol.type === 'personal' && sol.targetAmount) {
      return Math.min((sol.totalContributions / sol.targetAmount) * 100, 100);
    }
    return 0;
  };

  const getProgressGradient = (percentage) => {
    if (percentage >= 100) return 'from-green-500 to-green-600';
    if (percentage >= 75) return 'from-green-400 to-blue-500';
    if (percentage >= 50) return 'from-blue-400 to-blue-500';
    return 'from-purple-start to-purple-mid';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-logo bg-clip-text text-transparent">
            Sols
          </h1>
          <p className="text-white/80 mt-2">Gère tes cotisations et tontines</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-gradient-primary text-white font-semibold rounded-xl transition transform hover:scale-105 shadow-lg shadow-pink-custom/50"
        >
          + Nouveau Sol
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && sols.length === 0 ? (
        <div className="text-center text-white py-12">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          Chargement...
        </div>
      ) : (
        <>
          {/* Sols Grid */}
          {sols.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-12 text-center">
              <p className="text-6xl mb-4">🤝</p>
              <p className="text-gray-500 text-lg mb-4">Aucun sol créé</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-purple-start hover:text-purple-mid font-semibold"
              >
                Créer votre premier sol →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sols.map((sol) => (
                <div
                  key={sol._id}
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-lg hover:shadow-xl transition"
                >
                  {/* Sol Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{sol.icon}</span>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{sol.name}</h3>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            sol.type === 'collaborative'
                              ? 'bg-purple-100 text-purple-start'
                              : 'bg-green-100 text-green-600'
                          }`}
                        >
                          {sol.type === 'collaborative' ? 'Collaboratif' : 'Personnel'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingSol(sol);
                          setShowModal(true);
                        }}
                        className="text-purple-start hover:text-purple-mid p-1"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(sol._id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Sol Info */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Montant:</span>
                      <span className="font-bold text-gray-800">
                        {sol.amount.toLocaleString()} {sol.currency}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fréquence:</span>
                      <span className="font-semibold text-gray-800">
                        {sol.frequency === 'weekly' && 'Hebdomadaire'}
                        {sol.frequency === 'monthly' && 'Mensuel'}
                        {sol.frequency === 'yearly' && 'Annuel'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total cotisé:</span>
                      <span className="font-bold text-gray-800">
                        {sol.totalContributions.toLocaleString()} {sol.currency}
                      </span>
                    </div>

                    {/* Personal Sol - Progress Bar */}
                    {sol.type === 'personal' && sol.targetAmount && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Objectif</span>
                          <span>{getProgressPercentage(sol).toFixed(0)}%</span>
                        </div>
                        <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getProgressGradient(getProgressPercentage(sol))} transition-all duration-500`}
                            style={{ width: `${getProgressPercentage(sol)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-1 text-right">
                          {sol.totalContributions.toLocaleString()} / {sol.targetAmount.toLocaleString()} {sol.currency}
                        </div>
                      </div>
                    )}

                    {/* Collaborative Sol - Members and Recipient */}
                    {sol.type === 'collaborative' && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Membres:</span>
                          <span className="font-semibold text-gray-800">
                            {sol.members?.length || 0}
                          </span>
                        </div>
                        {sol.currentRecipient && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Bénéficiaire actuel:</span>
                            <span className="font-semibold text-purple-start">
                              {sol.currentRecipient.name || 'N/A'}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Next Payment Date */}
                    {sol.nextPaymentDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Prochain paiement:</span>
                        <span className={`font-bold ${getNextPaymentColor(sol.nextPaymentDate)}`}>
                          {new Date(sol.nextPaymentDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleContribute(sol)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg hover:scale-105 transition-all font-semibold"
                    >
                      Cotiser
                    </button>
                    {sol.type === 'collaborative' && (
                      <button
                        onClick={() => handleMoveToNext(sol._id)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-lg hover:scale-105 transition-all font-semibold"
                      >
                        Suivant
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals - Placeholders */}
      {/* {showModal && <SolFormModal ... />} */}
      {/* {showContributeModal && <ContributeSolModal ... />} */}
    </div>
  );
}

export default Sols;

import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Rise 💰</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Bonjour, {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenue sur Rise, {user?.name} !
          </h2>
          <p className="text-gray-600">
            Votre devise préférée : {user?.preferredCurrency === 'HTG' ? 'Gourde (HTG)' : 'Dollar (USD)'}
          </p>
        </div>

        {/* Quick stats placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Solde Total"
            value="--"
            subtitle="Ajoutez vos comptes"
            icon="💰"
          />
          <StatCard
            title="Dépenses du mois"
            value="--"
            subtitle="Aucune transaction"
            icon="📉"
          />
          <StatCard
            title="Revenus du mois"
            value="--"
            subtitle="Aucune transaction"
            icon="📈"
          />
        </div>

        {/* Modules coming soon */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Modules à venir</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ModuleCard icon="💳" title="Comptes" status="En cours" />
          <ModuleCard icon="💸" title="Transactions" status="À venir" />
          <ModuleCard icon="💰" title="Sol/Tontine" status="À venir" />
          <ModuleCard icon="📊" title="Budget" status="À venir" />
          <ModuleCard icon="💵" title="Dettes" status="À venir" />
          <ModuleCard icon="🐷" title="Investissements" status="À venir" />
          <ModuleCard icon="🎯" title="Épargne" status="À venir" />
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{icon}</span>
      </div>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function ModuleCard({ icon, title, status }) {
  const statusColors = {
    'En cours': 'bg-blue-100 text-blue-700',
    'À venir': 'bg-gray-100 text-gray-600',
    'Terminé': 'bg-green-100 text-green-700',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[status]}`}>
          {status}
        </span>
      </div>
    </div>
  );
}

export default Dashboard;

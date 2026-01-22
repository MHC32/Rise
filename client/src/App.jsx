import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <Accounts />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Home component
function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Rise 💰
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Gestion Financière Personnelle
        </p>
        <div className="space-x-4">
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Connexion
          </Link>
          <Link
            to="/register"
            className="inline-block px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition"
          >
            Inscription
          </Link>
        </div>
      </div>

      {/* Features preview */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        <FeatureCard
          icon="💳"
          title="Transactions"
          description="Suivez vos dépenses et revenus"
        />
        <FeatureCard
          icon="💰"
          title="Sol/Tontine"
          description="Gérez vos sols entre amis"
        />
        <FeatureCard
          icon="📊"
          title="Budget"
          description="Contrôlez vos finances"
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

export default App;

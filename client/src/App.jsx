import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './store/store';
import { loadUser } from './store/slices/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Sols from './pages/Sols';
import Layout from './components/Layout';

// App initializer component
function AppInitializer({ children }) {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      dispatch(loadUser());
    }
  }, [dispatch, token]);

  return children;
}

function AppRoutes() {
  return (
    <Router>
      <AppInitializer>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes with Layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <Layout>
                  <Accounts />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Layout>
                  <Transactions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/budgets"
            element={
              <ProtectedRoute>
                <Layout>
                  <Budgets />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sols"
            element={
              <ProtectedRoute>
                <Layout>
                  <Sols />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AppInitializer>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppRoutes />
    </Provider>
  );
}

// Home component with wireframe design
function Home() {
  return (
    <div className="min-h-screen bg-gradient-main flex items-center justify-center p-4">
      <div className="text-center">
        {/* Logo */}
        <h1 className="text-6xl font-bold mb-4 bg-gradient-logo bg-clip-text text-transparent animate-pulse">
          Rise
        </h1>
        <p className="text-white/90 text-lg mb-8">
          Ta finance, ton style
        </p>

        {/* Auth Buttons */}
        <div className="space-x-4">
          <Link
            to="/login"
            className="inline-block px-8 py-4 bg-gradient-primary text-white rounded-2xl font-semibold hover:scale-105 transition shadow-lg shadow-pink-custom/50"
          >
            Connexion
          </Link>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white rounded-2xl font-semibold hover:bg-white/30 transition"
          >
            Inscription
          </Link>
        </div>

        {/* Features preview */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <FeatureCard
            icon="💳"
            title="Comptes"
            description="Gère tous tes comptes en un seul endroit"
          />
          <FeatureCard
            icon="📊"
            title="Transactions"
            description="Suis tes dépenses et revenus"
          />
          <FeatureCard
            icon="🤝"
            title="Sol/Tontine"
            description="Gère tes cotisations"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/70 text-sm">{description}</p>
    </div>
  );
}

export default App;

import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';

const navSections = [
  {
    title: 'Principal',
    items: [
      { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
      { path: '/accounts', icon: '💳', label: 'Comptes' },
      { path: '/transactions', icon: '📊', label: 'Transactions' },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { path: '/budgets', icon: '🎯', label: 'Budgets' },
      { path: '/epargne', icon: '💰', label: 'Épargne', disabled: true },
      { path: '/investissements', icon: '💼', label: 'Investissements', disabled: true },
    ],
  },
  {
    title: 'Communauté',
    items: [
      { path: '/sols', icon: '🤝', label: 'Sols' },
      { path: '/dettes', icon: '💸', label: 'Dettes', disabled: true },
    ],
  },
  {
    title: 'Autre',
    items: [
      { path: '/notifications', icon: '🔔', label: 'Notifications', disabled: true },
      { path: '/parametres', icon: '⚙️', label: 'Paramètres', disabled: true },
    ],
  },
];

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-main">
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-5 left-5 z-50 w-12 h-12 bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-xl flex flex-col items-center justify-center gap-1.5 transition hover:bg-white/30"
      >
        <span className={`w-6 h-0.5 bg-white rounded transition-transform ${sidebarOpen ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`w-6 h-0.5 bg-white rounded transition-opacity ${sidebarOpen ? 'opacity-0' : ''}`} />
        <span className={`w-6 h-0.5 bg-white rounded transition-transform ${sidebarOpen ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed lg:relative lg:translate-x-0 z-40 w-72 h-screen bg-white/10 backdrop-blur-xl border-r-2 border-white/20 p-6 flex flex-col gap-8 overflow-y-auto transition-transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Logo */}
          <div className="text-center">
            <h1 className="text-5xl font-bold bg-gradient-logo bg-clip-text text-transparent">
              Rise
            </h1>
            <p className="text-white/70 text-sm mt-1">Ta finance, ton style</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1">
            {navSections.map((section) => (
              <div key={section.title} className="mb-6">
                <p className="text-white/50 text-xs uppercase tracking-wider mb-3 px-4 font-semibold">
                  {section.title}
                </p>
                {section.items.map((item) =>
                  item.disabled ? (
                    <div
                      key={item.path}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 mb-1 cursor-not-allowed"
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                      <span className="ml-auto text-xs bg-white/10 px-2 py-0.5 rounded-full">Bientôt</span>
                    </div>
                  ) : (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl text-white/90 mb-1 transition hover:bg-white/15 hover:translate-x-1 ${
                          isActive ? 'bg-white/25 shadow-lg shadow-white/10' : ''
                        }`
                      }
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </NavLink>
                  )
                )}
              </div>
            ))}
          </nav>

          {/* User Section */}
          <div className="border-t border-white/20 pt-4">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user?.name || 'Utilisateur'}</p>
                <p className="text-white/50 text-xs truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition text-left flex items-center gap-2"
            >
              <span>🚪</span>
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;

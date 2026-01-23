import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAccounts } from '../store/slices/accountSlice';
import { fetchTransactions } from '../store/slices/transactionSlice';

function Dashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { accounts, totals } = useSelector((state) => state.accounts);
  const { transactions, stats } = useSelector((state) => state.transactions);

  useEffect(() => {
    dispatch(fetchAccounts());
    dispatch(fetchTransactions({ limit: 5 }));
  }, [dispatch]);

  const recentTransactions = transactions.slice(0, 4);

  return (
    <div>
      {/* Header */}
      <header className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Mascot */}
          <svg className="w-28 h-28 hidden sm:block" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="60" fill="#f093fb"/>
            <circle cx="80" cy="85" r="8" fill="#fff"/>
            <circle cx="120" cy="85" r="8" fill="#fff"/>
            <circle cx="82" cy="87" r="4" fill="#1e293b"/>
            <circle cx="118" cy="87" r="4" fill="#1e293b"/>
            <ellipse cx="100" cy="105" rx="12" ry="8" fill="#fff" opacity="0.7"/>
            <circle cx="95" cy="105" r="3" fill="#f5576c"/>
            <circle cx="105" cy="105" r="3" fill="#f5576c"/>
            <circle cx="70" cy="75" r="15" fill="#f093fb"/>
            <circle cx="130" cy="75" r="15" fill="#f093fb"/>
            <path d="M 90 115 Q 100 125 110 115" stroke="#f5576c" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <rect x="95" y="60" width="10" height="20" rx="5" fill="#ffd876"/>
            <circle cx="100" cy="55" r="6" fill="#ffd876"/>
          </svg>

          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Salut {user?.name}!
            </h1>
            <p className="text-white/80 mt-1">Voici ton résumé financier du jour</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="w-12 h-12 bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-xl flex items-center justify-center text-xl hover:bg-white/30 transition">
            🔔
          </button>
          <Link
            to="/transactions"
            className="px-6 py-3 bg-gradient-to-r from-pink-400 to-red-400 text-white rounded-2xl font-semibold hover:scale-105 transition shadow-lg shadow-pink-custom/50"
          >
            + Nouvelle transaction
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon="💰"
          iconBg="bg-gradient-to-br from-purple-start to-purple-mid"
          label="Solde Total HTG"
          value={`${totals.HTG.toLocaleString()} HTG`}
          change={`$${totals.USD.toLocaleString()} USD`}
        />
        <StatCard
          icon="📈"
          iconBg="bg-gradient-to-br from-pink-400 to-red-400"
          label="Revenus ce mois"
          value={`+${(stats?.totalIncome || 0).toLocaleString()} HTG`}
          change="Ce mois"
          positive
        />
        <StatCard
          icon="📉"
          iconBg="bg-gradient-to-br from-yellow-400 to-pink-400"
          label="Dépenses ce mois"
          value={`-${(stats?.totalExpense || 0).toLocaleString()} HTG`}
          change="Ce mois"
        />
        <StatCard
          icon="💳"
          iconBg="bg-gradient-to-br from-green-400 to-blue-500"
          label="Comptes Actifs"
          value={accounts.length}
          change="comptes"
        />
      </div>

      {/* Mes Comptes */}
      <Section title="Mes Comptes" action="Voir tout →" actionLink="/accounts">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {accounts.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-400">
              <p className="mb-4">Aucun compte créé</p>
              <Link to="/accounts" className="text-purple-start font-semibold hover:text-purple-mid">
                Créer votre premier compte →
              </Link>
            </div>
          ) : (
            accounts.slice(0, 4).map((account) => (
              <CompteCard key={account._id} account={account} />
            ))
          )}
        </div>
      </Section>

      {/* Transactions Récentes */}
      <Section title="Transactions Récentes" action="Voir toutes →" actionLink="/transactions">
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="mb-4">Aucune transaction</p>
            <Link to="/transactions" className="text-purple-start font-semibold hover:text-purple-mid">
              Ajouter une transaction →
            </Link>
          </div>
        ) : (
          recentTransactions.map((transaction) => (
            <TransactionItem key={transaction._id} transaction={transaction} />
          ))
        )}
      </Section>

      {/* Quick Actions */}
      <Section title="Modules">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ModuleCard icon="💳" title="Comptes" status="Disponible" href="/accounts" />
          <ModuleCard icon="📊" title="Transactions" status="Disponible" href="/transactions" />
          <ModuleCard icon="🎯" title="Budgets" status="Bientôt" />
          <ModuleCard icon="💰" title="Épargne" status="Bientôt" />
          <ModuleCard icon="💼" title="Investissements" status="Bientôt" />
          <ModuleCard icon="🤝" title="Sols" status="Bientôt" />
          <ModuleCard icon="💸" title="Dettes" status="Bientôt" />
        </div>
      </Section>
    </div>
  );
}

function StatCard({ icon, iconBg, label, value, change, positive }) {
  return (
    <div className="bg-white/95 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition">
      <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center text-2xl mb-4`}>
        {icon}
      </div>
      <p className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-gray-800 mb-2">{value}</p>
      <span className={`text-sm font-semibold ${positive ? 'text-green-500' : 'text-gray-400'}`}>
        {change}
      </span>
    </div>
  );
}

function Section({ title, action, actionLink, children }) {
  return (
    <section className="bg-white/95 rounded-3xl p-6 sm:p-8 shadow-lg mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-purple-start to-purple-mid bg-clip-text text-transparent">
          {title}
        </h2>
        {action && actionLink && (
          <Link to={actionLink} className="text-purple-start font-semibold hover:text-purple-mid transition">
            {action}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function CompteCard({ account }) {
  const typeIcons = {
    bank: '🏦',
    mobile_money: '📱',
    cash: '💵',
  };

  return (
    <div
      className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200/50 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg transition"
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{account.icon || typeIcons[account.type]}</span>
        <span className="font-bold text-gray-800">{account.name}</span>
      </div>
      <p className="text-2xl font-extrabold bg-gradient-to-r from-purple-start to-pink-custom bg-clip-text text-transparent">
        {account.currency === 'USD' ? '$' : ''}
        {account.balance.toLocaleString()}
        {account.currency === 'HTG' ? ' HTG' : ''}
      </p>
    </div>
  );
}

function TransactionItem({ transaction }) {
  const isExpense = transaction.type === 'expense';
  const isIncome = transaction.type === 'income';

  const categoryIcons = {
    nourriture: '🍔',
    transport: '🚗',
    salaire: '💼',
    freelance: '💻',
    famille: '👨‍👩‍👧',
    loisirs: '🎮',
    sante: '🏥',
    loyer: '🏠',
    autre: '📦',
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-purple-50 transition mb-3">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
          isIncome
            ? 'bg-gradient-to-br from-green-400 to-blue-500'
            : 'bg-gradient-to-br from-pink-400 to-red-400'
        }`}
      >
        {categoryIcons[transaction.category] || '📦'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 truncate">
          {transaction.description || transaction.category}
        </p>
        <p className="text-sm text-gray-400">{formatDate(transaction.date)}</p>
      </div>
      <p
        className={`text-lg font-bold ${
          isExpense ? 'text-red-500' : isIncome ? 'text-green-500' : 'text-purple-start'
        }`}
      >
        {isExpense ? '-' : isIncome ? '+' : ''}
        {transaction.amount.toLocaleString()} {transaction.currency}
      </p>
    </div>
  );
}

function ModuleCard({ icon, title, status, href }) {
  const statusColors = {
    Disponible: 'bg-green-100 text-green-700',
    Bientôt: 'bg-gray-100 text-gray-500',
  };

  const content = (
    <>
      <span className="text-3xl">{icon}</span>
      <div className="flex-1">
        <h4 className="font-bold text-gray-800">{title}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[status]}`}>
          {status}
        </span>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="bg-white rounded-xl border-2 border-gray-100 p-4 flex items-center gap-4 hover:border-purple-300 hover:shadow-md transition"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-100 p-4 flex items-center gap-4 opacity-60">
      {content}
    </div>
  );
}

export default Dashboard;

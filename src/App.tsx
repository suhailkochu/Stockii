import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, TenancyProvider, useTenancy } from './contexts';
import { LayoutDashboard, Package, ShoppingCart, Users, Truck, Settings, LogOut, Menu, X, History, Plus, FileText, RotateCcw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Pages
import ItemsPage from './pages/ItemsPage';
import TransactionsPage from './pages/TransactionsPage';
import SettingsPage from './pages/SettingsPage';
import { CreatePurchasePage } from './pages/CreatePurchasePage';
import { CreateSalePage } from './pages/CreateSalePage';
import SalesPage from './pages/SalesPage';
import CustomersPage from './pages/CustomersPage';
import { Dashboard } from './pages/Dashboard';
import { InvoicePage } from './pages/InvoicePage';
import { ReportsPage } from './pages/ReportsPage';
import TrucksPage from './pages/TrucksPage';
import TruckStockPage from './pages/TruckStockPage';
import ReturnsPage from './pages/ReturnsPage';
import DamagesPage from './pages/DamagesPage';

function LoginScreen() {
  const { login } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
            <Package className="text-white w-10 h-10" />
          </div>
        </div>
        <div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900">Stockii</h2>
          <p className="mt-2 text-sm text-zinc-600 italic font-serif">Brutally practical distribution management.</p>
        </div>
        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-zinc-300 rounded-xl text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 transition-colors shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, to, active }: { icon: any, label: string, to: string, active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        active 
          ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' 
          : 'text-zinc-600 hover:bg-zinc-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { currentOrg, orgs, switchOrg } = useTenancy();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-zinc-200 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Package className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-zinc-900">Stockii</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-zinc-600">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-zinc-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-4">
          <div className="hidden md:flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
              <Package className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-zinc-900 leading-none">Stockii</h1>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">v1.0.0</span>
            </div>
          </div>

          <div className="flex-1 space-y-1">
            <NavItem icon={LayoutDashboard} label="Dashboard" to="/" active={isActive('/')} />
            <NavItem icon={Package} label="Inventory" to="/items" active={isActive('/items')} />
            <NavItem icon={History} label="Transactions" to="/transactions" active={isActive('/transactions')} />
            <NavItem icon={ShoppingCart} label="Sales" to="/sales" active={isActive('/sales')} />
            <NavItem icon={Users} label="Customers" to="/customers" active={isActive('/customers')} />
            {currentOrg?.settings?.modules?.truckInventory && (
              <NavItem icon={Truck} label="Trucks" to="/trucks" active={isActive('/trucks')} />
            )}
            {currentOrg?.settings?.modules?.returns && (
              <NavItem icon={RotateCcw} label="Returns" to="/returns" active={isActive('/returns')} />
            )}
            {currentOrg?.settings?.modules?.damages && (
              <NavItem icon={AlertTriangle} label="Damages" to="/damages" active={isActive('/damages')} />
            )}
            <NavItem icon={FileText} label="Reports" to="/reports" active={isActive('/reports')} />
            <NavItem icon={Settings} label="Settings" to="/settings" active={isActive('/settings')} />
          </div>

          <div className="pt-4 border-t border-zinc-100">
            <div className="flex items-center gap-3 px-2 mb-4">
              <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} className="w-8 h-8 rounded-full border border-zinc-200" alt="Avatar" referrerPolicy="no-referrer" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-900 truncate">{user?.displayName}</p>
                <select 
                  value={currentOrg?.id || ''} 
                  onChange={(e) => switchOrg(e.target.value)}
                  className="text-xs text-zinc-500 bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:text-zinc-700 w-full truncate"
                >
                  {orgs.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                  {orgs.length === 0 && <option value="">No Org Selected</option>}
                </select>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MainContent() {
  const { user, loading } = useAuth();
  const { currentOrg, createOrganization } = useTenancy();
  const [orgName, setOrgName] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // If no org is selected, show a simple "Setup" screen
  if (!currentOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 text-center space-y-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <Package className="text-orange-500 w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Welcome to Stockii</h2>
            <p className="text-sm text-zinc-500 mt-2">You haven't joined an organization yet. Create your workspace to get started.</p>
          </div>
          
          <div className="space-y-4">
            <div className="text-left">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Organization Name</label>
              <input 
                type="text" 
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Distribution"
                className="w-full mt-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
            <button 
              className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!orgName.trim() || isCreating}
              onClick={async () => {
                setIsCreating(true);
                try {
                  await createOrganization(orgName);
                } catch (error) {
                  console.error(error);
                  alert('Failed to create organization.');
                } finally {
                  setIsCreating(false);
                }
              }}
            >
              {isCreating ? 'Creating...' : 'Create Organization'}
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-100">
            <button onClick={() => window.location.reload()} className="text-xs text-zinc-400 hover:text-zinc-600">Refresh Account</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/items" element={<ItemsPage />} />
        <Route path="/purchases/new" element={<CreatePurchasePage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/sales/new" element={<CreateSalePage />} />
        <Route path="/sales/:id/invoice" element={<InvoicePage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/trucks" element={<TrucksPage />} />
        <Route path="/trucks/:id/stock" element={<TruckStockPage />} />
        <Route path="/returns" element={<ReturnsPage />} />
        <Route path="/damages" element={<DamagesPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenancyProvider>
          <MainContent />
        </TenancyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

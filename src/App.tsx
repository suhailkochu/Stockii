import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, TenancyProvider, useTenancy } from './contexts';
import { NotificationProvider, useNotifications } from './notifications';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Settings,
  LogOut,
  Menu,
  X,
  History,
  Plus,
  FileText,
  RotateCcw,
  AlertTriangle,
  MoreHorizontal,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import ItemsPage from './pages/ItemsPage';
import TransactionsPage from './pages/TransactionsPage';
import SettingsPage from './pages/SettingsPage';
import { CreatePurchasePage } from './pages/CreatePurchasePage';
import { CreateSalePage } from './pages/CreateSalePage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import CustomersPage from './pages/CustomersPage';
import { Dashboard } from './pages/Dashboard';
import { InvoicePage } from './pages/InvoicePage';
import { ReportsPage } from './pages/ReportsPage';
import TrucksPage from './pages/TrucksPage';
import TruckStockPage from './pages/TruckStockPage';
import ReturnsPage from './pages/ReturnsPage';
import DamagesPage from './pages/DamagesPage';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type NavEntry = {
  icon: React.ComponentType<any>;
  label: string;
  to: string;
  mobilePrimary?: boolean;
  requires?: 'truckInventory' | 'returns' | 'damages';
};

const navEntries: NavEntry[] = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/', mobilePrimary: true },
  { icon: Package, label: 'Inventory', to: '/items', mobilePrimary: true },
  { icon: Plus, label: 'Purchases', to: '/purchases', mobilePrimary: true },
  { icon: ShoppingCart, label: 'Sales', to: '/sales', mobilePrimary: true },
  { icon: Users, label: 'Customers', to: '/customers' },
  { icon: History, label: 'Transactions', to: '/transactions' },
  { icon: Truck, label: 'Trucks', to: '/trucks', requires: 'truckInventory' },
  { icon: RotateCcw, label: 'Returns', to: '/returns', requires: 'returns' },
  { icon: AlertTriangle, label: 'Damages', to: '/damages', requires: 'damages' },
  { icon: FileText, label: 'Reports', to: '/reports' },
  { icon: Settings, label: 'Settings', to: '/settings' },
];

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

function NavItem({ icon: Icon, label, to, active }: { key?: React.Key; icon: any; label: string; to: string; active: boolean }) {
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

function MobileFooterNav({
  entries,
  activePath,
  onMore,
}: {
  entries: NavEntry[];
  activePath: string;
  onMore: () => void;
}) {
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {entries.map((entry) => {
          const Icon = entry.icon;
          const active = activePath === entry.to || activePath.startsWith(`${entry.to}/`);
          return (
            <Link
              key={entry.to}
              to={entry.to}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all ${
                active ? 'bg-orange-500 text-white shadow-md shadow-orange-100' : 'text-zinc-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{entry.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all ${
            activePath.startsWith('/transactions') ||
            activePath.startsWith('/customers') ||
            activePath.startsWith('/reports') ||
            activePath.startsWith('/settings') ||
            activePath.startsWith('/trucks') ||
            activePath.startsWith('/returns') ||
            activePath.startsWith('/damages')
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-600'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </div>
    </div>
  );
}

function MoreSheet({
  open,
  onClose,
  entries,
  activePath,
  onInstall,
  canInstall,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  entries: NavEntry[];
  activePath: string;
  onInstall: () => void;
  canInstall: boolean;
  onLogout: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 z-50 bg-zinc-900/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="md:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white border-t border-zinc-200 px-5 pb-8 pt-4 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-zinc-200" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">More Options</h3>
                <p className="text-sm text-zinc-500">Everything else you may need on the go.</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-zinc-100">
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {entries.map((entry) => {
                const Icon = entry.icon;
                const active = activePath === entry.to || activePath.startsWith(`${entry.to}/`);
                return (
                  <Link
                    key={entry.to}
                    to={entry.to}
                    onClick={onClose}
                    className={`rounded-2xl border px-4 py-4 transition-all ${
                      active ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white text-zinc-700'
                    }`}
                  >
                    <Icon className="mb-2 h-5 w-5" />
                    <p className="text-sm font-semibold">{entry.label}</p>
                  </Link>
                );
              })}
              {canInstall && (
                <button
                  type="button"
                  onClick={() => {
                    onInstall();
                    onClose();
                  }}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-left text-zinc-700 transition-all"
                >
                  <Download className="mb-2 h-5 w-5" />
                  <p className="text-sm font-semibold">Install App</p>
                </button>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-left text-red-700 transition-all"
              >
                <LogOut className="mb-2 h-5 w-5" />
                <p className="text-sm font-semibold">Logout</p>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function InstallPromptCard({
  visible,
  onInstall,
  onDismiss,
}: {
  visible: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="md:hidden fixed left-4 right-4 bottom-24 z-40 rounded-3xl border border-orange-200 bg-white p-4 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-900">Install Stockii</p>
              <p className="text-sm text-zinc-600">Add it to your home screen for a smoother, app-like experience.</p>
              <div className="mt-3 flex gap-2">
                <button onClick={onInstall} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
                  Install
                </button>
                <button onClick={onDismiss} className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700">
                  Later
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { currentOrg, orgs, switchOrg } = useTenancy();
  const { info } = useNotifications();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = React.useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const availableNavEntries = React.useMemo(() => {
    return navEntries.filter((entry) => {
      if (!entry.requires) return true;
      return Boolean(currentOrg?.settings?.modules?.[entry.requires]);
    });
  }, [currentOrg]);

  const mobilePrimaryEntries = availableNavEntries.filter((entry) => entry.mobilePrimary).slice(0, 4);
  const moreEntries = availableNavEntries.filter((entry) => !entry.mobilePrimary);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      setShowInstallPrompt(true);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setShowInstallPrompt(false);
      info('Stockii installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [info]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans">
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Package className="text-white w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-zinc-900 block leading-none">Stockii</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-400">bulk operations</span>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-zinc-600">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-zinc-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
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
            {availableNavEntries.map((entry) => (
              <NavItem key={entry.to} icon={entry.icon} label={entry.label} to={entry.to} active={isActive(entry.to)} />
            ))}
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

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-8 pb-28 md:pb-8">
          {children}
        </div>
      </main>

      <InstallPromptCard
        visible={showInstallPrompt && Boolean(installPrompt)}
        onInstall={handleInstall}
        onDismiss={() => setShowInstallPrompt(false)}
      />

      <MobileFooterNav entries={mobilePrimaryEntries} activePath={location.pathname} onMore={() => setIsMoreOpen(true)} />
      <MoreSheet
        open={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        entries={moreEntries}
        activePath={location.pathname}
        onInstall={handleInstall}
        canInstall={Boolean(installPrompt)}
        onLogout={logout}
      />

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
  const { error: notifyError } = useNotifications();
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
                  notifyError('Failed to create organization.');
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
        <Route path="/purchases" element={<PurchasesPage />} />
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
      <NotificationProvider>
        <AuthProvider>
          <TenancyProvider>
            <MainContent />
          </TenancyProvider>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

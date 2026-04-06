import React, { useEffect, useState } from 'react';
import { useTenancy } from '../contexts';
import { useAuth } from '../contexts';
import { inventoryService } from '../services/inventoryService';
import { saleService } from '../services/saleService';
import { purchaseService } from '../services/purchaseService';
import { Item, InventoryTransaction, Sale, Purchase, Customer, Supplier } from '../types';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users, 
  Truck,
  ChevronRight,
  Clock,
  Plus,
  ShoppingCart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, startOfDay, endOfDay, startOfMonth, isWithinInterval } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { currentOrg, membership } = useTenancy();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentOrg) return;
      try {
        const [allItems, allTrans, allCusts, allSupps] = await Promise.all([
          inventoryService.getItems(currentOrg.id),
          inventoryService.getTransactions(currentOrg.id),
          saleService.getCustomers(currentOrg.id),
          purchaseService.getSuppliers(currentOrg.id)
        ]);
        setItems(allItems);
        setTransactions(allTrans);
        setCustomers(allCusts);
        setSuppliers(allSupps);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentOrg]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculations
  const now = new Date();
  const todaySales = transactions
    .filter(t => t.type === 'SALE_OUT' && isWithinInterval(t.timestamp, { start: startOfDay(now), end: endOfDay(now) }))
    .reduce((sum, t) => sum + (t.unitSellPrice || 0) * t.quantity, 0);

  const monthSales = transactions
    .filter(t => t.type === 'SALE_OUT' && isWithinInterval(t.timestamp, { start: startOfMonth(now), end: endOfDay(now) }))
    .reduce((sum, t) => sum + (t.unitSellPrice || 0) * t.quantity, 0);

  const lowStockItems = items.filter(i => i.currentStock <= i.reorderThreshold);
  const totalReceivables = customers.reduce((sum, c) => sum + c.balance, 0);
  const totalPayables = suppliers.reduce((sum, s) => sum + s.balance, 0);
  const stockValue = items.reduce((sum, i) => sum + i.currentStock * i.basePrice, 0);

  const renderOwnerDashboard = () => (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Sales" value={todaySales.toFixed(2)} trend="+12%" icon={TrendingUp} color="blue" />
        <StatCard label="Receivables" value={totalReceivables.toFixed(2)} icon={ArrowDownLeft} color="orange" />
        <StatCard label="Payables" value={totalPayables.toFixed(2)} icon={ArrowUpRight} color="red" />
        <StatCard label="Stock Value" value={stockValue.toFixed(2)} icon={Package} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-bold text-zinc-900">Recent Activity</h3>
            <Link to="/transactions" className="text-xs font-medium text-orange-600 hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {transactions.slice(0, 5).map((t) => {
              const item = items.find(i => i.id === t.itemId);
              return (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      t.type === 'SALE_OUT' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {t.type === 'SALE_OUT' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{item?.name}</p>
                      <p className="text-xs text-zinc-500 font-mono uppercase">{t.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${t.type === 'SALE_OUT' ? 'text-green-600' : 'text-blue-600'}`}>
                      {t.type === 'SALE_OUT' ? '-' : '+'}{t.quantity} {item?.unit}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono uppercase">{format(t.timestamp, 'HH:mm')}</p>
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <div className="p-12 text-center text-zinc-400 italic">No recent activity.</div>
            )}
          </div>
        </div>

        {/* Alerts & Quick Actions */}
        <div className="space-y-8">
          {/* Alerts */}
          {lowStockItems.length > 0 && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-red-700 font-bold mb-3">
                <AlertTriangle className="w-5 h-5" />
                <span>Low Stock Alerts</span>
              </div>
              <div className="space-y-2">
                {lowStockItems.slice(0, 3).map(item => (
                  <div key={item.id} className="flex justify-between text-xs text-red-600 font-medium">
                    <span>{item.name}</span>
                    <span>{item.currentStock} left</span>
                  </div>
                ))}
                {lowStockItems.length > 3 && (
                  <Link to="/items" className="block text-[10px] text-red-400 hover:underline">+{lowStockItems.length - 3} more items</Link>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100">
              <h3 className="font-bold text-zinc-900">Quick Actions</h3>
            </div>
            <div className="p-4 space-y-2">
              <QuickActionLink to="/sales/new" icon={ShoppingCart} label="New Sale" desc="Create customer invoice" color="orange" />
              <QuickActionLink to="/purchases/new" icon={Package} label="Receive Stock" desc="Add inventory from supplier" color="blue" />
              <QuickActionLink to="/items" icon={Plus} label="Add Item" desc="Register new product" color="zinc" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWarehouseDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Items" value={items.length.toString()} icon={Package} color="blue" />
        <StatCard label="Low Stock" value={lowStockItems.length.toString()} icon={AlertTriangle} color="red" />
        <StatCard label="Recent Movements" value={transactions.length.toString()} icon={Clock} color="zinc" />
      </div>
      {/* Add warehouse specific views here */}
      {renderOwnerDashboard()} {/* Fallback for now */}
    </div>
  );

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Dashboard</h2>
        <p className="text-zinc-500 font-serif italic">
          {membership?.role === 'owner' ? "Here's your business at a glance." : "Your daily operations summary."}
        </p>
      </header>

      {membership?.role === 'owner' || membership?.role === 'admin' ? renderOwnerDashboard() : renderWarehouseDashboard()}
    </div>
  );
};

const StatCard = ({ label, value, trend, icon: Icon, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-500 text-blue-600 bg-blue-50',
    orange: 'bg-orange-500 text-orange-600 bg-orange-50',
    red: 'bg-red-500 text-red-600 bg-red-50',
    purple: 'bg-purple-500 text-purple-600 bg-purple-50',
    zinc: 'bg-zinc-500 text-zinc-600 bg-zinc-50',
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-xl ${colors[color].split(' ')[2]} ${colors[color].split(' ')[1]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && <span className="text-xs font-medium text-green-600">{trend}</span>}
      </div>
      <p className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">{label}</p>
      <span className="text-2xl font-bold text-zinc-900">{value}</span>
    </div>
  );
};

const QuickActionLink = ({ to, icon: Icon, label, desc, color }: any) => (
  <Link to={to} className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-all group">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-white transition-colors`}>
        <Icon className={`w-5 h-5 text-zinc-600`} />
      </div>
      <div className="text-left">
        <p className="text-sm font-bold text-zinc-900">{label}</p>
        <p className="text-xs text-zinc-500">{desc}</p>
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-zinc-300" />
  </Link>
);

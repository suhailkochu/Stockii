import React, { useEffect, useState } from 'react';
import { saleService } from '../services/saleService';
import { Sale, Customer } from '../types';
import { Plus, Search, ShoppingCart, Calendar, User, FileText, Filter, Pencil, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useTenancy } from '../contexts';
import { useNotifications } from '../notifications';
import { AnimatePresence, motion } from 'motion/react';
import { formatCurrency } from '../utils/currency';
import { TableDisplayToggle } from '../components/TableDisplayToggle';
import { useOrgTableDisplayMode } from '../hooks/useOrgTableDisplayMode';

export default function SalesPage() {
  const { currentOrg } = useTenancy();
  const { success, error: notifyError } = useNotifications();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { tableDisplayMode, setTableDisplayMode, savingTableDisplayMode } = useOrgTableDisplayMode();

  useEffect(() => {
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [salesData, customersData] = await Promise.all([
        saleService.getSales(currentOrg.id),
        saleService.getCustomers(currentOrg.id)
      ]);
      setSales(salesData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown Customer';

  const filteredSales = sales.filter(sale =>
    getCustomerName(sale.customerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setPaidAmount(sale.paidAmount);
    setPaymentType(sale.paymentType);
    setNotes(sale.notes || '');
  };

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !editingSale) return;

    setSaving(true);
    try {
      await saleService.updateSale(currentOrg.id, editingSale.id, {
        paidAmount,
        paymentType,
        notes,
      });
      setEditingSale(null);
      await loadData();
      success('Sale updated successfully');
    } catch (error: any) {
      console.error(error);
      notifyError(error.message || 'Failed to update sale');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading sales...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Sales</h2>
          <p className="text-sm text-zinc-500">Track and manage your customer orders.</p>
        </div>
        <Link
          to="/sales/new"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-medium shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Sale
        </Link>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by customer or order ID..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-all">
          <Filter className="w-4 h-4" />
          Filters
        </button>
        <TableDisplayToggle
          value={tableDisplayMode}
          onChange={setTableDisplayMode}
          disabled={savingTableDisplayMode}
        />
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        {tableDisplayMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Order ID</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Customer</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Date</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-right">Total</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-center">Payment</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    No sales found.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                          <ShoppingCart className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-mono font-bold text-zinc-500">#{sale.id.slice(-6).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-900">{getCustomerName(sale.customerId)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Calendar className="w-4 h-4" />
                        {format(sale.timestamp, 'MMM dd, yyyy HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-zinc-900">{formatCurrency(sale.totalAmount, currentOrg?.settings.currency)}</p>
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tight">
                        Paid {formatCurrency(sale.paidAmount, currentOrg?.settings.currency)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        sale.paymentType === 'cash' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {sale.paymentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(sale)}
                          className="p-2 text-zinc-400 hover:text-orange-500 transition-colors inline-block"
                          title="Edit sale"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/sales/${sale.id}/invoice`}
                          className="p-2 text-zinc-400 hover:text-orange-500 transition-colors inline-block"
                          title="View Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filteredSales.length === 0 ? (
              <div className="px-6 py-12 text-center text-zinc-500">No sales found.</div>
            ) : (
              filteredSales.map((sale) => {
                const dueAmount = Math.max(sale.totalAmount - sale.paidAmount, 0);
                return (
                  <div key={sale.id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                          <ShoppingCart className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{getCustomerName(sale.customerId)}</p>
                          <p className="text-xs font-mono font-bold text-zinc-400">#{sale.id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        sale.paymentType === 'cash' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {sale.paymentType}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-zinc-50 p-3">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Date</p>
                        <p className="mt-1 text-sm text-zinc-700">{format(sale.timestamp, 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Total</p>
                        <p className="mt-1 text-sm font-bold text-zinc-900">{formatCurrency(sale.totalAmount, currentOrg?.settings.currency)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Paid</p>
                        <p className="mt-1 text-sm font-bold text-green-600">{formatCurrency(sale.paidAmount, currentOrg?.settings.currency)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Due</p>
                        <p className={`mt-1 text-sm font-bold ${dueAmount > 0 ? 'text-orange-600' : 'text-zinc-400'}`}>
                          {formatCurrency(dueAmount, currentOrg?.settings.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(sale)}
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                      <Link
                        to={`/sales/${sale.id}/invoice`}
                        className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Invoice
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingSale(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Edit Sale</h3>
                  <p className="text-sm text-zinc-500">Update payment received and notes for this order.</p>
                </div>
                <button onClick={() => setEditingSale(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <form onSubmit={handleSaveSale} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Payment Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentType('cash')}
                      className={`flex-1 py-2 rounded-lg border ${paymentType === 'cash' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200'}`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('credit')}
                      className={`flex-1 py-2 rounded-lg border ${paymentType === 'credit' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200'}`}
                    >
                      Credit
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Paid Amount</label>
                  <input
                    type="number"
                    min="0"
                    max={editingSale.totalAmount}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Math.min(Number(e.target.value), editingSale.totalAmount))}
                    className="w-full px-4 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl min-h-24"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Pencil className="w-5 h-5" />}
                  Save Sale Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

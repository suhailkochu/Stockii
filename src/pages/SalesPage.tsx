import React, { useEffect, useState } from 'react';
import { useTenancy, useAuth } from '../contexts';
import { saleService } from '../services/saleService';
import { Sale, Customer } from '../types';
import { Plus, Search, ShoppingCart, Calendar, User, FileText, ArrowRight, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function SalesPage() {
  const { currentOrg } = useTenancy();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesData, customersData] = await Promise.all([
        saleService.getSales(currentOrg!.id),
        saleService.getCustomers(currentOrg!.id)
      ]);
      setSales(salesData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (id: string) => {
    return customers.find(c => c.id === id)?.name || 'Unknown Customer';
  };

  const filteredSales = sales.filter(sale => 
    getCustomerName(sale.customerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      <div className="flex flex-col sm:flex-row gap-4">
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
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Order ID</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Customer</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Date</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-right">Total</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-center">Status</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400"></th>
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
                      <p className="text-sm font-bold text-zinc-900">{currentOrg?.settings.currency} {sale.totalAmount.toFixed(2)}</p>
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tight">{sale.paymentType}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        sale.status === 'completed' ? 'bg-green-100 text-green-700' : 
                        sale.status === 'pending' ? 'bg-orange-100 text-orange-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/sales/${sale.id}/invoice`}
                        className="p-2 text-zinc-400 hover:text-orange-500 transition-colors inline-block"
                        title="View Invoice"
                      >
                        <FileText className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useTenancy } from '../contexts';
import { inventoryService } from '../services/inventoryService';
import { InventoryTransaction, Item, InventoryLocation } from '../types';
import { Search, Filter, ArrowUpRight, ArrowDownLeft, RefreshCw, AlertTriangle, Package } from 'lucide-react';

export default function TransactionsPage() {
  const { currentOrg } = useTenancy();
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
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
      const [txData, itemsData, locsData] = await Promise.all([
        inventoryService.getTransactions(currentOrg!.id),
        inventoryService.getItems(currentOrg!.id),
        inventoryService.getLocations(currentOrg!.id)
      ]);
      setTransactions(txData);
      setItems(itemsData);
      setLocations(locsData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE_IN': return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      case 'SALE_OUT': return <ArrowUpRight className="w-4 h-4 text-blue-500" />;
      case 'TRANSFER': return <RefreshCw className="w-4 h-4 text-purple-500" />;
      case 'DAMAGE_OUT': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Package className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getTxLabel = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  const getSignedQuantity = (tx: InventoryTransaction) => {
    switch (tx.type) {
      case 'SALE_OUT':
      case 'DAMAGE_OUT':
      case 'ADJUSTMENT_OUT':
        return -tx.quantity;
      case 'PURCHASE_IN':
      case 'CUSTOMER_RETURN':
      case 'ADJUSTMENT_IN':
        return tx.quantity;
      default:
        return tx.quantity;
    }
  };

  const getLocationName = (locationId?: string) => {
    if (!locationId) return '-';
    return locations.find(location => location.id === locationId)?.name || 'Unknown Location';
  };

  const filteredTransactions = transactions.filter(tx => {
    const item = items.find(entry => entry.id === tx.itemId);
    const haystack = [
      tx.type,
      tx.referenceId || '',
      tx.notes || '',
      item?.name || '',
      item?.sku || '',
      getLocationName(tx.sourceLocationId),
      getLocationName(tx.destinationLocationId),
    ].join(' ').toLowerCase();

    return haystack.includes(searchTerm.toLowerCase());
  });

  if (loading) return <div className="p-8 text-center">Loading transactions...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Inventory Ledger</h2>
          <p className="text-sm text-zinc-500">Audit trail of all stock movements.</p>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by item, reference, notes, or location..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-600">
          <Filter className="w-4 h-4" />
          {filteredTransactions.length} entries
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Time</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Type</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Item</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-right">Quantity</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Locations</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const item = items.find(i => i.id === tx.itemId);
                  const signedQuantity = getSignedQuantity(tx);
                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs text-zinc-500 font-mono">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                            {getTxIcon(tx.type)}
                          </div>
                          <span className="text-xs font-bold uppercase tracking-tight text-zinc-700">
                            {getTxLabel(tx.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-zinc-900">{item?.name || 'Unknown Item'}</p>
                        <p className="text-xs text-zinc-500 font-mono">{item?.sku || 'NO-SKU'}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-bold ${signedQuantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {signedQuantity >= 0 ? '+' : ''}{signedQuantity} {item?.unit || ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-500">
                        <p>From: {getLocationName(tx.sourceLocationId)}</p>
                        <p>To: {getLocationName(tx.destinationLocationId)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-zinc-500 font-mono">{tx.referenceId || '-'}</p>
                        {tx.notes && <p className="text-[10px] text-zinc-400 italic">{tx.notes}</p>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

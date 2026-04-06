import React, { useEffect, useState } from 'react';
import { useAuth, useTenancy } from '../contexts';
import { inventoryService } from '../services/inventoryService';
import { InventoryTransaction, Item, InventoryLocation } from '../types';
import { Search, Filter, ArrowUpRight, ArrowDownLeft, RefreshCw, AlertTriangle, Package } from 'lucide-react';

export default function TransactionsPage() {
  const { currentOrg } = useTenancy();
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="p-8 text-center">Loading transactions...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Inventory Ledger</h2>
          <p className="text-sm text-zinc-500">Audit trail of all stock movements.</p>
        </div>
      </header>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Time</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Type</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Item</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-right">Quantity</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const item = items.find(i => i.id === tx.itemId);
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
                        <span className={`text-sm font-bold ${tx.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.quantity > 0 ? '+' : ''}{tx.quantity} {item?.unit || ''}
                        </span>
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

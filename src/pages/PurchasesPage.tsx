import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Search, PackagePlus, MapPin, Building2 } from 'lucide-react';
import { useTenancy } from '../contexts';
import { purchaseService } from '../services/purchaseService';
import { inventoryService } from '../services/inventoryService';
import { Purchase, Supplier, InventoryLocation } from '../types';

export default function PurchasesPage() {
  const { currentOrg } = useTenancy();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [purchaseData, supplierData, locationData] = await Promise.all([
        purchaseService.getPurchases(currentOrg.id),
        purchaseService.getSuppliers(currentOrg.id),
        inventoryService.getLocations(currentOrg.id),
      ]);
      setPurchases(purchaseData);
      setSuppliers(supplierData);
      setLocations(locationData);
    } finally {
      setLoading(false);
    }
  };

  const getSupplierName = (supplierId: string) => suppliers.find(supplier => supplier.id === supplierId)?.name || 'Unknown Supplier';
  const getLocationName = (locationId: string) => locations.find(location => location.id === locationId)?.name || 'Unknown Location';

  const filteredPurchases = purchases.filter(purchase =>
    getSupplierName(purchase.supplierId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getLocationName(purchase.locationId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Loading purchases...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Purchases</h2>
          <p className="text-sm text-zinc-500">Receive stock from suppliers and track incoming inventory.</p>
        </div>
        <Link
          to="/purchases/new"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-medium shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Purchase
        </Link>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by supplier, location, or purchase ID..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Receipt</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Supplier</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Destination</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Date</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No purchases recorded yet.</td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <PackagePlus className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-mono font-bold text-zinc-500">#{purchase.id.slice(-6).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900">{getSupplierName(purchase.supplierId)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <MapPin className="w-4 h-4 text-zinc-400" />
                        {getLocationName(purchase.locationId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">{format(purchase.timestamp, 'MMM dd, yyyy HH:mm')}</td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-zinc-900">{currentOrg?.settings.currency} {purchase.totalAmount.toFixed(2)}</p>
                      <p className="text-[10px] uppercase font-bold tracking-tight text-zinc-400">{purchase.paymentType}</p>
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

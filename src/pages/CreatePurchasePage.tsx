import React, { useState, useEffect } from 'react';
import { useTenancy } from '../contexts';
import { useAuth } from '../contexts';
import { purchaseService } from '../services/purchaseService';
import { inventoryService } from '../services/inventoryService';
import { Supplier, Item, PurchaseLine, InventoryLocation } from '../types';
import { Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export const CreatePurchasePage: React.FC = () => {
  const { currentOrg } = useTenancy();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<Partial<PurchaseLine>[]>([]);
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentOrg) {
      purchaseService.getSuppliers(currentOrg.id).then(setSuppliers);
      inventoryService.getItems(currentOrg.id).then(setItems);
      inventoryService.getLocations(currentOrg.id).then(locs => {
        setLocations(locs);
        const def = locs.find(l => l.isDefault || l.type === 'warehouse');
        if (def) setSelectedLocation(def.id);
      });
    }
  }, [currentOrg]);

  const totalAmount = purchaseItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  const addItem = (item: Item) => {
    const existing = purchaseItems.find(pi => pi.itemId === item.id);
    if (existing) return;

    setPurchaseItems([...purchaseItems, {
      itemId: item.id,
      quantity: 1,
      unitCost: item.basePrice,
      subtotal: item.basePrice
    }]);
    setSearchTerm('');
  };

  const updateItem = (index: number, updates: Partial<PurchaseLine>) => {
    const newItems = [...purchaseItems];
    const item = { ...newItems[index], ...updates };
    if (item.quantity && item.unitCost) {
      item.subtotal = item.quantity * item.unitCost;
    }
    newItems[index] = item;
    setPurchaseItems(newItems);
  };

  const removeItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !user || !selectedSupplier || !selectedLocation || purchaseItems.length === 0) return;

    setLoading(true);
    try {
      await purchaseService.createPurchase(currentOrg.id, {
        orgId: currentOrg.id,
        supplierId: selectedSupplier,
        locationId: selectedLocation,
        items: purchaseItems as PurchaseLine[],
        totalAmount,
        paidAmount: paymentType === 'cash' ? totalAmount : paidAmount,
        paymentType,
        status: 'completed',
        userId: user.uid,
        notes
      });
      // Reset form or redirect
      alert('Purchase recorded successfully');
      setPurchaseItems([]);
      setSelectedSupplier('');
    } catch (error) {
      console.error(error);
      alert('Failed to record purchase');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">New Purchase</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              <option value="">Select Supplier</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} (Bal: {s.balance})</option>
              ))}
            </select>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              <option value="">Select Location</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search items to add..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {searchTerm && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addItem(item)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-0"
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">SKU: {item.sku || 'N/A'} | Stock: {item.currentStock}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {purchaseItems.map((pi, index) => {
              const item = items.find(i => i.id === pi.itemId);
              return (
                <div key={pi.itemId} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item?.name}</div>
                    <div className="text-xs text-gray-500">Subtotal: {pi.subtotal}</div>
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] uppercase text-gray-400 font-bold">Qty</label>
                    <input
                      type="number"
                      value={pi.quantity}
                      onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                      className="w-full p-1 border rounded"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] uppercase text-gray-400 font-bold">Cost</label>
                    <input
                      type="number"
                      value={pi.unitCost}
                      onChange={(e) => updateItem(index, { unitCost: Number(e.target.value) })}
                      className="w-full p-1 border rounded"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="mt-4 p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
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
            {paymentType === 'credit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-gray-500">Total Amount</div>
            <div className="text-2xl font-bold text-blue-600">{totalAmount}</div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || purchaseItems.length === 0 || !selectedSupplier}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          Complete Purchase
        </button>
      </form>
    </div>
  );
};

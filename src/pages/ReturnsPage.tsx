import React, { useState, useEffect } from 'react';
import { useTenancy, useAuth } from '../contexts';
import { inventoryService } from '../services/inventoryService';
import { saleService } from '../services/saleService';
import { Item, Customer, InventoryLocation, ReturnLine } from '../types';
import { Search, Plus, Trash2, Loader2, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

export default function ReturnsPage() {
  const { currentOrg } = useTenancy();
  const { user } = useAuth();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [returnItems, setReturnItems] = useState<Partial<ReturnLine>[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentOrg) {
      saleService.getCustomers(currentOrg.id).then(setCustomers);
      inventoryService.getItems(currentOrg.id).then(setItems);
      inventoryService.getLocations(currentOrg.id).then(locs => {
        setLocations(locs);
        const def = locs.find(l => l.isDefault || l.type === 'warehouse');
        if (def) setSelectedLocation(def.id);
      });
    }
  }, [currentOrg]);

  const addItem = (item: Item) => {
    const existing = returnItems.find(ri => ri.itemId === item.id);
    if (existing) return;

    setReturnItems([...returnItems, {
      itemId: item.id,
      quantity: 1,
      unitPrice: item.sellingPrice,
      subtotal: item.sellingPrice
    }]);
    setSearchTerm('');
  };

  const updateItem = (index: number, updates: Partial<ReturnLine>) => {
    const newItems = [...returnItems];
    const item = { ...newItems[index], ...updates };
    if (item.quantity && item.unitPrice) {
      item.subtotal = item.quantity * item.unitPrice;
    }
    newItems[index] = item;
    setReturnItems(newItems);
  };

  const removeItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !user || !selectedCustomer || !selectedLocation || returnItems.length === 0) return;

    setLoading(true);
    try {
      // For each item, create a CUSTOMER_RETURN transaction
      for (const line of returnItems) {
        await inventoryService.createTransaction(currentOrg.id, user.uid, {
          itemId: line.itemId!,
          type: 'CUSTOMER_RETURN',
          quantity: line.quantity!,
          destinationLocationId: selectedLocation,
          unitSellPrice: line.unitPrice,
          notes: `Customer Return: ${reason}`
        });
      }
      
      alert('Return processed successfully. Stock updated.');
      setReturnItems([]);
      setSelectedCustomer('');
      setReason('');
    } catch (error: any) {
      alert(error.message || 'Failed to process return');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-zinc-900">Customer Returns</h2>
        <p className="text-sm text-zinc-500">Process returns and restore items to inventory.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Customer</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Return To Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="">Select Location</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search items to return..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {searchTerm && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addItem(item)}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b border-zinc-100 last:border-0"
                  >
                    <div className="font-bold text-zinc-900">{item.name}</div>
                    <div className="text-xs text-zinc-500">SKU: {item.sku || 'N/A'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {returnItems.map((ri, index) => {
              const item = items.find(i => i.id === ri.itemId);
              return (
                <div key={ri.itemId} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="flex-1">
                    <p className="font-bold text-zinc-900">{item?.name}</p>
                    <p className="text-xs text-zinc-500">Unit Price: {ri.unitPrice}</p>
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">Qty</label>
                    <input
                      type="number"
                      value={ri.quantity}
                      onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                      className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-center font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {returnItems.length === 0 && (
              <div className="py-8 text-center text-zinc-400">
                <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No items added to return.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Reason for Return</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Defective product, customer changed mind..."
            className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 h-24"
          />
        </div>

        <button
          type="submit"
          disabled={loading || returnItems.length === 0 || !selectedCustomer}
          className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-orange-200 transition-all active:scale-[0.98]"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
          Process Return
        </button>
      </form>
    </div>
  );
}

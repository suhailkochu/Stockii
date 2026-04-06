import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTenancy } from '../contexts';
import { useAuth } from '../contexts';
import { saleService } from '../services/saleService';
import { inventoryService } from '../services/inventoryService';
import { Customer, Item, SaleLine, InventoryLocation } from '../types';
import { Plus, Trash2, Search, Loader2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export const CreateSalePage: React.FC = () => {
  const { currentOrg } = useTenancy();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialLocationId = searchParams.get('locationId');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(initialLocationId || '');
  const [saleItems, setSaleItems] = useState<Partial<SaleLine>[]>([]);
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentOrg) {
      saleService.getCustomers(currentOrg.id).then(setCustomers);
      inventoryService.getItems(currentOrg.id).then(setItems);
      inventoryService.getLocations(currentOrg.id).then(locs => {
        setLocations(locs);
        if (!selectedLocation) {
          const def = locs.find(l => l.isDefault);
          if (def) setSelectedLocation(def.id);
        }
      });
    }
  }, [currentOrg]);

  const totalAmount = saleItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  const taxRate = currentOrg?.settings?.taxEnabled ? (currentOrg.settings.taxRate || 0) : 0;
  const taxAmount = totalAmount * (taxRate / 100);
  const finalTotal = totalAmount + taxAmount;

  const addItem = (item: Item) => {
    const existing = saleItems.find(si => si.itemId === item.id);
    if (existing) return;

    setSaleItems([...saleItems, {
      itemId: item.id,
      quantity: 1,
      unitPrice: item.sellingPrice,
      subtotal: item.sellingPrice
    }]);
    setSearchTerm('');
  };

  const updateItem = (index: number, updates: Partial<SaleLine>) => {
    const newItems = [...saleItems];
    const item = { ...newItems[index], ...updates };
    if (item.quantity && item.unitPrice) {
      item.subtotal = item.quantity * item.unitPrice;
    }
    newItems[index] = item;
    setSaleItems(newItems);
  };

  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !user || !selectedCustomer || !selectedLocation || saleItems.length === 0) return;

    setLoading(true);
    try {
      const sale = await saleService.createSale(currentOrg.id, {
        orgId: currentOrg.id,
        customerId: selectedCustomer,
        locationId: selectedLocation,
        items: saleItems as SaleLine[],
        totalAmount, // Subtotal before tax
        paidAmount: paymentType === 'cash' ? finalTotal : paidAmount,
        paymentType,
        status: 'completed',
        userId: user.uid,
        notes
      });
      alert('Sale recorded successfully');
      setSaleItems([]);
      setSelectedCustomer('');
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to record sale');
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
      <h1 className="text-2xl font-bold mb-6">New Sale</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} (Bal: {c.balance})</option>
              ))}
            </select>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Location</label>
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
                    <div className="text-xs text-gray-500">Price: {item.sellingPrice} | Stock: {item.currentStock}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {saleItems.map((si, index) => {
              const item = items.find(i => i.id === si.itemId);
              return (
                <div key={si.itemId} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item?.name}</div>
                    <div className="text-xs text-gray-500">Subtotal: {si.subtotal}</div>
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] uppercase text-gray-400 font-bold">Qty</label>
                    <input
                      type="number"
                      value={si.quantity}
                      onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                      className="w-full p-1 border rounded"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] uppercase text-gray-400 font-bold">Price</label>
                    <input
                      type="number"
                      value={si.unitPrice}
                      onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
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

          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between items-center text-sm text-gray-500">
              <div>Subtotal</div>
              <div>{totalAmount.toFixed(2)}</div>
            </div>
            {currentOrg?.settings?.taxEnabled && (
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div>Tax ({taxRate}%)</div>
                <div>{taxAmount.toFixed(2)}</div>
              </div>
            )}
            <div className="flex justify-between items-center pt-2">
              <div className="text-lg font-bold text-gray-900">Total</div>
              <div className="text-2xl font-bold text-blue-600">{finalTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || saleItems.length === 0 || !selectedCustomer}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
          Confirm Sale
        </button>
      </form>
    </div>
  );
};

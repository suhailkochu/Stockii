import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTenancy } from '../contexts';
import { useAuth } from '../contexts';
import { saleService } from '../services/saleService';
import { inventoryService } from '../services/inventoryService';
import { Customer, Item, SaleLine, InventoryLocation, StockSummary } from '../types';
import { Plus, Trash2, Search, Loader2, ShoppingCart, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../notifications';
import { AppSelect } from '../components/AppSelect';

const emptyCustomerForm: Partial<Customer> = {
  name: '',
  shopName: '',
  phone: '',
  email: '',
  address: '',
  route: '',
  balance: 0,
};

export const CreateSalePage: React.FC = () => {
  const { currentOrg } = useTenancy();
  const { user } = useAuth();
  const { success, error: notifyError } = useNotifications();
  const [searchParams] = useSearchParams();
  const initialLocationId = searchParams.get('locationId');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [locationStock, setLocationStock] = useState<StockSummary[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(initialLocationId || '');
  const [saleItems, setSaleItems] = useState<Partial<SaleLine>[]>([]);
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState<Partial<Customer>>(emptyCustomerForm);
  const [setupSubmitting, setSetupSubmitting] = useState(false);
  const multiLocationEnabled = currentOrg?.settings?.multiLocationEnabled ?? false;

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

  useEffect(() => {
    if (!currentOrg || !selectedLocation) {
      setLocationStock([]);
      return;
    }

    inventoryService.getStockByLocation(currentOrg.id, selectedLocation)
      .then(setLocationStock)
      .catch((error) => {
        console.error('Error loading location stock:', error);
        setLocationStock([]);
      });
  }, [currentOrg, selectedLocation]);

  useEffect(() => {
    setSaleItems(currentItems =>
      currentItems
        .map((line) => {
          const availableStock = locationStock.find(stock => stock.itemId === line.itemId)?.quantity || 0;
          if (availableStock <= 0) {
            return null;
          }

          const quantity = Math.min(Math.max(1, line.quantity || 1), availableStock);
          const unitPrice = line.unitPrice || 0;

          return {
            ...line,
            quantity,
            subtotal: quantity * unitPrice,
          };
        })
        .filter(Boolean) as Partial<SaleLine>[]
    );
  }, [locationStock]);

  const totalAmount = saleItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  const taxRate = currentOrg?.settings?.taxEnabled ? (currentOrg.settings.taxRate || 0) : 0;
  const taxAmount = totalAmount * (taxRate / 100);
  const finalTotal = totalAmount + taxAmount;

  const getAvailableStock = (itemId: string) => {
    return locationStock.find(stock => stock.itemId === itemId)?.quantity || 0;
  };

  const addItem = (item: Item) => {
    const existing = saleItems.find(si => si.itemId === item.id);
    if (existing) return;

    const availableStock = getAvailableStock(item.id);
    if (availableStock <= 0) {
      notifyError(`No stock available for ${item.name} at the selected location.`);
      return;
    }

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
    const availableStock = getAvailableStock(item.itemId!);
    if (item.quantity) {
      item.quantity = Math.min(Math.max(1, item.quantity), availableStock);
    }
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
      success('Sale recorded successfully');
      setSaleItems([]);
      setSelectedCustomer('');
      setPaymentType('cash');
      setPaidAmount(0);
      setNotes('');
    } catch (error: any) {
      console.error(error);
      notifyError(error.message || 'Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    setSetupSubmitting(true);
    try {
      const customer = await saleService.createCustomer(currentOrg.id, customerForm);
      setCustomers(prev => [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCustomer(customer.id);
      setShowCustomerModal(false);
      setCustomerForm(emptyCustomerForm);
      success('Customer added successfully');
    } catch (error: any) {
      console.error(error);
      notifyError(error.message || 'Failed to add customer');
    } finally {
      setSetupSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => 
    (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    getAvailableStock(item.id) > 0
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">New Sale</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">Customer</label>
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                + Add Customer
              </button>
            </div>
            <AppSelect
              value={selectedCustomer}
              onChange={setSelectedCustomer}
              placeholder="Select Customer"
              searchable
              emptyMessage="No customers found."
              options={[
                { value: '', label: 'Select Customer' },
                ...customers.map((customer) => ({
                  value: customer.id,
                  label: `${customer.name} (Bal: ${customer.balance})`,
                  keywords: `${customer.shopName || ''} ${customer.phone || ''} ${customer.route || ''}`,
                })),
              ]}
              buttonClassName="rounded-lg"
            />
          </div>

          {multiLocationEnabled && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Location</label>
              <AppSelect
                value={selectedLocation}
                onChange={setSelectedLocation}
                placeholder="Select Location"
                options={[
                  { value: '', label: 'Select Location' },
                  ...locations.map((location) => ({
                    value: location.id,
                    label: `${location.name} (${location.type})`,
                  })),
                ]}
                buttonClassName="rounded-lg"
              />
            </div>
          )}
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
                    <div className="text-xs text-gray-500">
                      Price: {item.sellingPrice} | Available here: {getAvailableStock(item.id)} {item.unit}
                    </div>
                  </button>
                ))}
                {filteredItems.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    No stocked items found for this location.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {saleItems.map((si, index) => {
              const item = items.find(i => i.id === si.itemId);
              const availableStock = getAvailableStock(si.itemId!);
              return (
                <div key={si.itemId} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item?.name}</div>
                    <div className="text-xs text-gray-500">
                      Available: {availableStock} {item?.unit} | Subtotal: {si.subtotal}
                    </div>
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] uppercase text-gray-400 font-bold">Qty</label>
                    <input
                      type="number"
                      min="1"
                      max={availableStock}
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

      <AnimatePresence>
        {showCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCustomerModal(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 p-6">
                <h3 className="text-xl font-bold text-zinc-900">Add New Customer</h3>
                <button onClick={() => setShowCustomerModal(false)} className="rounded-full p-2 hover:bg-zinc-100 transition-colors">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-bold uppercase text-zinc-400">Customer Name</label>
                    <input
                      required
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                      className="w-full rounded-xl border px-4 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-bold uppercase text-zinc-400">Shop Name</label>
                    <input
                      value={customerForm.shopName}
                      onChange={(e) => setCustomerForm({ ...customerForm, shopName: e.target.value })}
                      className="w-full rounded-xl border px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-zinc-400">Phone</label>
                    <input
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      className="w-full rounded-xl border px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-zinc-400">Email</label>
                    <input
                      type="email"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      className="w-full rounded-xl border px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-zinc-400">Route</label>
                    <input
                      value={customerForm.route}
                      onChange={(e) => setCustomerForm({ ...customerForm, route: e.target.value })}
                      className="w-full rounded-xl border px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-zinc-400">Opening Balance</label>
                    <input
                      type="number"
                      min="0"
                      value={customerForm.balance}
                      onChange={(e) => setCustomerForm({ ...customerForm, balance: Number(e.target.value) })}
                      className="w-full rounded-xl border px-4 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-bold uppercase text-zinc-400">Address</label>
                    <textarea
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                      className="min-h-24 w-full rounded-xl border px-4 py-2"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={setupSubmitting}
                  className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {setupSubmitting ? 'Saving...' : 'Save Customer'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useTenancy } from '../contexts';
import { saleService } from '../services/saleService';
import { Customer } from '../types';
import { Plus, Search, User, Phone, MapPin, X, Loader2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../notifications';

const emptyCustomerForm: Partial<Customer> = {
  name: '',
  shopName: '',
  phone: '',
  email: '',
  address: '',
  route: '',
  balance: 0,
};

export default function CustomersPage() {
  const { currentOrg } = useTenancy();
  const { success, error: notifyError } = useNotifications();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState<Partial<Customer>>(emptyCustomerForm);

  useEffect(() => {
    if (currentOrg) {
      loadCustomers();
    }
  }, [currentOrg]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await saleService.getCustomers(currentOrg!.id);
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setCustomerForm(emptyCustomerForm);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      shopName: customer.shopName || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      route: customer.route || '',
      balance: customer.balance || 0,
    });
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    
    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await saleService.updateCustomer(currentOrg.id, editingCustomer.id, customerForm);
      } else {
        await saleService.createCustomer(currentOrg.id, customerForm);
      }
      await loadCustomers();
      setIsModalOpen(false);
      setCustomerForm(emptyCustomerForm);
      setEditingCustomer(null);
      success(editingCustomer ? 'Customer updated successfully' : 'Customer created successfully');
    } catch (error) {
      console.error('Error saving customer:', error);
      notifyError(editingCustomer ? 'Failed to update customer' : 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  if (loading) return <div className="p-8 text-center">Loading customers...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Customers</h2>
          <p className="text-sm text-zinc-500">Manage your customer database and credit balances.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-medium shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input 
          type="text" 
          placeholder="Search by name, shop, or phone..." 
          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-500 bg-white border border-zinc-200 rounded-2xl">
            No customers found.
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-white border border-zinc-200 rounded-2xl p-5 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">{customer.name}</h3>
                    <p className="text-xs text-zinc-500">{customer.shopName || 'No Shop Name'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Balance</p>
                    <p className={`text-sm font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {currentOrg?.settings.currency} {customer.balance.toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditModal(customer)}
                    className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-orange-600"
                    title="Edit customer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t border-zinc-50">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <Phone className="w-3 h-3 text-zinc-400" />
                  {customer.phone || 'No Phone'}
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <MapPin className="w-3 h-3 text-zinc-400" />
                  <span className="truncate">{customer.address || 'No Address'}</span>
                </div>
                {customer.route && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 rounded text-[10px] font-medium text-zinc-500">
                    Route: {customer.route}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Customer Name</label>
                    <input
                      required
                      type="text"
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Shop Name</label>
                    <input
                      type="text"
                      value={customerForm.shopName}
                      onChange={(e) => setCustomerForm({ ...customerForm, shopName: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Phone</label>
                    <input
                      type="text"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Route</label>
                    <input
                      type="text"
                      value={customerForm.route}
                      onChange={(e) => setCustomerForm({ ...customerForm, route: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Email</label>
                    <input
                      type="email"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Address</label>
                    <textarea
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 h-20 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    {editingCustomer ? 'Save Changes' : 'Create Customer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

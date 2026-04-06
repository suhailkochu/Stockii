import React, { useEffect, useState } from 'react';
import { useAuth, useTenancy } from '../contexts';
import { inventoryService } from '../services/inventoryService';
import { Item, ItemCategory, InventoryLocation } from '../types';
import { Plus, Search, Filter, Package, Tag, MapPin, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ItemsPage() {
  const { currentOrg } = useTenancy();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItem, setNewItem] = useState<Partial<Item>>({
    name: '',
    sku: '',
    categoryId: '',
    unit: 'pcs',
    basePrice: 0,
    sellingPrice: 0,
    reorderThreshold: 5,
  });

  useEffect(() => {
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsData, catsData, locsData] = await Promise.all([
        inventoryService.getItems(currentOrg!.id),
        inventoryService.getCategories(currentOrg!.id),
        inventoryService.getLocations(currentOrg!.id)
      ]);
      setItems(itemsData);
      setCategories(catsData);
      setLocations(locsData);
      if (catsData.length > 0 && !newItem.categoryId) {
        setNewItem(prev => ({ ...prev, categoryId: catsData[0].id }));
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!currentOrg || !newCategoryName.trim()) return;
    try {
      const cat = await inventoryService.createCategory(currentOrg.id, newCategoryName);
      setCategories([...categories, cat]);
      setNewItem({ ...newItem, categoryId: cat.id });
      setNewCategoryName('');
      setShowCategoryInput(false);
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !user) return;
    
    setIsSubmitting(true);
    try {
      await inventoryService.createItem(currentOrg.id, newItem);
      await loadData();
      setIsModalOpen(false);
      setNewItem({
        name: '',
        sku: '',
        categoryId: categories[0]?.id || '',
        unit: 'pcs',
        basePrice: 0,
        sellingPrice: 0,
        reorderThreshold: 5,
      });
    } catch (error) {
      console.error('Error creating item:', error);
      alert('Failed to create item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Loading items...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Item Master</h2>
          <p className="text-sm text-zinc-500">Manage your product catalog and stock levels.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-medium shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add New Item
        </button>
      </header>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search by name or SKU..." 
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
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Item Details</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Category</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-right">Selling Price</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-right">Stock</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    No items found. Add your first product to get started.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{item.name}</p>
                          <p className="text-xs text-zinc-500 font-mono">{item.sku || 'NO-SKU'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                        <Tag className="w-3 h-3" />
                        {categories.find(c => c.id === item.categoryId)?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-zinc-900">
                      {currentOrg?.settings.currency} {item.sellingPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm font-bold ${item.currentStock <= item.reorderThreshold ? 'text-red-600' : 'text-zinc-900'}`}>
                        {item.currentStock} {item.unit}
                      </div>
                      {item.currentStock <= item.reorderThreshold && (
                        <p className="text-[10px] text-red-500 uppercase font-bold tracking-tight">Low Stock</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
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
                <h3 className="text-xl font-bold text-zinc-900">Add New Item</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <form onSubmit={handleCreateItem} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Item Name</label>
                    <input
                      required
                      type="text"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g. Premium Dates 1kg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">SKU</label>
                    <input
                      type="text"
                      value={newItem.sku}
                      onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Category</label>
                    {showCategoryInput ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="New Category..."
                        />
                        <button
                          type="button"
                          onClick={handleCreateCategory}
                          className="px-3 bg-zinc-900 text-white rounded-xl text-xs font-bold"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCategoryInput(false)}
                          className="px-3 bg-zinc-100 text-zinc-500 rounded-xl text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          required
                          value={newItem.categoryId}
                          onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                          className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCategoryInput(true)}
                          className="p-2 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-colors"
                          title="Add New Category"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Unit</label>
                    <input
                      required
                      type="text"
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="pcs, kg, box..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Reorder Level</label>
                    <input
                      required
                      type="number"
                      value={newItem.reorderThreshold}
                      onChange={(e) => setNewItem({ ...newItem, reorderThreshold: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Base Cost</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={newItem.basePrice}
                      onChange={(e) => setNewItem({ ...newItem, basePrice: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Selling Price</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={newItem.sellingPrice}
                      onChange={(e) => setNewItem({ ...newItem, sellingPrice: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
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
                    Create Item
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

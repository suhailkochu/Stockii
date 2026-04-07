import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useTenancy } from '../contexts';
import { inventoryService } from '../services/inventoryService';
import { Item, ItemCategory, InventoryLocation } from '../types';
import { Plus, Search, Filter, Package, Tag, X, Loader2, Pencil, ArrowUpDown, Warehouse } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../notifications';

const emptyItemForm = {
  name: '',
  sku: '',
  categoryId: '',
  unit: 'pcs',
  basePrice: 0,
  sellingPrice: 0,
  reorderThreshold: 5,
  description: '',
};

export default function ItemsPage() {
  const { currentOrg } = useTenancy();
  const { user } = useAuth();
  const { success, error: notifyError } = useNotifications();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemForm, setItemForm] = useState<Partial<Item>>(emptyItemForm);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState<Item | null>(null);
  const [stockMode, setStockMode] = useState<'add' | 'remove'>('add');
  const [stockLocationId, setStockLocationId] = useState('');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockNotes, setStockNotes] = useState('');

  useEffect(() => {
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [itemsData, catsData, locsData] = await Promise.all([
        inventoryService.getItems(currentOrg.id),
        inventoryService.getCategories(currentOrg.id),
        inventoryService.getLocations(currentOrg.id),
      ]);
      setItems(itemsData);
      setCategories(catsData);
      setLocations(locsData);
      setItemForm(prev => ({
        ...prev,
        categoryId: prev.categoryId || catsData[0]?.id || '',
      }));
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const defaultLocationId = useMemo(
    () => locations.find(location => location.isDefault || location.type === 'warehouse')?.id || locations[0]?.id || '',
    [locations]
  );

  const resetItemForm = () => {
    setEditingItem(null);
    setItemForm({
      ...emptyItemForm,
      categoryId: categories[0]?.id || '',
    });
    setShowCategoryInput(false);
    setNewCategoryName('');
  };

  const openCreateModal = () => {
    resetItemForm();
    setIsItemModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      sku: item.sku || '',
      categoryId: item.categoryId,
      unit: item.unit,
      basePrice: item.basePrice,
      sellingPrice: item.sellingPrice,
      reorderThreshold: item.reorderThreshold,
      description: item.description || '',
      isActive: item.isActive,
    });
    setShowCategoryInput(false);
    setNewCategoryName('');
    setIsItemModalOpen(true);
  };

  const openStockModal = (item: Item, mode: 'add' | 'remove') => {
    setStockItem(item);
    setStockMode(mode);
    setStockLocationId(defaultLocationId);
    setStockQuantity(1);
    setStockNotes('');
    setIsStockModalOpen(true);
  };

  const handleCreateCategory = async () => {
    if (!currentOrg || !newCategoryName.trim()) return;
    try {
      const cat = await inventoryService.createCategory(currentOrg.id, newCategoryName.trim());
      setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setItemForm(prev => ({ ...prev, categoryId: cat.id }));
      setNewCategoryName('');
      setShowCategoryInput(false);
    } catch (error) {
      console.error('Error creating category:', error);
      notifyError('Failed to create category');
      return;
    }
    success('Category created successfully.');
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await inventoryService.updateItem(currentOrg.id, editingItem.id, itemForm);
      } else {
        await inventoryService.createItem(currentOrg.id, itemForm);
      }
      await loadData();
      setIsItemModalOpen(false);
      resetItemForm();
      success(editingItem ? 'Item updated successfully.' : 'Item created successfully.');
    } catch (error) {
      console.error('Error saving item:', error);
      notifyError(editingItem ? 'Failed to update item' : 'Failed to create item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !user || !stockItem || !stockLocationId) return;

    setIsSubmitting(true);
    try {
      await inventoryService.adjustItemStock(currentOrg.id, user.uid, {
        itemId: stockItem.id,
        locationId: stockLocationId,
        quantity: stockQuantity,
        mode: stockMode,
        notes: stockNotes.trim() || `${stockMode === 'add' ? 'Manual stock addition' : 'Manual stock removal'} for ${stockItem.name}`,
      });
      await loadData();
      setIsStockModalOpen(false);
      setStockItem(null);
      success(stockMode === 'add' ? 'Stock added successfully.' : 'Stock removed successfully.');
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      notifyError(error.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    categories.find(category => category.id === item.categoryId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Loading items...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Item Master</h2>
          <p className="text-sm text-zinc-500">Manage your product catalog, prices, and stock levels.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/purchases/new"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-medium hover:bg-zinc-50 transition-all"
          >
            <Warehouse className="w-4 h-4" />
            Receive Stock
          </Link>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-medium shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Item
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, or category..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-600">
          <Filter className="w-4 h-4" />
          {filteredItems.length} items
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Item Details</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400">Category</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-right">Pricing</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-right">Stock</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-center">Status</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-wider text-zinc-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    No items found. Add your first product to get started.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{item.name}</p>
                          <p className="text-xs text-zinc-500 font-mono">{item.sku || 'NO-SKU'}</p>
                          {item.description && <p className="text-xs text-zinc-400 mt-1">{item.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                        <Tag className="w-3 h-3" />
                        {categories.find(c => c.id === item.categoryId)?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-zinc-900">
                        {currentOrg?.settings.currency} {item.sellingPrice.toFixed(2)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Cost {currentOrg?.settings.currency} {item.basePrice.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm font-bold ${item.currentStock <= item.reorderThreshold ? 'text-red-600' : 'text-zinc-900'}`}>
                        {item.currentStock} {item.unit}
                      </div>
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tight">
                        Reorder at {item.reorderThreshold}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openStockModal(item, 'add')}
                          className="px-3 py-2 text-xs font-medium bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors"
                        >
                          Add Stock
                        </button>
                        <button
                          onClick={() => openStockModal(item, 'remove')}
                          className="px-3 py-2 text-xs font-medium bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors"
                        >
                          Remove
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-xl transition-colors"
                          title="Edit item"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isItemModalOpen && (
          <ModalShell onClose={() => setIsItemModalOpen(false)}>
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-zinc-900">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
              <button onClick={() => setIsItemModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Item Name</label>
                  <input
                    required
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Premium Dates 1kg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">SKU</label>
                  <input
                    type="text"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
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
                        placeholder="New category..."
                      />
                      <button type="button" onClick={handleCreateCategory} className="px-3 bg-zinc-900 text-white rounded-xl text-xs font-bold">
                        Add
                      </button>
                      <button type="button" onClick={() => setShowCategoryInput(false)} className="px-3 bg-zinc-100 text-zinc-500 rounded-xl text-xs font-bold">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        required
                        value={itemForm.categoryId}
                        onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                        className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setShowCategoryInput(true)} className="p-2 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-colors">
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
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Reorder Level</label>
                  <input
                    required
                    min="0"
                    type="number"
                    value={itemForm.reorderThreshold}
                    onChange={(e) => setItemForm({ ...itemForm, reorderThreshold: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Base Cost</label>
                  <input
                    required
                    min="0"
                    type="number"
                    step="0.01"
                    value={itemForm.basePrice}
                    onChange={(e) => setItemForm({ ...itemForm, basePrice: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Selling Price</label>
                  <input
                    required
                    min="0"
                    type="number"
                    step="0.01"
                    value={itemForm.sellingPrice}
                    onChange={(e) => setItemForm({ ...itemForm, sellingPrice: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Description</label>
                  <textarea
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 h-24"
                    placeholder="Optional notes about pack size, brand, or handling"
                  />
                </div>
                {editingItem && (
                  <div className="col-span-2 flex items-center justify-between p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                    <div>
                      <p className="text-sm font-bold text-zinc-900">Item Availability</p>
                      <p className="text-xs text-zinc-500">Inactive items stay in reports but are hidden from future operations.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setItemForm({ ...itemForm, isActive: !itemForm.isActive })}
                      className={`px-4 py-2 rounded-xl text-sm font-medium ${itemForm.isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-600'}`}
                    >
                      {itemForm.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isStockModalOpen && stockItem && (
          <ModalShell onClose={() => setIsStockModalOpen(false)}>
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-zinc-900">{stockMode === 'add' ? 'Add Stock' : 'Remove Stock'}</h3>
                <p className="text-sm text-zinc-500">{stockItem.name}</p>
              </div>
              <button onClick={() => setIsStockModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <p className="text-xs uppercase font-bold text-zinc-400 mb-1">Current Total Stock</p>
                  <p className="text-2xl font-bold text-zinc-900">{stockItem.currentStock} {stockItem.unit}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Location</label>
                  <select
                    value={stockLocationId}
                    onChange={(e) => setStockLocationId(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="">Select Location</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name} ({location.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Notes</label>
                  <textarea
                    value={stockNotes}
                    onChange={(e) => setStockNotes(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 h-24"
                    placeholder="Reason for this manual stock adjustment"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !stockLocationId || stockQuantity <= 0}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${stockMode === 'add' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpDown className="w-5 h-5" />}
                {stockMode === 'add' ? 'Confirm Stock Addition' : 'Confirm Stock Removal'}
              </button>
            </form>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {children}
      </motion.div>
    </div>
  );
}

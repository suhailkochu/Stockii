import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenancy } from '../contexts';
import { saleService } from '../services/saleService';
import { inventoryService } from '../services/inventoryService';
import { purchaseService } from '../services/purchaseService';
import { Sale, Item, Customer, InventoryLocation } from '../types';
import { Printer, ArrowLeft, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export const InvoicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrg } = useTenancy();
  const [sale, setSale] = useState<Sale | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [location, setLocation] = useState<InventoryLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentOrg || !id) return;
      try {
        const saleData = await saleService.getSale(currentOrg.id, id);
        if (saleData) {
          setSale(saleData);
          const [custs, allItems, locs] = await Promise.all([
            saleService.getCustomers(currentOrg.id),
            inventoryService.getItems(currentOrg.id),
            inventoryService.getLocations(currentOrg.id)
          ]);
          setCustomer(custs.find(c => c.id === saleData.customerId) || null);
          setItems(allItems);
          setLocation(locs.find(l => l.id === saleData.locationId) || null);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentOrg, id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!sale || !currentOrg) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-orange-600 font-medium">Go Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action Bar - Hidden on Print */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" />
            Print Invoice
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentOrg.name}</h1>
            <p className="text-sm text-gray-500">Stockii Network</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wider mb-1">Invoice</h2>
            <p className="text-sm text-gray-500 font-mono">#{sale.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-12 mb-12">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Bill To</h3>
            <div className="space-y-1">
              <p className="font-bold text-gray-900">{customer?.name || 'Walk-in Customer'}</p>
              {customer?.shopName && <p className="text-sm text-gray-600">{customer.shopName}</p>}
              {customer?.address && <p className="text-sm text-gray-500">{customer.address}</p>}
              {customer?.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Details</h3>
            <div className="space-y-1">
              <div className="flex justify-end gap-4 text-sm">
                <span className="text-gray-500">Date:</span>
                <span className="font-medium text-gray-900">{format(sale.timestamp, 'MMM dd, yyyy HH:mm')}</span>
              </div>
              <div className="flex justify-end gap-4 text-sm">
                <span className="text-gray-500">Payment:</span>
                <span className="font-medium text-gray-900 uppercase">{sale.paymentType}</span>
              </div>
              <div className="flex justify-end gap-4 text-sm">
                <span className="text-gray-500">Location:</span>
                <span className="font-medium text-gray-900">{location?.name || 'Main Warehouse'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-12">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="py-4 text-xs font-mono uppercase tracking-widest text-gray-400">Description</th>
              <th className="py-4 text-xs font-mono uppercase tracking-widest text-gray-400 text-right">Qty</th>
              <th className="py-4 text-xs font-mono uppercase tracking-widest text-gray-400 text-right">Price</th>
              <th className="py-4 text-xs font-mono uppercase tracking-widest text-gray-400 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sale.items.map((line, i) => {
              const item = items.find(it => it.id === line.itemId);
              return (
                <tr key={i}>
                  <td className="py-4">
                    <p className="font-medium text-gray-900">{item?.name || 'Unknown Item'}</p>
                    <p className="text-xs text-gray-500 font-mono">{item?.sku}</p>
                  </td>
                  <td className="py-4 text-right text-gray-600">{line.quantity}</td>
                  <td className="py-4 text-right text-gray-600">{line.unitPrice.toFixed(2)}</td>
                  <td className="py-4 text-right font-medium text-gray-900">{line.subtotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{(sale.totalAmount - (sale.taxAmount || 0)).toFixed(2)}</span>
            </div>
            {sale.taxAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax ({currentOrg.settings.taxRate}%)</span>
                <span>{sale.taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-gray-200">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold text-blue-600">{sale.totalAmount.toFixed(2)}</span>
            </div>
            {sale.paymentType === 'credit' && (
              <div className="flex justify-between text-sm text-gray-500 italic">
                <span>Paid Amount</span>
                <span>{sale.paidAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-24 pt-12 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400 font-serif italic">Thank you for your business!</p>
          <div className="mt-4 flex justify-center gap-8 text-[10px] text-gray-300 uppercase tracking-widest font-mono">
            <span>Generated by Stockii</span>
            <span>Ref: {sale.id}</span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
          .max-w-7xl { max-width: none !important; padding: 0 !important; }
        }
      `}} />
    </div>
  );
};

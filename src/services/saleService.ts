import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  runTransaction,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { Customer, Sale, InventoryTransaction } from '../types';

export const saleService = {
  async getCustomers(orgId: string) {
    const q = query(collection(db, `organizations/${orgId}/customers`), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
  },

  async createCustomer(orgId: string, customerData: Partial<Customer>) {
    const customerRef = doc(collection(db, `organizations/${orgId}/customers`));
    const newCustomer = {
      ...customerData,
      id: customerRef.id,
      orgId,
      balance: customerData.balance || 0,
    };
    await setDoc(customerRef, newCustomer);
    return newCustomer;
  },

  async createSale(orgId: string, saleData: Omit<Sale, 'id' | 'timestamp' | 'taxAmount'>) {
    return await runTransaction(db, async (transaction) => {
      const saleRef = doc(collection(db, `organizations/${orgId}/sales`));
      const customerRef = doc(db, `organizations/${orgId}/customers`, saleData.customerId);
      const orgRef = doc(db, `organizations`, orgId);
      
      const [customerSnap, orgSnap] = await Promise.all([
        transaction.get(customerRef),
        transaction.get(orgRef)
      ]);

      if (!customerSnap.exists()) throw new Error('Customer not found');
      if (!orgSnap.exists()) throw new Error('Organization not found');
      
      const orgData = orgSnap.data();
      const taxRate = orgData.settings?.taxEnabled ? (orgData.settings?.taxRate || 0) : 0;
      const taxAmount = saleData.totalAmount * (taxRate / 100);
      const finalTotal = saleData.totalAmount + taxAmount;

      const currentBalance = customerSnap.data().balance || 0;
      const outstandingAmount = finalTotal - saleData.paidAmount;

      const lineSnapshots = await Promise.all(
        saleData.items.map(async (line) => {
          const itemRef = doc(db, `organizations/${orgId}/items`, line.itemId);
          const summaryRef = doc(db, 'organizations', orgId, 'stockSummaries', `${line.itemId}_${saleData.locationId}`);
          const [itemSnap, summarySnap] = await Promise.all([
            transaction.get(itemRef),
            transaction.get(summaryRef)
          ]);

          if (!itemSnap.exists()) {
            throw new Error(`Item ${line.itemId} not found`);
          }

          const currentStock = itemSnap.data().currentStock || 0;
          const currentLocStock = summarySnap.exists() ? summarySnap.data().quantity : 0;

          if (currentLocStock < line.quantity) {
            throw new Error(`Insufficient stock for item ${itemSnap.data().name} at the selected location (Available: ${currentLocStock})`);
          }

          return {
            line,
            itemRef,
            summaryRef,
            currentStock,
            currentLocStock,
          };
        })
      );

      // 1. Create Sale Record
      const sale: Sale = {
        ...saleData,
        id: saleRef.id,
        taxAmount,
        totalAmount: finalTotal,
        timestamp: Date.now(),
      };
      transaction.set(saleRef, sale);

      // 2. Update Customer Balance if credit
      if (outstandingAmount > 0) {
        transaction.update(customerRef, {
          balance: currentBalance + outstandingAmount
        });
      }

      // 3. Update Stock for each item
      for (const { line, itemRef, summaryRef, currentStock, currentLocStock } of lineSnapshots) {
        transaction.update(itemRef, {
          currentStock: currentStock - line.quantity
        });

        transaction.set(summaryRef, {
          itemId: line.itemId,
          locationId: saleData.locationId,
          quantity: currentLocStock - line.quantity
        }, { merge: true });

        // 4. Create Inventory Transaction
        const invTransRef = doc(collection(db, `organizations/${orgId}/transactions`));
        const invTrans: InventoryTransaction = {
          id: invTransRef.id,
          orgId,
          itemId: line.itemId,
          type: 'SALE_OUT',
          sourceLocationId: saleData.locationId,
          quantity: line.quantity,
          unitSellPrice: line.unitPrice,
          referenceId: saleRef.id,
          userId: saleData.userId,
          timestamp: Date.now(),
          status: 'completed'
        };
        transaction.set(invTransRef, invTrans);
      }

      return sale;
    });
  },

  async getSale(orgId: string, saleId: string) {
    const saleSnap = await getDoc(doc(db, `organizations/${orgId}/sales`, saleId));
    if (!saleSnap.exists()) return null;
    return { id: saleSnap.id, ...saleSnap.data() } as Sale;
  },

  async getSales(orgId: string) {
    const q = query(collection(db, `organizations/${orgId}/sales`), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
  },

  async updateCustomer(orgId: string, customerId: string, data: Partial<Customer>) {
    const customerRef = doc(db, `organizations/${orgId}/customers`, customerId);
    await updateDoc(customerRef, data);
  },

  async updateSale(
    orgId: string,
    saleId: string,
    data: {
      paidAmount: number;
      paymentType: 'cash' | 'credit';
      notes?: string;
    }
  ) {
    return await runTransaction(db, async (transaction) => {
      const saleRef = doc(db, `organizations/${orgId}/sales`, saleId);
      const saleSnap = await transaction.get(saleRef);
      if (!saleSnap.exists()) throw new Error('Sale not found');

      const sale = saleSnap.data() as Sale;
      const customerRef = doc(db, `organizations/${orgId}/customers`, sale.customerId);
      const customerSnap = await transaction.get(customerRef);
      if (!customerSnap.exists()) throw new Error('Customer not found');

      const previousOutstanding = sale.totalAmount - sale.paidAmount;
      const nextOutstanding = sale.totalAmount - data.paidAmount;
      const balanceDelta = nextOutstanding - previousOutstanding;
      const currentBalance = customerSnap.data().balance || 0;

      transaction.update(saleRef, {
        paidAmount: data.paidAmount,
        paymentType: data.paymentType,
        notes: data.notes || ''
      });

      transaction.update(customerRef, {
        balance: currentBalance + balanceDelta
      });
    });
  }
};

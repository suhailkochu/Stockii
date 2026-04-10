import { 
  collection, 
  doc, 
  deleteDoc,
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
import { Customer, Sale, InventoryTransaction, PaymentRecord, CustomerReturn, ReturnLine } from '../types';

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

  async deleteCustomer(orgId: string, customerId: string) {
    const customerRef = doc(db, `organizations/${orgId}/customers`, customerId);
    const customerSnap = await getDoc(customerRef);
    if (!customerSnap.exists()) throw new Error('Customer not found');

    const customer = customerSnap.data() as Customer;
    if ((customer.balance || 0) > 0) {
      throw new Error('Customer cannot be deleted while a pending amount exists');
    }

    await deleteDoc(customerRef);
  },

  async getCustomerReturnEligibility(orgId: string, customerId: string) {
    const salesQuery = query(collection(db, `organizations/${orgId}/sales`), where('customerId', '==', customerId));
    const returnsQuery = query(collection(db, `organizations/${orgId}/customerReturns`), where('customerId', '==', customerId));

    const [salesSnapshot, returnsSnapshot] = await Promise.all([
      getDocs(salesQuery),
      getDocs(returnsQuery),
    ]);

    const soldByItem: Record<string, number> = {};
    const returnedByItem: Record<string, number> = {};

    salesSnapshot.docs.forEach((saleDoc) => {
      const sale = saleDoc.data() as Sale;
      sale.items.forEach((line) => {
        soldByItem[line.itemId] = (soldByItem[line.itemId] || 0) + line.quantity;
      });
    });

    returnsSnapshot.docs.forEach((returnDoc) => {
      const customerReturn = returnDoc.data() as CustomerReturn;
      customerReturn.items.forEach((line) => {
        returnedByItem[line.itemId] = (returnedByItem[line.itemId] || 0) + line.quantity;
      });
    });

    const eligibility: Record<string, { sold: number; returned: number; remaining: number }> = {};

    Object.entries(soldByItem).forEach(([itemId, sold]) => {
      const returned = returnedByItem[itemId] || 0;
      eligibility[itemId] = {
        sold,
        returned,
        remaining: Math.max(sold - returned, 0),
      };
    });

    return eligibility;
  },

  async createCustomerReturn(
    orgId: string,
    userId: string,
    data: {
      customerId: string;
      locationId: string;
      items: ReturnLine[];
      reason: string;
    }
  ) {
    const eligibility = await this.getCustomerReturnEligibility(orgId, data.customerId);

    data.items.forEach((line) => {
      const remaining = eligibility[line.itemId]?.remaining || 0;
      if (line.quantity > remaining) {
        throw new Error('Return quantity cannot exceed the quantity purchased by this customer');
      }
    });

    return await runTransaction(db, async (transaction) => {
      const returnRef = doc(collection(db, `organizations/${orgId}/customerReturns`));
      const returnRecord: CustomerReturn = {
        id: returnRef.id,
        orgId,
        customerId: data.customerId,
        locationId: data.locationId,
        items: data.items,
        totalAmount: data.items.reduce((sum, line) => sum + line.subtotal, 0),
        reason: data.reason,
        timestamp: Date.now(),
        userId,
      };

      for (const line of data.items) {
        const itemRef = doc(db, `organizations/${orgId}/items`, line.itemId);
        const summaryRef = doc(db, 'organizations', orgId, 'stockSummaries', `${line.itemId}_${data.locationId}`);
        const [itemSnap, summarySnap] = await Promise.all([
          transaction.get(itemRef),
          transaction.get(summaryRef),
        ]);

        if (!itemSnap.exists()) {
          throw new Error(`Item ${line.itemId} not found`);
        }

        const currentStock = itemSnap.data().currentStock || 0;
        const currentLocStock = summarySnap.exists() ? summarySnap.data().quantity : 0;

        transaction.update(itemRef, {
          currentStock: currentStock + line.quantity,
        });

        transaction.set(summaryRef, {
          itemId: line.itemId,
          locationId: data.locationId,
          quantity: currentLocStock + line.quantity,
        }, { merge: true });

        const invTransRef = doc(collection(db, `organizations/${orgId}/transactions`));
        const invTrans: InventoryTransaction = {
          id: invTransRef.id,
          orgId,
          itemId: line.itemId,
          type: 'CUSTOMER_RETURN',
          destinationLocationId: data.locationId,
          quantity: line.quantity,
          unitSellPrice: line.unitPrice,
          referenceId: returnRef.id,
          userId,
          timestamp: Date.now(),
          notes: `Customer Return: ${data.reason}`,
          status: 'completed',
        };
        transaction.set(invTransRef, invTrans);
      }

      transaction.set(returnRef, returnRecord);
      return returnRecord;
    });
  },

  async createCustomerBalanceTransaction(
    orgId: string,
    userId: string,
    data: {
      customerId: string;
      amount: number;
      action: 'collect-payment' | 'add-due' | 'write-off';
      paymentMethod?: 'cash' | 'bank' | 'cheque';
      notes?: string;
    }
  ) {
    return await runTransaction(db, async (transaction) => {
      const customerRef = doc(db, `organizations/${orgId}/customers`, data.customerId);
      const paymentRef = doc(collection(db, `organizations/${orgId}/payments`));
      const customerSnap = await transaction.get(customerRef);

      if (!customerSnap.exists()) throw new Error('Customer not found');
      if (!Number.isFinite(data.amount) || data.amount <= 0) {
        throw new Error('Amount must be greater than zero');
      }

      const customer = customerSnap.data() as Customer;
      const currentBalance = customer.balance || 0;

      let balanceDelta = 0;
      let direction: PaymentRecord['direction'] = 'payment_received';

      if (data.action === 'add-due') {
        balanceDelta = data.amount;
        direction = 'balance_added';
      } else if (data.action === 'write-off') {
        if (data.amount > currentBalance) {
          throw new Error('Write-off amount cannot exceed the current customer balance');
        }
        balanceDelta = -data.amount;
        direction = 'write_off';
      } else {
        if (data.amount > currentBalance) {
          throw new Error('Collected amount cannot exceed the current customer balance');
        }
        balanceDelta = -data.amount;
        direction = 'payment_received';
      }

      const nextBalance = currentBalance + balanceDelta;

      transaction.update(customerRef, {
        balance: nextBalance,
      });

      const paymentRecord: PaymentRecord = {
        id: paymentRef.id,
        orgId,
        entityType: 'customer',
        entityId: data.customerId,
        amount: data.amount,
        direction,
        balanceAfter: nextBalance,
        paymentMethod: data.paymentMethod || 'cash',
        timestamp: Date.now(),
        userId,
        notes: data.notes || '',
      };

      transaction.set(paymentRef, paymentRecord);

      return paymentRecord;
    });
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

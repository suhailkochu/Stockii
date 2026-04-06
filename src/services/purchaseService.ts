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
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { Supplier, Purchase, InventoryTransaction } from '../types';
import { inventoryService } from './inventoryService';

export const purchaseService = {
  async getSuppliers(orgId: string) {
    const q = query(collection(db, `organizations/${orgId}/suppliers`), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
  },

  async createSupplier(orgId: string, supplierData: Partial<Supplier>) {
    const supplierRef = doc(collection(db, `organizations/${orgId}/suppliers`));
    const newSupplier = {
      ...supplierData,
      id: supplierRef.id,
      orgId,
      balance: supplierData.balance || 0,
    };
    await setDoc(supplierRef, newSupplier);
    return newSupplier;
  },

  async createPurchase(orgId: string, purchaseData: Omit<Purchase, 'id' | 'timestamp'>) {
    return await runTransaction(db, async (transaction) => {
      const purchaseRef = doc(collection(db, `organizations/${orgId}/purchases`));
      const supplierRef = doc(db, `organizations/${orgId}/suppliers`, purchaseData.supplierId);
      
      const supplierSnap = await transaction.get(supplierRef);
      if (!supplierSnap.exists()) throw new Error('Supplier not found');
      
      const currentBalance = supplierSnap.data().balance || 0;
      const outstandingAmount = purchaseData.totalAmount - purchaseData.paidAmount;

      // 1. Create Purchase Record
      const purchase: Purchase = {
        ...purchaseData,
        id: purchaseRef.id,
        timestamp: Date.now(),
      };
      transaction.set(purchaseRef, purchase);

      // 2. Update Supplier Balance if credit
      if (outstandingAmount > 0) {
        transaction.update(supplierRef, {
          balance: currentBalance + outstandingAmount
        });
      }

      // 3. Update Stock for each item
      for (const line of purchaseData.items) {
        const itemRef = doc(db, `organizations/${orgId}/items`, line.itemId);
        const summaryRef = doc(db, 'organizations', orgId, 'stockSummaries', `${line.itemId}_${purchaseData.locationId}`);
        
        const [itemSnap, summarySnap] = await Promise.all([
          transaction.get(itemRef),
          transaction.get(summaryRef)
        ]);

        if (!itemSnap.exists()) throw new Error(`Item ${line.itemId} not found`);
        
        const currentStock = itemSnap.data().currentStock || 0;
        const currentLocStock = summarySnap.exists() ? summarySnap.data().quantity : 0;

        transaction.update(itemRef, {
          currentStock: currentStock + line.quantity,
          basePrice: line.unitCost // Update buying price
        });

        transaction.set(summaryRef, {
          itemId: line.itemId,
          locationId: purchaseData.locationId,
          quantity: currentLocStock + line.quantity
        }, { merge: true });

        // 4. Create Inventory Transaction
        const invTransRef = doc(collection(db, `organizations/${orgId}/transactions`));
        const invTrans: InventoryTransaction = {
          id: invTransRef.id,
          orgId,
          itemId: line.itemId,
          type: 'PURCHASE_IN',
          destinationLocationId: purchaseData.locationId,
          quantity: line.quantity,
          unitCost: line.unitCost,
          referenceId: purchaseRef.id,
          userId: purchaseData.userId,
          timestamp: Date.now(),
          status: 'completed'
        };
        transaction.set(invTransRef, invTrans);
      }

      return purchase;
    });
  }
};

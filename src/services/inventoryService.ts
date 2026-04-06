import { 
  collection, 
  doc, 
  runTransaction, 
  increment, 
  serverTimestamp,
  getDoc,
  setDoc,
  addDoc,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { InventoryTransaction, TransactionType, Item } from '../types';

export const inventoryService = {
  /**
   * Core Transaction Engine
   * Handles all stock movements and ensures item currentStock is updated atomically.
   */
  async createTransaction(
    orgId: string,
    userId: string,
    params: {
      itemId: string;
      type: TransactionType;
      quantity: number;
      sourceLocationId?: string;
      destinationLocationId?: string;
      unitCost?: number;
      unitSellPrice?: number;
      referenceId?: string;
      notes?: string;
    }
  ) {
    const itemRef = doc(db, 'organizations', orgId, 'items', params.itemId);
    const transactionsRef = collection(db, 'organizations', orgId, 'transactions');

    return runTransaction(db, async (transaction) => {
      const itemSnap = await transaction.get(itemRef);
      if (!itemSnap.exists()) {
        throw new Error('Item not found');
      }

      const itemData = itemSnap.data() as Item;
      let stockChange = 0;

      // Logic for stock change based on transaction type
      switch (params.type) {
        case 'PURCHASE_IN':
        case 'ADJUSTMENT_IN':
        case 'CUSTOMER_RETURN':
        case 'TRUCK_RETURN':
          stockChange = params.quantity;
          break;
        case 'SALE_OUT':
        case 'ADJUSTMENT_OUT':
        case 'DAMAGE_OUT':
          stockChange = -params.quantity;
          break;
        case 'TRANSFER':
        case 'TRUCK_ASSIGNMENT':
          // Transfers don't change total stock, but we might track location-wise stock later
          stockChange = 0;
          break;
      }

      // Guard against negative stock (unless adjustment)
      if (params.type !== 'ADJUSTMENT_IN' && params.type !== 'ADJUSTMENT_OUT') {
        if (itemData.currentStock + stockChange < 0) {
          throw new Error('Insufficient stock for this operation');
        }
      }

      // Create transaction record
      const newTransactionRef = doc(transactionsRef);
      const transactionData: InventoryTransaction = {
        id: newTransactionRef.id,
        orgId,
        itemId: params.itemId,
        type: params.type,
        sourceLocationId: params.sourceLocationId,
        destinationLocationId: params.destinationLocationId,
        quantity: params.quantity,
        unitCost: params.unitCost,
        unitSellPrice: params.unitSellPrice,
        referenceId: params.referenceId,
        userId,
        timestamp: Date.now(),
        notes: params.notes,
        status: 'completed'
      };

      transaction.set(newTransactionRef, transactionData);

      // Update item stock
      if (stockChange !== 0) {
        transaction.update(itemRef, {
          currentStock: increment(stockChange)
        });
      }

      // Update location-wise stock summaries
      if (params.sourceLocationId) {
        const sourceSummaryRef = doc(db, 'organizations', orgId, 'stockSummaries', `${params.itemId}_${params.sourceLocationId}`);
        transaction.set(sourceSummaryRef, {
          itemId: params.itemId,
          locationId: params.sourceLocationId,
          quantity: increment(-params.quantity)
        }, { merge: true });
      }

      if (params.destinationLocationId) {
        const destSummaryRef = doc(db, 'organizations', orgId, 'stockSummaries', `${params.itemId}_${params.destinationLocationId}`);
        transaction.set(destSummaryRef, {
          itemId: params.itemId,
          locationId: params.destinationLocationId,
          quantity: increment(params.quantity)
        }, { merge: true });
      }

      // Special case for types that don't have explicit source/dest but affect stock
      // e.g. PURCHASE_IN usually goes to a default warehouse if not specified
      // But we'll assume the caller provides source/dest for all inventory-affecting actions now.
      
      return transactionData;
    });
  },

  async getStockByLocation(orgId: string, locationId: string) {
    const q = query(
      collection(db, 'organizations', orgId, 'stockSummaries'),
      where('locationId', '==', locationId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as any);
  },

  async getTransactions(orgId: string, limitCount = 50) {
    const q = query(
      collection(db, 'organizations', orgId, 'transactions'),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as InventoryTransaction);
  },

  async getItems(orgId: string) {
    const q = query(collection(db, 'organizations', orgId, 'items'), orderBy('name'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Item);
  },

  async getLocations(orgId: string) {
    const q = query(collection(db, 'organizations', orgId, 'locations'), orderBy('name'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as any);
  },

  async getCategories(orgId: string) {
    const q = query(collection(db, 'organizations', orgId, 'categories'), orderBy('name'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as any);
  },

  async createItem(orgId: string, item: Partial<Item>) {
    const itemsRef = collection(db, 'organizations', orgId, 'items');
    const newDoc = doc(itemsRef);
    const newItem = {
      ...item,
      id: newDoc.id,
      orgId,
      currentStock: item.currentStock || 0,
      createdAt: Date.now(),
      isActive: true
    };
    await setDoc(newDoc, newItem);
    return newItem;
  },

  async createCategory(orgId: string, name: string, description?: string) {
    const catsRef = collection(db, 'organizations', orgId, 'categories');
    const newDoc = doc(catsRef);
    const newCat = {
      id: newDoc.id,
      orgId,
      name,
      description,
    };
    await setDoc(newDoc, newCat);
    return newCat;
  }
};

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Truck, InventoryLocation } from '../types';

export const truckService = {
  async createTruck(orgId: string, data: Omit<Truck, 'id' | 'orgId' | 'createdAt'>) {
    const locationsRef = collection(db, 'organizations', orgId, 'locations');
    const trucksRef = collection(db, 'organizations', orgId, 'trucks');

    // 1. Create the InventoryLocation first
    const newLocationRef = doc(locationsRef);
    const locationData: InventoryLocation = {
      id: newLocationRef.id,
      orgId,
      name: data.name,
      type: 'truck',
      isDefault: false
    };
    await setDoc(newLocationRef, locationData);

    // 2. Create the Truck record
    const newTruckRef = doc(trucksRef);
    const truckData: Truck = {
      ...data,
      id: newTruckRef.id,
      orgId,
      locationId: newLocationRef.id,
      createdAt: Date.now()
    };
    await setDoc(newTruckRef, truckData);

    return truckData;
  },

  async getTrucks(orgId: string) {
    const q = query(collection(db, 'organizations', orgId, 'trucks'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Truck);
  },

  async getTruck(orgId: string, truckId: string) {
    const docRef = doc(db, 'organizations', orgId, 'trucks', truckId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Truck;
  },

  async updateTruck(orgId: string, truckId: string, data: Partial<Truck>) {
    const docRef = doc(db, 'organizations', orgId, 'trucks', truckId);
    await updateDoc(docRef, data);

    // If name changed, update the location name too
    if (data.name && data.locationId) {
      const locRef = doc(db, 'organizations', orgId, 'locations', data.locationId);
      await updateDoc(locRef, { name: data.name });
    }
  },

  async deleteTruck(orgId: string, truckId: string, locationId: string) {
    // Note: In a real app, we'd check if there's stock before deleting
    await deleteDoc(doc(db, 'organizations', orgId, 'trucks', truckId));
    await deleteDoc(doc(db, 'organizations', orgId, 'locations', locationId));
  }
};

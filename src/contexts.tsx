import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, collection, query, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, Membership, Organization } from './types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        // Sync user profile
        const userRef = doc(db, 'users', fUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const newUser: User = {
            uid: fUser.uid,
            email: fUser.email || '',
            displayName: fUser.displayName || 'User',
            photoURL: fUser.photoURL || undefined,
            createdAt: Date.now(),
          };
          await setDoc(userRef, newUser);
          setUser(newUser);
        } else {
          setUser(userSnap.data() as User);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface TenancyContextType {
  currentOrg: Organization | null;
  membership: Membership | null;
  orgs: Organization[];
  switchOrg: (orgId: string) => void;
  createOrganization: (name: string) => Promise<void>;
  loading: boolean;
}

const TenancyContext = createContext<TenancyContextType | undefined>(undefined);

export function TenancyProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrgs([]);
      setMemberships([]);
      setCurrentOrg(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'memberships'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const membershipData = snapshot.docs.map(doc => doc.data() as Membership);
      setMemberships(membershipData);
      
      if (membershipData.length === 0) {
        setOrgs([]);
        setCurrentOrg(null);
        setMembership(null);
        setLoading(false);
        return;
      }

      // Fetch organization details for each membership
      const orgPromises = membershipData.map(m => getDoc(doc(db, 'organizations', m.orgId)));
      const orgSnaps = await Promise.all(orgPromises);
      const userOrgs = orgSnaps
        .filter(snap => snap.exists())
        .map(snap => snap.data() as Organization);
      
      setOrgs(userOrgs);

      // Auto-select first org if none selected
      if (userOrgs.length > 0 && !currentOrg) {
        setCurrentOrg(userOrgs[0]);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Sync membership when currentOrg or memberships change
  useEffect(() => {
    if (currentOrg && memberships.length > 0) {
      const currentMem = memberships.find(m => m.orgId === currentOrg.id);
      setMembership(currentMem || null);
    } else {
      setMembership(null);
    }
  }, [currentOrg, memberships]);

  const createOrganization = async (name: string) => {
    if (!user) return;

    const orgRef = doc(collection(db, 'organizations'));
    const orgId = orgRef.id;
    
    const newOrg: Organization = {
      id: orgId,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      ownerId: user.uid,
      createdAt: Date.now(),
      settings: {
        currency: 'USD',
        taxEnabled: false,
        taxRate: 0,
        modules: {
          purchases: true,
          sales: true,
          inventory: true,
          finance: true,
          returns: true,
          damages: true,
          customerCredit: true,
          supplierCredit: true,
          pdfInvoices: true,
          truckInventory: false,
          staffManagement: false,
          advancedReports: false,
          alerts: false,
        }
      }
    };

    const newMembership: Membership = {
      id: `${user.uid}_${orgId}`,
      orgId,
      userId: user.uid,
      role: 'owner',
      joinedAt: Date.now(),
    };

    // Create default location
    const locationRef = doc(collection(db, `organizations/${orgId}/locations`));
    const defaultLocation = {
      id: locationRef.id,
      orgId,
      name: 'Main Warehouse',
      type: 'warehouse',
      isDefault: true,
    };

    await Promise.all([
      setDoc(orgRef, newOrg),
      setDoc(doc(db, 'memberships', newMembership.id), newMembership),
      setDoc(locationRef, defaultLocation),
    ]);

    setCurrentOrg(newOrg);
  };

  const switchOrg = async (orgId: string) => {
    const org = orgs.find(o => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
    } else {
      // Fallback: fetch if not in list
      const orgRef = doc(db, 'organizations', orgId);
      const orgSnap = await getDoc(orgRef);
      if (orgSnap.exists()) {
        setCurrentOrg(orgSnap.data() as Organization);
      }
    }
  };

  return (
    <TenancyContext.Provider value={{ currentOrg, membership, orgs, switchOrg, createOrganization, loading: loading || authLoading }}>
      {children}
    </TenancyContext.Provider>
  );
}

export function useTenancy() {
  const context = useContext(TenancyContext);
  if (context === undefined) {
    throw new Error('useTenancy must be used within a TenancyProvider');
  }
  return context;
}

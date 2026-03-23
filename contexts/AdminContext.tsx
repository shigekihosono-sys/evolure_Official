
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Serum, Ampoule, LogEntry, UserSession, LogEventType, ChatMessage, Product, MasterConfig, MasterConfigCategory } from '../types';
import { SERUM_A, SERUM_B, SERUM_C, FOUNDATION_AMPOULES, PERFORMANCE_AMPOULES, SKIN_CONCERNS, IDEAL_SKIN_GOALS, LIFESTYLE_FACTORS, INVESTIGATION_DISSATISFACTIONS, TROUBLE_HISTORY_OPTIONS, CONCERN_TIMINGS, CURRENT_LACKS, PRODUCT_USAGE_DURATIONS } from '../constants';
import { auth, googleProvider, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, setDoc, getDocs, getDocFromServer } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively removes undefined values from an object to make it Firestore-compatible.
 */
const sanitizeForFirestore = (data: any): any => {
    if (data === undefined) return null;
    if (data === null || typeof data !== 'object') return data;
    
    if (Array.isArray(data)) {
        return data.map(sanitizeForFirestore);
    }

    const sanitized: any = {};
    Object.keys(data).forEach(key => {
        const value = data[key];
        if (value !== undefined) {
            sanitized[key] = sanitizeForFirestore(value);
        }
    });
    return sanitized;
};

interface AdminContextType {
    products: {
        serums: Serum[];
        foundationAmpoules: Ampoule[];
        performanceAmpoules: Ampoule[];
    };
    sessions: UserSession[];
    logs: LogEntry[];
    masterConfigs: MasterConfig[];
    addProduct: (type: 'serum' | 'foundation' | 'performance', product: Serum | Ampoule) => void;
    updateProduct: (type: 'serum' | 'foundation' | 'performance', product: Serum | Ampoule) => void;
    deleteProduct: (type: 'serum' | 'foundation' | 'performance', id: string) => void;
    addMasterConfig: (config: Omit<MasterConfig, 'id'>) => Promise<void>;
    updateMasterConfig: (id: string, config: Partial<MasterConfig>) => Promise<void>;
    deleteMasterConfig: (id: string) => Promise<void>;
    seedMasterConfigs: () => Promise<void>;
    logEvent: (sessionId: string, type: LogEventType, payload?: any) => void;
    updateSession: (sessionId: string, data: Partial<UserSession>) => void;
    currentSessionId: string;
    // Auth
    user: User | null;
    isAdmin: boolean;
    isAuthLoading: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const STORAGE_KEYS = {
    PRODUCTS: 'evolure_products',
    LOGS: 'evolure_logs',
    SESSIONS: 'evolure_sessions'
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initial State: Load synchronously to prevent flash of empty content
    const [serums, setSerums] = useState<Serum[]>([]);
    const [foundationAmpoules, setFoundationAmpoules] = useState<Ampoule[]>([]);
    const [performanceAmpoules, setPerformanceAmpoules] = useState<Ampoule[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [masterConfigs, setMasterConfigs] = useState<MasterConfig[]>([]);

    const [currentSessionId] = useState<string>(`sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    
    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    const login = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error('Login failed', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser && currentUser.email?.endsWith('@kaian.jp')) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
            setIsAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Test connection
    useEffect(() => {
        const testConnection = async () => {
            try {
                await getDocFromServer(doc(db, 'test', 'connection'));
            } catch (error) {
                if (error instanceof Error && error.message.includes('the client is offline')) {
                    console.error("Please check your Firebase configuration. The client is offline.");
                } else {
                    console.error("Firebase connection test failed:", error);
                }
            }
        };
        testConnection();
    }, []);

    // Load Products from Firestore
    useEffect(() => {
        const path = 'products';
        const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
            const allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            
            const firestoreSerums = allProducts.filter(p => p.type === 'serum') as Serum[];
            const firestoreFoundation = allProducts.filter(p => p.type === 'foundation') as Ampoule[];
            const firestorePerformance = allProducts.filter(p => p.type === 'performance') as Ampoule[];

            const mergeWithDefaults = <T extends { id: string }>(firestoreItems: T[], defaults: T[]): T[] => {
                const merged = [...defaults];
                firestoreItems.forEach(item => {
                    const index = merged.findIndex(d => d.id === item.id);
                    if (index !== -1) {
                        merged[index] = item;
                    } else {
                        merged.push(item);
                    }
                });
                return merged;
            };

            setSerums(mergeWithDefaults(firestoreSerums, [SERUM_A, SERUM_B, SERUM_C]));
            setFoundationAmpoules(mergeWithDefaults(firestoreFoundation, [...FOUNDATION_AMPOULES]));
            setPerformanceAmpoules(mergeWithDefaults(firestorePerformance, [...PERFORMANCE_AMPOULES]));
        });
        return () => unsubscribe();
    }, []);

    // Load Sessions from Firestore (Admins only)
    useEffect(() => {
        if (!isAdmin) {
            setSessions([]);
            return;
        }
        const path = 'sessions';
        const q = query(collection(db, path), orderBy('lastActive', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const s = snapshot.docs.map(doc => doc.data() as UserSession);
            setSessions(s);
        });
        return () => unsubscribe();
    }, [isAdmin]);

    // Load Logs from Firestore (Admins only)
    useEffect(() => {
        if (!isAdmin) {
            setLogs([]);
            return;
        }
        const path = 'logs';
        const q = query(collection(db, path), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const l = snapshot.docs.map(doc => doc.data() as LogEntry);
            setLogs(l);
        });
        return () => unsubscribe();
    }, [isAdmin]);

    // Load Master Configs from Firestore
    useEffect(() => {
        const path = 'master_configs';
        const q = query(collection(db, path), orderBy('order', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const configs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterConfig));
            setMasterConfigs(configs);

            // If empty, seed with defaults
            if (configs.length === 0 && isAdmin) {
                seedMasterConfigs();
            }
        }, (error) => {
            if (error.message.includes('permissions')) {
                handleFirestoreError(error, OperationType.LIST, path);
            } else {
                console.error("Master Configs error:", error);
            }
        });
        return () => unsubscribe();
    }, [isAdmin]);

    const seedMasterConfigs = async () => {
        const path = 'master_configs';
        const defaults: Omit<MasterConfig, 'id'>[] = [
            ...SKIN_CONCERNS.map((label, i) => ({ category: 'skin_concerns' as MasterConfigCategory, label, order: i, isActive: true })),
            ...IDEAL_SKIN_GOALS.map((goal, i) => ({ category: 'ideal_goals' as MasterConfigCategory, label: goal.label, description: goal.description || '', order: i, isActive: true })),
            ...LIFESTYLE_FACTORS.map((label, i) => ({ category: 'lifestyle_factors' as MasterConfigCategory, label, order: i, isActive: true })),
            ...INVESTIGATION_DISSATISFACTIONS.map((label, i) => ({ category: 'dissatisfactions' as MasterConfigCategory, label, order: i, isActive: true })),
            ...TROUBLE_HISTORY_OPTIONS.map((label, i) => ({ category: 'trouble_history' as MasterConfigCategory, label, order: i, isActive: true })),
            ...CONCERN_TIMINGS.map((label, i) => ({ category: 'concern_timings' as MasterConfigCategory, label, order: i, isActive: true })),
            ...CURRENT_LACKS.map((label, i) => ({ category: 'current_lacks' as MasterConfigCategory, label, order: i, isActive: true })),
            ...PRODUCT_USAGE_DURATIONS.map((label, i) => ({ category: 'usage_durations' as MasterConfigCategory, label, order: i, isActive: true })),
        ];

        try {
            for (const config of defaults) {
                const newDocRef = doc(collection(db, path));
                await setDoc(newDocRef, { ...config, id: newDocRef.id });
            }
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, path);
        }
    };

    const addMasterConfig = async (config: Omit<MasterConfig, 'id'>) => {
        const path = 'master_configs';
        try {
            const newDocRef = doc(collection(db, path));
            await setDoc(newDocRef, { ...config, id: newDocRef.id });
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, path);
        }
    };

    const updateMasterConfig = async (id: string, config: Partial<MasterConfig>) => {
        const path = `master_configs/${id}`;
        try {
            await setDoc(doc(db, 'master_configs', id), sanitizeForFirestore(config), { merge: true });
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
        }
    };

    const deleteMasterConfig = async (id: string) => {
        const path = `master_configs/${id}`;
        try {
            await deleteDoc(doc(db, 'master_configs', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, path);
        }
    };

    // Initialize current session on mount
    useEffect(() => {
        updateSession(currentSessionId, {
            sessionId: currentSessionId,
            startTime: Date.now(),
            lastActive: Date.now(),
            status: 'active',
            currentStep: 'welcome',
            demographics: {},
            chatHistory: []
        });
        logEvent(currentSessionId, 'SESSION_START');
    }, [currentSessionId]);

    // Persist products when changed
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify({
            serums,
            foundationAmpoules,
            performanceAmpoules
        }));
    }, [serums, foundationAmpoules, performanceAmpoules]);

    // Persist logs and sessions
    useEffect(() => {
        if (logs.length > 0) localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(-2000)));
    }, [logs]);

    useEffect(() => {
        if (sessions.length > 0) localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions.slice(-200)));
    }, [sessions]);

    const addProduct = async (type: 'serum' | 'foundation' | 'performance', product: Serum | Ampoule) => {
        const path = 'products';
        try {
            await setDoc(doc(db, path, product.id), sanitizeForFirestore({ ...product, type }));
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, path);
        }
    };

    const updateProduct = async (type: 'serum' | 'foundation' | 'performance', product: Serum | Ampoule) => {
        const path = `products/${product.id}`;
        try {
            await setDoc(doc(db, 'products', product.id), sanitizeForFirestore({ ...product, type }), { merge: true });
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
        }
    };

    const deleteProduct = async (type: 'serum' | 'foundation' | 'performance', id: string) => {
        const path = `products/${id}`;
        try {
            await deleteDoc(doc(db, 'products', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, path);
        }
    };

    const logEvent = useCallback(async (sessionId: string, type: LogEventType, payload?: any) => {
        const path = 'logs';
        const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newLog: LogEntry = {
            id,
            sessionId,
            timestamp: Date.now(),
            type,
            payload: payload === undefined ? null : sanitizeForFirestore(payload)
        };
        
        // Optimistic update for local UI if needed, but we rely on Firestore for admin
        try {
            await setDoc(doc(db, path, id), sanitizeForFirestore(newLog));
        } catch (error) {
            if (error instanceof Error && error.message.includes('permissions')) {
                handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
            } else {
                console.error("Failed to log event to Firestore:", error);
            }
        }
    }, []);

    const updateSession = useCallback(async (sessionId: string, data: Partial<UserSession>) => {
        const path = `sessions/${sessionId}`;
        try {
            const sessionRef = doc(db, 'sessions', sessionId);
            const sanitizedData = sanitizeForFirestore(data);
            
            await setDoc(sessionRef, { 
                ...sanitizedData, 
                lastActive: Date.now(),
                // Ensure basic fields exist if it's a new session
                sessionId: sessionId,
                startTime: sanitizedData.startTime || Date.now(),
                status: sanitizedData.status || 'active'
            }, { merge: true });
        } catch (error) {
            if (error instanceof Error && error.message.includes('permissions')) {
                handleFirestoreError(error, OperationType.WRITE, `sessions/${sessionId}`);
            } else {
                console.error("Failed to update session in Firestore:", error);
            }
        }
    }, []);

    return (
        <AdminContext.Provider value={{
            products: { serums, foundationAmpoules, performanceAmpoules },
            sessions,
            logs,
            addProduct,
            updateProduct,
            deleteProduct,
            logEvent,
            updateSession,
            currentSessionId,
            masterConfigs,
            addMasterConfig,
            updateMasterConfig,
            deleteMasterConfig,
            seedMasterConfigs,
            user,
            isAdmin,
            isAuthLoading,
            login,
            logout
        }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};

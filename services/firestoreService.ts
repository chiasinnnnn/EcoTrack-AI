
import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  getDocs,
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp 
} from "firebase/firestore";
import { HistoryItem, WasteAnalysis } from "../types";

const COLLECTION_NAME = "scans";
const LOCAL_STORAGE_KEY = "ecotrack_history_fallback";

// Helper to manage local fallback
const getLocalHistory = (): HistoryItem[] => {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveToLocal = (item: HistoryItem) => {
  const history = getLocalHistory();
  const updated = [item, ...history].slice(0, 50);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
};

let isFirestoreAvailable = true;

export const saveScanToFirestore = async (userId: string, image: string, result: WasteAnalysis) => {
  // Always save to local first as a fallback/cache
  const localItem: HistoryItem = {
    id: `local_${Date.now()}`,
    timestamp: Date.now(),
    image,
    result
  };
  saveToLocal(localItem);

  if (!isFirestoreAvailable) return;

  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      userId,
      image, 
      result,
      timestamp: Timestamp.now()
    });
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      isFirestoreAvailable = false;
      console.warn("Firestore access denied. Switching to Local Mode for this session. To fix this, update your Firestore Security Rules.");
    } else {
      console.error("Firestore save error:", error);
    }
  }
};

export const getHistoryFromFirestore = async (userId: string): Promise<HistoryItem[]> => {
  if (!isFirestoreAvailable) return getLocalHistory();

  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => ({
      id: doc.id,
      timestamp: doc.data().timestamp.toMillis(),
      image: doc.data().image,
      result: doc.data().result
    }));
    
    return items.length > 0 ? items : getLocalHistory();
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      isFirestoreAvailable = false;
      console.warn("Firestore access denied. Using Local History.");
    } else {
      console.error("Firestore fetch error:", error);
    }
    return getLocalHistory();
  }
};

export const subscribeToUserHistory = (userId: string, callback: (items: HistoryItem[]) => void) => {
  if (!isFirestoreAvailable) {
    callback(getLocalHistory());
    return () => {};
  }

  const q = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(50)
  );

  return onSnapshot(q, {
    next: (snapshot) => {
      const items: HistoryItem[] = snapshot.docs.map(doc => ({
        id: doc.id,
        timestamp: doc.data().timestamp.toMillis(),
        image: doc.data().image,
        result: doc.data().result
      }));
      callback(items.length > 0 ? items : getLocalHistory());
    },
    error: (error: any) => {
      if (error.code === 'permission-denied') {
        isFirestoreAvailable = false;
        console.warn("Firestore subscription denied. Falling back to Local Mode.");
        callback(getLocalHistory());
      } else {
        console.error("Firestore subscription error:", error);
      }
    }
  });
};

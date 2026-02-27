
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
  Timestamp,
  doc,
  deleteDoc
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
    const remoteItems = querySnapshot.docs.map(doc => ({
      id: doc.id,
      timestamp: doc.data().timestamp.toMillis(),
      image: doc.data().image,
      result: doc.data().result
    }));
    
    const localItems = getLocalHistory();
    const merged = [...remoteItems];
    localItems.forEach(local => {
      if (!remoteItems.some(remote => remote.image === local.image)) {
        merged.push(local);
      }
    });
    merged.sort((a, b) => b.timestamp - a.timestamp);
    
    return merged.slice(0, 50);
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
      const remoteItems: HistoryItem[] = snapshot.docs.map(doc => ({
        id: doc.id,
        timestamp: doc.data().timestamp.toMillis(),
        image: doc.data().image,
        result: doc.data().result
      }));
      
      const localItems = getLocalHistory();
      
      // Merge: Keep all remote items, and add local items that aren't in remote yet (by image matching)
      const merged = [...remoteItems];
      localItems.forEach(local => {
        const isAlreadyInRemote = remoteItems.some(remote => remote.image === local.image);
        if (!isAlreadyInRemote) {
          merged.push(local);
        }
      });
      
      // Sort by timestamp desc
      merged.sort((a, b) => b.timestamp - a.timestamp);
      
      callback(merged.slice(0, 50));
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

export const deleteScanFromFirestore = async (id: string) => {
  // Remove from local first
  const history = getLocalHistory();
  const updated = history.filter(item => item.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

  if (!isFirestoreAvailable || id.startsWith('local_') || id.startsWith('temp_')) return;

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error("Firestore delete error:", error);
  }
};

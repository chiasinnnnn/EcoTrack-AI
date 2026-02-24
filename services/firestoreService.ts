
import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp 
} from "firebase/firestore";
import { HistoryItem, WasteAnalysis } from "../types";

const COLLECTION_NAME = "scans";

export const saveScanToFirestore = async (userId: string, image: string, result: WasteAnalysis) => {
  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      userId,
      image, // Note: In production, consider saving image to Firebase Storage and storing URL here
      result,
      timestamp: Timestamp.now()
    });
  } catch (error) {
    console.error("Error saving to Firestore:", error);
  }
};

export const subscribeToUserHistory = (userId: string, callback: (items: HistoryItem[]) => void) => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const items: HistoryItem[] = snapshot.docs.map(doc => ({
      id: doc.id,
      timestamp: doc.data().timestamp.toMillis(),
      image: doc.data().image,
      result: doc.data().result
    }));
    callback(items);
  });
};

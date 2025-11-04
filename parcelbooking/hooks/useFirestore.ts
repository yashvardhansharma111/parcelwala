/**
 * Generic Firestore Helper Hook
 * Provides common Firestore operations
 */

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { getFirestoreInstance } from "../services/firebaseInit";

/**
 * Generic hook to subscribe to a Firestore collection
 */
export const useFirestoreCollection = <T>(
  collectionName: string,
  filters?: { field: string; operator: any; value: any }[],
  orderByField?: string
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const db = getFirestoreInstance();
      const collectionRef = collection(db, collectionName);
      let q: any = query(collectionRef);

      // Apply filters
      if (filters && filters.length > 0) {
        filters.forEach((filter) => {
          q = query(q, where(filter.field, filter.operator, filter.value));
        });
      }

      // Apply ordering
      if (orderByField) {
        q = query(q, orderBy(orderByField, "desc"));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as T[];
          setData(items);
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [collectionName, JSON.stringify(filters), orderByField]);

  return { data, loading, error };
};


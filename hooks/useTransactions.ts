"use client";

import { useEffect, useState } from "react";
import {
  collection, query, where, orderBy, onSnapshot, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transaction } from "@/types";
import { getPayPeriodStart, getPayPeriodKey } from "@/lib/calculations";

export function useTransactions(
  coupleId: string | undefined,
  paydayType: "date" | "end_of_month",
  paydayDate: number | undefined
) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) return;

    // Use current date to determine current period, don't strictly filter yet
    const periodStart = getPayPeriodStart(paydayType, paydayDate);

    const q = query(
      collection(db, "transactions"),
      where("coupleId", "==", coupleId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, 
      (snap) => {
        const mappedTxs = snap.docs.map((d) => {
          const data = d.data();
          
          // Safe date parsing
          const createdAt = data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate() 
            : new Date();
            
          const payPeriodStart = data.payPeriodStart instanceof Timestamp
            ? data.payPeriodStart.toDate()
            : periodStart; 

          return {
            id: d.id,
            ...data,
            createdAt,
            payPeriodStart,
          } as Transaction;
        });
        
        // Only return transactions for the current viewing period
        const filtered = mappedTxs.filter((tx) => tx.createdAt >= periodStart);
        
        setTransactions(filtered);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Listener Error:", error);
        if (error.code === 'failed-precondition') {
          console.error("Missing Composite Index! Create it here: ", error.message);
        }
        setLoading(false);
      }
    );

    return () => unsub();
  }, [coupleId, paydayType, paydayDate]);

  return { transactions, loading };
}
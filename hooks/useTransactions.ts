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

    const periodStart = getPayPeriodStart(paydayType, paydayDate);
    const payPeriodKey = getPayPeriodKey(periodStart);

    const q = query(
  collection(db, "transactions"),
  where("coupleId", "==", coupleId),
  orderBy("createdAt", "desc")
);

    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt:      d.data().createdAt.toDate(),
        payPeriodStart: d.data().payPeriodStart.toDate(),
      })) as Transaction[];
      setTransactions(txs);
      setLoading(false);
    });

    return () => unsub();
  }, [coupleId, paydayType, paydayDate]);

  return { transactions, loading };
}
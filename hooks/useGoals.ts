"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Goal } from "@/types";

export function useGoals(coupleId: string | undefined) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) return;

    const q = query(
      collection(db, "couples", coupleId, "goals"),
      orderBy("priority", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt.toDate(),
        targetDate: d.data().targetDate?.toDate(),
      })) as Goal[];
      setGoals(data);
      setLoading(false);
    });

    return () => unsub();
  }, [coupleId]);

  return { goals, loading };
}
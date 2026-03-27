"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bucket } from "@/types";

export function useBuckets(coupleId: string | undefined) {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) return;

    const q = query(
      collection(db, "couples", coupleId, "buckets"),
      orderBy("order", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt.toDate(),
      })) as Bucket[];
      setBuckets(data);
      setLoading(false);
    });

    return () => unsub();
  }, [coupleId]);

  return { buckets, loading };
}
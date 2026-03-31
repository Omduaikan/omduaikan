"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/types";

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(doc(db, "users", user.uid), async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;

        // ── Auto-Heal: ซ่อมแซมข้อมูลบัญชีเก่าที่ไม่มี partnerId ──
        if (data.coupleId && !data.partnerId) {
          try {
            const coupleSnap = await getDoc(doc(db, "couples", data.coupleId));
            if (coupleSnap.exists()) {
              const coupleData = coupleSnap.data();
              const m1 = coupleData.member1;
              const m2 = coupleData.member2;
              
              let foundPartner = null;
              if (user.uid === m1 && m2) foundPartner = m2;
              if (user.uid === m2 && m1) foundPartner = m1;

              // ถ้าเจอ UID แฟนแล้ว ให้อัปเดตเข้า profile ทันที
              if (foundPartner) {
                await updateDoc(doc(db, "users", user.uid), { partnerId: foundPartner });
                data.partnerId = foundPartner; // อัปเดต state ในเครื่องทันทีไม่ต้องรอโหลดใหม่
                console.log("Auto-healed missing partnerId:", foundPartner);
              }
            }
          } catch (err) {
            console.error("Auto-heal failed:", err);
          }
        }

        setProfile(data);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  return { profile, loading };
}
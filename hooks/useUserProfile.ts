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

        // ── Auto-Heal 2: ซ่อมแซม coupleId ไม่ตรงกัน (เนื่องจากบั๊กเก่าตอน Setup) ──
        if (data.partnerId) {
          try {
            const partnerSnap = await getDoc(doc(db, "users", data.partnerId));
            if (partnerSnap.exists()) {
              const partnerData = partnerSnap.data() as UserProfile;
              // ถ้า coupleId ของเราไม่ตรงกับของแฟน
              if (partnerData.coupleId && data.coupleId !== partnerData.coupleId) {
                // ให้ยึด coupleId ของคนที่สมัครก่อน (โดยเช็คว่า coupleId ของใครไม่ใช่ UID ของอีกคน)
                // หรือถ้ายึดไม่ได้ ก็ยึดของคนที่เป็นเจ้าของ couple doc 
                let correctCoupleId = partnerData.coupleId;
                
                // ถ้า coupleId ของเรา ไปตรงกับ UID ของแฟน แสดงว่าเราเพิ่ง join ทีหลังด้วย UID แฟน (ซึ่งเป็นบั๊ก)
                if (data.coupleId === partnerData.uid) {
                  correctCoupleId = partnerData.coupleId;
                  await updateDoc(doc(db, "users", user.uid), { coupleId: correctCoupleId });
                  data.coupleId = correctCoupleId;
                  console.log("Auto-healed mismatched coupleId to match partner:", correctCoupleId);
                }
              }
            }
          } catch (err) {
            console.error("Auto-heal 2 failed:", err);
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
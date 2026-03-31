"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, getDoc, updateDoc, setDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
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
        
        // ── SUPER HEALER FOR SPLIT BRAIN ──
        try {
          // 1. กรณีที่ coupleId ของเราดันไปเป็น UID ของแฟน (หลงไปอยู่คนละกล่องเพราะบั๊กเก่า)
          if (data.coupleId && data.coupleId !== data.partnerId) {
            const checkUserDoc = await getDoc(doc(db, "users", data.coupleId));
            if (checkUserDoc.exists() && checkUserDoc.id !== user.uid) {
              // เจอแล้ว! coupleId ของเราคือ UID ของแฟนจริงๆ
              const pData = checkUserDoc.data() as UserProfile;
              const realCoupleId = pData.coupleId; // ดึงกล่อง A (ของแท้) ของแฟนมา

              if (realCoupleId) {
                console.log("Super Heal: Fixing orphan user pointing to UID instead of couple doc");
                
                // 1.1 อัปเดตโปรไฟล์ตัวเองให้ชี้ไปที่กล่อง A และผูก partnerId
                await updateDoc(doc(db, "users", user.uid), {
                  partnerId: pData.uid,
                  coupleId: realCoupleId
                });
                data.partnerId = pData.uid;
                data.coupleId = realCoupleId;

                // 1.2 เอาชื่อตัวเองไปใส่ในกล่อง A (couples doc ของจริง)
                await setDoc(doc(db, "couples", realCoupleId), {
                  member2: user.uid
                }, { merge: true });

                // 1.3 บังคับให้โปรไฟล์แฟนชี้กลับมาหาเราด้วย (เผื่อแฟนยังไม่มี partnerId)
                if (pData.partnerId !== user.uid) {
                  await updateDoc(doc(db, "users", pData.uid), {
                    partnerId: user.uid
                  });
                }

                // 1.4 ย้ายรายการที่จดผิดกล่อง (กล่อง B) มารวมในกล่อง A ให้หมด
                const txQuery = query(collection(db, "transactions"), where("userId", "==", user.uid), where("coupleId", "==", checkUserDoc.id));
                const txSnaps = await getDocs(txQuery);
                if (!txSnaps.empty) {
                  const batch = writeBatch(db);
                  txSnaps.forEach(tx => {
                    batch.update(tx.ref, { coupleId: realCoupleId });
                  });
                  await batch.commit();
                  console.log("Migrated stray txs to", realCoupleId);
                }
              }
            }
          }

          // 2. กรณีมี partnerId แต่ coupleId ไม่ตรงกัน
          if (data.partnerId) {
            const pSnap = await getDoc(doc(db, "users", data.partnerId));
            if (pSnap.exists()) {
              const pData = pSnap.data() as UserProfile;
              if (pData.coupleId && data.coupleId !== pData.coupleId) {
                // ยึด coupleId ของแฟนเป็นหลัก
                const realCoupleId = pData.coupleId;
                await updateDoc(doc(db, "users", user.uid), { coupleId: realCoupleId });
                data.coupleId = realCoupleId;

                await setDoc(doc(db, "couples", realCoupleId), { member2: user.uid }, { merge: true });
                if (pData.partnerId !== user.uid) {
                  await updateDoc(doc(db, "users", pData.uid), { partnerId: user.uid });
                }
              }
            }
          }

        } catch (err) {
          console.error("Super Heal failed:", err);
        }

        setProfile({ ...data });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  return { profile, loading };
}
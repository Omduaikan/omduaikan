"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { UserProfile, UserProfileSchema } from "@/types";

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(doc(db, "users", user.uid), async (snap) => {
      if (snap.exists()) {
        const rawData = snap.data();
        
        // --- DATA HYDRATION & MIGRATION ---
        const parsedData = UserProfileSchema.safeParse(rawData);
        
        if (!parsedData.success) {
          console.error("User profile data validation failed. Fallback to raw data.", parsedData.error);
        }
        
        const data = parsedData.success ? parsedData.data : (rawData as UserProfile);

        const currentVersion = rawData.schemaVersion || 0;
        const TARGET_VERSION = 1;

        if (currentVersion < TARGET_VERSION) {
          console.log(`Migrating user ${user.uid} to schemaVersion ${TARGET_VERSION}`);
          try {
            await updateDoc(doc(db, "users", user.uid), {
              ...data,
              schemaVersion: TARGET_VERSION
            });
          } catch (e) {
            console.error("Failed to migrate user data:", e);
          }
        }
        // ----------------------------------

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

  export function usePartnerProfile(partnerId: string | undefined) {
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partnerId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "users", partnerId), (snap) => {
      if (snap.exists()) {
        const rawData = snap.data();
        const parsedData = UserProfileSchema.safeParse(rawData);
        const data = parsedData.success ? parsedData.data : (rawData as UserProfile);
        setPartnerProfile(data);
      } else {
        setPartnerProfile(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [partnerId]);

  return { partnerProfile, loading };
  }
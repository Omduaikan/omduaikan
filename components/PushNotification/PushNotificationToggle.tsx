"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Bell, BellOff, BellRing } from "lucide-react";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export default function PushNotificationToggle() {
  const { profile } = useUserProfile();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setIsSubscribed(false);
        return;
      }
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking push subscription", error);
    }
  };

  const subscribeToPush = async () => {
    try {
      setLoading(true);
      
      // 1. Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("คุณไม่อนุญาตให้รับการแจ้งเตือน โปรดเปิดสิทธิ์ในการตั้งค่าเครื่องของคุณ");
        setLoading(false);
        return;
      }

      // 2. Get Service Worker
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
      }
      
      // Ensure it's active
      registration = await navigator.serviceWorker.ready;
      
      // 3. Subscribe
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID Key not found in environment");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // 4. Save to Firebase
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          pushSubscription: JSON.parse(JSON.stringify(subscription)),
        });
        setIsSubscribed(true);
        alert("เปิดการแจ้งเตือนสำเร็จแล้ว!");
      }
    } catch (error) {
      console.error("Error subscribing to push notifications", error);
      alert("เกิดข้อผิดพลาดในการเปิดการแจ้งเตือน");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      setLoading(true);
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from Firebase
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          pushSubscription: null,
        });
      }

      setIsSubscribed(false);
    } catch (error) {
      console.error("Error unsubscribing", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-gray-50 border border-gray-200 text-gray-500 rounded-xl p-4 text-sm flex items-center gap-3">
        <BellOff className="w-5 h-5" />
        <div>เบราว์เซอร์หรืออุปกรณ์ของคุณไม่รองรับการแจ้งเตือน (กรุณาใช้เป็นแอปที่ติดตั้งลงเครื่อง)</div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <div className="bg-green-100 text-green-600 p-2 rounded-lg">
            <BellRing className="w-5 h-5" />
          </div>
        ) : (
          <div className="bg-gray-100 text-gray-600 p-2 rounded-lg">
            <Bell className="w-5 h-5" />
          </div>
        )}
        <div>
          <h3 className="font-medium text-gray-900">การแจ้งเตือนแอป</h3>
          <p className="text-xs text-gray-500">
            {isSubscribed ? "เปิดรับการแจ้งเตือนแล้ว" : "รับการแจ้งเตือนเมื่อถึงเวลาออมเงิน"}
          </p>
        </div>
      </div>

      <button
        onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
        disabled={loading}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          isSubscribed
            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
            : "bg-black text-white hover:bg-gray-800"
        } disabled:opacity-50`}
      >
        {loading ? "กำลังโหลด..." : isSubscribed ? "ปิด" : "เปิด"}
      </button>
    </div>
  );
}

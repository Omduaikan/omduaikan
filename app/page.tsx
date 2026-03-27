"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { token, t, Spinner } from "@/components/ui";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) checkStatus(user.uid);
  }, [user, loading]);

  async function checkStatus(uid: string) {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) router.replace("/setup");
    else if (!snap.data().onboardingDone) router.replace("/onboarding");
    else router.replace("/overview");
  }

  async function handleLogin() {
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (e: any) { 
      // ดักจับ error ที่เกิดจากการปิดป๊อปอัปโดยผู้ใช้
      if (e.code === 'auth/popup-closed-by-user') {
        console.log("Login popup closed by user.");
        return; 
      }
      
      // ถ้าเป็น error อื่นๆ ค่อยแสดงผล
      console.error("Login Error:", e);
      alert("ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง");
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>

      {/* logo + text */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: token.accentBg,
          border: `1px solid ${token.accentLight}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 3C9 3 6.5 5.5 7 9c-2 1-2.5 2.5-1.5 4 1 1 2.5.5 3-.5 0 2.5 1 4 3.5 5 2.5-1 3.5-2.5 3.5-5 .5 1 2 1.5 3 .5 1-1.5.5-3-1.5-4 .5-3.5-2-6-5-6z"
              fill={token.accent} opacity=".2" stroke={token.accent} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <div style={{ textAlign: "center" }}>
          <h1 style={{ ...t.h1, margin: 0 }}>ออมด้วยกัน</h1>
          <p style={{ ...t.small, marginTop: 8, lineHeight: 1.7 }}>
            วางแผนการเงินด้วยกัน<br />สร้างอนาคตที่มั่นคงตั้งแต่วันนี้
          </p>
        </div>
      </div>

      {/* login */}
      <div style={{ paddingBottom: 48, display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            padding: "14px 0",
            background: token.surface,
            border: `1px solid ${token.border}`,
            borderRadius: 99,
            fontSize: 14, fontWeight: 500,
            color: token.textPrimary,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          เข้าสู่ระบบด้วย Google
        </button>
        <p style={{ ...t.tiny, textAlign: "center" }}>ข้อมูลซิงค์กับแฟนแบบ real-time</p>
      </div>
    </div>
  );
}

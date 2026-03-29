"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useUserProfile } from "@/hooks/useUserProfile";
import BottomNav from "@/components/BottomNav";
import { token, t, BtnPrimary, Input, Card, Spinner, Label } from "@/components/ui";
import { LogOut, User, DollarSign, Calendar, ShieldCheck } from "lucide-react";
import PushNotificationToggle from "@/components/PushNotification/PushNotificationToggle";


export default function ProfilePage() {
  const { profile, loading } = useUserProfile();
  const router = useRouter();
  
  // States สำหรับแก้ไขข้อมูล
  const [nickname, setNickname] = useState("");
  const [income, setIncome] = useState("");
  const [expenseBuffer, setExpenseBuffer] = useState("");
  const [paydayType, setPaydayType] = useState<"date" | "end_of_month">("end_of_month");
  const [paydayDate, setPaydayDate] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sync ข้อมูลจาก Profile เข้า State เมื่อโหลดเสร็จ
  useEffect(() => {
    if (profile) {
      setNickname(profile.displayName || "");
      setIncome(profile.monthlyIncome.toString());
      setExpenseBuffer(profile.expenseBuffer.toString());
      setPaydayType(profile.paydayType);
      setPaydayDate(profile.paydayDate?.toString() || "25");
    }
  }, [profile]);

  async function handleUpdate() {
    if (!profile?.uid) return;
    setSaving(true);
    try {
      const incomeNum = parseFloat(income) || 0;
      const expenseNum = parseFloat(expenseBuffer) || 0;
      
      const updatedData = {
        displayName: nickname.trim(),
        monthlyIncome: incomeNum,
        expenseBuffer: expenseNum,
        paydayType,
        ...(paydayType === "date" ? { paydayDate: parseInt(paydayDate) } : {}),
      };

      await updateDoc(doc(db, "users", profile.uid), updatedData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      await auth.signOut();
      router.push("/");
    }
  }

  if (loading || !profile) return <Spinner />;

  const netIncome = (parseFloat(income) || 0) - (parseFloat(expenseBuffer) || 0);

  return (
    <div className="page-wide" style={{ paddingTop: 28, paddingBottom: 120 }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <p style={{ ...t.h1, margin: 0 }}>โปรไฟล์ & แผนการเงิน</p>
          <p style={{ ...t.small, marginTop: 4 }}>จัดการข้อมูลส่วนตัวของคุณ</p>
        </div>
        <button 
          onClick={handleLogout}
          style={{ 
            background: token.dangerBg, color: token.danger, 
            border: "none", borderRadius: 12, padding: "10px 12px",
            display: "flex", alignItems: "center", gap: 6, cursor: "pointer"
          }}
        >
          <LogOut size={16} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>ออก</span>
        </button>
      </div>

      {/* ── ข้อมูลส่วนตัว ── */}
      
        {/* ── การแจ้งเตือน ── */}
        <section style={{ marginBottom: 32 }}>
          <PushNotificationToggle />
        </section>
<section style={{ marginBottom: 32 }}>
        <Label>ข้อมูลพื้นฐาน</Label>
        <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: "50%", 
              background: token.surfaceAlt, display: "flex", 
              alignItems: "center", justifyContent: "center",
              overflow: "hidden"
            }}>
              {profile.photoURL ? (
                <img src={profile.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User size={24} color={token.textHint} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <Input 
                placeholder="ชื่อของคุณ" 
                value={nickname} 
                onChange={setNickname} 
                style={{ border: "none", background: "transparent", padding: 0 }}
              />
              <p style={{ ...t.tiny, color: token.textHint }}>{profile.email}</p>
            </div>
          </div>
        </Card>
      </section>

      {/* ── แผนการเงิน ── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <DollarSign size={16} color={token.accent} />
          <p style={{ ...t.tiny, textTransform: "uppercase", margin: 0, fontWeight: 600, color: token.accent }}>
            แผนการเงินปัจจุบัน
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <p style={{ ...t.tiny, marginBottom: 8 }}>รายได้ต่อเดือน</p>
            <Input prefix="฿" type="number" value={income} onChange={setIncome} />
          </Card>

          <Card>
            <p style={{ ...t.tiny, marginBottom: 8 }}>งบสำรองรายจ่ายประจำ (ค่าน้ำ/ไฟ/บิล)</p>
            <Input prefix="฿" type="number" value={expenseBuffer} onChange={setExpenseBuffer} />
            <p style={{ ...t.tiny, marginTop: 8, color: token.textSecondary }}>
              เงินที่ใช้บริหารได้จริง: <span style={{ color: token.accent, fontWeight: 600 }}>฿{netIncome.toLocaleString()}</span>
            </p>
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Calendar size={16} color={token.textSecondary} />
              <p style={{ ...t.tiny, margin: 0 }}>วันเงินออก</p>
            </div>
            
            <div style={{ display: "flex", gap: 8, marginBottom: paydayType === "date" ? 12 : 0 }}>
              <button
                onClick={() => setPaydayType("end_of_month")}
                style={{
                  flex: 1, padding: "10px", borderRadius: 10, fontSize: 13,
                  border: `1px solid ${paydayType === "end_of_month" ? token.textPrimary : token.border}`,
                  background: paydayType === "end_of_month" ? token.surfaceAlt : "transparent",
                  cursor: "pointer", fontFamily: "inherit"
                }}
              >
                สิ้นเดือน
              </button>
              <button
                onClick={() => setPaydayType("date")}
                style={{
                  flex: 1, padding: "10px", borderRadius: 10, fontSize: 13,
                  border: `1px solid ${paydayType === "date" ? token.textPrimary : token.border}`,
                  background: paydayType === "date" ? token.surfaceAlt : "transparent",
                  cursor: "pointer", fontFamily: "inherit"
                }}
              >
                ระบุวันที่
              </button>
            </div>

            {paydayType === "date" && (
              <Input prefix="วันที่" type="number" value={paydayDate} onChange={setPaydayDate} placeholder="25" />
            )}
          </Card>
        </div>
      </section>

      {/* ── ข้อมูลการเชื่อมต่อ ── */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <ShieldCheck size={16} color={token.textSecondary} />
          <p style={{ ...t.tiny, textTransform: "uppercase", margin: 0 }}>การเชื่อมต่อคู่รัก</p>
        </div>
        <Card style={{ background: token.surfaceAlt }}>
          <p style={{ ...t.tiny, marginBottom: 4 }}>รหัสของคุณ (ส่งให้แฟนเพื่อเชื่อมต่อ)</p>
          <code style={{ fontSize: 12, color: token.textSecondary, wordBreak: "break-all" }}>
            {profile.uid}
          </code>
          {profile.partnerId && (
            <p style={{ ...t.tiny, marginTop: 12, color: token.accent, fontWeight: 500 }}>
              ✓ เชื่อมต่อกับแฟนแล้ว
            </p>
          )}
        </Card>
      </section>

      <BtnPrimary onClick={handleUpdate} disabled={saving}>
        {saving ? "กำลังบันทึก..." : success ? "บันทึกเรียบร้อย ✓" : "บันทึกการเปลี่ยนแปลง"}
      </BtnPrimary>

      <BottomNav />
    </div>
  );
}

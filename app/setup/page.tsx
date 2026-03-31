"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, collection, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/types";
import { token, t, BtnPrimary, BtnOutline, Input, Spinner } from "@/components/ui";

type Step = 1 | 2 | 3;

export default function SetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  const [paydayType, setPaydayType] = useState<"date" | "end_of_month">("end_of_month");
  const [paydayDate, setPaydayDate] = useState("25");
  const [income, setIncome] = useState("");
  const [expenseBuffer, setExpenseBuffer] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);

  // แก้ไข: ใช้ parseFloat แทน parseInt เพื่อรองรับเศษสตางค์
  const incomeNum = parseFloat(income) || 0;
  const expenseNum = parseFloat(expenseBuffer) || 0;
  const netIncome = incomeNum - expenseNum;
  const [nickname, setNickname] = useState("");

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    try {
      let coupleId = inviteCode.trim();
      if (!coupleId) {
        coupleId = user.uid;
        await setDoc(doc(db, "couples", coupleId), {
          member1: user.uid,
          totalMonthlyIncome: incomeNum,
          createdAt: new Date(),
        }, { merge: true });
      } else {
        await setDoc(doc(db, "couples", coupleId), { member2: user.uid }, { merge: true });
      }

      const profile = {
        uid: user.uid,
        displayName: nickname.trim() || user.displayName || "คุณ",
        email: user.email ?? "",
        ...(user.photoURL ? { photoURL: user.photoURL } : {}),
        monthlyIncome: incomeNum, // ตอนนี้เป็น float แล้ว
        paydayType,
        ...(paydayType === "date" ? { paydayDate: parseInt(paydayDate) } : {}),
        expenseBuffer: expenseNum, // ตอนนี้เป็น float แล้ว
        coupleId,
        onboardingDone: false,
      };

      await setDoc(doc(db, "users", user.uid), profile);
      router.replace("/onboarding");
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  function copyUid() {
    navigator.clipboard.writeText(user?.uid ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!user) return <Spinner />;

  // progress dots
  const dots = (
    <div style={{ display: "flex", gap: 6, marginBottom: 36 }}>
      {[1,2,3].map((s) => (
        <div key={s} style={{
          height: 3, borderRadius: 99, transition: "all 0.3s",
          width: s === step ? 24 : 8,
          background: s <= step ? token.textPrimary : token.border,
        }} />
      ))}
    </div>
  );

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", paddingTop: 52 }}>

      {dots}

      {/* ── Step 1 — วันเงินออก ── */}
      {step === 1 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <h1 style={{ ...t.h1, marginBottom: 6 }}>เงินเดือนออกวันไหน?</h1>
          <p style={{ ...t.small, marginBottom: 28, lineHeight: 1.7 }}>
            ใช้คำนวณงบรายวันให้อัตโนมัติ
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { val: "end_of_month", label: "สิ้นเดือน", sub: "วันทำงานสุดท้ายของเดือน" },
              { val: "date",         label: "วันที่กำหนด", sub: "เช่น ทุกวันที่ 25 (ราชการ)" },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setPaydayType(opt.val as "end_of_month" | "date")}
                style={{
                  textAlign: "left", padding: "16px 18px",
                  border: `1px solid ${paydayType === opt.val ? token.textPrimary : token.border}`,
                  borderRadius: 14, background: paydayType === opt.val ? token.surfaceAlt : token.surface,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                }}
              >
                <p style={{ ...t.h3, margin: 0 }}>{opt.label}</p>
                <p style={{ ...t.small, margin: "3px 0 0" }}>{opt.sub}</p>
              </button>
            ))}

            {paydayType === "date" && (
              <Input
                prefix="วันที่"
                type="number"
                placeholder="25"
                value={paydayDate}
                onChange={setPaydayDate}
              />
            )}
          </div>

          <div style={{ margin: "24px 0 20px" }}>
            <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 8 }}>
              ชื่อที่อยากให้แอปเรียก
            </p>
            <Input
              placeholder="เช่น ต้น, มิ้น, โอ๊ต"
              value={nickname}
              onChange={setNickname}
            />
            <p style={{ ...t.tiny, marginTop: 6 }}>
              ใช้แสดงในแอปเท่านั้น ไม่เกี่ยวกับ Google account
            </p>
          </div>

          <div style={{ marginTop: "auto", paddingTop: 32 }}>
            <BtnPrimary onClick={() => setStep(2)}>ต่อไป</BtnPrimary>
          </div>
        </div>
      )}

      {/* ── Step 2 — รายได้ ── */}
      {step === 2 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <h1 style={{ ...t.h1, marginBottom: 6 }}>รายได้และค่าใช้จ่าย</h1>
          <p style={{ ...t.small, marginBottom: 28 }}>ของคุณคนเดียวก่อน</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 8 }}>รายได้ต่อเดือน</p>
              <Input prefix="฿" type="number" placeholder="0" value={income} onChange={setIncome} />
            </div>
            <div>
              <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 8 }}>
                งบสำรองรายจ่ายประจำ
              </p>
              <Input
                prefix="฿"
                type="number"
                placeholder="ค่าไฟ ค่าน้ำ ประมาณคร่าวๆ"
                value={expenseBuffer}
                onChange={setExpenseBuffer}
              />
              <p style={{ ...t.tiny, marginTop: 6 }}>
                ใส่ประมาณได้เลย ไม่ต้องแม่นยำ — ปรับได้ทุกรอบ
              </p>
            </div>

            {incomeNum > 0 && (
              <div style={{
                background: token.accentBg,
                border: `1px solid ${token.accentLight}`,
                borderRadius: 14, padding: "16px 18px",
              }}>
                <p style={{ ...t.tiny, color: token.accent, textTransform: "uppercase", marginBottom: 4 }}>
                  เงินที่วางแผนได้
                </p>
                <p style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.5px", color: token.accent, margin: 0 }}>
                  ฿{netIncome.toLocaleString()}
                </p>
                <p style={{ ...t.tiny, marginTop: 4 }}>AI จะช่วยแบ่งก้อนนี้ในขั้นถัดไป</p>
              </div>
            )}
          </div>

          <div style={{ marginTop: "auto", paddingTop: 32, display: "flex", gap: 10 }}>
            <BtnOutline onClick={() => setStep(1)} style={{ width: "auto", padding: "15px 24px" }}>ย้อนกลับ</BtnOutline>
            <BtnPrimary onClick={() => setStep(3)} disabled={!income} style={{ flex: 1 }}>ต่อไป</BtnPrimary>
          </div>
        </div>
      )}

      {/* ── Step 3 — เชื่อมแฟน ── */}
      {step === 3 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <h1 style={{ ...t.h1, marginBottom: 6 }}>เชื่อมกับแฟน</h1>
          <p style={{ ...t.small, marginBottom: 28, lineHeight: 1.7 }}>
            ถ้าแฟน setup ไปก่อน ขอรหัสมาได้เลย<br />ถ้ายังไม่ได้ตั้งค่า ข้ามไปก่อนได้
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 8 }}>รหัสจากแฟน (ถ้ามี)</p>
              <Input placeholder="วางรหัสตรงนี้" value={inviteCode} onChange={setInviteCode} />
            </div>

            <div style={{
              background: token.surfaceAlt,
              border: `1px solid ${token.border}`,
              borderRadius: 14, padding: "16px 18px",
            }}>
              <p style={{ ...t.tiny, marginBottom: 8 }}>หรือส่งรหัสนี้ให้แฟน</p>
              <p style={{ fontSize: 12, fontFamily: "monospace", color: token.textSecondary, wordBreak: "break-all", lineHeight: 1.6 }}>
                {user.uid}
              </p>
              <button
                onClick={copyUid}
                style={{
                  marginTop: 10, fontSize: 12, fontWeight: 500,
                  color: copied ? token.accent : token.textSecondary,
                  background: "none", border: "none", cursor: "pointer",
                  padding: 0, fontFamily: "inherit",
                }}
              >
                {copied ? "คัดลอกแล้ว ✓" : "คัดลอกรหัส"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: "auto", paddingTop: 32, display: "flex", gap: 10 }}>
            <BtnOutline onClick={() => setStep(2)} style={{ width: "auto", padding: "15px 24px" }}>ย้อนกลับ</BtnOutline>
            <BtnPrimary disabled={saving} style={{ flex: 1 }} onClick={handleFinish}>
              {saving ? "กำลังบันทึก..." : "เริ่มเลย"}
            </BtnPrimary>
          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import { useState } from "react";
import { collection, addDoc, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useGoals } from "@/hooks/useGoals";
import { calcMonthsToGoal, calcRequiredMonthly } from "@/lib/calculations";
import BottomNav from "@/components/BottomNav";
import { token, t, BtnPrimary, BtnOutline, Input, ProgressBar, Spinner } from "@/components/ui";
import { Plus, X, CheckCircle } from "lucide-react";

export default function GoalsPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { goals, loading } = useGoals(profile?.coupleId);

  const [showForm, setShowForm] = useState(false);
  const [name, setName]         = useState("");
  const [target, setTarget]     = useState("");
  const [alreadySaved, setAlreadySaved] = useState("");
  const [monthly, setMonthly]   = useState("");
  const [saving, setSaving]     = useState(false);

  const targetNum  = parseInt(target) || 0;
  const savedNum   = parseInt(alreadySaved) || 0;
  const monthlyNum = parseInt(monthly) || 0;
  const months     = targetNum > 0 && monthlyNum > 0
    ? calcMonthsToGoal(targetNum, savedNum, monthlyNum) : null;

  function resetForm() {
    setName(""); setTarget(""); setAlreadySaved(""); setMonthly("");
    setShowForm(false);
  }

  async function handleAdd() {
    if (!user || !profile?.coupleId || !name || !targetNum) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "couples", profile.coupleId, "goals"), {
        coupleId: profile.coupleId, createdBy: user.uid,
        name, targetAmount: targetNum,
        savedAmount: savedNum,
        monthlyContribution: monthlyNum,
        estimatedMonths: months ?? 999,
        priority: goals.length + 1,
        completed: false,
        createdAt: Timestamp.now(),
      });
      resetForm();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function markDone(id: string) {
    if (!profile?.coupleId) return;
    await updateDoc(doc(db, "couples", profile.coupleId, "goals", id), { completed: true });
  }

  const active    = goals.filter((g) => !g.completed);
  const completed = goals.filter((g) => g.completed);

  if (loading) return <Spinner />;

  return (
    <div className="page-wide" style={{ paddingTop: 28, paddingBottom: 100 }}>

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <p style={{ ...t.h1, margin: 0 }}>เป้าหมาย</p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 99,
              background: token.textPrimary, color: "#fff",
              border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, fontFamily: "inherit",
            }}
          >
            <Plus size={14} />
            เพิ่มเป้าหมาย
          </button>
        )}
      </div>
      <p style={{ ...t.small, marginBottom: 28 }}>เก็บเพื่ออะไร เห็นชัดขึ้นที่นี่</p>

      {/* ── add form ── */}
      {showForm && (
        <div style={{
          background: token.surface, border: `1px solid ${token.border}`,
          borderRadius: 18, padding: "20px", marginBottom: 20,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <p style={{ ...t.h3, margin: 0 }}>เป้าหมายใหม่</p>
            <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <X size={16} color={token.textHint} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ชื่อ */}
            <div>
              <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 8 }}>อยากได้อะไร?</p>
              <Input placeholder="เช่น ไปญี่ปุ่น, โน้ตบุ๊กใหม่, เงินฉุกเฉิน" value={name} onChange={setName} />
            </div>

            {/* ราคาเป้าหมาย */}
            <div>
              <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 8 }}>ต้องใช้เงินเท่าไหร่?</p>
              <Input prefix="฿" type="number" placeholder="0" value={target} onChange={setTarget} />
            </div>

            {/* มีอยู่แล้ว */}
            <div>
              <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 4 }}>เก็บไว้แล้วเท่าไหร่?</p>
              <p style={{ ...t.tiny, marginBottom: 8 }}>ถ้าเพิ่งเริ่มใส่ 0 ได้เลย</p>
              <Input prefix="฿" type="number" placeholder="0" value={alreadySaved} onChange={setAlreadySaved} />
            </div>

            {/* เก็บเดือนละ */}
            <div>
              <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 4 }}>จะเก็บเดือนละเท่าไหร่?</p>
              <p style={{ ...t.tiny, marginBottom: 8 }}>ใส่ตามที่ทำได้จริง ไม่ต้องกดดันตัวเอง</p>
              <Input prefix="฿" type="number" placeholder="0" value={monthly} onChange={setMonthly} />
            </div>

            {/* preview */}
            {months !== null && targetNum > 0 && (
              <div style={{
                background: token.accentBg, border: `1px solid ${token.accentLight}`,
                borderRadius: 12, padding: "16px",
              }}>
                <p style={{ ...t.tiny, color: token.accent, textTransform: "uppercase", marginBottom: 12 }}>
                  คาดการณ์
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <p style={{ ...t.tiny, marginBottom: 3 }}>จะได้ภายใน</p>
                    <p style={{ fontSize: 22, fontWeight: 500, color: token.accent, margin: 0, letterSpacing: "-0.5px" }}>
                      {months} เดือน
                    </p>
                  </div>
                  {months > 2 && (
                    <div>
                      <p style={{ ...t.tiny, marginBottom: 3 }}>อยากเร็วกว่าครึ่ง?</p>
                      <p style={{ fontSize: 15, fontWeight: 500, color: token.accent, margin: 0 }}>
                        ฿{calcRequiredMonthly(targetNum, savedNum, Math.ceil(months / 2)).toLocaleString()}/เดือน
                      </p>
                    </div>
                  )}
                </div>
                {savedNum > 0 && (
                  <p style={{ ...t.tiny, marginTop: 10 }}>
                    มีอยู่แล้ว ฿{savedNum.toLocaleString()} · ยังขาด ฿{(targetNum - savedNum).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <BtnOutline onClick={resetForm} style={{ width: "auto", padding: "13px 20px" }}>ยกเลิก</BtnOutline>
              <BtnPrimary onClick={handleAdd} disabled={!name || !targetNum || saving} style={{ flex: 1 }}>
                {saving ? "กำลังบันทึก..." : "เพิ่มเป้าหมายนี้"}
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}

      {/* ── active goals ── */}
      {active.length === 0 && !showForm ? (
        <div style={{
          textAlign: "center", padding: "60px 0",
          border: `1px dashed ${token.border}`, borderRadius: 16,
        }}>
          <p style={{ ...t.small, color: token.textHint }}>ยังไม่มีเป้าหมาย</p>
          <p style={{ ...t.tiny, marginTop: 6 }}>กด &quot;เพิ่มเป้าหมาย&quot; เพื่อเริ่มออมเพื่อสิ่งที่อยากได้</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {active.map((g) => {
            const pct    = g.targetAmount > 0 ? Math.min(Math.round((g.savedAmount / g.targetAmount) * 100), 100) : 0;
            const months = calcMonthsToGoal(g.targetAmount, g.savedAmount, g.monthlyContribution);
            const remaining = g.targetAmount - g.savedAmount;
            return (
              <div key={g.id} style={{
                background: token.surface, border: `1px solid ${token.border}`,
                borderRadius: 16, padding: "18px 20px",
              }}>
                {/* ชื่อ + % */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <p style={{ ...t.h3, margin: 0 }}>{g.name}</p>
                  <p style={{ fontSize: 18, fontWeight: 500, color: token.accent, margin: 0 }}>{pct}%</p>
                </div>

                {/* ตัวเลข */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <p style={{ ...t.tiny }}>
                    เก็บแล้ว ฿{g.savedAmount.toLocaleString()} · เป้า ฿{g.targetAmount.toLocaleString()}
                  </p>
                  <p style={{ ...t.tiny }}>เหลือ ฿{remaining.toLocaleString()}</p>
                </div>

                <ProgressBar value={g.savedAmount} max={g.targetAmount} />

                {/* timeline */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginTop: 12, paddingTop: 12,
                  borderTop: `1px solid ${token.border}`,
                }}>
                  <p style={{ ...t.tiny }}>
                    {g.monthlyContribution > 0
                      ? `เก็บ ฿${g.monthlyContribution.toLocaleString()}/เดือน · อีก ${months} เดือน`
                      : "ยังไม่ได้ตั้งยอดต่อเดือน"}
                  </p>
                  <button
                    onClick={() => markDone(g.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 12, color: token.textHint,
                      fontFamily: "inherit", padding: 0,
                    }}
                  >
                    <CheckCircle size={13} />
                    ทำได้แล้ว
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── completed ── */}
      {completed.length > 0 && (
        <>
          <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 12 }}>สำเร็จแล้ว</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {completed.map((g) => (
              <div key={g.id} style={{
                background: token.surfaceAlt, border: `1px solid ${token.border}`,
                borderRadius: 12, padding: "14px 18px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                opacity: 0.6,
              }}>
                <p style={{ ...t.body, margin: 0 }}>{g.name}</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: token.accent, margin: 0 }}>
                  ฿{g.targetAmount.toLocaleString()} ✓
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
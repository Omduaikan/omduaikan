"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc, collection, setDoc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getAIBucketRecommendation } from "@/lib/ai";
import { calcBucketAmount, BUCKET_DEFAULTS } from "@/lib/calculations";
import { BucketRecommendation, BucketType } from "@/types";
import { token, t, BtnPrimary, ProgressBar, Spinner } from "@/components/ui";

const BUCKET_ACCENT: Record<BucketType, string> = {
  needs:      "#2D7A5F",
  wants:      "#4A7FB5",
  savings:    "#8A6D3B",
  emergency:  "#A0522D",
  investment: "#4A7A4A",
};

export default function OnboardingPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [recs, setRecs]         = useState<BucketRecommendation[]>([]);
  const [percents, setPercents] = useState<Record<string, number>>({});

  const totalIncome   = profile?.monthlyIncome ?? 0;
  const fixedExpenses = profile?.expenseBuffer ?? 0;
  const netIncome     = totalIncome - fixedExpenses;

  useEffect(() => {
    if (!profile) return;
    fetchRec();
  }, [profile]);

  async function fetchRec() {
    setLoading(true);
    try {
      const result = await getAIBucketRecommendation({
        totalIncome, 
        fixedExpenses, 
        ages: [22], 
        hasEmergencyFund: false,
      });
      setRecs(result);
      const init: Record<string, number> = {};
      result.forEach((r) => { init[r.type] = r.percent; });
      setPercents(init);
    } catch (e) {
      console.error(e);
    } finally { 
      setLoading(false); 
    }
  }

  const totalPct = Object.values(percents).reduce((s, v) => s + v, 0);

  async function handleConfirm() {
    if (!user || !profile?.coupleId) return;
    
    // Type narrowing for TypeScript
    const cid = profile.coupleId;
    
    setSaving(true);
    try {
      const ref = collection(db, "couples", cid, "buckets");
      
      // [Prevention] Clean up existing buckets first to avoid duplicates
      const snap = await getDocs(ref);
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      // [Shared] Save buckets with fixed IDs (type) to ensure only one of each exists
      await Promise.all(
        recs.map((r, i) => {
          const bucketDocRef = doc(db, "couples", cid, "buckets", r.type);
          return setDoc(bucketDocRef, {
            type: r.type, 
            name: r.name,
            targetPercent: percents[r.type] ?? r.percent,
            targetAmount: calcBucketAmount(netIncome, percents[r.type] ?? r.percent),
            currentAmount: 0,
            color: BUCKET_DEFAULTS[r.type].color,
            icon: BUCKET_DEFAULTS[r.type].icon,
            order: i, 
            coupleId: cid,
            createdAt: new Date(),
          });
        })
      );

      await updateDoc(doc(db, "users", user.uid), { onboardingDone: true });
      router.replace("/overview");
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16 }}>
        <div style={{
          width: 20, height: 20,
          border: `2px solid ${token.border}`,
          borderTopColor: token.textPrimary,
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ ...t.small }}>AI กำลังวิเคราะห์แผนการออมของคุณ</p>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingTop: 52, paddingBottom: 120 }}>

      <h1 style={{ ...t.h1, marginBottom: 6 }}>แผนออมเงินของคุณ</h1>
      <p style={{ ...t.small, marginBottom: 8, lineHeight: 1.7 }}>
        AI แนะนำการแบ่งจากรายได้สุทธิ ฿{netIncome.toLocaleString()}
      </p>
      <p style={{ ...t.tiny, marginBottom: 28 }}>เลื่อน slider ปรับ % ได้ตามใจ</p>

      {/* buckets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {recs.map((r) => {
          const pct = percents[r.type] ?? r.percent;
          const amt = calcBucketAmount(netIncome, pct);
          const color = BUCKET_ACCENT[r.type];

          return (
            <div key={r.type} style={{
              background: token.surface,
              border: `1px solid ${token.border}`,
              borderRadius: 16, padding: "18px 20px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ flex: 1, marginRight: 16 }}>
                  <p style={{ ...t.h3, margin: "0 0 4px" }}>{r.name}</p>
                  <p style={{ ...t.small, margin: 0, lineHeight: 1.6 }}>{r.reason}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px", margin: 0, color }}>
                    {pct}%
                  </p>
                  <p style={{ ...t.tiny, margin: "2px 0 0" }}>฿{amt.toLocaleString()}</p>
                </div>
              </div>

              <input
                type="range" min={5} max={60} step={5} value={pct}
                onChange={(e) => setPercents((prev) => ({ ...prev, [r.type]: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: color, marginBottom: 4 }}
              />
              <ProgressBar value={pct} max={100} color={color} />
            </div>
          );
        })}
      </div>

      {/* total indicator */}
      <div style={{
        padding: "14px 18px", borderRadius: 12, textAlign: "center",
        background: totalPct === 100 ? token.accentBg : token.dangerBg,
        border: `1px solid ${totalPct === 100 ? token.accentLight : "#F5C6C2"}`,
        marginBottom: 8,
      }}>
        <p style={{
          fontSize: 14, fontWeight: 500, margin: 0,
          color: totalPct === 100 ? token.accent : token.danger,
        }}>
          รวม {totalPct}%{" "}
          {totalPct === 100 ? "· ครบพอดี" : totalPct < 100 ? `· ยังขาด ${100 - totalPct}%` : `· เกิน ${totalPct - 100}%`}
        </p>
      </div>

      <p style={{ ...t.tiny, textAlign: "center", lineHeight: 1.7, marginBottom: 32 }}>
        ปรับได้ทุกเมื่อในหน้าตั้งค่า<br />ไม่ต้องสมบูรณ์แบบตั้งแต่วันแรก
      </p>

      {/* fixed bottom button */}
      <div className="bottom-nav" style={{
        background: token.bg, borderTop: `1px solid ${token.border}`, padding: "16px 20px 32px",
      }}>
        <BtnPrimary onClick={handleConfirm} disabled={totalPct !== 100 || saving}>
          {saving ? "กำลังบันทึก..." : "ยืนยันแผนนี้"}
        </BtnPrimary>
        {totalPct !== 100 && (
          <p style={{ ...t.tiny, textAlign: "center", marginTop: 8 }}>
            ปรับให้รวม 100% ก่อนนะ
          </p>
        )}
      </div>
    </div>
  );
}
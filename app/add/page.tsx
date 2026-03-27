"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useBuckets } from "@/hooks/useBuckets";
import { Category } from "@/types";
import { getPayPeriodStart, getPayPeriodKey } from "@/lib/calculations";
import BottomNav from "@/components/BottomNav";
import { token, t, BtnPrimary, Chip } from "@/components/ui";

const CATEGORIES: Category[] = [
  "อาหาร", "เดินทาง", "ช้อปปิ้ง",
  "สุขภาพ", "บันเทิง", "ที่พัก",
  "ค่าบ้าน/บิล", "รายจ่ายพิเศษ", "อื่นๆ",
];

const CAT_BUCKET: Record<Category, string> = {
  อาหาร:         "needs",
  เดินทาง:        "needs",
  ที่พัก:         "needs",
  สุขภาพ:         "needs",
  "ค่าบ้าน/บิล":  "needs",
  ช้อปปิ้ง:       "wants",
  บันเทิง:        "wants",
  รายจ่ายพิเศษ:   "needs",
  อื่นๆ:          "wants",
};

// ← AI แนะนำ category จาก note ที่พิมพ์ (ทำ local ไม่ต้องเรียก API)
function guessCategory(note: string): Category | null {
  const n = note.toLowerCase();
  if (/ข้าว|กิน|ร้าน|อาหาร|กาแฟ|ชา|นม|ขนม/.test(n))      return "อาหาร";
  if (/รถ|บัส|มอ|แกร็บ|grab|taxi|แท็กซี่|เดิน/.test(n))   return "เดินทาง";
  if (/ไฟ|น้ำ|เน็ต|internet|ค่าบ้าน|ซ่อม|บิล/.test(n))   return "ค่าบ้าน/บิล";
  if (/ยา|หมอ|โรงพยาบาล|คลินิก|ฟัน/.test(n))              return "สุขภาพ";
  if (/หนัง|เกม|คอนเสิร์ต|ท่องเที่ยว|เที่ยว/.test(n))     return "บันเทิง";
  if (/โรงแรม|ที่พัก|ห้อง/.test(n))                        return "ที่พัก";
  if (/ซื้อ|ช้อป|เสื้อ|รองเท้า|กระเป๋า|shopee|lazada/.test(n)) return "ช้อปปิ้ง";
  return null;
}

function amountLabel(n: number): { text: string; color: string } {
  if (n <= 0)   return { text: "", color: "" };
  if (n <= 100) return { text: "ประหยัดมาก", color: token.accent };
  if (n <= 300) return { text: "พอใช้ได้", color: token.textSecondary };
  if (n <= 800) return { text: "ค่อนข้างเยอะ", color: "#8A6D3B" };
  return             { text: "เยอะมากเลย", color: token.danger };
}

export default function AddPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { buckets } = useBuckets(profile?.coupleId);
  const router = useRouter();

  const [amount, setAmount]   = useState("");
  const [cat, setCat]         = useState<Category | null>(null);
  const [who, setWho]         = useState<"me" | "partner">("me");
  const [note, setNote]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);
  const [suggested, setSuggested] = useState<Category | null>(null);

  // แก้ไข: ใช้ parseFloat แทน parseInt เพื่อรองรับเศษสตางค์
  const amountNum = parseFloat(amount) || 0;
  const canSave   = amountNum > 0 && cat !== null;
  const label     = amountLabel(amountNum);

  // ← AI แนะนำ category เมื่อพิมพ์ note
  useEffect(() => {
    if (!note) { setSuggested(null); return; }
    const guess = guessCategory(note);
    if (guess && guess !== cat) setSuggested(guess);
    else setSuggested(null);
  }, [note]);

  function getBucketId(c: Category) {
    return buckets.find((b) => b.type === CAT_BUCKET[c])?.id;
  }

  async function handleSave() {
    if (!canSave || !user || !profile?.coupleId) return;
    setSaving(true);
    try {
      const periodStart = getPayPeriodStart(profile.paydayType, profile.paydayDate);
      const payPeriodKey = getPayPeriodKey(periodStart);
      await addDoc(collection(db, "transactions"), {
        userId:         who === "me" ? user.uid : (profile.partnerId ?? user.uid),
        coupleId:       profile.coupleId,
        amount:         amountNum, // ตอนนี้จะเป็น float แล้ว
        category:       cat,
        bucketId:       cat ? getBucketId(cat) : undefined,
        note:           note.trim() || null,
        createdAt:      Timestamp.now(),
        payPeriodStart: Timestamp.fromDate(periodStart),
        payPeriodKey,
      });
      setDone(true);
      setAmount(""); setCat(null); setNote(""); setSuggested(null);
      setTimeout(() => { setDone(false); router.push("/overview"); }, 800);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  return (
    <div className="page" style={{ paddingTop: 28, paddingBottom: 100 }}>

      <div style={{ marginBottom: 32 }}>
        <p style={{ ...t.h1, margin: 0 }}>บันทึกรายจ่าย</p>
        <p style={{ ...t.small, marginTop: 4 }}>วันนี้ใช้ไปกับอะไร?</p>
      </div>

      {/* note — ย้ายมาก่อน เพื่อให้ AI guess category ได้ก่อนเลือก */}
      <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 8 }}>
        ใช้ไปกับอะไร?
      </p>
      <input
        type="text"
        placeholder="เช่น ข้าวมันไก่ ค่าไฟ ตั๋วหนัง..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{
          width: "100%", background: token.surfaceAlt,
          border: `1px solid ${token.border}`, borderRadius: 12,
          padding: "13px 16px", fontSize: 15,
          color: token.textPrimary, outline: "none",
          fontFamily: "inherit", marginBottom: 10,
        }}
      />

      {/* AI suggestion */}
      {suggested && (
        <button
          onClick={() => { setCat(suggested); setSuggested(null); }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: token.accentBg,
            border: `1px solid ${token.accentLight}`,
            borderRadius: 10, padding: "8px 14px",
            marginBottom: 16, cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <span style={{ ...t.tiny, color: token.accent }}>AI แนะนำ →</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: token.accent }}>{suggested}</span>
          <span style={{ ...t.tiny }}>กดเพื่อใช้</span>
        </button>
      )}

      {/* amount */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "28px 0 24px",
        borderTop: `1px solid ${token.border}`,
        borderBottom: `1px solid ${token.border}`,
        margin: "4px 0 24px",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 24, color: token.textHint }}>฿</span>
          <input
            type="number" 
            inputMode="decimal" // แก้ไข: เปลี่ยนเป็น decimal เพื่อให้คีย์บอร์ดมือถือโชว์ปุ่มจุด
            step="any"          // แก้ไข: สำคัญมากเพื่อให้เบราว์เซอร์ยอมรับทศนิยม
            placeholder="0"
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            style={{
              fontSize: 52, fontWeight: 500, letterSpacing: "-2px",
              width: 200, textAlign: "center",
              border: "none", outline: "none",
              background: "transparent", color: token.textPrimary,
              fontFamily: "inherit",
            }}
          />
        </div>
        <p style={{ ...t.small, color: label.color, marginTop: 8, minHeight: 20 }}>
          {label.text}
        </p>
      </div>

      {/* category */}
      <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 10 }}>หมวดหมู่</p>
      <div className="scrollbar-none" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} active={cat === c} onClick={() => setCat(c)} />
        ))}
      </div>

      {/* bucket preview */}
      {cat && (
        <div style={{
          background: token.surfaceAlt, borderRadius: 10,
          padding: "10px 14px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: buckets.find((b) => b.id === getBucketId(cat))?.color ?? token.textHint,
          }} />
          <p style={{ ...t.tiny }}>
            ตัดจากกล่อง:{" "}
            <span style={{ color: token.textPrimary, fontWeight: 500 }}>
              {buckets.find((b) => b.id === getBucketId(cat))?.name ?? "ไม่ระบุ"}
            </span>
          </p>
        </div>
      )}

      {/* who */}
      <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 10 }}>ใครจ่าย?</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        <Chip label="ฉัน" active={who === "me"}      onClick={() => setWho("me")} />
        <Chip label="แฟน" active={who === "partner"}  onClick={() => setWho("partner")} />
      </div>

      <BtnPrimary onClick={handleSave} disabled={!canSave || saving}>
        {saving ? "กำลังบันทึก..." : done ? "บันทึกแล้ว ✓" : "บันทึก"}
      </BtnPrimary>

      <BottomNav />
    </div>
  );
}
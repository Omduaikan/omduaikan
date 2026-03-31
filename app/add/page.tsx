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
  "อาหาร & เครื่องดื่ม",
  "เดินทาง & รถ",
  "ที่พัก & บิล",
  "ของใช้ในบ้าน",
  "ช้อปปิ้ง",
  "สุขภาพ & ความงาม",
  "บันเทิง & พักผ่อน",
  "การศึกษา",
  "ครอบครัว & สัตว์เลี้ยง",
  "ทำบุญ & ของขวัญ",
  "เงินออม & ลงทุน",
  "รายจ่ายพิเศษ",
  "อื่นๆ",
  "รายรับพิเศษ",
];

const CAT_BUCKET: Record<Category, string | null> = {
  "อาหาร & เครื่องดื่ม": "needs",
  "เดินทาง & รถ":     "needs",
  "ที่พัก & บิล":      "needs",
  "ของใช้ในบ้าน":     "needs",
  "ช้อปปิ้ง":         "wants",
  "สุขภาพ & ความงาม": "needs",
  "บันเทิง & พักผ่อน":  "wants",
  "การศึกษา":        "needs",
  "ครอบครัว & สัตว์เลี้ยง": "needs",
  "ทำบุญ & ของขวัญ":  "wants",
  "เงินออม & ลงทุน":    "savings",
  "รายจ่ายพิเศษ":     "needs",
  "อื่นๆ":           "wants",
  "รายรับพิเศษ":      null,
};

// ← AI แนะนำ category จาก note ที่พิมพ์
function guessCategory(note: string): Category | null {
  const n = note.toLowerCase();
  if (/ข้าว|กิน|ร้าน|อาหาร|กาแฟ|ชา|นม|ขนม|บุฟเฟ่ต์|น้ำเปล่า|เซเว่น|7-11/.test(n)) return "อาหาร & เครื่องดื่ม";
  if (/รถ|บัส|มอ|แกร็บ|grab|taxi|แท็กซี่|เดิน|น้ำมัน|เติมน้ำมัน|จอดรถ|ทางด่วน/.test(n)) return "เดินทาง & รถ";
  if (/ไฟ|น้ำ|เน็ต|internet|ค่าบ้าน|ซ่อม|บิล|มือถือ|โทรศัพท์|เช่า/.test(n)) return "ที่พัก & บิล";
  if (/สบู่|แชมพู|ทิชชู่|ผงซักฟอก|น้ำยา|ของใช้|ซุปเปอร์|lotus|bigc/.test(n)) return "ของใช้ในบ้าน";
  if (/ซื้อ|ช้อป|เสื้อ|รองเท้า|กระเป๋า|shopee|lazada|tiktok|mall/.test(n)) return "ช้อปปิ้ง";
  if (/ยา|หมอ|โรงพยาบาล|คลินิก|ฟัน|วิตามิน|สกินแคร์|แต่งหน้า|ตัดผม/.test(n)) return "สุขภาพ & ความงาม";
  if (/หนัง|เกม|คอนเสิร์ต|ท่องเที่ยว|เที่ยว|พักผ่อน|โรงแรม|รีสอร์ท|netflix|disney|youtube/.test(n)) return "บันเทิง & พักผ่อน";
  if (/หนังสือ|เรียน|คอร์ส|ติว|สอบ|สมัคร/.test(n)) return "การศึกษา";
  if (/พ่อ|แม่|ลูก|หมา|แมว|สัตว์เลี้ยง|ทรายแมว|อาหารสัตว์/.test(n)) return "ครอบครัว & สัตว์เลี้ยง";
  if (/ทำบุญ|บริจาค|ของขวัญ|งานแต่ง|งานบวช|วันเกิด/.test(n)) return "ทำบุญ & ของขวัญ";
  if (/ออม|ฝากเงิน|ลงทุน|หุ้น|คริปโต|ทอง|กองทุน|ออมทรัพย์/.test(n)) return "เงินออม & ลงทุน";
  if (/อุบัติเหตุ|ซ่อมฉุกเฉิน|ค่าปรับ|ภาษี/.test(n)) return "รายจ่ายพิเศษ";
  if (/เงินเดือน|โบนัส|ขาย|ได้เงิน|รับเงิน|เงินเข้า|คืน|ค่าน้ำมันคืน|รายได้/.test(n)) return "รายรับพิเศษ";
  return null;
}

function amountLabel(n: number, category: Category | null): { text: string; color: string } {
  if (n <= 0)   return { text: "", color: "" };
  
  if (category === "รายรับพิเศษ") {
    return { text: "เงินเข้า! เยี่ยมไปเลย", color: token.accent };
  }

  // ถ้าเป็นเงินออม ให้แสดงข้อความให้กำลังใจ
  if (category === "เงินออม & ลงทุน") {
    if (n >= 1000) return { text: "เก่งมากเลย! เก็บได้เยอะเชียว", color: token.accent };
    return { text: "เก็บทีละนิด ก็ถึงเป้าได้นะ", color: token.accent };
  }

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
  const label     = amountLabel(amountNum, cat);

  // ← AI แนะนำ category เมื่อพิมพ์ note
  useEffect(() => {
    if (!note) { setSuggested(null); return; }
    const guess = guessCategory(note);
    if (guess && guess !== cat) setSuggested(guess);
    else setSuggested(null);
  }, [note, cat]);

  function getBucketId(c: Category) {
    return buckets.find((b) => b.type === CAT_BUCKET[c])?.id;
  }

  async function handleSave() {
    if (!canSave || !user || !profile?.coupleId) {
      if (!profile?.coupleId) alert("ไม่พบรหัสคู่รัก กรุณาลองล็อกอินใหม่หรือตั้งค่าคู่รัก");
      return;
    }

    if (who === "partner" && !profile.partnerId) {
      alert("คุณยังไม่ได้เชื่อมต่อบัญชีกับแฟน ไม่สามารถบันทึกรายการแทนแฟนได้ครับ");
      return;
    }

    setSaving(true);
    try {
      const periodStart = getPayPeriodStart(profile.paydayType, profile.paydayDate);
      const payPeriodKey = getPayPeriodKey(periodStart);
      
      const bucketId = cat ? getBucketId(cat) : null;

      const txData = {
        userId:         who === "me" ? user.uid : (profile.partnerId || user.uid),
        coupleId:       profile.coupleId,
        amount:         amountNum,
        category:       cat as Category,
        note:           note.trim() || null,
        createdAt:      Timestamp.now(),
        payPeriodStart: Timestamp.fromDate(periodStart),
        payPeriodKey,
        ...(bucketId ? { bucketId } : {}),
      };

      await addDoc(collection(db, "transactions"), txData);
      
      setDone(true);
      setAmount(""); setCat(null); setNote(""); setSuggested(null);
      setTimeout(() => { setDone(false); router.push("/overview"); }, 800);
    } catch (e: unknown) { 
      console.error(e);
      const err = e as { message?: string };
      alert("บันทึกไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ"));
    }
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
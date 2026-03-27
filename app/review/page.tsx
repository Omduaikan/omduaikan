"use client";

import { useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTransactions } from "@/hooks/useTransactions";
import { getMonthlyReview } from "@/lib/ai";
import { getCurrentMonth } from "@/lib/calculations";
import { Category } from "@/types";
import BottomNav from "@/components/BottomNav";
import { token, t, BtnOutline, ProgressBar, Label } from "@/components/ui";

export default function ReviewPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { transactions } = useTransactions(
    profile?.coupleId,
    profile?.paydayType ?? "end_of_month",
    profile?.paydayDate
  );

  const [review, setReview]           = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiDone, setAiDone]           = useState(false);

  // ── การคำนวณที่ถูกต้อง ──
  const totalIncome   = profile?.monthlyIncome ?? 0;
  const expenseBuffer = profile?.expenseBuffer ?? 0;   // ← แก้จาก fixedExpenses
  const netIncome     = totalIncome - expenseBuffer    // เงินที่วางแผนได้จริง

  const myTxs        = transactions.filter((tx) => tx.userId === user?.uid);
  const partnerTxs   = transactions.filter((tx) => tx.userId !== user?.uid);
  const mySpent      = myTxs.reduce((s, tx) => s + tx.amount, 0);
  const partnerSpent = partnerTxs.reduce((s, tx) => s + tx.amount, 0);
  const totalSpent   = mySpent + partnerSpent;

  // เงินที่เหลือ = เงินสุทธิ - รายจ่ายของฉัน
  const mySaved      = Math.max(netIncome - mySpent, 0);
  const savingRate   = netIncome > 0 ? Math.round((mySaved / netIncome) * 100) : 0;

  const byCategory = myTxs.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] ?? 0) + tx.amount;
    return acc;
  }, {} as Record<Category, number>);

  const sortedCats = (Object.entries(byCategory) as [Category, number][])
    .sort((a, b) => b[1] - a[1]);
  const maxAmt = sortedCats[0]?.[1] ?? 1;

  const rateNote =
    savingRate >= 20 ? "ยอดเยี่ยม เกิน 20% แล้ว" :
    savingRate >= 10 ? "ดีมาก ลองเพิ่มขึ้นอีกนิด" :
    "ลองตั้งเป้า 10% ก่อนในเดือนหน้า";

  async function handleAI() {
    if (aiDone || aiLoading || myTxs.length === 0) return;
    setAiLoading(true);
    try {
      const res = await getMonthlyReview({
        month: getCurrentMonth(),
        totalIncome: netIncome,
        totalSpent: mySpent,
        totalSaved: mySaved,
        spentByCategory: byCategory as Record<string, number>,
      });
      setReview(res.review);
      setSuggestions(res.suggestions);
      setAiDone(true);
    } finally { setAiLoading(false); }
  }

  return (
    <div className="page-wide" style={{ paddingTop: 28, paddingBottom: 100 }}>

      {/* header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 2 }}>
          {format(new Date(), "MMMM yyyy", { locale: th })}
        </p>
        <p style={{ ...t.h1, margin: 0 }}>รีวิวรอบนี้</p>
      </div>

      {/* ── summary 3 ช่อง ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { label: "รายได้สุทธิ", val: netIncome,   note: `หักสำรอง ฿${expenseBuffer.toLocaleString()}`, accent: false },
          { label: "ใช้ไปแล้ว",  val: mySpent,     note: `${myTxs.length} รายการ`,                      accent: false },
          { label: "เหลือเก็บ",  val: mySaved,     note: `${savingRate}% ของรายได้`,                     accent: true  },
        ].map((item) => (
          <div key={item.label} style={{
            background: item.accent ? token.accentBg : token.surfaceAlt,
            border: `1px solid ${item.accent ? token.accentLight : token.border}`,
            borderRadius: 14, padding: "14px 14px",
          }}>
            <p style={{ fontSize: 10, color: item.accent ? token.accent : token.textHint, marginBottom: 6, textTransform: "uppercase" as const }}>
              {item.label}
            </p>
            <p style={{ fontSize: 17, fontWeight: 500, margin: "0 0 3px", color: item.accent ? token.accent : token.textPrimary }}>
              ฿{item.val.toLocaleString()}
            </p>
            <p style={{ fontSize: 10, color: item.accent ? token.accent : token.textHint, margin: 0 }}>
              {item.note}
            </p>
          </div>
        ))}
      </div>

      {/* ── การคำนวณอธิบาย ── */}
      <div style={{
        background: token.surfaceAlt,
        border: `1px solid ${token.border}`,
        borderRadius: 14, padding: "14px 16px", marginBottom: 14,
      }}>
        <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 10 }}>สูตรคำนวณรอบนี้</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "เงินเดือน",       val: `฿${totalIncome.toLocaleString()}`,     color: token.textPrimary },
            { label: "หัก งบสำรอง",     val: `− ฿${expenseBuffer.toLocaleString()}`, color: token.danger      },
            { label: "= รายได้สุทธิ",   val: `฿${netIncome.toLocaleString()}`,       color: token.textPrimary },
            { label: "หัก ใช้จ่ายจริง", val: `− ฿${mySpent.toLocaleString()}`,       color: token.danger      },
            { label: "= เหลือเก็บ",     val: `฿${mySaved.toLocaleString()}`,         color: token.accent      },
          ].map((row, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              paddingTop: i === 2 || i === 4 ? 6 : 0,
              borderTop: i === 2 || i === 4 ? `1px solid ${token.border}` : "none",
            }}>
              <p style={{ ...t.small, margin: 0, color: token.textSecondary }}>{row.label}</p>
              <p style={{ ...t.small, margin: 0, fontWeight: i === 4 ? 500 : 400, color: row.color }}>
                {row.val}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── saving rate ── */}
      <div style={{
        background: token.surface, border: `1px solid ${token.border}`,
        borderRadius: 16, padding: "18px 20px", marginBottom: 14,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ ...t.h3, margin: 0 }}>อัตราออม</p>
          <p style={{ fontSize: 24, fontWeight: 500, color: token.accent, margin: 0 }}>{savingRate}%</p>
        </div>
        <ProgressBar value={savingRate} max={100} />
        <p style={{ ...t.tiny, marginTop: 8 }}>{rateNote}</p>
      </div>

      {/* ── ฉัน vs แฟน ── */}
      {totalSpent > 0 && (
        <div style={{
          background: token.surface, border: `1px solid ${token.border}`,
          borderRadius: 16, padding: "18px 20px", marginBottom: 14,
        }}>
          <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 16 }}>ฉัน vs แฟน</p>
          {[
            { label: "ฉัน",  val: mySpent,      color: token.accent },
            { label: "แฟน",  val: partnerSpent,  color: "#4A7FB5"    },
          ].map((item) => (
            <div key={item.label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <p style={{ ...t.body, margin: 0 }}>{item.label}</p>
                <p style={{ ...t.body, fontWeight: 500, margin: 0 }}>฿{item.val.toLocaleString()}</p>
              </div>
              <ProgressBar value={item.val} max={Math.max(mySpent, partnerSpent, 1)} color={item.color} />
            </div>
          ))}
        </div>
      )}

      {/* ── category breakdown ── */}
      {sortedCats.length > 0 && (
        <div style={{
          background: token.surface, border: `1px solid ${token.border}`,
          borderRadius: 16, padding: "18px 20px", marginBottom: 14,
        }}>
          <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 16 }}>รายจ่ายตามหมวด</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sortedCats.map(([cat, amt]) => (
              <div key={cat}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <p style={{ ...t.body, margin: 0 }}>{cat}</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <p style={{ ...t.tiny }}>
                      {Math.round((amt / mySpent) * 100)}%
                    </p>
                    <p style={{ ...t.body, fontWeight: 500, margin: 0 }}>฿{amt.toLocaleString()}</p>
                  </div>
                </div>
                <ProgressBar value={amt} max={maxAmt} color={token.textSecondary} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI ── */}
      {!aiDone ? (
        <BtnOutline
          onClick={handleAI}
          style={{ marginBottom: 14, opacity: myTxs.length === 0 ? 0.4 : 1 }}
        >
          {aiLoading ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{
                width: 14, height: 14, display: "inline-block",
                border: `2px solid ${token.border}`,
                borderTopColor: token.textPrimary,
                borderRadius: "50%", animation: "spin 0.7s linear infinite",
              }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              AI กำลังวิเคราะห์...
            </span>
          ) : "ขอให้ AI วิเคราะห์รอบนี้"}
        </BtnOutline>
      ) : (
        <div style={{
          background: token.accentBg, border: `1px solid ${token.accentLight}`,
          borderRadius: 16, padding: "18px 20px",
        }}>
          <p style={{ ...t.tiny, color: token.accent, textTransform: "uppercase", marginBottom: 10 }}>
            AI วิเคราะห์
          </p>
          <p style={{ ...t.body, lineHeight: 1.75, margin: "0 0 16px" }}>{review}</p>
          {suggestions.length > 0 && (
            <>
              <p style={{ ...t.tiny, color: token.accent, textTransform: "uppercase", marginBottom: 8 }}>
                คำแนะนำ
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {suggestions.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: token.accent, flexShrink: 0, fontWeight: 500 }}>·</span>
                    <p style={{ ...t.body, margin: 0 }}>{s}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
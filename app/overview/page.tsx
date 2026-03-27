"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTransactions } from "@/hooks/useTransactions";
import { useBuckets } from "@/hooks/useBuckets";
import { useGoals } from "@/hooks/useGoals";
import {
  getDailyBudgetLeft,
  getDailyBudget,
  getProjectedSavings,
  getDaysUntilPayday,
  calcMonthsToGoal,
  getBudgetStatus,
} from "@/lib/calculations";
import { Category, BudgetStatus } from "@/types";
import BottomNav from "@/components/BottomNav";
import { token, t, Label, ProgressBar, Spinner } from "@/components/ui";

const STATUS_CONFIG: Record<BudgetStatus, { bg: string; border: string; text: string; label: string }> = {
  great: { bg: token.accentBg, border: token.accentLight, text: token.accent,  label: "ใช้ได้สบายๆ"  },
  ok:    { bg: "#FFF8ED",      border: "#F5DFA0",         text: "#8A6D3B",     label: "พอใช้ได้"      },
  tight: { bg: "#FFF3ED",      border: "#F5C9A0",         text: "#A0522D",     label: "เริ่มตึงแล้ว"  },
  over:  { bg: token.dangerBg, border: "#F5C6C2",         text: token.danger,  label: "เกินงบวันนี้"  },
};

const CAT_COLOR: Record<Category, string> = {
  อาหาร:          token.accent,
  เดินทาง:         "#4A7FB5",
  ช้อปปิ้ง:        "#8A6D3B",
  สุขภาพ:          "#4A7A4A",
  บันเทิง:         "#A0522D",
  ที่พัก:          "#6B5B8A",
  "ค่าบ้าน/บิล":   "#5B7A8A",
  รายจ่ายพิเศษ:    "#8A5B6B",
  อื่นๆ:           token.textHint,
};

export default function OverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { profile, loading: profileLoading } = useUserProfile();
  const { transactions, loading: txLoading } = useTransactions(
    profile?.coupleId,
    profile?.paydayType ?? "end_of_month",
    profile?.paydayDate
  );
  const { buckets } = useBuckets(profile?.coupleId);
  const { goals }   = useGoals(profile?.coupleId);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/");
  }, [user, authLoading]);

  if (authLoading || profileLoading) return <Spinner />;
  if (!profile) return null;

  // ── คำนวณ ──
  const myTxs        = transactions.filter((tx) => tx.userId === user!.uid);
  const partnerTxs   = transactions.filter((tx) => tx.userId !== user!.uid);
  const mySpent      = myTxs.reduce((s, tx) => s + tx.amount, 0);
  const partnerSpent = partnerTxs.reduce((s, tx) => s + tx.amount, 0);

  const savingTarget = buckets
    .filter((b) => ["savings", "emergency", "investment"].includes(b.type))
    .reduce((s, b) => s + b.targetAmount, 0);

  const netIncome   = profile.monthlyIncome - profile.expenseBuffer;
  const saved       = Math.max(netIncome - mySpent, 0);
  const savingPct   = savingTarget > 0
    ? Math.min(Math.round((saved / savingTarget) * 100), 100) : 0;
  const daysLeft    = getDaysUntilPayday(profile.paydayType, profile.paydayDate);
  const projected   = getProjectedSavings(
    profile.monthlyIncome, profile.expenseBuffer, mySpent,
    profile.paydayType, profile.paydayDate
  );
  const dailyBudget = getDailyBudget(
    profile.monthlyIncome, profile.expenseBuffer, savingTarget,
    profile.paydayType, profile.paydayDate
  );
  const dailyLeft   = getDailyBudgetLeft(
    profile.monthlyIncome, profile.expenseBuffer, savingTarget, mySpent,
    profile.paydayType, profile.paydayDate
  );
  const status    = getBudgetStatus(dailyLeft, dailyBudget);
  const statusCfg = STATUS_CONFIG[status];

  // ยอดทบสะสมจากวันที่ใช้น้อยกว่างบ
  const rollover = Math.max(dailyLeft - dailyBudget, 0);

  const todayStr        = format(new Date(), "yyyy-MM-dd");
  const myToday         = myTxs
    .filter((tx) => format(tx.createdAt, "yyyy-MM-dd") === todayStr)
    .reduce((s, tx) => s + tx.amount, 0);
  const partnerToday    = partnerTxs
    .filter((tx) => format(tx.createdAt, "yyyy-MM-dd") === todayStr)
    .reduce((s, tx) => s + tx.amount, 0);
  const partnerRecorded = partnerTxs
    .some((tx) => format(tx.createdAt, "yyyy-MM-dd") === todayStr);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "สวัสดีตอนเช้า"
    : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
  const topGoal  = goals.filter((g) => !g.completed)[0];

  // ชื่อ — ลบอักขระพิเศษ fallback เป็น "คุณ"
  const firstName = profile.displayName
    ?.replace(/[^ก-๙a-zA-Z\s]/g, "")
    ?.split(" ")[0]
    ?.trim() || "คุณ";

  return (
    <div className="page-wide" style={{ paddingTop: 28, paddingBottom: 100 }}>

      {/* ── greeting ── */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 2 }}>
          {greeting}
        </p>
        <p style={{ ...t.h1, margin: 0 }}>{firstName}</p>
      </div>

      {/* ── savings card หรือ CTA ถ้าไม่มีเป้า ── */}
      {savingTarget === 0 ? (
        <div style={{
          background: token.accentBg,
          border: `1px solid ${token.accentLight}`,
          borderRadius: 20, padding: "22px", marginBottom: 12,
        }}>
          <p style={{ ...t.h3, margin: "0 0 6px" }}>ยังไม่ได้ตั้งเป้าการออม</p>
          <p style={{ ...t.small, color: token.textSecondary, marginBottom: 16, lineHeight: 1.6 }}>
            ตั้งเป้าหมายเพื่อให้แอปคำนวณได้ว่าเก็บได้แค่ไหนแล้วในรอบนี้
          </p>
          <a
            href="/onboarding"
            style={{
              display: "inline-block", padding: "10px 20px",
              background: token.accent, color: "#fff",
              borderRadius: 99, fontSize: 13, fontWeight: 500,
              textDecoration: "none",
            }}
          >
            ตั้งเป้าเลย
          </a>
        </div>
      ) : (
        <div style={{
          background: token.accentBg,
          border: `1px solid ${token.accentLight}`,
          borderRadius: 20, padding: "22px 22px 18px", marginBottom: 12,
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", marginBottom: 18,
          }}>
            <div>
              <Label>เก็บได้รอบนี้</Label>
              <p style={{
                fontSize: 40, fontWeight: 500, letterSpacing: "-1.5px",
                color: token.accent, margin: "4px 0 0",
              }}>
                ฿{saved.toLocaleString()}
              </p>
              <p style={{ ...t.tiny, marginTop: 4 }}>
                เป้า ฿{savingTarget.toLocaleString()}
              </p>
            </div>
            <div style={{
              background: token.surface, borderRadius: 12,
              padding: "10px 14px", textAlign: "center",
            }}>
              <p style={{ fontSize: 24, fontWeight: 500, color: token.accent, margin: 0 }}>
                {savingPct}%
              </p>
              <p style={{ ...t.tiny, marginTop: 2 }}>ของเป้า</p>
            </div>
          </div>
          <ProgressBar value={saved} max={savingTarget} color={token.accent} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <p style={{ ...t.tiny }}>เหลืออีก {daysLeft} วัน</p>
            <p style={{ ...t.tiny }}>
              คาดสิ้นรอบ ฿{Math.max(projected, 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* ── daily budget + status ── */}
      <div style={{
  background: statusCfg.bg,
  border: `1px solid ${statusCfg.border}`,
  borderRadius: 16, padding: "18px 20px", marginBottom: 12,
}}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
    <div>
      <Label>ใช้ได้อีกวันนี้</Label>
      <p style={{
        fontSize: 32, fontWeight: 500, letterSpacing: "-1px",
        margin: "4px 0 0", color: statusCfg.text,
      }}>
        {dailyLeft < 0 && "−"}฿{Math.abs(dailyLeft).toLocaleString()}
      </p>
      <p style={{ ...t.tiny, marginTop: 6, color: statusCfg.text }}>
        {myToday > 0
          ? `ใช้ไปแล้ว ฿${myToday.toLocaleString()} วันนี้`
          : "ยังไม่ได้ใช้วันนี้เลย"}
      </p>
    </div>
    <div style={{
      background: token.surface, borderRadius: 10,
      padding: "6px 14px", alignSelf: "flex-start",
    }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: statusCfg.text, margin: 0 }}>
        {statusCfg.label}
      </p>
    </div>
  </div>
</div>

      {/* ── today cards + partner status ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        <div style={{
          background: token.surface, border: `1px solid ${token.border}`,
          borderRadius: 14, padding: "16px 18px",
        }}>
          <Label>ฉัน · วันนี้</Label>
          <p style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px", margin: "4px 0 0" }}>
            ฿{myToday.toLocaleString()}
          </p>
        </div>
        <div style={{
          background: token.surface,
          border: `1px solid ${partnerRecorded ? token.accentLight : token.border}`,
          borderRadius: 14, padding: "16px 18px",
        }}>
          <Label>แฟน · วันนี้</Label>
          <p style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px", margin: "4px 0 0" }}>
            ฿{partnerToday.toLocaleString()}
          </p>
          <p style={{ ...t.tiny, marginTop: 4, color: partnerRecorded ? token.accent : token.textHint }}>
            {partnerRecorded ? "บันทึกแล้ววันนี้" : "ยังไม่ได้บันทึก"}
          </p>
        </div>
      </div>

      {/* ── buckets ── */}
      {buckets.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 12 }}>กล่องเงิน</p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
          }}>
            {buckets.map((b) => {
              const spent     = transactions
                .filter((tx) => tx.bucketId === b.id)
                .reduce((s, tx) => s + tx.amount, 0);
              const remaining = Math.max(b.targetAmount - spent, 0);
              const pct       = b.targetAmount > 0
                ? Math.min(Math.round((spent / b.targetAmount) * 100), 100) : 0;
              const barColor  = pct >= 80 ? token.danger
                : pct >= 50 ? "#8A6D3B" : b.color;

              return (
                <div key={b.id} style={{
                  background: token.surface, border: `1px solid ${token.border}`,
                  borderRadius: 14, padding: "14px 16px",
                }}>
                  <p style={{
                    ...t.tiny, marginBottom: 4,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {b.name}
                  </p>
                  <p style={{
                    fontSize: 18, fontWeight: 500,
                    letterSpacing: "-0.3px", margin: "0 0 12px",
                  }}>
                    ฿{remaining.toLocaleString()}
                  </p>

                  {/* progress bar พร้อม label */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <p style={{ ...t.tiny }}>ใช้ {pct}%</p>
                    <p style={{ ...t.tiny }}>฿{spent.toLocaleString()}</p>
                  </div>
                  <div style={{
                    background: token.surfaceAlt,
                    borderRadius: 99, height: 6, overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${pct}%`, height: 6, borderRadius: 99,
                      background: barColor,
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── top goal ── */}
      {topGoal && (
        <div style={{
          background: token.surface, border: `1px solid ${token.border}`,
          borderRadius: 16, padding: "18px 20px", marginBottom: 24,
        }}>
          <Label>เป้าหมายหลัก</Label>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", margin: "8px 0 14px",
          }}>
            <div>
              <p style={{ ...t.h3, margin: 0 }}>{topGoal.name}</p>
              <p style={{ ...t.tiny, marginTop: 4 }}>
                อีก {calcMonthsToGoal(
                  topGoal.targetAmount,
                  topGoal.savedAmount,
                  topGoal.monthlyContribution
                )} เดือน
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 18, fontWeight: 500, color: token.accent, margin: 0 }}>
                ฿{topGoal.savedAmount.toLocaleString()}
              </p>
              <p style={{ ...t.tiny, marginTop: 2 }}>
                / ฿{topGoal.targetAmount.toLocaleString()}
              </p>
            </div>
          </div>
          <ProgressBar value={topGoal.savedAmount} max={topGoal.targetAmount} />
        </div>
      )}

      {/* ── recent transactions ── */}
      <p style={{ ...t.tiny, textTransform: "uppercase", marginBottom: 12 }}>รายการล่าสุด</p>

      {txLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
          <div style={{
            width: 18, height: 18,
            border: `2px solid ${token.border}`,
            borderTopColor: token.textPrimary,
            borderRadius: "50%", animation: "spin 0.7s linear infinite",
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : transactions.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 0",
          border: `1px dashed ${token.border}`,
          borderRadius: 16,
        }}>
          <p style={{ ...t.small, color: token.textHint }}>ยังไม่มีรายการ</p>
          <p style={{ ...t.tiny, marginTop: 4 }}>กดปุ่ม + เพื่อเริ่มบันทึก</p>
        </div>
      ) : (
        <div>
          {transactions.slice(0, 10).map((tx, i) => (
            <div
              key={tx.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 0",
                borderBottom: i < Math.min(transactions.length, 10) - 1
                  ? `1px solid ${token.border}` : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: CAT_COLOR[tx.category],
                }} />
                <div>
                  <p style={{ ...t.body, margin: 0, fontWeight: 500 }}>{tx.category}</p>
                  <p style={{ ...t.tiny, marginTop: 2 }}>
                    {tx.userId === user?.uid ? "ฉัน" : "แฟน"} · {format(tx.createdAt, "HH:mm")}
                    {tx.note ? ` · ${tx.note}` : ""}
                  </p>
                </div>
              </div>
              <p style={{ ...t.body, fontWeight: 500, margin: 0 }}>
                ฿{tx.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
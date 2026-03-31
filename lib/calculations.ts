import {
  endOfMonth, setDate, addMonths, startOfDay,
  differenceInDays, format,
} from "date-fns"
import { BucketType, BudgetStatus } from "@/types"

export function getPayPeriodStart(
  paydayType: "date" | "end_of_month",
  paydayDate: number | undefined | string,
  from: Date = new Date()
): Date {
  // ทำให้ from เริ่มต้นที่ 00:00:00 เสมอ เพื่อไม่ให้มีปัญหาในการเปรียบเทียบเวลา
  const fromStartOfDay = startOfDay(from);

  if (paydayType === "end_of_month") {
    return endOfMonth(addMonths(fromStartOfDay, -1))
  }
  const day = typeof paydayDate === 'string' ? parseInt(paydayDate, 10) : (paydayDate ?? 25)
  const thisMonthPayday = setDate(fromStartOfDay, day || 25)
  return fromStartOfDay >= thisMonthPayday
    ? thisMonthPayday
    : setDate(addMonths(fromStartOfDay, -1), day || 25)
}

export function getPayPeriodEnd(
  paydayType: "date" | "end_of_month",
  paydayDate: number | undefined | string,
  from: Date = new Date()
): Date {
  const start = getPayPeriodStart(paydayType, paydayDate, from)
  if (paydayType === "end_of_month") {
    return endOfMonth(addMonths(start, 1))
  }
  const day = typeof paydayDate === 'string' ? parseInt(paydayDate, 10) : (paydayDate ?? 25)
  return setDate(addMonths(start, 1), (day || 25) - 1)
}

export function getDaysUntilPayday(
  paydayType: "date" | "end_of_month",
  paydayDate: number | undefined | string
): number {
  return Math.max(differenceInDays(getPayPeriodEnd(paydayType, paydayDate), new Date()), 0)
}

export function getTotalDaysInPeriod(
  paydayType: "date" | "end_of_month",
  paydayDate: number | undefined | string
): number {
  const start = getPayPeriodStart(paydayType, paydayDate)
  const end   = getPayPeriodEnd(paydayType, paydayDate)
  return differenceInDays(end, start) + 1
}

// งบรายวันที่ควรใช้ได้
export function getDailyBudget(
  monthlyIncome: number,
  expenseBuffer: number,
  savingTarget: number,
  paydayType: "date" | "end_of_month",
  paydayDate: number | undefined | string
): number {
  const totalDays = getTotalDaysInPeriod(paydayType, paydayDate)
  const spendable = monthlyIncome - expenseBuffer - savingTarget
  return Math.round(Math.max(spendable, 0) / totalDays)
}

// งบที่เหลือวันนี้ (รายวัน × วันที่เหลือ − รายจ่ายที่เหลือ)
export function getDailyBudgetLeft(
  monthlyIncome: number,
  expenseBuffer: number,
  savingTarget: number,
  totalSpentThisPeriod: number,
  paydayType: "date" | "end_of_month",
  paydayDate: number | undefined | string
): number {
  const today      = new Date()
  const periodEnd  = getPayPeriodEnd(paydayType, paydayDate, today)
  const daysLeft   = Math.max(differenceInDays(periodEnd, today), 1)
  const spendable  = monthlyIncome - expenseBuffer - savingTarget
  const remaining  = spendable - totalSpentThisPeriod
  return Math.round(remaining / daysLeft)
}

// ← ใหม่: สัญญาณไฟ บอกสถานะงบวันนี้
export function getBudgetStatus(
  dailyBudgetLeft: number,
  dailyBudget: number
): BudgetStatus {
  if (dailyBudgetLeft < 0)                          return "over"
  if (dailyBudgetLeft < dailyBudget * 0.25)         return "tight"
  if (dailyBudgetLeft < dailyBudget * 0.6)          return "ok"
  return "great"
}

// คาดการณ์สิ้นรอบ
export function getProjectedSavings(
  monthlyIncome: number,
  expenseBuffer: number,
  totalSpentSoFar: number,
  paydayType: "date" | "end_of_month",
  paydayDate: number | undefined | string
): number {
  const today        = new Date()
  const start        = getPayPeriodStart(paydayType, paydayDate, today)
  const end          = getPayPeriodEnd(paydayType, paydayDate, today)
  const totalDays    = differenceInDays(end, start) + 1
  const daysElapsed  = Math.max(differenceInDays(today, start) + 1, 1)
  const dailyRate    = totalSpentSoFar / daysElapsed
  const projected    = dailyRate * totalDays
  return Math.round(monthlyIncome - expenseBuffer - projected)
}

export function calcMonthsToGoal(
  targetAmount: number,
  savedAmount: number,
  monthlyContribution: number
): number {
  if (monthlyContribution <= 0) return 999
  return Math.ceil(Math.max(targetAmount - savedAmount, 0) / monthlyContribution)
}

export function calcRequiredMonthly(
  targetAmount: number,
  savedAmount: number,
  months: number
): number {
  return Math.ceil(Math.max(targetAmount - savedAmount, 0) / months)
}

export function calcBucketAmount(income: number, percent: number): number {
  return Math.round((income * percent) / 100)
}

export const BUCKET_DEFAULTS: Record<BucketType, { color: string; icon: string; name: string }> = {
  needs:      { color: "#2D7A5F", icon: "ShoppingCart", name: "ค่าใช้จ่ายจำเป็น" },
  wants:      { color: "#4A7FB5", icon: "Heart",        name: "ใช้ชีวิต"          },
  savings:    { color: "#8A6D3B", icon: "PiggyBank",    name: "เก็บออม"           },
  emergency:  { color: "#A0522D", icon: "Shield",       name: "ฉุกเฉิน"          },
  investment: { color: "#4A7A4A", icon: "TrendingUp",   name: "ลงทุน"            },
}

export function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM")
}

export function getPayPeriodKey(date: Date): string {
  return format(date, "yyyy-MM");
}
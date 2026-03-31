import { z } from "zod";

export const UserProfileSchema = z.object({
  uid: z.string(),
  displayName: z.string().default("ผู้ใช้งาน"),
  email: z.string().default(""),
  photoURL: z.string().optional(),
  monthlyIncome: z.number().default(0),
  paydayType: z.enum(["date", "end_of_month"]).default("end_of_month"),
  paydayDate: z.number().optional(),
  expenseBuffer: z.number().default(0),
  coupleId: z.string().optional(),
  partnerId: z.string().optional(),
  onboardingDone: z.boolean().default(false),
  lineNotifyToken: z.string().optional(),
  schemaVersion: z.number().default(1),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export type BucketType =
  | "needs"
  | "wants"
  | "savings"
  | "emergency"
  | "investment"

export interface Bucket {
  id: string
  coupleId: string
  type: BucketType
  name: string
  targetPercent: number
  targetAmount: number
  currentAmount: number
  color: string
  icon: string
  order: number
  createdAt: Date
}

export interface Goal {
  id: string
  coupleId: string
  createdBy: string
  name: string
  targetAmount: number
  savedAmount: number
  monthlyContribution: number
  bucketId?: string
  targetDate?: Date
  estimatedMonths: number
  priority: number
  completed: boolean
  createdAt: Date
}

// ← category เพิ่มและยืดหยุ่นขึ้น
export type Category =
  | "อาหาร & เครื่องดื่ม"
  | "เดินทาง & รถ"
  | "ที่พัก & บิล"
  | "ของใช้ในบ้าน"
  | "ช้อปปิ้ง"
  | "สุขภาพ & ความงาม"
  | "บันเทิง & พักผ่อน"
  | "การศึกษา"
  | "ครอบครัว & สัตว์เลี้ยง"
  | "ทำบุญ & ของขวัญ"
  | "เงินออม & ลงทุน"
  | "รายจ่ายพิเศษ"
  | "อื่นๆ"
  | "รายรับพิเศษ"

export interface Transaction {
  id: string
  userId: string
  coupleId: string
  amount: number
  category: Category
  bucketId?: string
  note?: string
  payPeriodStart: Date
  payPeriodKey: string
  createdAt: Date
}

export interface CoupleData {
  id: string
  member1: string
  member2: string | null
  totalMonthlyIncome: number
  createdAt: Date
}

export interface BucketRecommendation {
  type: BucketType
  name: string
  percent: number
  amount: number
  reason: string
}

export interface AIRecommendation {
  coupleId: string
  month: string
  buckets: BucketRecommendation[]
  savingRate: number
  analysis: string
  suggestions: string[]
  createdAt: Date
}

export interface MonthlySummary {
  id: string
  coupleId: string
  month: string
  totalIncome: number
  totalSpent: number
  totalSaved: number
  savingRate: number
  spentByCategory: Record<Category, number>
  spentByPerson: { [uid: string]: number }
  aiReview: string
  createdAt: Date
}

export interface StreakData {
  userId: string
  currentStreak: number
  lastRecordDate: string
  longestStreak: number
}

// ← ใหม่: สถานะงบวันนี้
export type BudgetStatus = "great" | "ok" | "tight" | "over"
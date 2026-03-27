import { BucketRecommendation, BucketType } from "@/types"
import { BUCKET_DEFAULTS } from "./calculations"

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

// helper เรียก Gemini และ parse JSON กลับมา
async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  })

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
}

// ─────────────────────────────────────────
// แนะนำ % การแบ่ง bucket สำหรับคู่
// ─────────────────────────────────────────
export async function getAIBucketRecommendation(params: {
  totalIncome: number
  fixedExpenses: number
  ages: number[]              // อายุของแต่ละคน
  hasEmergencyFund: boolean   // มีเงินฉุกเฉินอยู่แล้วไหม
}): Promise<BucketRecommendation[]> {
  const prompt = `
คุณเป็นที่ปรึกษาการเงินสำหรับคนไทยอายุน้อย
ช่วยแนะนำการแบ่งเงินเดือนเป็น bucket สำหรับคู่รักที่เพิ่งเริ่มทำงาน

ข้อมูล:
- รายได้รวมต่อเดือน: ${params.totalIncome.toLocaleString()} บาท
- ค่าใช้จ่ายคงที่ต่อเดือน: ${params.fixedExpenses.toLocaleString()} บาท (ค่าไฟ ค่ากับข้าว)
- อายุ: ${params.ages.join(" และ ")} ปี
- มีเงินฉุกเฉิน: ${params.hasEmergencyFund ? "มีแล้ว" : "ยังไม่มี"}

กรุณาตอบกลับเป็น JSON array เท่านั้น ห้ามมีข้อความอื่น รูปแบบ:
[
  {
    "type": "needs|wants|savings|emergency|investment",
    "name": "ชื่อภาษาไทย",
    "percent": 20,
    "reason": "เหตุผลสั้นๆ ภาษาไทย 1 ประโยค"
  }
]

เงื่อนไข:
- percent รวมกันต้องได้ 100
- ถ้าไม่มีเงินฉุกเฉิน ให้มี emergency bucket อย่างน้อย 10%
- อายุน้อยควรเน้น savings และ emergency ก่อน investment
- ใช้ภาษาไทยที่เป็นกันเองสำหรับ reason
`

  try {
    const raw = await callGemini(prompt)
    // ดึง JSON ออกจาก response
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) throw new Error("No JSON found")

    const parsed = JSON.parse(match[0]) as Array<{
      type: BucketType
      name: string
      percent: number
      reason: string
    }>

    return parsed.map((b) => ({
      ...b,
      amount: Math.round((params.totalIncome * b.percent) / 100),
    }))
  } catch {
    // fallback ถ้า AI error
    return getDefaultRecommendation(params.totalIncome, params.hasEmergencyFund)
  }
}

// fallback ถ้า Gemini ไม่ตอบ
function getDefaultRecommendation(
  totalIncome: number,
  hasEmergencyFund: boolean
): BucketRecommendation[] {
  const buckets: Array<{
    type: BucketType
    percent: number
    reason: string
  }> = hasEmergencyFund
    ? [
        { type: "needs",      percent: 40, reason: "ค่าใช้จ่ายจำเป็นในชีวิตประจำวัน" },
        { type: "wants",      percent: 30, reason: "ใช้ชีวิต กิน เที่ยว ช้อปปิ้ง" },
        { type: "savings",    percent: 20, reason: "เก็บออมระยะสั้นเพื่อเป้าหมาย" },
        { type: "investment", percent: 10, reason: "ลงทุนระยะยาวเพื่ออนาคต" },
      ]
    : [
        { type: "needs",     percent: 40, reason: "ค่าใช้จ่ายจำเป็นในชีวิตประจำวัน" },
        { type: "wants",     percent: 25, reason: "ใช้ชีวิต กิน เที่ยว ช้อปปิ้ง" },
        { type: "savings",   percent: 15, reason: "เก็บออมระยะสั้นเพื่อเป้าหมาย" },
        { type: "emergency", percent: 20, reason: "สร้างเงินฉุกเฉิน 3-6 เดือนก่อน" },
      ]

  return buckets.map((b) => ({
    ...b,
    name: BUCKET_DEFAULTS[b.type].name,
    amount: Math.round((totalIncome * b.percent) / 100),
  }))
}

// ─────────────────────────────────────────
// สรุปรายเดือน
// ─────────────────────────────────────────
export async function getMonthlyReview(params: {
  month: string
  totalIncome: number
  totalSpent: number
  totalSaved: number
  spentByCategory: Record<string, number>
  previousMonthSaved?: number
}): Promise<{ review: string; suggestions: string[] }> {
  const savingRate = Math.round((params.totalSaved / params.totalIncome) * 100)

  const prompt = `
คุณเป็นโค้ชการเงินที่เป็นมิตรสำหรับคนไทยวัยเริ่มทำงาน
สรุปผลการเงินเดือนนี้และให้คำแนะนำ

ข้อมูลเดือน ${params.month}:
- รายได้รวม: ฿${params.totalIncome.toLocaleString()}
- ใช้ไปทั้งหมด: ฿${params.totalSpent.toLocaleString()}
- เก็บได้: ฿${params.totalSaved.toLocaleString()} (${savingRate}%)
- รายจ่ายตามหมวด: ${JSON.stringify(params.spentByCategory, null, 2)}
${params.previousMonthSaved ? `- เดือนที่แล้วเก็บได้: ฿${params.previousMonthSaved.toLocaleString()}` : ""}

ตอบเป็น JSON รูปแบบนี้เท่านั้น:
{
  "review": "สรุปภาพรวม 2-3 ประโยค ภาษาไทยเป็นกันเอง ไม่ดุ ให้กำลังใจ",
  "suggestions": [
    "คำแนะนำข้อ 1 สั้นๆ",
    "คำแนะนำข้อ 2 สั้นๆ",
    "คำแนะนำข้อ 3 สั้นๆ"
  ]
}
`

  try {
    const raw = await callGemini(prompt)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("No JSON found")
    return JSON.parse(match[0])
  } catch {
    return {
      review: "เดือนนี้ทำได้ดีมากเลย ยังคงรักษาวินัยการออมได้ต่อเนื่อง",
      suggestions: [
        "ลองตั้งเป้าหมายที่ชัดเจนสำหรับเดือนหน้า",
        "ดูว่าหมวดไหนใช้เยอะเกินไปและลดได้ไหม",
        "อย่าลืมบันทึกรายจ่ายทุกวันเพื่อข้อมูลที่ครบถ้วน",
      ],
    }
  }
}

export { getCurrentMonth } from "./calculations";
// ─────────────────────────────────────────
// Design Tokens
// ─────────────────────────────────────────
export const token = {
  // สี — warm neutral + sage green accent
  bg:         "#FAFAF8",   // background หลัก warm off-white
  surface:    "#FFFFFF",   // card surface
  surfaceAlt: "#F4F3F0",   // input, chip bg
  border:     "#E8E7E3",   // border ทั่วไป
  borderDark: "#D4D3CE",   // border เน้น

  textPrimary:   "#1C1C1A",  // ข้อความหลัก
  textSecondary: "#6B6966",  // ข้อความรอง
  textHint:      "#A8A6A1",  // placeholder, hint

  accent:        "#2D7A5F",  // sage green — ใช้ sparingly
  accentBg:      "#EDF5F1",  // bg เขียวอ่อน
  accentLight:   "#C8E6D8",  // progress bar track

  danger:        "#C0392B",
  dangerBg:      "#FDF2F1",
} as const;

// ─────────────────────────────────────────
// Typography helpers (inline style objects)
// ─────────────────────────────────────────
export const t = {
  h1:    { fontSize: 26, fontWeight: 500, letterSpacing: "-0.5px", color: token.textPrimary },
  h2:    { fontSize: 20, fontWeight: 500, letterSpacing: "-0.3px", color: token.textPrimary },
  h3:    { fontSize: 16, fontWeight: 500, color: token.textPrimary },
  body:  { fontSize: 15, fontWeight: 400, color: token.textPrimary, lineHeight: 1.6 },
  small: { fontSize: 13, fontWeight: 400, color: token.textSecondary },
  tiny:  { fontSize: 11, fontWeight: 400, color: token.textHint, letterSpacing: "0.3px" },
  num:   { fontSize: 32, fontWeight: 500, letterSpacing: "-1px", color: token.textPrimary },
  numLg: { fontSize: 44, fontWeight: 500, letterSpacing: "-2px", color: token.textPrimary },
} as const;

// ─────────────────────────────────────────
// Components
// ─────────────────────────────────────────

// Card
export function Card({
  children,
  style,
  accent,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: accent ? token.accentBg : token.surface,
        border: `1px solid ${accent ? token.accentLight : token.border}`,
        borderRadius: 16,
        padding: "18px 20px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Label — uppercase small label
export function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ ...t.tiny, textTransform: "uppercase" as const, marginBottom: 6 }}>
      {children}
    </p>
  );
}

// Progress bar
export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div style={{ background: token.surfaceAlt, borderRadius: 99, height: 5, overflow: "hidden" }}>
      <div
        style={{
          width: `${pct}%`,
          height: 5,
          borderRadius: 99,
          background: color ?? token.accent,
          transition: "width 0.5s ease",
        }}
      />
    </div>
  );
}

// Button primary
export function BtnPrimary({
  children,
  onClick,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "15px 0",
        background: disabled ? token.surfaceAlt : token.textPrimary,
        color: disabled ? token.textHint : "#fff",
        border: "none",
        borderRadius: 99,
        fontSize: 14,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "opacity 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// Button outline
export function BtnOutline({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "15px 0",
        background: "transparent",
        color: token.textPrimary,
        border: `1px solid ${token.border}`,
        borderRadius: 99,
        fontSize: 14,
        fontWeight: 400,
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// Input
export function Input({
  placeholder,
  value,
  onChange,
  type = "text",
  prefix,
  style,
  step,
  inputMode,
}: {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  prefix?: string;
  style?: React.CSSProperties;
  step?: string;
  inputMode?: any;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: token.surfaceAlt,
        border: `1px solid ${token.border}`,
        borderRadius: 12,
        padding: "0 16px",
        ...style,
      }}
    >
      {prefix && (
        <span style={{ ...t.body, color: token.textHint, marginRight: 6 }}>{prefix}</span>
      )}
      <input
        type={type}
        // เมื่อ type="number" เราจะตั้งค่าเริ่มต้นให้รองรับทศนิยมเสมอเพื่อป้องกันปัญหาในอนาคต
        inputMode={inputMode || (type === "number" ? "decimal" : undefined)}
        step={step || (type === "number" ? "any" : undefined)}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 15,
          color: token.textPrimary,
          padding: "13px 0",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

// Chip
export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: "8px 18px",
        borderRadius: 99,
        border: `1px solid ${active ? token.textPrimary : token.border}`,
        background: active ? token.textPrimary : token.surface,
        color: active ? "#fff" : token.textSecondary,
        fontSize: 13,
        fontFamily: "inherit",
        cursor: "pointer",
        whiteSpace: "nowrap" as const,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

// Spinner
export function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div
        style={{
          width: 20,
          height: 20,
          border: `2px solid ${token.border}`,
          borderTopColor: token.textPrimary,
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Divider
export function Divider() {
  return <div style={{ height: 1, background: token.border, margin: "4px 0" }} />;
}

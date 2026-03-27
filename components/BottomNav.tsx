"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, Target, BookOpen, User } from "lucide-react";
import { token } from "./ui";

const nav = [
  { href: "/overview", label: "ภาพรวม",   icon: Home       },
  { href: "/add",      label: "บันทึก",   icon: PlusCircle },
  { href: "/goals",    label: "เป้าหมาย", icon: Target     },
  { href: "/review",   label: "รีวิว",    icon: BookOpen   },
  { href: "/profile",  label: "โปรไฟล์",  icon: User       },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: token.surface,
        borderTop: `1px solid ${token.border}`,
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom, 12px)",
        paddingTop: 8,
      }}
    >
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "6px 0",
              textDecoration: "none",
            }}
          >
            <Icon
              size={21}
              strokeWidth={1.5}
              color={active ? token.textPrimary : token.textHint}
            />
            <span style={{
              fontSize: 10,
              color: active ? token.textPrimary : token.textHint,
              fontWeight: active ? 500 : 400,
            }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

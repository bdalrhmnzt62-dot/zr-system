import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell, type NavItem } from "@/components/AppShell";
import { getMyRole } from "@/lib/admin.functions";
import { LayoutDashboard, KeyRound, Settings, Users } from "lucide-react";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

const items: NavItem[] = [
  { to: "/admin/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/admin/licenses", label: "أكواد التفعيل", icon: KeyRound },
  { to: "/admin/customers", label: "العملاء", icon: Users },
  { to: "/admin/settings", label: "الإعدادات", icon: Settings },
];

function AdminLayout() {
  return (
    <AppShell
      items={items}
      title="لوحة المسؤول"
      badge="ADMIN"
      guard={async () => {
        try {
          const { roles } = await getMyRole();
          return roles.includes("admin");
        } catch { return false; }
      }}
      redirectIfGuardFails="/admin/setup"
    />
  );
}

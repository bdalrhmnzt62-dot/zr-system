import { createFileRoute } from "@tanstack/react-router";
import { AppShell, type NavItem } from "@/components/AppShell";
import { checkLicense } from "@/lib/license.functions";
import { LayoutDashboard, Users, Wrench, ClipboardList, FileText, Package, Receipt, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: ClientAppLayout,
});

const items: NavItem[] = [
  { to: "/app/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/app/customers", label: "العملاء", icon: Users },
  { to: "/app/work-orders", label: "أوامر الشغل", icon: Wrench },
  { to: "/app/inspections", label: "الكشف الفني", icon: ClipboardList },
  { to: "/app/invoices", label: "الفواتير", icon: FileText },
  { to: "/app/inventory", label: "المخزن", icon: Package },
  { to: "/app/expenses", label: "المصروفات", icon: Receipt },
  { to: "/app/reports", label: "تحليل الأرباح", icon: TrendingUp },
];

function ClientAppLayout() {
  return (
    <AppShell
      items={items}
      title="ZR System"
      guard={async () => {
        try {
          const lic = await checkLicense();
          return !!lic;
        } catch { return false; }
      }}
      redirectIfGuardFails="/activate"
    />
  );
}

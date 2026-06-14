import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, Wrench, TrendingUp, ArrowLeft } from "lucide-react";
import { readCachedLicense } from "@/lib/device-id";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/app/dashboard")({
  component: Dashboard,
});

function Stat({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${accent}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-extrabold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const lic = typeof window !== "undefined" ? readCachedLicense() : null;

  const { data: stats } = useQuery({
    queryKey: ["app-stats"],
    queryFn: async () => {
      const [customers, workOrders, invoices, expenses] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("work_orders").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("total, issued_date"),
        supabase.from("expenses").select("amount, expense_date"),
      ]);
      const totalRevenue = (invoices.data ?? []).reduce((s, r) => s + Number(r.total || 0), 0);
      const totalExpenses = (expenses.data ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);

      // Monthly chart for last 6 months
      const months: { name: string; revenue: number; expenses: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        const rev = (invoices.data ?? []).filter((r) => (r.issued_date as string)?.startsWith(key)).reduce((s, r) => s + Number(r.total || 0), 0);
        const exp = (expenses.data ?? []).filter((r) => (r.expense_date as string)?.startsWith(key)).reduce((s, r) => s + Number(r.amount || 0), 0);
        months.push({ name: key, revenue: rev, expenses: exp });
      }

      return {
        customers: customers.count ?? 0,
        workOrders: workOrders.count ?? 0,
        invoices: invoices.data?.length ?? 0,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        months,
      };
    },
  });

  const expDate = lic?.expires_at ? new Date(lic.expires_at) : null;
  const daysLeft = expDate ? Math.max(0, Math.ceil((expDate.getTime() - Date.now()) / 86400000)) : null;

  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <Card className="border-0 gradient-hero text-white shadow-elegant overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <p className="text-xs text-white/70">مرحباً بك في</p>
          <h2 className="text-2xl font-extrabold md:text-3xl">{lic?.client_name ?? "ZR System"}</h2>
          {daysLeft !== null && (
            <p className="mt-2 text-sm text-white/85">
              متبقي على انتهاء الاشتراك: <span className="font-bold">{daysLeft}</span> يوم
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="العملاء" value={stats?.customers ?? 0} icon={Users} accent="bg-primary/10 text-primary" />
        <Stat label="أوامر الشغل" value={stats?.workOrders ?? 0} icon={Wrench} accent="bg-warning/15 text-warning-foreground" />
        <Stat label="الفواتير" value={stats?.invoices ?? 0} icon={FileText} accent="bg-accent text-accent-foreground" />
        <Stat label="صافي الربح" value={`${Number(stats?.netProfit ?? 0).toLocaleString("en-US")} ج.م`} icon={TrendingUp} accent="bg-success/15 text-success" />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>الإيرادات والمصروفات (آخر 6 أشهر)</CardTitle>
        </CardHeader>
        <CardContent style={{ direction: "ltr" }}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats?.months ?? []}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="var(--color-chart-1)" name="إيرادات" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--color-chart-4)" name="مصروفات" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-5">
            <div><p className="text-sm font-bold">إضافة عميل جديد</p><p className="text-xs text-muted-foreground">سجّل عميل وسيارته</p></div>
            <Button asChild size="sm" variant="ghost"><Link to="/app/customers"><ArrowLeft className="h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-5">
            <div><p className="text-sm font-bold">فاتورة جديدة</p><p className="text-xs text-muted-foreground">أنشئ واطبع فاتورة احترافية</p></div>
            <Button asChild size="sm" variant="ghost"><Link to="/app/invoices"><ArrowLeft className="h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center justify-between p-5">
            <div><p className="text-sm font-bold">كشف فني جديد</p><p className="text-xs text-muted-foreground">كشف شامل لسيارة</p></div>
            <Button asChild size="sm" variant="ghost"><Link to="/app/inspections"><ArrowLeft className="h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

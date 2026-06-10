import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_app/app/reports")({
  component: ReportsPage,
});

function Stat({ label, value, hue, Icon }: { label: string; value: string; hue: string; Icon: any }) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${hue}`}><Icon className="h-5 w-5" /></div>
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-extrabold" dir="ltr">{value}</p></div>
      </CardContent>
    </Card>
  );
}

function ReportsPage() {
  const { data } = useQuery({
    queryKey: ["report"],
    queryFn: async () => {
      const [invoices, expenses] = await Promise.all([
        supabase.from("invoices").select("total, issued_date"),
        supabase.from("expenses").select("amount, expense_date"),
      ]);
      const months: { name: string; revenue: number; expenses: number; profit: number }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        const rev = (invoices.data ?? []).filter((r) => (r.issued_date as string)?.startsWith(key)).reduce((s, r) => s + Number(r.total || 0), 0);
        const exp = (expenses.data ?? []).filter((r) => (r.expense_date as string)?.startsWith(key)).reduce((s, r) => s + Number(r.amount || 0), 0);
        months.push({ name: key, revenue: rev, expenses: exp, profit: rev - exp });
      }
      const totalRevenue = (invoices.data ?? []).reduce((s, r) => s + Number(r.total || 0), 0);
      const totalExpenses = (expenses.data ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);
      return { months, totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses };
    },
  });

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-extrabold">تحليل الأرباح</h2><p className="text-sm text-muted-foreground">نظرة شاملة على الإيرادات والمصروفات وصافي الربح</p></div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="إجمالي الإيرادات" value={`${Number(data?.totalRevenue ?? 0).toLocaleString("en-US")} ج.م`} hue="bg-success/15 text-success" Icon={TrendingUp} />
        <Stat label="إجمالي المصروفات" value={`${Number(data?.totalExpenses ?? 0).toLocaleString("en-US")} ج.م`} hue="bg-destructive/15 text-destructive" Icon={TrendingDown} />
        <Stat label="صافي الربح" value={`${Number(data?.netProfit ?? 0).toLocaleString("en-US")} ج.م`} hue="bg-primary/10 text-primary" Icon={DollarSign} />
      </div>

      <Card>
        <CardHeader><CardTitle>الإيرادات والمصروفات (آخر 12 شهر)</CardTitle></CardHeader>
        <CardContent style={{ direction: "ltr" }}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data?.months ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="var(--color-chart-2)" name="إيرادات" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--color-chart-4)" name="مصروفات" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>صافي الربح الشهري</CardTitle></CardHeader>
        <CardContent style={{ direction: "ltr" }}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data?.months ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="profit" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} name="صافي الربح" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

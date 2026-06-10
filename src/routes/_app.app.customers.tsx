import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMut = useMutation({
    mutationFn: async (input: Record<string, string>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل");
      const { error } = await supabase.from("customers").insert({ ...input, owner_id: user.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); setOpen(false); toast.success("تم إضافة العميل"); },
    onError: (e: any) => toast.error(e?.message ?? "فشل"),
  });
  const delMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("customers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); toast.success("تم الحذف"); },
  });

  const filtered = rows.filter((r: any) => !q || (r.full_name || "").includes(q) || (r.phone || "").includes(q) || (r.plate_number || "").includes(q));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-extrabold">العملاء</h2><p className="text-sm text-muted-foreground">إدارة عملاء الورشة وسياراتهم</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Plus className="ms-2 h-4 w-4" /> عميل جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة عميل</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); createMut.mutate(Object.fromEntries(f) as any); }} className="space-y-3">
              <div className="space-y-2"><Label htmlFor="full_name">الاسم</Label><Input id="full_name" name="full_name" required maxLength={120} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label htmlFor="phone">الجوال</Label><Input id="phone" name="phone" maxLength={20} dir="ltr" /></div>
                <div className="space-y-2"><Label htmlFor="plate_number">رقم اللوحة</Label><Input id="plate_number" name="plate_number" maxLength={20} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label htmlFor="car_make">الماركة</Label><Input id="car_make" name="car_make" maxLength={50} /></div>
                <div className="space-y-2"><Label htmlFor="car_model">الموديل</Label><Input id="car_model" name="car_model" maxLength={50} /></div>
                <div className="space-y-2"><Label htmlFor="car_year">السنة</Label><Input id="car_year" name="car_year" maxLength={6} dir="ltr" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="notes">ملاحظات</Label><Textarea id="notes" name="notes" maxLength={1000} /></div>
              <DialogFooter><Button type="submit" disabled={createMut.isPending} className="gradient-primary text-primary-foreground">{createMut.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />} حفظ</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <CardTitle>قائمة العملاء ({filtered.length})</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الجوال أو اللوحة..." className="pe-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> :
           filtered.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد عملاء.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>الاسم</TableHead><TableHead>الجوال</TableHead><TableHead>السيارة</TableHead><TableHead>اللوحة</TableHead><TableHead className="text-end">إجراءات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{r.phone || "—"}</TableCell>
                    <TableCell>{[r.car_make, r.car_model, r.car_year].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.plate_number || "—"}</TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("حذف العميل؟")) delMut.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

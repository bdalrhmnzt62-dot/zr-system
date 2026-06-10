import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/work-orders")({
  component: WorkOrdersPage,
});

const STATUS_LABEL: Record<string, string> = { open: "مفتوح", in_progress: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي" };

function WorkOrdersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["work_orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("work_orders").select("*, customers(full_name, plate_number)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => { const { data } = await supabase.from("customers").select("id, full_name").order("full_name"); return data ?? []; },
  });

  const createMut = useMutation({
    mutationFn: async (input: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل");
      const { error } = await supabase.from("work_orders").insert({ ...input, owner_id: user.id, total_amount: Number(input.total_amount || 0) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_orders"] }); setOpen(false); toast.success("تم الإنشاء"); },
    onError: (e: any) => toast.error(e?.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("work_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work_orders"] }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("work_orders").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_orders"] }); toast.success("تم الحذف"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-extrabold">أوامر الشغل</h2><p className="text-sm text-muted-foreground">متابعة الأعمال الجارية في الورشة</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Plus className="ms-2 h-4 w-4" /> أمر شغل جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>أمر شغل جديد</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); createMut.mutate(Object.fromEntries(f)); }} className="space-y-3">
              <div className="space-y-2"><Label htmlFor="title">العنوان</Label><Input id="title" name="title" required maxLength={200} /></div>
              <div className="space-y-2">
                <Label>العميل</Label>
                <Select name="customer_id">
                  <SelectTrigger><SelectValue placeholder="اختر عميل (اختياري)" /></SelectTrigger>
                  <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="description">الوصف</Label><Textarea id="description" name="description" maxLength={2000} /></div>
              <div className="space-y-2"><Label htmlFor="total_amount">المبلغ المتوقع (ج.م)</Label><Input id="total_amount" name="total_amount" type="number" step="0.01" min="0" defaultValue="0" dir="ltr" /></div>
              <DialogFooter><Button type="submit" disabled={createMut.isPending} className="gradient-primary text-primary-foreground">{createMut.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />} حفظ</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>كل الأوامر ({orders.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> :
           orders.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">لا توجد أوامر شغل.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>العنوان</TableHead><TableHead>العميل</TableHead><TableHead>الحالة</TableHead><TableHead>المبلغ</TableHead><TableHead>التاريخ</TableHead><TableHead className="text-end">إجراءات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {orders.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.title}</TableCell>
                    <TableCell>{o.customers?.full_name || "—"}</TableCell>
                    <TableCell>
                      <Select defaultValue={o.status} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-mono text-sm" dir="ltr">{Number(o.total_amount || 0).toLocaleString("en-US")}</TableCell>
                    <TableCell className="font-mono text-xs">{new Date(o.created_at).toISOString().slice(0, 10)}</TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("حذف؟")) delMut.mutate(o.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

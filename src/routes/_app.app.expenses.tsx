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
import { Plus, Trash2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/expenses")({
  component: ExpensesPage,
});

function ExpensesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => { const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false }); if (error) throw error; return data ?? []; },
  });

  const createMut = useMutation({
    mutationFn: async (input: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل");
      const { error } = await supabase.from("expenses").insert({
        owner_id: user.id, title: input.title, category: input.category || null,
        amount: Number(input.amount || 0), expense_date: input.expense_date, notes: input.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setOpen(false); toast.success("تمت الإضافة"); },
    onError: (e: any) => toast.error(e?.message),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: any }) => {
      const { error } = await supabase.from("expenses").update({
        title: input.title,
        category: input.category || null,
        amount: Number(input.amount || 0),
        expense_date: input.expense_date,
        notes: input.notes || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setEditRow(null); toast.success("تم التحديث"); },
    onError: (e: any) => toast.error(e?.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("expenses").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("تم الحذف"); },
  });

  const total = rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-extrabold">المصروفات</h2><p className="text-sm text-muted-foreground">تسجيل مصروفات الورشة</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Plus className="ms-2 h-4 w-4" /> مصروف جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة مصروف</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); createMut.mutate(Object.fromEntries(f)); }} className="space-y-3">
              <div className="space-y-2"><Label htmlFor="title">العنوان</Label><Input id="title" name="title" required maxLength={200} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label htmlFor="category">التصنيف</Label><Input id="category" name="category" maxLength={50} placeholder="إيجار، رواتب، ..." /></div>
                <div className="space-y-2"><Label htmlFor="amount">المبلغ (ج.م)</Label><Input id="amount" name="amount" type="number" min="0" step="0.01" required defaultValue="0" dir="ltr" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="expense_date">التاريخ</Label><Input id="expense_date" name="expense_date" type="date" required defaultValue={today} dir="ltr" /></div>
              <div className="space-y-2"><Label htmlFor="notes">ملاحظات</Label><Textarea id="notes" name="notes" maxLength={1000} /></div>
              <DialogFooter><Button type="submit" disabled={createMut.isPending} className="gradient-primary text-primary-foreground">{createMut.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />} حفظ</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-5"><p className="text-xs text-muted-foreground">إجمالي المصروفات</p><p className="text-2xl font-extrabold text-destructive" dir="ltr">{total.toLocaleString("en-US")} ج.م</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>كل المصروفات ({rows.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">لا توجد مصروفات.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>العنوان</TableHead><TableHead>التصنيف</TableHead><TableHead>المبلغ</TableHead><TableHead>التاريخ</TableHead><TableHead className="text-end">إجراءات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>{r.category || "—"}</TableCell>
                    <TableCell className="font-mono font-bold" dir="ltr">{Number(r.amount).toLocaleString("en-US")}</TableCell>
                    <TableCell className="font-mono text-xs">{r.expense_date}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditRow(r)} title="تعديل"><Pencil className="h-4 w-4 text-primary" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("حذف؟")) delMut.mutate(r.id); }} title="حذف"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل المصروف</DialogTitle></DialogHeader>
          {editRow && (
            <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); updateMut.mutate({ id: editRow.id, input: Object.fromEntries(f) }); }} className="space-y-3">
              <div className="space-y-2"><Label htmlFor="title_e">العنوان</Label><Input id="title_e" name="title" required maxLength={200} defaultValue={editRow.title} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label htmlFor="category_e">التصنيف</Label><Input id="category_e" name="category" maxLength={50} defaultValue={editRow.category ?? ""} /></div>
                <div className="space-y-2"><Label htmlFor="amount_e">المبلغ (ج.م)</Label><Input id="amount_e" name="amount" type="number" min="0" step="0.01" required defaultValue={editRow.amount} dir="ltr" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="expense_date_e">التاريخ</Label><Input id="expense_date_e" name="expense_date" type="date" required defaultValue={editRow.expense_date} dir="ltr" /></div>
              <div className="space-y-2"><Label htmlFor="notes_e">ملاحظات</Label><Textarea id="notes_e" name="notes" maxLength={1000} defaultValue={editRow.notes ?? ""} /></div>
              <DialogFooter><Button type="submit" disabled={updateMut.isPending} className="gradient-primary text-primary-foreground">{updateMut.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />} حفظ</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

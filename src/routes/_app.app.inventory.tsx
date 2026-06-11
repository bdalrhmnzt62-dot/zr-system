import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/inventory")({
  component: InventoryPage,
});

function ItemForm({ initial, onSubmit, pending }: { initial?: any; onSubmit: (v: any) => void; pending: boolean }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); onSubmit(Object.fromEntries(f)); }} className="space-y-3">
      <div className="space-y-2"><Label htmlFor="name">الاسم</Label><Input id="name" name="name" required maxLength={120} defaultValue={initial?.name ?? ""} /></div>
      <div className="space-y-2"><Label htmlFor="sku">الكود (SKU)</Label><Input id="sku" name="sku" maxLength={50} dir="ltr" defaultValue={initial?.sku ?? ""} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2"><Label htmlFor="quantity">الكمية</Label><Input id="quantity" name="quantity" type="number" min="0" step="0.01" defaultValue={initial?.quantity ?? "0"} dir="ltr" /></div>
        <div className="space-y-2"><Label htmlFor="unit_cost">سعر التكلفة</Label><Input id="unit_cost" name="unit_cost" type="number" min="0" step="0.01" defaultValue={initial?.unit_cost ?? "0"} dir="ltr" /></div>
        <div className="space-y-2"><Label htmlFor="unit_price">سعر البيع</Label><Input id="unit_price" name="unit_price" type="number" min="0" step="0.01" defaultValue={initial?.unit_price ?? "0"} dir="ltr" /></div>
      </div>
      <DialogFooter><Button type="submit" disabled={pending} className="gradient-primary text-primary-foreground">{pending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />} حفظ</Button></DialogFooter>
    </form>
  );
}

function InventoryPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["inventory_items"],
    queryFn: async () => { const { data, error } = await supabase.from("inventory_items").select("*").order("created_at", { ascending: false }); if (error) throw error; return data ?? []; },
  });

  const createMut = useMutation({
    mutationFn: async (input: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل");
      const { error } = await supabase.from("inventory_items").insert({
        owner_id: user.id, name: input.name, sku: input.sku || null,
        quantity: Number(input.quantity || 0), unit_cost: Number(input.unit_cost || 0), unit_price: Number(input.unit_price || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory_items"] }); setOpen(false); toast.success("تمت الإضافة"); },
    onError: (e: any) => toast.error(e?.message),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: any }) => {
      const { error } = await supabase.from("inventory_items").update({
        name: input.name, sku: input.sku || null,
        quantity: Number(input.quantity || 0), unit_cost: Number(input.unit_cost || 0), unit_price: Number(input.unit_price || 0),
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory_items"] }); setEditRow(null); toast.success("تم التحديث"); },
    onError: (e: any) => toast.error(e?.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("inventory_items").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory_items"] }); toast.success("تم الحذف"); },
  });

  const totalValue = rows.reduce((s: number, r: any) => s + Number(r.quantity) * Number(r.unit_cost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-extrabold">المخزن</h2><p className="text-sm text-muted-foreground">إدارة قطع الغيار والكميات</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Plus className="ms-2 h-4 w-4" /> صنف جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة صنف</DialogTitle></DialogHeader>
            <ItemForm onSubmit={(v) => createMut.mutate(v)} pending={createMut.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-5"><p className="text-xs text-muted-foreground">إجمالي قيمة المخزون (التكلفة)</p><p className="text-2xl font-extrabold" dir="ltr">{totalValue.toLocaleString("en-US")} ج.م</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الأصناف ({rows.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">لا توجد أصناف.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>الاسم</TableHead><TableHead>الكود</TableHead><TableHead>الكمية</TableHead><TableHead>التكلفة</TableHead><TableHead>البيع</TableHead><TableHead className="text-end">إجراءات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.sku || "—"}</TableCell>
                    <TableCell className="font-mono" dir="ltr">{Number(r.quantity)}</TableCell>
                    <TableCell className="font-mono" dir="ltr">{Number(r.unit_cost).toLocaleString("en-US")}</TableCell>
                    <TableCell className="font-mono" dir="ltr">{Number(r.unit_price).toLocaleString("en-US")}</TableCell>
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
          <DialogHeader><DialogTitle>تعديل الصنف</DialogTitle></DialogHeader>
          {editRow && <ItemForm initial={editRow} onSubmit={(v) => updateMut.mutate({ id: editRow.id, input: v })} pending={updateMut.isPending} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

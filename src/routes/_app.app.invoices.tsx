import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
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
import { Plus, Trash2, Loader2, Printer, ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_app/app/invoices")({
  component: InvoicesPage,
});

const STATUS_LABEL: Record<string, string> = { draft: "مسودة", issued: "صادرة", paid: "مدفوعة", cancelled: "ملغاة" };

function InvoicesPage() {
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*, customers(full_name)").order("created_at", { ascending: false });
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
      const invoice_number = "INV-" + Date.now().toString().slice(-8);
      const { data, error } = await supabase.from("invoices").insert({
        owner_id: user.id, customer_id: input.customer_id || null, invoice_number, notes: input.notes || null,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (inv) => { qc.invalidateQueries({ queryKey: ["invoices"] }); setOpenNew(false); setActiveId(inv.id); toast.success("تم إنشاء الفاتورة"); },
    onError: (e: any) => toast.error(e?.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("invoices").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("تم الحذف"); },
  });

  if (activeId) return <InvoiceDetail id={activeId} onBack={() => setActiveId(null)} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-extrabold">الفواتير</h2><p className="text-sm text-muted-foreground">إنشاء وطباعة الفواتير</p></div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Plus className="ms-2 h-4 w-4" /> فاتورة جديدة</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>فاتورة جديدة</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); createMut.mutate(Object.fromEntries(f)); }} className="space-y-3">
              <div className="space-y-2">
                <Label>العميل</Label>
                <Select name="customer_id">
                  <SelectTrigger><SelectValue placeholder="اختر عميل (اختياري)" /></SelectTrigger>
                  <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="notes">ملاحظات</Label><Textarea id="notes" name="notes" maxLength={1000} /></div>
              <DialogFooter><Button type="submit" disabled={createMut.isPending} className="gradient-primary text-primary-foreground">{createMut.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />} إنشاء وفتح</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>كل الفواتير ({invoices.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {invoices.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">لا توجد فواتير.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>الرقم</TableHead><TableHead>العميل</TableHead><TableHead>الحالة</TableHead><TableHead>الإجمالي</TableHead><TableHead>التاريخ</TableHead><TableHead className="text-end">إجراءات</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {invoices.map((i: any) => (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => setActiveId(i.id)}>
                    <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                    <TableCell>{i.customers?.full_name || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{STATUS_LABEL[i.status]}</Badge></TableCell>
                    <TableCell className="font-mono text-sm" dir="ltr">{Number(i.total || 0).toLocaleString("en-US")}</TableCell>
                    <TableCell className="font-mono text-xs">{i.issued_date}</TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); if (confirm("حذف؟")) delMut.mutate(i.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

function InvoiceDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: invoice } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*, customers(full_name, phone, plate_number, car_make, car_model)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: items = [] } = useQuery({
    queryKey: ["invoice_items", id],
    queryFn: async () => { const { data, error } = await supabase.from("invoice_items").select("*").eq("invoice_id", id).order("created_at"); if (error) throw error; return data ?? []; },
  });
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return null; const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single(); return data; },
  });

  const recalc = async (invId: string) => {
    const { data: rows } = await supabase.from("invoice_items").select("amount").eq("invoice_id", invId);
    const subtotal = (rows ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);
    await supabase.from("invoices").update({ subtotal, total: subtotal } as any).eq("id", invId);
  };

  const addItem = useMutation({
    mutationFn: async (input: { description: string; quantity: number; unit_price: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل");
      const amount = input.quantity * input.unit_price;
      const { error } = await supabase.from("invoice_items").insert({ invoice_id: id, owner_id: user.id, description: input.description, quantity: input.quantity, unit_price: input.unit_price, amount });
      if (error) throw error;
      await recalc(id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoice_items", id] }); qc.invalidateQueries({ queryKey: ["invoice", id] }); qc.invalidateQueries({ queryKey: ["invoices"] }); },
  });

  const delItem = useMutation({
    mutationFn: async (itemId: string) => { const { error } = await supabase.from("invoice_items").delete().eq("id", itemId); if (error) throw error; await recalc(id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoice_items", id] }); qc.invalidateQueries({ queryKey: ["invoice", id] }); qc.invalidateQueries({ queryKey: ["invoices"] }); },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => { const { error } = await supabase.from("invoices").update({ status: status as any }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoice", id] }),
  });

  if (!invoice) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="ms-2 h-4 w-4 rotate-180" /> العودة</Button>
        <div className="flex gap-2">
          <Select defaultValue={invoice.status} onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => window.print()} className="gradient-primary text-primary-foreground"><Printer className="ms-2 h-4 w-4" /> طباعة</Button>
        </div>
      </div>

      {/* Printable invoice */}
      <div ref={printRef} className="rounded-2xl border bg-card p-8 shadow-card print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
          <div>
            <Logo />
            <p className="mt-3 text-sm font-bold">{profile?.workshop_name || profile?.full_name || "ZR System"}</p>
            {profile?.phone && <p className="text-xs text-muted-foreground" dir="ltr">{profile.phone}</p>}
          </div>
          <div className="text-end">
            <div className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
              <FileText className="h-4 w-4" /> فاتورة
            </div>
            <p className="mt-2 font-mono text-sm font-bold">{invoice.invoice_number}</p>
            <p className="font-mono text-xs text-muted-foreground">{invoice.issued_date}</p>
          </div>
        </div>

        <div className="grid gap-4 border-b py-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">العميل</p>
            <p className="font-bold">{invoice.customers?.full_name ?? "—"}</p>
            {invoice.customers?.phone && <p className="font-mono text-xs text-muted-foreground" dir="ltr">{invoice.customers.phone}</p>}
          </div>
          {invoice.customers?.plate_number && (
            <div>
              <p className="text-xs text-muted-foreground">السيارة</p>
              <p className="font-bold">{[invoice.customers.car_make, invoice.customers.car_model].filter(Boolean).join(" ") || "—"}</p>
              <p className="font-mono text-xs">{invoice.customers.plate_number}</p>
            </div>
          )}
        </div>

        <Table className="my-4">
          <TableHeader><TableRow>
            <TableHead>الوصف</TableHead><TableHead className="text-center">الكمية</TableHead><TableHead className="text-center">السعر</TableHead><TableHead className="text-center">الإجمالي</TableHead><TableHead className="no-print" />
          </TableRow></TableHeader>
          <TableBody>
            {items.map((it: any) => (
              <TableRow key={it.id}>
                <TableCell>{it.description}</TableCell>
                <TableCell className="text-center font-mono" dir="ltr">{Number(it.quantity)}</TableCell>
                <TableCell className="text-center font-mono" dir="ltr">{Number(it.unit_price).toLocaleString("en-US")}</TableCell>
                <TableCell className="text-center font-mono font-bold" dir="ltr">{Number(it.amount).toLocaleString("en-US")}</TableCell>
                <TableCell className="no-print"><Button size="sm" variant="ghost" onClick={() => delItem.mutate(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">لا توجد بنود بعد.</TableCell></TableRow>}
          </TableBody>
        </Table>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const description = String(f.get("description") || "").trim();
            if (!description) return;
            addItem.mutate({
              description,
              quantity: Number(f.get("quantity") || 1),
              unit_price: Number(f.get("unit_price") || 0),
            });
            (e.currentTarget as HTMLFormElement).reset();
          }}
          className="grid gap-2 border-t pt-4 sm:grid-cols-[1fr_80px_120px_auto] no-print"
        >
          <Input name="description" placeholder="وصف البند" required maxLength={200} />
          <Input name="quantity" type="number" min="0" step="0.01" defaultValue="1" dir="ltr" />
          <Input name="unit_price" type="number" min="0" step="0.01" defaultValue="0" dir="ltr" placeholder="السعر" />
          <Button type="submit" variant="outline"><Plus className="h-4 w-4" /></Button>
        </form>

        <div className="mt-6 flex justify-end">
          <div className="min-w-[240px] space-y-1.5 rounded-xl border bg-secondary/30 p-4">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">الإجمالي الفرعي</span><span className="font-mono font-bold" dir="ltr">{Number(invoice.subtotal || 0).toLocaleString("en-US")} ج.م</span></div>
            <div className="flex items-center justify-between border-t pt-2 text-base"><span className="font-bold">المجموع</span><span className="font-mono text-xl font-extrabold text-primary" dir="ltr">{Number(invoice.total || 0).toLocaleString("en-US")} ج.م</span></div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-6 border-t pt-4 text-sm text-muted-foreground">
            <p className="mb-1 font-bold text-foreground">ملاحظات:</p>
            <p>{invoice.notes}</p>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">شكراً لتعاملكم معنا — ZR System</p>
      </div>
    </div>
  );
}

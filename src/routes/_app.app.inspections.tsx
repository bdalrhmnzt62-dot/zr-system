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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/app/inspections")({
  component: InspectionsPage,
});

const CATEGORY_LABEL: Record<string, string> = {
  electrical: "كهرباء", mechanical: "ميكانيكا", suspension: "عفشة", bodywork: "سمكرة",
};
const STATUS_LABEL: Record<string, string> = { good: "سليم", monitor: "يحتاج متابعة", repair: "يحتاج إصلاح" };
const STATUS_COLOR: Record<string, string> = {
  good: "bg-success/15 text-success border-success/30",
  monitor: "bg-warning/15 text-warning-foreground border-warning/40",
  repair: "bg-destructive/15 text-destructive border-destructive/30",
};

// Default inspection checklist items per category
const DEFAULT_ITEMS: Record<string, string[]> = {
  electrical: ["البطارية", "الدينمو", "السلف", "الأنوار الأمامية", "الأنوار الخلفية", "المساحات", "التكييف الكهربائي", "أسلاك المحرك"],
  mechanical: ["المحرك", "الزيوت والسوائل", "الفرامل", "ناقل الحركة (الجير)", "العفشة الأمامية", "الكاتم (الشكمان)", "الرديتر", "السيور"],
  suspension: ["المساعدين أمامي", "المساعدين خلفي", "بلي العجل", "كراسي المحرك", "البلوف", "البولي بوش", "عمود الكردان", "ميزان العجلات"],
  bodywork: ["البويا الأمامية", "البويا الخلفية", "الأبواب", "الكبوت", "الصدامات", "الزجاج", "المرايات", "حالة الشاسيه"],
};

function InspectionsPage() {
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: inspections = [] } = useQuery({
    queryKey: ["inspections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inspections").select("*, customers(full_name, plate_number)").order("created_at", { ascending: false });
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
      const { data: ins, error } = await supabase.from("inspections").insert({ title: input.title, customer_id: input.customer_id || null, notes: input.notes || null, owner_id: user.id }).select().single();
      if (error) throw error;
      // Seed default items
      const items: any[] = [];
      Object.entries(DEFAULT_ITEMS).forEach(([cat, names]) => {
        names.forEach((name) => items.push({ inspection_id: ins.id, owner_id: user.id, category: cat, item_name: name, status: "good" }));
      });
      const { error: itemsErr } = await supabase.from("inspection_items").insert(items);
      if (itemsErr) throw itemsErr;
      return ins;
    },
    onSuccess: (ins) => { qc.invalidateQueries({ queryKey: ["inspections"] }); setOpenNew(false); setActiveId(ins.id); toast.success("تم إنشاء الكشف"); },
    onError: (e: any) => toast.error(e?.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("inspections").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inspections"] }); toast.success("تم الحذف"); },
  });

  if (activeId) {
    return <InspectionDetail id={activeId} onBack={() => setActiveId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-extrabold">الكشف الفني</h2><p className="text-sm text-muted-foreground">كشف شامل: كهرباء، ميكانيكا، عفشة، سمكرة</p></div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Plus className="ms-2 h-4 w-4" /> كشف جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>كشف فني جديد</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); createMut.mutate(Object.fromEntries(f)); }} className="space-y-3">
              <div className="space-y-2"><Label htmlFor="title">عنوان الكشف</Label><Input id="title" name="title" required maxLength={200} placeholder="مثال: كشف شامل قبل الشراء" /></div>
              <div className="space-y-2">
                <Label>العميل</Label>
                <Select name="customer_id">
                  <SelectTrigger><SelectValue placeholder="اختر عميل (اختياري)" /></SelectTrigger>
                  <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="notes">ملاحظات</Label><Textarea id="notes" name="notes" maxLength={2000} /></div>
              <DialogFooter><Button type="submit" disabled={createMut.isPending} className="gradient-primary text-primary-foreground">{createMut.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />} إنشاء وفتح</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>كل الكشوفات ({inspections.length})</CardTitle></CardHeader>
        <CardContent>
          {inspections.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">لا توجد كشوفات.</p> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inspections.map((i: any) => (
                <Card key={i.id} className="cursor-pointer transition hover:shadow-elegant" onClick={() => setActiveId(i.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{i.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{i.customers?.full_name || "بدون عميل"}</p>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{new Date(i.created_at).toISOString().slice(0, 10)}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); if (confirm("حذف؟")) delMut.mutate(i.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InspectionDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: inspection } = useQuery({
    queryKey: ["inspection", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("inspections").select("*, customers(full_name, plate_number)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: items = [] } = useQuery({
    queryKey: ["inspection_items", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("inspection_items").select("*").eq("inspection_id", id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ itemId, patch }: { itemId: string; patch: any }) => {
      const { error } = await supabase.from("inspection_items").update(patch).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspection_items", id] }),
  });

  const addItem = useMutation({
    mutationFn: async ({ category, name }: { category: string; name: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("غير مسجل");
      const { error } = await supabase.from("inspection_items").insert({ inspection_id: id, owner_id: user.id, category, item_name: name, status: "good" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspection_items", id] }),
  });

  const delItem = useMutation({
    mutationFn: async (itemId: string) => { const { error } = await supabase.from("inspection_items").delete().eq("id", itemId); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspection_items", id] }),
  });

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="ms-2 h-4 w-4 rotate-180" /> العودة</Button>
      <Card className="shadow-card">
        <CardContent className="p-5">
          <h2 className="text-xl font-extrabold">{inspection?.title}</h2>
          <p className="text-sm text-muted-foreground">{inspection?.customers?.full_name ?? "بدون عميل"} • {inspection?.created_at ? new Date(inspection.created_at).toISOString().slice(0, 10) : ""}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="electrical">
        <TabsList className="grid w-full grid-cols-4">
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => <TabsTrigger key={k} value={k}>{v}</TabsTrigger>)}
        </TabsList>
        {Object.keys(CATEGORY_LABEL).map((cat) => {
          const catItems = items.filter((i: any) => i.category === cat);
          return (
            <TabsContent key={cat} value={cat} className="mt-4 space-y-3">
              {catItems.map((it: any) => (
                <Card key={it.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex-1 font-medium">{it.item_name}</p>
                      <Badge variant="outline" className={STATUS_COLOR[it.status]}>{STATUS_LABEL[it.status]}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => delItem.mutate(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(STATUS_LABEL).map((s) => (
                        <Button key={s} size="sm" variant={it.status === s ? "default" : "outline"} onClick={() => updateItem.mutate({ itemId: it.id, patch: { status: s } })}>
                          {STATUS_LABEL[s]}
                        </Button>
                      ))}
                    </div>
                    <Textarea
                      defaultValue={it.notes ?? ""}
                      placeholder="ملاحظات..."
                      onBlur={(e) => { if (e.target.value !== (it.notes ?? "")) updateItem.mutate({ itemId: it.id, patch: { notes: e.target.value } }); }}
                      maxLength={1000}
                    />
                  </CardContent>
                </Card>
              ))}
              <form
                onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const name = String(f.get("name") || "").trim(); if (!name) return; addItem.mutate({ category: cat, name }); (e.currentTarget as HTMLFormElement).reset(); }}
                className="flex gap-2"
              >
                <Input name="name" placeholder="إضافة عنصر..." maxLength={120} />
                <Button type="submit" variant="outline"><Plus className="h-4 w-4" /></Button>
              </form>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

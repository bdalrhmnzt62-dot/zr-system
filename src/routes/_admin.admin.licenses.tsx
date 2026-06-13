import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listLicenses, createLicense, updateLicense, deleteLicense, renewLicense } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Ban, CheckCircle2, Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/licenses")({
  component: LicensesPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار", active: "نشط", expired: "منتهي", revoked: "محظور",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary", active: "default", expired: "outline", revoked: "destructive",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 10);
}

function LicensesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listLicenses);
  const create = useServerFn(createLicense);
  const update = useServerFn(updateLicense);
  const remove = useServerFn(deleteLicense);
  const renew = useServerFn(renewLicense);

  const { data: licenses = [], isLoading } = useQuery({ queryKey: ["licenses"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [renewRow, setRenewRow] = useState<any | null>(null);
  const [renewMode, setRenewMode] = useState<"days" | "date">("days");

  const createMut = useMutation({
    mutationFn: (input: { client_name: string; duration_days: number; notes?: string }) => create({ data: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["licenses"] }); setOpen(false); toast.success("تم إنشاء الكود"); },
    onError: (e: any) => toast.error(e?.message ?? "فشل الإنشاء"),
  });
  const updateMut = useMutation({
    mutationFn: (input: { id: string; status?: "pending" | "active" | "expired" | "revoked" }) => update({ data: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["licenses"] }); toast.success("تم التحديث"); },
    onError: (e: any) => toast.error(e?.message ?? "فشل التحديث"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["licenses"] }); toast.success("تم الحذف"); },
    onError: (e: any) => toast.error(e?.message ?? "فشل الحذف"),
  });
  const renewMut = useMutation({
    mutationFn: (input: { id: string; add_days?: number; expires_at?: string }) => renew({ data: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["licenses"] }); setRenewRow(null); toast.success("تم تجديد الاشتراك بنفس الكود"); },
    onError: (e: any) => toast.error(e?.message ?? "فشل التجديد"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold">أكواد التفعيل</h2>
          <p className="text-sm text-muted-foreground">إنشاء وإدارة أكواد اشتراك العملاء</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground"><Plus className="ms-2 h-4 w-4" /> كود جديد</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء كود تفعيل</DialogTitle>
              <DialogDescription>سيتم توليد الكود تلقائياً وحفظه بحالة "قيد الانتظار"</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                createMut.mutate({
                  client_name: String(f.get("client_name") || ""),
                  duration_days: Number(f.get("duration_days") || 30),
                  notes: String(f.get("notes") || "") || undefined,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2"><Label htmlFor="cn">اسم العميل</Label><Input id="cn" name="client_name" required maxLength={120} /></div>
              <div className="space-y-2"><Label htmlFor="dd">مدة الاشتراك (يوم)</Label><Input id="dd" name="duration_days" type="number" defaultValue={30} min={1} max={3650} required /></div>
              <div className="space-y-2"><Label htmlFor="nt">ملاحظات (اختياري)</Label><Input id="nt" name="notes" maxLength={500} /></div>
              <DialogFooter>
                <Button type="submit" disabled={createMut.isPending} className="gradient-primary text-primary-foreground">
                  {createMut.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />} إنشاء
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>كل الأكواد</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : licenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد أكواد بعد. أنشئ أول كود.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>التفعيل</TableHead>
                  <TableHead>الانتهاء</TableHead>
                  <TableHead className="text-end">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">
                      <button
                        onClick={() => { navigator.clipboard.writeText(l.key); toast.success("تم النسخ"); }}
                        className="inline-flex items-center gap-1 hover:text-primary"
                      >
                        {l.key} <Copy className="h-3 w-3" />
                      </button>
                    </TableCell>
                    <TableCell>{l.client_name}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[l.status]}>{STATUS_LABEL[l.status]}</Badge></TableCell>
                    <TableCell>{l.duration_days} يوم</TableCell>
                    <TableCell className="font-mono text-xs">{fmtDate(l.activated_at)}</TableCell>
                    <TableCell className="font-mono text-xs">{fmtDate(l.expires_at)}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setRenewRow(l)} title="تجديد"><RefreshCw className="h-4 w-4 text-primary" /></Button>
                        {l.status !== "revoked" && (
                          <Button size="sm" variant="ghost" onClick={() => updateMut.mutate({ id: l.id, status: "revoked" })}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        {l.status === "revoked" && (
                          <Button size="sm" variant="ghost" onClick={() => updateMut.mutate({ id: l.id, status: "pending" })}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("تأكيد الحذف؟")) deleteMut.mutate(l.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!renewRow} onOpenChange={(value) => !value && setRenewRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تجديد الكود</DialogTitle><DialogDescription>سيبقى الكود والجهاز والبيانات كما هي، وسيتم تحديث تاريخ الانتهاء فقط.</DialogDescription></DialogHeader>
          {renewRow && <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            if (renewMode === "days") renewMut.mutate({ id: renewRow.id, add_days: Number(form.get("days") || 30) });
            else renewMut.mutate({ id: renewRow.id, expires_at: new Date(`${String(form.get("date"))}T23:59:59.999Z`).toISOString() });
          }}>
            <div className="grid grid-cols-2 gap-2"><Button type="button" variant={renewMode === "days" ? "default" : "outline"} onClick={() => setRenewMode("days")}>إضافة أيام</Button><Button type="button" variant={renewMode === "date" ? "default" : "outline"} onClick={() => setRenewMode("date")}>تاريخ محدد</Button></div>
            {renewMode === "days" ? <div className="space-y-2"><Label htmlFor="renew-days">عدد الأيام</Label><Input id="renew-days" name="days" type="number" min={1} max={3650} defaultValue={30} required /></div> : <div className="space-y-2"><Label htmlFor="renew-date">تاريخ الانتهاء الجديد</Label><Input id="renew-date" name="date" type="date" min={new Date().toISOString().slice(0, 10)} required /></div>}
            <DialogFooter><Button type="submit" disabled={renewMut.isPending}>{renewMut.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}تجديد</Button></DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

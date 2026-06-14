import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLicenses } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/customers")({
  component: AdminCustomers,
});

function AdminCustomers() {
  const list = useServerFn(listLicenses);
  const { data: licenses = [], isLoading } = useQuery({ queryKey: ["licenses"], queryFn: () => list() });
  const activated = licenses.filter((l: any) => l.user_id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold">العملاء</h2>
        <p className="text-sm text-muted-foreground">العملاء الذين قاموا بتفعيل أكوادهم</p>
      </div>
      <Card>
        <CardHeader><CardTitle>قائمة العملاء المفعّلين</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : activated.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لم يقم أي عميل بالتفعيل بعد.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم العميل</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ التفعيل</TableHead>
                  <TableHead>تاريخ الانتهاء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activated.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.client_name}</TableCell>
                    <TableCell className="font-mono text-xs">{l.activation_code}</TableCell>
                    <TableCell><Badge>{l.status}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{l.start_date ? new Date(l.start_date).toISOString().slice(0, 10) : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{l.end_date ? new Date(l.end_date).toISOString().slice(0, 10) : "—"}</TableCell>
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

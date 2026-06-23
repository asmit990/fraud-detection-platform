import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { api, type Transaction } from "@/lib/api";
import { fmtMoney, fmtDate, riskBgClass, statusClass } from "@/lib/format";
import { AlertTriangle, Globe, Smartphone, CreditCard, MapPin, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TransactionDrawer({
  tx,
  open,
  onOpenChange,
}: {
  tx: Transaction | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: alerts } = useQuery({
    queryKey: ["tx-alerts", tx?.id],
    queryFn: () => api.alertsFor(tx!.id),
    enabled: !!tx && open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full p-0 overflow-y-auto">
        {tx && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border bg-surface-2">
              <div className="flex items-center justify-between gap-2">
                <span className={cn("inline-flex px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-md font-semibold", riskBgClass(tx.riskLevel))}>
                  {tx.riskLevel} RISK · {tx.riskScore}
                </span>
                <span className={cn("inline-flex px-2 py-0.5 text-[11px] rounded-md font-medium capitalize", statusClass(tx.status))}>
                  {tx.status}
                </span>
              </div>
              <SheetTitle className="text-2xl font-mono tracking-tight mt-3">
                {fmtMoney(tx.amount, tx.currency)}
              </SheetTitle>
              <SheetDescription className="font-mono text-xs">{tx.id}</SheetDescription>
            </SheetHeader>

            <div className="p-6 space-y-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Details
                </h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <DetailItem icon={Hash} label="User ID" value={tx.userId} mono />
                  <DetailItem icon={CreditCard} label="Method" value={tx.paymentMethod ?? "—"} />
                  <DetailItem icon={MapPin} label="Country" value={tx.country} />
                  <DetailItem icon={Globe} label="IP Address" value={tx.ipAddress ?? "—"} mono />
                  <DetailItem icon={Smartphone} label="Device" value={tx.device ?? "—"} />
                  <DetailItem icon={Hash} label="Merchant" value={tx.merchant ?? "—"} />
                </dl>
                <div className="mt-4 text-xs text-muted-foreground">
                  Recorded {fmtDate(tx.timestamp)}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Related alerts
                  </h3>
                  <span className="text-xs text-muted-foreground">{alerts?.length ?? 0} found</span>
                </div>
                <div className="space-y-2">
                  {(alerts ?? []).map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3"
                    >
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", riskBgClass(a.severity))}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-snug">{a.reason}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">{a.id}</div>
                      </div>
                    </div>
                  ))}
                  {alerts && alerts.length === 0 && (
                    <div className="text-sm text-muted-foreground italic">No alerts linked.</div>
                  )}
                </div>
              </section>

              <div className="flex gap-2 pt-2">
                <Button className="flex-1">Investigate</Button>
                <Button variant="outline" className="flex-1">
                  Approve manually
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <dt className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </dt>
      <dd className={cn("mt-0.5 text-sm truncate", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

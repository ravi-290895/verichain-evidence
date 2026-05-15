import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, AlertTriangle, HelpCircle } from "lucide-react";

type Status = "AUTHENTIC" | "TAMPERED" | "PENDING" | "NOT_FOUND" | "REGISTERED";

const styles: Record<Status, { cls: string; icon: typeof CheckCircle2; label: string }> = {
  AUTHENTIC: { cls: "bg-success/15 text-success border-success/40", icon: CheckCircle2, label: "Authentic" },
  REGISTERED: { cls: "bg-success/15 text-success border-success/40", icon: CheckCircle2, label: "Registered" },
  TAMPERED: { cls: "bg-destructive/15 text-destructive border-destructive/40", icon: XCircle, label: "Tampered" },
  PENDING: { cls: "bg-warning/15 text-warning border-warning/40", icon: Clock, label: "Pending" },
  NOT_FOUND: { cls: "bg-muted text-muted-foreground border-border", icon: HelpCircle, label: "Not Found" },
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const s = styles[status];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold", s.cls, className)}>
      <Icon className="h-3.5 w-3.5" />
      {s.label}
    </span>
  );
}

export { AlertTriangle };

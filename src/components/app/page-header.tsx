import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title, description, action, icon,
}: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="border border-dashed rounded-lg p-10 text-center bg-muted/30">
      {icon && <div className="mx-auto mb-3 size-12 grid place-items-center rounded-full bg-background border">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusDot({ tone, className }: { tone: "success" | "warning" | "destructive" | "muted" | "info"; className?: string }) {
  const map: Record<string, string> = {
    success: "bg-success", warning: "bg-warning", destructive: "bg-destructive", muted: "bg-muted-foreground/40", info: "bg-info",
  };
  return <span className={cn("inline-block size-2 rounded-full", map[tone], className)} />;
}

import { cn } from "@/lib/utils";
import { Check, AlertTriangle, XCircle } from "lucide-react";

export type Confidence = "high" | "medium" | "low";

const MAP: Record<
  Confidence,
  { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  high: {
    label: "Confiance élevée",
    className: "bg-success-soft text-success border-success/20",
    Icon: Check,
  },
  medium: {
    label: "À vérifier",
    className: "bg-warning-soft text-warning-foreground border-warning/30",
    Icon: AlertTriangle,
  },
  low: {
    label: "Échec extraction",
    className: "bg-danger-soft text-danger border-danger/25",
    Icon: XCircle,
  },
};

export function ConfidenceBadge({
  level,
  compact = false,
  className,
}: {
  level: Confidence;
  compact?: boolean;
  className?: string;
}) {
  const { label, className: c, Icon } = MAP[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        c,
        className,
      )}
      title={label}
    >
      <Icon className="h-3 w-3" />
      {!compact && label}
    </span>
  );
}

export function ConfidenceDot({ level, className }: { level: Confidence; className?: string }) {
  const color =
    level === "high" ? "bg-success" : level === "medium" ? "bg-warning" : "bg-danger";
  return <span className={cn("inline-block h-2 w-2 rounded-full", color, className)} />;
}

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkspacePageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b-2 border-dock-navy pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="font-utility text-xs font-semibold uppercase tracking-[0.16em] text-steel-blue">
            {eyebrow}
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function WorkspacePanel({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border border-border bg-card", className)}>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-dock-navy text-paper-white">
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold tracking-wide">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

export function WorkspaceLoading({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-48 items-center justify-center gap-3 border border-border bg-card px-6 py-12 text-sm text-muted-foreground"
    >
      <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function WorkspaceError({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="border-l-4 border-destructive bg-destructive/5 px-5 py-6"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <h2 className="font-semibold text-destructive">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function WorkspaceEmpty({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="border border-dashed border-input bg-concrete/35 px-5 py-10 text-center">
      <Icon aria-hidden="true" className="mx-auto h-8 w-8 text-steel-blue" />
      <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { createElement, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CallToActionCardProps {
  action?: {
    label: string | ReactNode;
    onClick: () => void;
  };
  className?: string;
  description: string;
  icons?: LucideIcon[];
  secondaryAction?: {
    label: string | ReactNode;
    onClick: () => void;
    disabled?: boolean;
  };
  title: string;
}

export function CallToActionCard({
  title,
  description,
  icons = [],
  action,
  secondaryAction,
  className,
}: CallToActionCardProps) {
  return (
    <div
      className={cn(
        "border-border bg-background text-center hover:border-border/80",
        "w-full max-w-3xl rounded-xl border-2 border-dashed p-14",
        "group transition duration-500 hover:duration-200",
        className
      )}
    >
      <div className="isolate flex justify-center">
        {icons.length === 3 ? (
          <>
            <div className="relative top-1.5 left-2.5 grid size-12 -rotate-6 place-items-center rounded-xl bg-background shadow-lg ring-1 ring-border transition duration-500 group-hover:-translate-x-5 group-hover:-translate-y-0.5 group-hover:-rotate-12 group-hover:duration-200">
              {icons[0] &&
                createElement(icons[0], {
                  className: "w-6 h-6 text-muted-foreground",
                })}
            </div>
            <div className="relative z-10 grid size-12 place-items-center rounded-xl bg-background shadow-lg ring-1 ring-border transition duration-500 group-hover:-translate-y-0.5 group-hover:duration-200">
              {icons[1] &&
                createElement(icons[1], {
                  className: "w-6 h-6 text-muted-foreground",
                })}
            </div>
            <div className="relative top-1.5 right-2.5 grid size-12 rotate-6 place-items-center rounded-xl bg-background shadow-lg ring-1 ring-border transition duration-500 group-hover:translate-x-5 group-hover:-translate-y-0.5 group-hover:rotate-12 group-hover:duration-200">
              {icons[2] &&
                createElement(icons[2], {
                  className: "w-6 h-6 text-muted-foreground",
                })}
            </div>
          </>
        ) : (
          <div className="grid size-12 place-items-center rounded-xl bg-background shadow-lg ring-1 ring-border transition duration-500 group-hover:-translate-y-0.5 group-hover:duration-200">
            {icons[0] &&
              createElement(icons[0], {
                className: "w-6 h-6 text-muted-foreground",
              })}
          </div>
        )}
      </div>
      <h1 className="mt-10 text-center font-semibold text-2xl leading-none">
        {title}
      </h1>
      <p className="mt-6 whitespace-pre-line text-muted-foreground text-sm">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {action && (
            <Button
              className={cn("cursor-pointer shadow-sm active:shadow-none")}
              onClick={action.onClick}
              size="lg"
            >
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              className={cn("cursor-pointer shadow-sm active:shadow-none")}
              disabled={secondaryAction.disabled}
              onClick={secondaryAction.onClick}
              size="lg"
              variant="secondary"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

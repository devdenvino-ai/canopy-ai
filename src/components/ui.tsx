import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, ChevronDown, Minus, Plus, X } from "lucide-react";
import { cn, initials, toneFor } from "../lib/utils";

/* ─────────────────────────── Button ─────────────────────────── */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.97] cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#4c1d95] shadow-sm",
        soft: "bg-primary-soft text-primary hover:bg-[#ddd0f5]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[#e0dbeb]",
        ghost: "text-foreground/75 hover:bg-secondary hover:text-foreground",
        outline: "border border-border bg-card text-foreground hover:bg-secondary/60",
        destructive: "bg-destructive text-destructive-foreground hover:bg-[#9c2f3d] shadow-sm",
        gold: "bg-accent text-accent-foreground hover:bg-[#9a4708] shadow-sm",
      },
      size: {
        default: "h-9 px-4 text-sm",
        sm: "h-8 px-3 text-[13px]",
        xs: "h-7 px-2.5 text-xs",
        lg: "h-10 px-5 text-sm",
        icon: "h-9 w-9",
        iconXs: "h-6 w-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type, ...props }, ref) => (
    <button ref={ref} type={type ?? "button"} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

/* ─────────────────────────── Badge ─────────────────────────── */

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold leading-4",
  {
    variants: {
      variant: {
        default: "bg-primary-soft text-primary",
        success: "bg-primary text-primary-foreground",
        gold: "bg-accent-soft text-accent",
        danger: "bg-destructive-soft text-destructive",
        neutral: "bg-secondary text-muted-foreground",
        outline: "border border-border bg-transparent text-muted-foreground",
        dark: "bg-sidebar text-sidebar-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/* ─────────────────────────── Card ─────────────────────────── */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border/80 bg-card shadow-lift", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-[15px] font-bold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[13px] leading-relaxed text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-2", className)} {...props} />;
}

/* ─────────────────────────── Dialog ─────────────────────────── */

export const Dialog = DialogPrimitive.Root;

export function DialogContent({
  className,
  children,
  wide,
}: {
  className?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[#191227]/50 backdrop-blur-[2px]" />
      <DialogPrimitive.Content className="pointer-events-none fixed inset-0 z-50 overflow-y-auto">
        <div className="grid min-h-full place-items-center p-4 sm:py-10">
          <div
            className={cn(
              "dialog-content anim-scale-in pointer-events-auto relative w-full rounded-xl border border-border bg-popover shadow-pop",
              wide ? "max-w-2xl" : "max-w-md",
              className,
            )}
          >
            {children}
            <DialogPrimitive.Close className="absolute right-3 top-3 z-10 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3 pr-12", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("font-display text-lg font-bold tracking-tight", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[13px] leading-relaxed text-muted-foreground", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-end gap-2 p-5 pt-3", className)} {...props} />;
}

/* ─────────────────────────── Tabs ─────────────────────────── */

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("inline-flex items-center gap-0.5 rounded-lg bg-secondary p-0.5", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;

/* ─────────────────────────── Select ─────────────────────────── */

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-[placeholder]:text-muted-foreground",
        className,
      )}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={4}
        className={cn(
          "pop-content z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-popover shadow-pop",
          className,
        )}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-pointer items-center rounded-md py-1.5 pl-2.5 pr-7 text-sm outline-none data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-3.5 w-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

/* ─────────────────────────── Slider ─────────────────────────── */

export function Slider({
  value,
  onValueChange,
  onValueCommit,
  max = 100,
  step = 5,
  className,
  disabled,
}: {
  value: number[];
  onValueChange?: (v: number[]) => void;
  onValueCommit?: (v: number[]) => void;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none select-none items-center", disabled && "opacity-40", className)}
      value={value}
      onValueChange={onValueChange}
      onValueCommit={onValueCommit}
      max={max}
      step={step}
      disabled={disabled}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 cursor-grab rounded-full border-2 border-primary bg-card shadow-sm transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:cursor-grabbing" />
    </SliderPrimitive.Root>
  );
}

/* ─────────────────────────── Switch ─────────────────────────── */

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-[22px] w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-[#cbc3dd]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5" />
    </SwitchPrimitive.Root>
  );
}

/* ─────────────────────────── Progress ─────────────────────────── */

export function Progress({
  value,
  className,
  tone = "default",
}: {
  value: number;
  className?: string;
  tone?: "default" | "gold" | "danger";
}) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700 ease-out",
          tone === "gold" ? "bg-accent" : tone === "danger" ? "bg-destructive" : "bg-primary",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

/* ─────────────────────────── Avatar ─────────────────────────── */

const AVATAR_SIZES = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-7 w-7 text-[10px]",
  md: "h-8 w-8 text-[11px]",
  lg: "h-10 w-10 text-xs",
  xl: "h-14 w-14 text-base",
} as const;

export function Avatar({
  name,
  size = "md",
  className,
  ring,
}: {
  name: string;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
  ring?: boolean;
}) {
  const tone = toneFor(name);
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold", AVATAR_SIZES[size], className)}
      style={{
        backgroundColor: tone.bg,
        color: tone.fg,
        boxShadow: ring ? `0 0 0 2px #fbfcfa, 0 0 0 3.5px ${tone.fg}40` : undefined,
      }}
    >
      {initials(name)}
    </div>
  );
}

/* ─────────────────────────── Tooltip ─────────────────────────── */

export function Tip({
  label,
  children,
  side = "top",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={180}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="anim-pop-in z-50 max-w-64 rounded-md bg-sidebar px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground shadow-pop"
          >
            {label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/* ─────────────────────────── Misc ─────────────────────────── */

export function Separator({ className, ...props }: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return <SeparatorPrimitive.Root className={cn("h-px w-full bg-line", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn("text-[13px] font-semibold", className)} {...props} />;
}

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  className,
  children,
  align = "start",
  sideOffset = 6,
}: {
  className?: string;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "pop-content z-50 rounded-lg border border-border bg-popover shadow-pop",
          className,
        )}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex h-9 items-center rounded-md border border-border bg-card", className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="grid h-full w-8 cursor-pointer place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-8 text-center font-mono text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="grid h-full w-8 cursor-pointer place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-lg bg-secondary p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "cursor-pointer rounded-md font-semibold transition-all",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-[13px]",
            value === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────── Table ─────────────────────────── */

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-collapse text-sm", className)} {...props} />;
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-line", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-line transition-colors hover:bg-secondary/40", className)} {...props} />;
}

export function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("h-10 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2.5 align-middle", className)} {...props} />;
}

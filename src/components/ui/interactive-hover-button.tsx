import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  icon?: React.ReactNode;
  variant?: 'emerald' | 'default' | 'outline';
}

const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({
  text = "Button",
  icon = <ArrowRight className="w-4 h-4" />,
  className,
  children,
  disabled,
  variant = 'emerald',
  ...props
}, ref) => {
  const contentText = text || children;

  const variantStyles = {
    emerald: {
      button: "bg-emerald-600 text-white border-emerald-500/40 dark:bg-emerald-600 dark:text-white dark:border-emerald-400/30 shadow-sm shadow-emerald-900/20 hover:border-emerald-400 dark:hover:border-emerald-300",
      dot: "bg-emerald-700 dark:bg-emerald-500",
      hoverText: "text-white",
    },
    default: {
      button: "bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700",
      dot: "bg-blue-600 dark:bg-blue-500",
      hoverText: "text-white",
    },
    outline: {
      button: "bg-transparent text-slate-700 border-slate-300 dark:text-slate-200 dark:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/50",
      dot: "bg-slate-900 dark:bg-slate-100",
      hoverText: "text-white dark:text-slate-900",
    }
  }[variant];

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "group relative inline-flex h-10 w-full min-w-[7.5rem] cursor-pointer items-center justify-center overflow-hidden rounded-xl border px-4 text-center text-sm font-bold transition-all duration-300 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:border-transparent disabled:text-slate-400 dark:disabled:text-slate-500 disabled:shadow-none",
        variantStyles.button,
        className,
      )}
      {...props}
    >
      {/* Main content - slides right & fades out on hover */}
      <span className="inline-flex items-center justify-center gap-2 transition-all duration-300 ease-out group-hover:translate-x-12 group-hover:opacity-0">
        <span>{contentText}</span>
      </span>

      {/* Hover content - slides in from left & fades in on hover */}
      <div className={cn(
        "absolute inset-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100",
        variantStyles.hoverText
      )}>
        <span className="font-bold">{contentText}</span>
        <span className="transition-transform duration-300 ease-out group-hover:scale-110">{icon}</span>
      </div>

      {/* Expanding circle background animation */}
      <div className={cn(
        "absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full transition-transform duration-300 ease-out group-hover:scale-[20] group-disabled:hidden",
        variantStyles.dot
      )} />
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };

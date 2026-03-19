import { cn } from "../../lib/utils";

interface SpinnerProps {
  /** Additional CSS classes to customize the spinner */
  className?: string;
  /** Size of the spinner - small, medium, or large */
  size?: "sm" | "md" | "lg";
  /** Custom size in pixels (overrides size prop) */
  customSize?: number;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

/**
 * Spinner - A loading spinner component with customizable size and styling
 *
 * @example
 * // Basic usage
 * <Spinner />
 *
 * @example
 * // Custom size
 * <Spinner size="lg" />
 * <Spinner customSize={48} />
 *
 * @example
 * // With custom styling
 * <Spinner className="text-blue-500" />
 */
export function Spinner({ className, size = "md", customSize }: SpinnerProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={customSize || undefined}
      height={customSize || undefined}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "animate-spin text-muted-foreground",
        customSize ? undefined : sizeClasses[size],
        className,
      )}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

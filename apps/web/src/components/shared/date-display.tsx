import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

interface DateDisplayProps {
  date: Date | string | number;
  format?: "full" | "short" | "relative" | "datetime";
}

export function DateDisplay({
  date,
  format: formatType = "short",
}: DateDisplayProps) {
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;

  const formatted = (() => {
    switch (formatType) {
      case "full":
        return format(dateObj, "PPPP");
      case "datetime":
        return format(dateObj, "PPp");
      case "relative":
        return formatDistanceToNow(dateObj, { addSuffix: true });
      case "short":
      default:
        if (isToday(dateObj)) {
          return `Today at ${format(dateObj, "p")}`;
        }
        if (isYesterday(dateObj)) {
          return `Yesterday at ${format(dateObj, "p")}`;
        }
        return format(dateObj, "PP");
    }
  })();

  return (
    <span className="text-muted-foreground" title={format(dateObj, "PPpp")}>
      {formatted}
    </span>
  );
}

export function formatDate(
  date: Date | string | number,
  formatStr = "PP",
): string {
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  return format(dateObj, formatStr);
}

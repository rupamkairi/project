// CSS is handled by the consuming app — import @projectx/ui/tokens.css

// ─── Shadcn Primitives ────────────────────────────────────────────────────────

export { Alert, AlertTitle, AlertDescription } from "./components/ui/alert"

export { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar"

export { Badge, badgeVariants } from "./components/ui/badge"
export type { BadgeProps } from "./components/ui/badge"

export { Button, buttonVariants } from "./components/ui/button"
export type { ButtonProps } from "./components/ui/button"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/ui/card"

export { Checkbox } from "./components/ui/checkbox"

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog"

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "./components/ui/dropdown-menu"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from "./components/ui/form"

export { Input } from "./components/ui/input"
export type { InputProps } from "./components/ui/input"

export { Label } from "./components/ui/label"

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "./components/ui/popover"

export { Progress } from "./components/ui/progress"

export { ScrollArea, ScrollBar } from "./components/ui/scroll-area"

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select"

export { Separator } from "./components/ui/separator"

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./components/ui/sheet"

export { Skeleton } from "./components/ui/skeleton"

export { Spinner } from "./components/ui/spinner"

export { Switch } from "./components/ui/switch"

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  tabsListVariants,
} from "./components/ui/tabs"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./components/ui/table"

export { Textarea } from "./components/ui/textarea"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./components/ui/tooltip"

// ─── Composed Components ─────────────────────────────────────────────────────

export { DataTable, SortableHeader, ActionCell } from "./components/data-table"
export type { DataTableProps } from "./components/data-table"

export { EmptyState } from "./components/empty-state"
export type { EmptyStateProps } from "./components/empty-state"

export { ConfirmDialog } from "./components/confirm-dialog"
export type { ConfirmDialogProps } from "./components/confirm-dialog"

export { PageHeader } from "./components/page-header"
export type { PageHeaderProps } from "./components/page-header"

export { NavBar } from "./components/nav-bar"
export type { NavBarProps, NavBarItem } from "./components/nav-bar"

export { StatusBadge, statusBadgeVariants } from "./components/status-badge"
export type { StatusBadgeProps } from "./components/status-badge"

// ─── Utility ─────────────────────────────────────────────────────────────────

export { cn } from "./lib/utils"

# Design System Guidelines

This document outlines the design system standards for ProjectX. All UI components and styling should follow these guidelines to ensure consistency across the entire application.

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [UI Package Structure](#ui-package-structure)
4. [Component Guidelines](#component-guidelines)
5. [Styling Standards](#styling-standards)
6. [Theming](#theming)
7. [Accessibility](#accessibility)
8. [Usage Examples](#usage-examples)
9. [Best Practices](#best-practices)

---

## Overview

ProjectX uses a centralized UI package (`@projectx/ui`) to ensure consistent design across all applications. This package provides:

- **Shadcn/UI Components** - Base components built on Radix UI primitives
- **Custom Reusable Components** - Additional components specific to ProjectX
- **Design Tokens** - CSS variables for consistent theming
- **Utility Functions** - Helper functions like `cn()` for className merging

---

## Technology Stack

| Technology                         | Purpose                              |
| ---------------------------------- | ------------------------------------ |
| **TailwindCSS v4**                 | Utility-first CSS framework          |
| **Radix UI**                       | Accessible UI component primitives   |
| **Shadcn/UI**                      | Component patterns and styles        |
| **Class Variance Authority (CVA)** | Component variant management         |
| **Tailwind Merge**                 | Efficient Tailwind className merging |
| **Lucide React**                   | Icon library                         |

---

## UI Package Structure

```
packages/ui/
├── src/
│   ├── index.ts              # Main exports
│   ├── lib/
│   │   └── utils.ts          # Utility functions (cn, etc.)
│   └── components/
│       └── ui/               # Shadcn base components
│           ├── button.tsx
│           ├── input.tsx
│           ├── card.tsx
│           └── ...
├── package.json
└── tsconfig.json
```

### Exports

The UI package exports:

```typescript
// Base UI Components
export { Button, buttonVariants } from "./components/ui/button";
export type { ButtonProps } from "./components/ui/button";

export { Input } from "./components/ui/input";
export type { InputProps } from "./components/ui/input";

export { Label } from "./components/ui/label";

export { Badge, badgeVariants } from "./components/ui/badge";
export type { BadgeProps } from "./components/ui/badge";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/ui/card";

export { Spinner } from "./components/ui/spinner";

// Utility function
export { cn } from "./lib/utils";
```

---

## Component Guidelines

### 1. Always Include className Prop

Every component must accept a `className` prop for customization:

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string; // Required!
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}
```

### 2. Use CVA for Variants

Use Class Variance Authority for managing component variants:

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground...",
        destructive: "bg-destructive text-destructive-foreground...",
        outline: "border border-input bg-background...",
        // ...
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        // ...
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
```

### 3. Forward Ref

Always forward refs for component composition:

```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
```

### 4. Use cn() Utility

Always use the `cn()` utility for merging classNames:

```tsx
import { cn } from "@projectx/ui"

// Good
<div className={cn("base-classes", conditional && "conditional-class", className)} />

// Bad
<div className={`base-classes ${conditional ? 'conditional-class' : ''} ${className}`} />
```

---

## Styling Standards

### 1. TailwindCSS Configuration

All TailwindCSS configuration is centralized in `packages/config/`:

- **`packages/config/src/index.css`** - Base CSS with Tailwind directives and CSS variables
- **`packages/config/tailwind.config.js`** - Tailwind configuration with theme customization

### 2. CSS Variables

Use CSS variables for theming instead of hardcoded values:

```css
/* Instead of hardcoded colors */
background: hsl(var(--background));
color: hsl(var(--foreground));

/* Not this */
background: #ffffff;
color: #000000;
```

### 3. Spacing

Use Tailwind's spacing scale:

| Token | Value         |
| ----- | ------------- |
| `p-1` | 0.25rem (4px) |
| `p-2` | 0.5rem (8px)  |
| `p-4` | 1rem (16px)   |
| `p-6` | 1.5rem (24px) |
| `p-8` | 2rem (32px)   |

### 4. Typography

Use Tailwind's typography scale:

| Element | Classes                  |
| ------- | ------------------------ |
| H1      | `text-4xl font-bold`     |
| H2      | `text-3xl font-bold`     |
| H3      | `text-2xl font-semibold` |
| Body    | `text-base`              |
| Small   | `text-sm`                |
| Caption | `text-xs`                |

### 5. Border Radius

Use the design system's radius tokens:

| Size    | Token        | Value                     |
| ------- | ------------ | ------------------------- |
| Small   | `rounded-sm` | calc(var(--radius) - 4px) |
| Medium  | `rounded-md` | calc(var(--radius) - 2px) |
| Default | `rounded-lg` | var(--radius)             |
| Large   | `rounded-xl` | calc(var(--radius) + 4px) |

---

## Theming

### Light/Dark Mode

The design system supports light and dark mode via CSS variables:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  /* ... */
}
```

### Usage

Components automatically adapt to the theme:

```tsx
// Automatically uses primary color from current theme
<Button>Click me</Button>

// Use destructive variant for error states
<Button variant="destructive">Delete</Button>
```

---

## Accessibility

### 1. Radix UI Primitives

All interactive components should use Radix UI primitives for built-in accessibility:

- **Keyboard navigation** - Built-in
- **Focus management** - Built-in
- **Screen reader support** - Built-in
- **ARIA attributes** - Automatically handled

### 2. Focus States

Always include focus styles:

```tsx
// Good - includes focus ring
className =
  "... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Bad - no focus indicator
className = "...";
```

### 3. Disabled States

Provide clear disabled states:

```tsx
// Good - visual feedback
disabled:opacity-50 disabled:pointer-events-none

// Button component handles this automatically
<Button disabled>Disabled</Button>
```

### 4. Color Contrast

Ensure sufficient color contrast (WCAG AA):

- **Normal text**: 4.5:1 ratio minimum
- **Large text**: 3:1 ratio minimum
- **UI components**: 3:1 ratio minimum

---

## Usage Examples

### Basic Usage

```tsx
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@projectx/ui";

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="Enter your name" />
        <Button>Submit</Button>
      </CardContent>
    </Card>
  );
}
```

### With Custom Classes

```tsx
import { Button, Spinner, cn } from "@projectx/ui";

function LoadingButton({ loading, className }) {
  return (
    <Button className={cn("gap-2", className)} disabled={loading}>
      {loading && <Spinner size="sm" />}
      {loading ? "Loading..." : "Submit"}
    </Button>
  );
}
```

### With Variants

```tsx
<Button variant="default">Primary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

### With Sizes

```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

---

## Best Practices

### DO

✅ **DO** use the UI package components instead of creating custom ones  
✅ **DO** use `cn()` utility for merging classNames  
✅ **DO** use CVA for component variants  
✅ **DO** forward refs for component composition  
✅ **DO** use CSS variables for theming  
✅ **DO** use Radix UI primitives for interactive components  
✅ **DO** include focus states for accessibility  
✅ **DO** export components with `className` prop support

### DON'T

❌ **DON'T** create duplicate components in apps or composes  
❌ **DON'T** use hardcoded colors instead of CSS variables  
❌ **DON'T** skip focus states  
❌ **DON'T** use inline styles  
❌ **DON'T** forget to handle disabled states  
❌ **DON'T** use non-accessible components

---

## Adding New Components

When adding new components to the UI package:

1. **Create the component file** in `packages/ui/src/components/ui/`
2. **Use CVA** for variants if applicable
3. **Forward the ref**
4. **Include className prop**
5. **Use cn() utility**
6. **Export from** `packages/ui/src/index.ts`
7. **Add TypeScript types** for props

### Component Template

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const componentVariants = cva("base-styles-here", {
  variants: {
    variant: {
      default: "default-styles",
      // ... other variants
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface ComponentProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentVariants> {}

const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        className={cn(componentVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Component.displayName = "Component";

export { Component, componentVariants };
```

---

## Related Documents

- [Web Architecture](../docs/web-architecture.md)
- [Monorepo Architecture](../docs/monorepo-architecture.md)
- [TailwindCSS v4 Documentation](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Shadcn/UI](https://ui.shadcn.com)

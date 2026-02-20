import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "textarea"
  | "select"
  | "multiselect"
  | "checkbox"
  | "switch"
  | "date"
  | "date-range"
  | "file";

export interface FormFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { label: string; value: string }[];
  accept?: string;
  rows?: number;
}

interface FormGeneratorProps {
  schema: z.ZodObject<any>;
  fields: FormFieldConfig[];
  onSubmit: (data: any) => void;
  defaultValues?: Record<string, any>;
  className?: string;
  isLoading?: boolean;
}

export function FormGenerator({
  schema,
  fields,
  onSubmit,
  defaultValues,
  className,
  isLoading,
}: FormGeneratorProps) {
  const form = useForm({
    resolver: zodResolver(schema) as any,
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const renderField = (field: FormFieldConfig) => {
    const error = errors[field.name]?.message as string | undefined;

    const fieldWrapper = (children: React.ReactNode) => (
      <div className="space-y-2">
        <Label htmlFor={field.name}>
          {field.label}
          {field.required && <span className="text-destructive"> *</span>}
        </Label>
        {children}
        {field.description && (
          <p className="text-sm text-muted-foreground">{field.description}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );

    switch (field.type) {
      case "textarea":
        return fieldWrapper(
          <Textarea
            id={field.name}
            placeholder={field.placeholder}
            {...register(field.name)}
            disabled={field.disabled}
            rows={field.rows ?? 3}
            className={cn(error && "border-destructive")}
          />,
        );

      case "select":
        return fieldWrapper(
          <Select
            onValueChange={(value) => setValue(field.name, value)}
            defaultValue={watch(field.name) as string}
            disabled={field.disabled}
          >
            <SelectTrigger
              id={field.name}
              className={cn(error && "border-destructive")}
            >
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
        );

      case "switch":
        return fieldWrapper(
          <Switch
            id={field.name}
            checked={watch(field.name) as boolean}
            onCheckedChange={(checked) => setValue(field.name, checked)}
            disabled={field.disabled}
          />,
        );

      case "number":
        return fieldWrapper(
          <Input
            id={field.name}
            type="number"
            placeholder={field.placeholder}
            {...register(field.name, { valueAsNumber: true })}
            disabled={field.disabled}
            className={cn(error && "border-destructive")}
          />,
        );

      case "password":
      case "email":
      case "text":
      default:
        return fieldWrapper(
          <Input
            id={field.name}
            type={field.type === "password" ? "password" : "text"}
            placeholder={field.placeholder}
            {...register(field.name)}
            disabled={field.disabled}
            className={cn(error && "border-destructive")}
          />,
        );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("space-y-4", className)}
    >
      {fields.map((field) => (
        <React.Fragment key={field.name}>{renderField(field)}</React.Fragment>
      ))}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Loading..." : "Submit"}
      </Button>
    </form>
  );
}

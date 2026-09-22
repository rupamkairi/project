import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

export interface EnumOption {
  value: string
  label: string
}

export function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string
  children: string
  required?: boolean
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      {required ? ' *' : ''}
    </Label>
  )
}

export function EnumSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  allowEmpty = false,
  emptyLabel = 'All',
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: EnumOption[]
  placeholder?: string
  allowEmpty?: boolean
  emptyLabel?: string
}) {
  return (
    <Select
      value={value || (allowEmpty ? '__empty__' : undefined)}
      onValueChange={(v) => onChange(v === '__empty__' ? '' : v)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty ? <SelectItem value="__empty__">{emptyLabel}</SelectItem> : null}
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function OptionalNumberInput({
  id,
  value,
  onChange,
  min,
}: {
  id?: string
  value: number | string | ''
  onChange: (value: number | '') => void
  min?: number
}) {
  return (
    <Input
      id={id}
      type="number"
      min={min}
      value={value === '' || value === undefined || value === null ? '' : value}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') onChange('')
        else onChange(Number(raw))
      }}
    />
  )
}

export function DateTimeInput({
  id,
  value,
  onChange,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
}) {
  return <Input id={id} type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} />
}

export function TextField({
  id,
  label,
  value,
  onChange,
  required,
  type = 'text',
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  rows = 3,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function FilterButtons({
  options,
  value,
  onChange,
}: {
  options: EnumOption[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={
            value === opt.value
              ? 'inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground'
              : 'inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-accent'
          }
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

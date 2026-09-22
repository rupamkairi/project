import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { AdminListPage } from './admin-list-page'
import { AdminFormDialog } from './admin-form-dialog'
import { useAdminList } from './use-admin-list'
import {
  EnumSelect,
  OptionalNumberInput,
  DateTimeInput,
  FieldLabel,
  FilterButtons,
  type EnumOption,
} from './fields'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import { Skeleton } from '../components/ui/skeleton'
import { ConfirmDialog } from '../components/confirm-dialog'

export type CrudFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'select'
  | 'textarea'
  | 'datetime'
  | 'checkbox'

export interface CrudField {
  key: string
  label: string
  type?: CrudFieldType
  required?: boolean
  placeholder?: string
  options?: EnumOption[]
  createOnly?: boolean
  editOnly?: boolean
}

export interface CrudColumn<T> {
  header: string
  accessor: (row: T) => ReactNode
}

export interface CrudTablePageProps<T extends { id: string }> {
  title: string
  description: string
  createLabel?: string
  emptyLabel?: string
  searchPlaceholder?: string
  columns: CrudColumn<T>[]
  fields: CrudField[]
  filterKey?: string
  filterOptions?: EnumOption[]
  defaults?: Record<string, unknown>
  list: (params: {
    page: number
    limit: number
    search: string
    filters: Record<string, string>
  }) => Promise<{ items: T[]; total: number }>
  create?: (body: Record<string, unknown>) => Promise<{ error?: string }>
  update?: (id: string, body: Record<string, unknown>) => Promise<{ error?: string }>
  remove?: (id: string) => Promise<{ error?: string }>
  extraRowActions?: (row: T, reload: () => void) => ReactNode
  onRowClick?: (row: T) => void
  onCreate?: () => void
}

function blankForm(fields: CrudField[], defaults?: Record<string, unknown>) {
  const next: Record<string, unknown> = { ...defaults }
  for (const field of fields) {
    if (next[field.key] !== undefined) continue
    if (field.type === 'number') next[field.key] = ''
    else if (field.type === 'checkbox') next[field.key] = false
    else next[field.key] = ''
  }
  return next
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: CrudField
  value: unknown
  onChange: (value: unknown) => void
}) {
  const id = `crud-${field.key}`
  const type = field.type ?? 'text'
  return (
    <div className="space-y-1.5">
      {type !== 'checkbox' ? (
        <FieldLabel htmlFor={id} required={field.required}>
          {field.label}
        </FieldLabel>
      ) : null}
      {type === 'select' ? (
        <EnumSelect
          id={id}
          value={String(value ?? '')}
          onChange={(v) => onChange(v)}
          options={field.options ?? []}
        />
      ) : type === 'number' ? (
        <OptionalNumberInput id={id} value={value as number | ''} onChange={(v) => onChange(v)} />
      ) : type === 'datetime' ? (
        <DateTimeInput id={id} value={String(value ?? '')} onChange={(v) => onChange(v)} />
      ) : type === 'textarea' ? (
        <Textarea
          id={id}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : type === 'checkbox' ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {field.label}
        </label>
      ) : (
        <Input
          id={id}
          type={type}
          required={field.required}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

export function CrudTablePage<T extends { id: string }>({
  title,
  description,
  createLabel,
  emptyLabel,
  searchPlaceholder = 'Search…',
  columns,
  fields,
  filterKey,
  filterOptions,
  defaults,
  list,
  create,
  update,
  remove,
  extraRowActions,
  onRowClick,
  onCreate,
}: CrudTablePageProps<T>) {
  const load = useCallback(
    (params: { page: number; limit: number; search: string; filters: Record<string, string> }) =>
      list(params),
    [list],
  )
  const {
    rows,
    pagination,
    isLoading,
    error,
    setError,
    search,
    setSearch,
    filters,
    setFilter,
    reload,
  } = useAdminList<T>({ load })

  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selected, setSelected] = useState<T | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>(() => blankForm(fields, defaults))
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const colCount = columns.length + 1

  const createFields = useMemo(() => fields.filter((f) => !f.editOnly), [fields])
  const editFields = useMemo(() => fields.filter((f) => !f.createOnly), [fields])

  function openCreate() {
    setForm(blankForm(fields, defaults))
    setError(null)
    setShowCreate(true)
  }

  function openEdit(row: T) {
    const next = blankForm(fields, defaults)
    for (const field of fields) {
      const raw = (row as Record<string, unknown>)[field.key]
      next[field.key] = raw ?? next[field.key]
    }
    setSelected(row)
    setForm(next)
    setError(null)
    setShowEdit(true)
  }

  function payload(mode: 'create' | 'edit') {
    const source = mode === 'create' ? createFields : editFields
    const body: Record<string, unknown> = {}
    for (const field of source) {
      const value = form[field.key]
      if (value === '' || value === undefined) {
        if (field.required) body[field.key] = value
        continue
      }
      body[field.key] = value
    }
    return body
  }

  async function handleCreate() {
    if (!create) return
    setSubmitting(true)
    const { error: err } = await create(payload('create'))
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    setShowCreate(false)
    await reload(pagination.page)
  }

  async function handleEdit() {
    if (!update || !selected) return
    setSubmitting(true)
    const { error: err } = await update(selected.id, payload('edit'))
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    setShowEdit(false)
    setSelected(null)
    await reload(pagination.page)
  }

  async function handleDelete() {
    if (!remove || !deleteId) return
    setSubmitting(true)
    const { error: err } = await remove(deleteId)
    setSubmitting(false)
    setDeleteId(null)
    if (err) setError(err)
    await reload(pagination.page)
  }

  return (
    <>
      <AdminListPage
        title={title}
        description={description}
        error={error}
        pagination={pagination}
        onPageChange={(page) => void reload(page)}
        actions={
          create || onCreate ? (
            <Button size="sm" onClick={onCreate ?? openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              {createLabel ?? `Add ${title.replace(/s$/, '')}`}
            </Button>
          ) : null
        }
        toolbar={
          <>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void reload(1)
              }}
            >
              <Input
                className="h-8 w-64"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button type="submit" variant="outline" size="sm">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            {filterKey && filterOptions ? (
              <FilterButtons
                options={filterOptions}
                value={filters[filterKey] ?? ''}
                onChange={(v) => setFilter(filterKey, v)}
              />
            ) : null}
          </>
        }
      >
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.header}>{c.header}</TableHead>
                ))}
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={colCount}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="h-24 text-center text-muted-foreground">
                    {emptyLabel ?? `No ${title.toLowerCase()} found`}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow
                    key={row.id || `row-${index}`}
                    className={onRowClick ? 'cursor-pointer' : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((c) => (
                      <TableCell key={c.header} className="text-sm">
                        {c.accessor(row)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {extraRowActions?.(row, () => void reload(pagination.page))}
                        {update ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        {remove ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(row.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </AdminListPage>

      <AdminFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title={createLabel ?? `Add ${title.replace(/s$/, '')}`}
        onSubmit={handleCreate}
        submitting={submitting}
        submitLabel="Create"
      >
        {createFields.map((field) => (
          <FieldControl
            key={field.key}
            field={field}
            value={form[field.key]}
            onChange={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
          />
        ))}
      </AdminFormDialog>

      <AdminFormDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        title={`Edit ${title.replace(/s$/, '')}`}
        onSubmit={handleEdit}
        submitting={submitting}
        submitLabel="Save Changes"
      >
        {editFields.map((field) => (
          <FieldControl
            key={field.key}
            field={field}
            value={form[field.key]}
            onChange={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
          />
        ))}
      </AdminFormDialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title={`Delete ${title.replace(/s$/, '')}`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        loading={submitting}
      />
    </>
  )
}

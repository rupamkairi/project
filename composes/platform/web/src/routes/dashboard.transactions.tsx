import { useEffect, useState } from 'react'
import { createRoute, useNavigate, useParams } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'
import { CrudTablePage } from '@projectx/ui/admin'
import {
  Button,
  Input,
  Label,
  PageHeader,
  ConfirmDialog,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@projectx/ui'
import { Route as dashboardLayoutRoute } from './dashboard.layout'
import { platformApi } from '../lib/api/platform'

const TX_TYPES = [
  'order',
  'invoice',
  'purchase_order',
  'sales_order',
  'bill',
  'folio',
  'quote',
  'receipt',
]

const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString() : '—')

async function unwrapList(res: { data?: { data: any[]; pagination?: { total: number } }; error?: string }) {
  if (res.error) throw new Error(res.error)
  return { items: res.data?.data ?? [], total: res.data?.pagination?.total ?? 0 }
}

function TransactionsListPage() {
  const navigate = useNavigate()
  return (
    <CrudTablePage
      title="Transactions"
      description="Orders, invoices, bills, folios and other documents."
      createLabel="Add Transaction"
      filterKey="type"
      filterOptions={[{ value: '', label: 'All' }, ...TX_TYPES.map((v) => ({ value: v, label: v }))]}
      columns={[
        { header: 'Reference', accessor: (r) => r.referenceNo ?? r.id },
        { header: 'Type', accessor: (r) => r.type },
        { header: 'Total', accessor: (r) => `${r.totalAmount ?? 0} ${r.totalCurrency ?? ''}` },
        { header: 'Created', accessor: (r) => fmtDate(r.createdAt) },
      ]}
      fields={[]}
      list={async ({ page, limit, filters }) =>
        unwrapList(await platformApi.getTransactions({ page, limit, type: filters.type || undefined }))
      }
      remove={(id) => platformApi.deleteTransaction(id)}
      onRowClick={(row) => navigate({ to: '/dashboard/transactions/$id', params: { id: row.id } })}
      onCreate={() => navigate({ to: '/dashboard/transactions/new' })}
    />
  )
}

export const transactionsRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/transactions',
  component: TransactionsListPage,
})

type Line = {
  id?: string
  description: string
  qty: number
  unitPriceAmount: number
  taxRate: number
}

const EMPTY_LINE: Line = { description: '', qty: 1, unitPriceAmount: 0, taxRate: 0 }

function TransactionFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { id?: string }
  const [form, setForm] = useState({
    type: 'invoice',
    referenceNo: '',
    personId: '',
    partyId: '',
    stageId: '',
    currency: 'USD',
  })
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }])
  const [submitting, setSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'edit' || !params.id) return
    void platformApi.getTransaction(params.id).then(({ data, error: err }) => {
      if (err) setError(err)
      if (!data) return
      setForm({
        type: data.type,
        referenceNo: data.referenceNo ?? '',
        personId: data.personId ?? '',
        partyId: data.partyId ?? '',
        stageId: data.stageId ?? '',
        currency: data.totalCurrency ?? 'USD',
      })
      setLines(
        (data.lines ?? []).map((l: any) => ({
          id: l.id,
          description: l.description ?? '',
          qty: l.qty ?? 1,
          unitPriceAmount: l.unitPriceAmount ?? 0,
          taxRate: l.taxRate ?? 0,
        })),
      )
    })
  }, [mode, params.id])

  const total = lines.reduce((sum, l) => sum + Number(l.qty || 0) * Number(l.unitPriceAmount || 0), 0)

  async function save() {
    setSubmitting(true)
    setError(null)
    if (mode === 'create') {
      const { error: err } = await platformApi.createTransaction({
        ...form,
        personId: form.personId || undefined,
        partyId: form.partyId || undefined,
        stageId: form.stageId || undefined,
        lines: lines.map((l) => ({
          description: l.description,
          qty: Number(l.qty),
          unitPriceAmount: Number(l.unitPriceAmount),
          taxRate: Number(l.taxRate),
          currency: form.currency,
        })),
      })
      setSubmitting(false)
      if (err) {
        setError(err)
        return
      }
      navigate({ to: '/dashboard/transactions' })
      return
    }
    if (!params.id) return
    const { error: err } = await platformApi.updateTransaction(params.id, {
      referenceNo: form.referenceNo || undefined,
      personId: form.personId || undefined,
      partyId: form.partyId || undefined,
      stageId: form.stageId || undefined,
    })
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    navigate({ to: '/dashboard/transactions' })
  }

  async function addLine() {
    if (mode === 'create') {
      setLines((prev) => [...prev, { ...EMPTY_LINE }])
      return
    }
    if (!params.id) return
    const { error: err } = await platformApi.addTransactionLine(params.id, {
      description: '',
      qty: 1,
      unitPriceAmount: 0,
    })
    if (err) setError(err)
    const { data } = await platformApi.getTransaction(params.id)
    if (data?.lines) {
      setLines(
        data.lines.map((l: any) => ({
          id: l.id,
          description: l.description ?? '',
          qty: l.qty ?? 1,
          unitPriceAmount: l.unitPriceAmount ?? 0,
          taxRate: l.taxRate ?? 0,
        })),
      )
    }
  }

  async function removeLine(index: number) {
    const line = lines[index]
    if (mode === 'edit' && params.id && line?.id) {
      await platformApi.removeTransactionLine(params.id, line.id)
    }
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={mode === 'create' ? 'New Transaction' : 'Edit Transaction'}
        description="Header fields and line items."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: '/dashboard/transactions' })}>
              Cancel
            </Button>
            {mode === 'edit' ? (
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                Delete
              </Button>
            ) : null}
            <Button size="sm" disabled={submitting} onClick={() => void save()}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Type *</Label>
          <Select
            value={form.type}
            onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}
            disabled={mode === 'edit'}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TX_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Reference</Label>
          <Input
            value={form.referenceNo}
            onChange={(e) => setForm((p) => ({ ...p, referenceNo: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Person ID</Label>
          <Input value={form.personId} onChange={(e) => setForm((p) => ({ ...p, personId: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Party ID</Label>
          <Input value={form.partyId} onChange={(e) => setForm((p) => ({ ...p, partyId: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Stage ID</Label>
          <Input value={form.stageId} onChange={(e) => setForm((p) => ({ ...p, stageId: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Currency</Label>
          <Input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Lines</h2>
          <Button variant="outline" size="sm" onClick={() => void addLine()}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add line
          </Button>
        </div>
        <div className="rounded-md border divide-y">
          {lines.map((line, index) => (
            <div key={line.id ?? index} className="grid gap-2 p-3 sm:grid-cols-5">
              <Input
                placeholder="Description"
                value={line.description}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) => (i === index ? { ...l, description: e.target.value } : l)),
                  )
                }
              />
              <Input
                type="number"
                placeholder="Qty"
                value={line.qty}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) => (i === index ? { ...l, qty: Number(e.target.value) } : l)),
                  )
                }
              />
              <Input
                type="number"
                placeholder="Unit price"
                value={line.unitPriceAmount}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === index ? { ...l, unitPriceAmount: Number(e.target.value) } : l,
                    ),
                  )
                }
              />
              <Input
                type="number"
                placeholder="Tax rate"
                value={line.taxRate}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) => (i === index ? { ...l, taxRate: Number(e.target.value) } : l)),
                  )
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => void removeLine(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Total {total} {form.currency}</p>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Transaction"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!params.id) return
          await platformApi.deleteTransaction(params.id)
          navigate({ to: '/dashboard/transactions' })
        }}
      />
    </div>
  )
}

export const transactionNewRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/transactions/new',
  component: () => <TransactionFormPage mode="create" />,
})

export const transactionEditRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/transactions/$id',
  component: () => <TransactionFormPage mode="edit" />,
})

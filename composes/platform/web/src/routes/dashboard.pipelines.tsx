import { useEffect, useState } from 'react'
import { createRoute, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { CrudTablePage } from '@projectx/ui/admin'
import { Button, Input, Label, PageHeader, ConfirmDialog, Switch } from '@projectx/ui'
import { Route as dashboardLayoutRoute } from './dashboard.layout'
import { platformApi } from '../lib/api/platform'

const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString() : '—')

async function unwrapList(res: { data?: { data: any[]; pagination?: { total: number } }; error?: string }) {
  if (res.error) throw new Error(res.error)
  return { items: res.data?.data ?? [], total: res.data?.pagination?.total ?? 0 }
}

function PipelinesIndex() {
  const navigate = useNavigate()
  return (
    <CrudTablePage
      title="Pipelines"
      description="Status flows seeded by composes."
      createLabel="Add Pipeline"
      columns={[
        { header: 'Name', accessor: (r) => r.name },
        { header: 'Entity Type', accessor: (r) => r.entityType },
        { header: 'Default', accessor: (r) => (r.isDefault ? 'Yes' : 'No') },
        { header: 'Created', accessor: (r) => fmtDate(r.createdAt) },
      ]}
      fields={[]}
      list={async ({ page, limit }) => unwrapList(await platformApi.getPipelines({ page, limit }))}
      remove={(id) => platformApi.deletePipeline(id)}
      onRowClick={(row) => navigate({ to: '/dashboard/pipelines/$id', params: { id: row.id } })}
      onCreate={() => navigate({ to: '/dashboard/pipelines/new' })}
    />
  )
}

function PipelineFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { id?: string }
  const [form, setForm] = useState({ name: '', entityType: '', isDefault: false })
  const [stages, setStages] = useState<{ id?: string; name: string }[]>([{ name: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'edit' || !params.id) return
    void platformApi.getPipeline(params.id).then(({ data, error: err }) => {
      if (err) setError(err)
      if (!data) return
      setForm({ name: data.name, entityType: data.entityType, isDefault: !!data.isDefault })
      setStages((data.stages ?? []).map((s: any) => ({ id: s.id, name: s.name })))
    })
  }, [mode, params.id])

  async function save() {
    setSubmitting(true)
    setError(null)
    if (mode === 'create') {
      const { error: err } = await platformApi.createPipeline({
        name: form.name,
        entityType: form.entityType,
        isDefault: form.isDefault,
        stages: stages.filter((s) => s.name.trim()).map((s) => ({ name: s.name })),
      })
      setSubmitting(false)
      if (err) {
        setError(err)
        return
      }
      navigate({ to: '/dashboard/pipelines' })
      return
    }
    if (!params.id) return
    const { error: err } = await platformApi.updatePipeline(params.id, {
      name: form.name,
      isDefault: form.isDefault,
    })
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    navigate({ to: '/dashboard/pipelines' })
  }

  async function addStage() {
    if (mode === 'create') {
      setStages((prev) => [...prev, { name: '' }])
      return
    }
    if (!params.id) return
    const { error: err } = await platformApi.addPipelineStage(params.id, {
      name: 'New stage',
      position: stages.length,
    })
    if (err) setError(err)
    const { data } = await platformApi.getPipeline(params.id)
    if (data?.stages) setStages(data.stages.map((s: any) => ({ id: s.id, name: s.name })))
  }

  async function renameStage(index: number, name: string) {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, name } : s)))
    const stage = stages[index]
    if (mode === 'edit' && params.id && stage?.id) {
      await platformApi.updatePipelineStage(params.id, stage.id, { name })
    }
  }

  async function removeStage(index: number) {
    const stage = stages[index]
    if (mode === 'edit' && params.id && stage?.id) {
      await platformApi.removePipelineStage(params.id, stage.id)
    }
    setStages((prev) => prev.filter((_, i) => i !== index))
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...stages]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setStages(next)
    if (mode === 'edit' && params.id) {
      await platformApi.reorderPipelineStages(
        params.id,
        next.map((s) => s.id!).filter(Boolean),
      )
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={mode === 'create' ? 'New Pipeline' : 'Edit Pipeline'}
        description="Name, entity type, and ordered stages."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: '/dashboard/pipelines' })}>
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
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Entity type *</Label>
          <Input
            value={form.entityType}
            disabled={mode === 'edit'}
            onChange={(e) => setForm((p) => ({ ...p, entityType: e.target.value }))}
            placeholder="deal, order, ticket…"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={form.isDefault}
            onCheckedChange={(checked) => setForm((p) => ({ ...p, isDefault: checked }))}
          />
          Default pipeline
        </label>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Stages</h2>
          <Button variant="outline" size="sm" onClick={() => void addStage()}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add stage
          </Button>
        </div>
        <div className="rounded-md border divide-y">
          {stages.map((stage, index) => (
            <div key={stage.id ?? index} className="flex items-center gap-2 p-3">
              <Input value={stage.name} onChange={(e) => void renameStage(index, e.target.value)} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void move(index, -1)}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void move(index, 1)}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => void removeStage(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Pipeline"
        description="Stages will be deleted as well."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!params.id) return
          await platformApi.deletePipeline(params.id)
          navigate({ to: '/dashboard/pipelines' })
        }}
      />
    </div>
  )
}

export const pipelinesRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/pipelines',
  component: PipelinesIndex,
})

export const pipelineNewRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/pipelines/new',
  component: () => <PipelineFormPage mode="create" />,
})

export const pipelineEditRoute = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: '/pipelines/$id',
  component: () => <PipelineFormPage mode="edit" />,
})

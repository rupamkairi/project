import type { FormEvent, ReactNode } from 'react'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'

export interface AdminFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onSubmit: (e: FormEvent) => void | Promise<void>
  submitting?: boolean
  submitLabel?: string
  cancelLabel?: string
  children: ReactNode
  wide?: boolean
}

export function AdminFormDialog({
  open,
  onOpenChange,
  title,
  onSubmit,
  submitting = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  children,
  wide = false,
}: AdminFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={wide ? 'sm:max-w-lg max-h-[90vh] overflow-y-auto' : 'sm:max-w-md'}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void onSubmit(e)
          }}
          className="space-y-3"
        >
          {children}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Saving...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

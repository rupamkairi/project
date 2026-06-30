import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { Button, Input, Label, Switch } from "@projectx/ui"
import { Loader2 } from "lucide-react"

interface Props {
  course: any
  courseId: string
}

export function PricingForm({ course, courseId }: Props) {
  const [price, setPrice] = useState("")
  const [compareAtPrice, setCompareAtPrice] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [isFree, setIsFree] = useState(false)

  useEffect(() => {
    if (course) {
      setPrice(course.price ?? "0")
      setCompareAtPrice(course.compareAtPrice ?? "")
      setCurrency(course.currency ?? "USD")
      setIsFree(!course.price || parseFloat(course.price) === 0)
    }
  }, [course])

  const update = useMutation({
    mutationFn: () =>
      lmsApi.patch(`/instructor/courses/${courseId}`, {
        price: isFree ? "0" : price,
        compareAtPrice: compareAtPrice || undefined,
        currency,
      }),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        update.mutate()
      }}
      className="space-y-4 max-w-md"
    >
      <div className="flex items-center gap-2">
        <Switch id="is-free" checked={isFree} onCheckedChange={setIsFree} />
        <Label htmlFor="is-free">Free course</Label>
      </div>

      {!isFree && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="compare">Compare-at Price (optional)</Label>
            <Input
              id="compare"
              type="number"
              step="0.01"
              min="0"
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="INR">INR</option>
            </select>
          </div>
        </>
      )}

      {update.isSuccess && <p className="text-sm text-green-600">Pricing saved</p>}
      {update.isError && (
        <p className="text-sm text-red-500">{(update.error as any)?.message ?? "Save failed"}</p>
      )}

      <Button type="submit" disabled={update.isPending}>
        {update.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Pricing"
        )}
      </Button>
    </form>
  )
}

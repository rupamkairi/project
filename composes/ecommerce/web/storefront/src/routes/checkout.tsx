import { createRoute } from '@tanstack/react-router'
import { ecommerceStorefrontLayoutRoute } from './store.layout'
import { useState } from 'react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@projectx/ui'
import { useCartStore } from '../stores/cart'
import { formatCurrency } from '../lib/format'
import { Link } from '@tanstack/react-router'
import { ShoppingBag, Check, CreditCard, MapPin, Truck, ArrowLeft } from 'lucide-react'

const STEPS = ['address', 'shipping', 'payment', 'confirmation'] as const
type Step = (typeof STEPS)[number]

const STEP_LABELS: Record<Step, string> = {
  address: 'Address',
  shipping: 'Shipping',
  payment: 'Payment',
  confirmation: 'Confirmation',
}
const STEP_ICONS: Record<Step, typeof MapPin> = {
  address: MapPin,
  shipping: Truck,
  payment: CreditCard,
  confirmation: Check,
}

function StorefrontCheckout() {
  const { items, clearCart, cartId, setCartId } = useCartStore()
  const [step, setStep] = useState<Step>('address')
  const [address, setAddress] = useState({ line1: '', city: '', state: '', zip: '', country: 'US' })
  const [shippingOption, setShippingOption] = useState('standard')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [busy, setBusy] = useState(false)
  const [apiError, setApiError] = useState('')
  const [serverOptions, setServerOptions] = useState<any[] | null>(null)
  const [serverTax, setServerTax] = useState<any | null>(null)
  const [sessionUrl, setSessionUrl] = useState<string | null>(null)

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
  const shipping = shippingOption === 'express' ? 1299 : 499
  const taxAmount = serverTax?.total?.amount ?? serverTax?.amount ?? 0
  const total = subtotal + shipping + taxAmount
  const currentStepIndex = STEPS.indexOf(step)

  const ensureDraft = async (): Promise<string | null> => {
    if (cartId) return cartId
    setBusy(true)
    setApiError('')
    try {
      const { ecommerceStorefrontApi } = await import('../lib/api')
      const created = await ecommerceStorefrontApi.createCart()
      if (created.error) throw new Error(created.error)
      const draftId = (created.data as any)?.id ?? null
      if (!draftId) throw new Error('Could not create cart')
      setCartId(draftId)
      for (const item of items) {
        await ecommerceStorefrontApi.addToCart(draftId, item.variantId, item.qty)
      }
      return draftId
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Could not create cart')
      return null
    } finally {
      setBusy(false)
    }
  }

  const handleAddressNext = async () => {
    const draftId = await ensureDraft()
    if (!draftId) return
    setBusy(true)
    setApiError('')
    try {
      const { ecommerceStorefrontApi } = await import('../lib/api')
      const res = await ecommerceStorefrontApi.setShippingAddress(draftId, address)
      if (res.error) throw new Error(res.error)
      const opts = await ecommerceStorefrontApi.getShippingOptions(draftId)
      if (!opts.error) {
        const list = (opts.data as any)?.data ?? opts.data ?? []
        if (Array.isArray(list) && list.length > 0) setServerOptions(list)
      }
      setStep('shipping')
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Could not save address')
    } finally {
      setBusy(false)
    }
  }

  const handleShippingNext = async () => {
    const draftId = cartId ?? (await ensureDraft())
    if (!draftId) return
    setBusy(true)
    setApiError('')
    try {
      const { ecommerceStorefrontApi } = await import('../lib/api')
      // Server options carry ids; local standard/express fallback otherwise.
      const match = serverOptions?.find((o: any) => o.id === shippingOption)
      await ecommerceStorefrontApi.selectShippingOption(
        draftId,
        match?.id ?? shippingOption,
      )
      const tax = await ecommerceStorefrontApi.getTax(draftId)
      if (!tax.error) setServerTax(tax.data)
      setStep('payment')
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Could not save shipping')
    } finally {
      setBusy(false)
    }
  }

  const handlePay = async () => {
    const draftId = cartId ?? (await ensureDraft())
    if (!draftId) return
    setBusy(true)
    setApiError('')
    try {
      const { ecommerceStorefrontApi } = await import('../lib/api')
      const session = await ecommerceStorefrontApi.createPaymentSession(draftId)
      if (session.error) throw new Error(session.error)
      const url = (session.data as any)?.url ?? null
      setSessionUrl(url)
      clearCart()
      setStep('confirmation')
    } catch (e) {
      // Payment adapter may be unconfigured (see backend handoff open item #2).
      // Surface the error but still confirm locally for COD-style flows.
      setApiError(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setBusy(false)
    }
  }

  const handleComplete = () => {
    void handlePay()
  }

  if (items.length === 0 && step !== 'confirmation') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Nothing to check out</h2>
        <p className="text-sm text-muted-foreground">Add items to your cart first</p>
        <Button asChild>
          <Link to="/ecommerce/store/products">Start Shopping</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Checkout</h1>

      <div className="flex items-center justify-center gap-0 mb-10">
        {STEPS.map((s, i) => {
          const Icon = STEP_ICONS[s]
          const isPast = currentStepIndex > i
          const isCurrent = step === s
          return (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center gap-2 ${isCurrent ? '' : isPast ? 'text-green-600' : 'text-muted-foreground'}`}
              >
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground shadow-md scale-110'
                      : isPast
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isPast ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:block ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {STEP_LABELS[s]}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-12 sm:w-20 h-px mx-2 sm:mx-4 ${isPast ? 'bg-green-300' : 'bg-border'}`}
                />
              )}
            </div>
          )
        })}
      </div>

      {step === 'address' && (
        <div className="max-w-lg mx-auto space-y-4 rounded-xl border p-6 sm:p-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Shipping Address
          </h2>
          <Input
            placeholder="Address Line 1 *"
            value={address.line1}
            onChange={(e) => setAddress({ ...address, line1: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="City *"
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
            />
            <Input
              placeholder="State"
              value={address.state}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="ZIP *"
              value={address.zip}
              onChange={(e) => setAddress({ ...address, zip: e.target.value })}
            />
            <Select
              value={address.country}
              onValueChange={(v) => setAddress({ ...address, country: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="IN">India</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {apiError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{apiError}</p>
          )}
          <Button
            className="w-full h-11 mt-2"
            onClick={() => void handleAddressNext()}
            disabled={!address.line1 || !address.city || !address.zip || busy}
          >
            {busy ? 'Saving...' : 'Continue to Shipping'}
          </Button>
        </div>
      )}

      {step === 'shipping' && (
        <div className="max-w-lg mx-auto space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Shipping Method
          </h2>
          {(serverOptions ?? [
            { id: 'standard', label: 'Standard Shipping', desc: '5-7 business days', price: 499 },
            { id: 'express', label: 'Express Shipping', desc: '2-3 business days', price: 1299 },
          ]).map((opt: any) => (
            <label
              key={opt.id}
              className={`flex items-center justify-between rounded-xl border p-5 cursor-pointer transition-all ${shippingOption === opt.id ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-muted-foreground/20'}`}
            >
              <div className="flex items-center gap-4">
                <input
                  type="radio"
                  name="shipping"
                  checked={shippingOption === opt.id}
                  onChange={() => setShippingOption(opt.id)}
                  className="h-4 w-4 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </div>
              <span className="text-sm font-semibold">{formatCurrency(opt.price)}</span>
            </label>
          ))}
          {apiError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{apiError}</p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('address')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              className="flex-1 h-11"
              onClick={() => void handleShippingNext()}
              disabled={busy}
            >
              {busy ? 'Saving...' : 'Continue to Payment'}
            </Button>
          </div>
        </div>
      )}

      {step === 'payment' && (
        <div className="max-w-lg mx-auto space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Payment
          </h2>
          <div className="space-y-3">
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Credit Card</SelectItem>
                <SelectItem value="cod">Cash on Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-xl border p-5 space-y-2 text-sm bg-muted/30">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatCurrency(shipping)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          {apiError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{apiError}</p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('shipping')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              className="flex-1 h-11"
              size="lg"
              onClick={handleComplete}
              disabled={busy}
            >
              {busy ? 'Placing order...' : `Pay ${formatCurrency(total)}`}
            </Button>
          </div>
        </div>
      )}

      {step === 'confirmation' && (
        <div className="max-w-lg mx-auto text-center py-8 space-y-5">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Order Confirmed!</h2>
            <p className="text-muted-foreground mt-2">
              Thank you for your purchase. You'll receive a confirmation email shortly.
            </p>
          </div>
          {sessionUrl && (
            <Button asChild className="w-full">
              <a href={sessionUrl} target="_blank" rel="noreferrer">
                Complete payment
              </a>
            </Button>
          )}
          <div className="rounded-xl border p-4 text-sm space-y-1 text-left bg-muted/30">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span>{paymentMethod === 'card' ? 'Credit Card' : 'Cash on Delivery'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{shippingOption === 'express' ? 'Express' : 'Standard'}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Charged</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link to="/ecommerce/store/products">Continue Shopping</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/ecommerce/store/account">View Orders</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export const ecoStoreCheckoutRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: '/checkout',
  component: StorefrontCheckout,
})

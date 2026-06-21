# Phase 17 — Web: GuestApp

---

## 17.1 Guest App Overview

Mobile-first self-service portal for in-house guests. Access via:
- QR code in room links to `/guest?token=RESERVATION_TOKEN`
- Pre-arrival email link
- Hotel website guest portal

No traditional auth — link token identifies the reservation.

---

## 17.2 My Reservation Page

Route: `/guest`

```tsx
export function GuestHomePage() {
  const token = useSearchParam("token");
  const { data: reservation } = useQuery({
    queryKey: ["guest-reservation", token],
    queryFn: () => hspApi.get(`/guest/reservations?token=${token}`),
  });

  if (!reservation) return <GuestTokenError />;

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {/* Welcome */}
      <div className="text-center py-6">
        <p className="text-2xl font-semibold">Welcome, {reservation.guest.firstName}</p>
        <p className="text-muted-foreground">{reservation.hotel.propertyName}</p>
      </div>

      {/* Reservation card */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <InfoRow label="Room" value={reservation.roomNumber ?? "To be assigned"} />
          <InfoRow label="Check-in" value={formatDate(reservation.checkInDate)} />
          <InfoRow label="Check-out" value={formatDate(reservation.checkOutDate)} />
          <InfoRow label="Confirmation" value={<code className="text-xs">{reservation.confirmationNumber}</code>} />
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard icon="🛎" label="Request Service" onClick={() => navigate("/guest/request")} />
        <QuickActionCard icon="📄" label="View Folio" onClick={() => navigate("/guest/folio")} />
        <QuickActionCard icon="📶" label="WiFi Password" value={reservation.hotel.wifiPassword} />
        <QuickActionCard icon="🏨" label="Checkout Online" onClick={() => navigate("/guest/checkout")} />
      </div>
    </div>
  );
}
```

---

## 17.3 Service Request Page

Route: `/guest/request`

```tsx
export function GuestServiceRequestPage() {
  const { reservationId } = useGuestContext();
  const [type, setType] = useState<string>("");
  const [description, setDescription] = useState("");
  const submit = useMutation({
    mutationFn: () => hspApi.post("/service-requests", { reservationId, type, description }),
  });

  const serviceTypes = [
    { id: "housekeeping", label: "Housekeeping", icon: "🧹" },
    { id: "fnb", label: "Food & Beverage", icon: "🍽" },
    { id: "concierge", label: "Concierge", icon: "🗺" },
    { id: "maintenance", label: "Report Issue", icon: "🔧" },
    { id: "other", label: "Other", icon: "💬" },
  ];

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Request Service</h1>

      <div className="grid grid-cols-3 gap-3">
        {serviceTypes.map(s => (
          <button key={s.id}
            className={cn("border rounded-lg p-3 text-center space-y-1", type === s.id && "border-primary bg-primary/5")}
            onClick={() => setType(s.id)}
          >
            <p className="text-2xl">{s.icon}</p>
            <p className="text-xs">{s.label}</p>
          </button>
        ))}
      </div>

      {type && (
        <>
          <Textarea
            placeholder="Describe your request..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
          <Button className="w-full" disabled={!description || submit.isPending}
            onClick={() => submit.mutateAsync().then(() => {
              toast("Request submitted. We'll be with you shortly.");
              setType("");
              setDescription("");
            })}>
            Submit Request
          </Button>
        </>
      )}
    </div>
  );
}
```

---

## 17.4 Guest Folio Page

Route: `/guest/folio`

Read-only view of current charges.

```tsx
export function GuestFolioPage() {
  const { reservationId } = useGuestContext();
  const { data: folio } = useQuery({ queryKey: ["guest-folio", reservationId], queryFn: () => hspApi.get(`/guest/folio?reservationId=${reservationId}`) });

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Your Charges</h1>

      {/* Charge list */}
      <div className="space-y-2">
        {folio?.charges.filter(c => !c.reversed).map(c => (
          <div key={c.id} className="flex justify-between text-sm">
            <div>
              <p>{c.description}</p>
              <p className="text-xs text-muted-foreground">{formatDate(c.date)}</p>
            </div>
            <AmountDisplay amount={parseFloat(c.amount) + parseFloat(c.taxAmount)} />
          </div>
        ))}
      </div>

      {/* Balance */}
      <div className="border-t pt-3 flex justify-between font-bold">
        <span>Balance Due</span>
        <AmountDisplay amount={folio?.balance ?? 0} />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Final settlement at check-out. Contact front desk for any queries.
      </p>
    </div>
  );
}
```

---

## 17.5 Online Check-Out Page

Route: `/guest/checkout`

Allows guest to initiate checkout and pre-pay online if configured.

```tsx
export function GuestCheckoutPage() {
  const { reservation, folio } = useGuestContext();

  if (reservation.status !== "checked-in") {
    return <p className="p-4 text-muted-foreground">Checkout is only available during your stay.</p>;
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Express Check-Out</h1>

      <FolioSummary folio={folio} />

      {folio?.balance > 0 ? (
        <div className="space-y-3">
          <Alert>
            <AlertDescription>
              Outstanding balance: <AmountDisplay amount={folio.balance} />
              Please settle at front desk or online below.
            </AlertDescription>
          </Alert>
          <Button className="w-full" onClick={() => openOnlinePayment()}>Pay Online</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Alert>
            <AlertDescription>Your account is settled. Have a great journey!</AlertDescription>
          </Alert>
          <Button className="w-full" variant="outline" onClick={() => submitExpressCheckout(reservation.id)}>
            Submit Check-Out Request
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Front desk will process and leave your receipt at reception.
          </p>
        </div>
      )}
    </div>
  );
}
```

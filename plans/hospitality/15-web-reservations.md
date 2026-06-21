# Phase 15 — Web: ReservationsApp

---

## 15.1 Reservation Search Page

Route: `/reservations`

```tsx
export function ReservationsPage() {
  const [filters, setFilters] = useState<ReservationFilters>({});
  const { data } = useQuery({
    queryKey: ["reservations", filters],
    queryFn: () => hspApi.get(`/reservations?${buildQueryString(filters)}`),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">Reservations</h1>
        <Button onClick={() => navigate("/reservations/new")}>New Reservation</Button>
      </div>

      <ReservationFilters filters={filters} onChange={setFilters} />

      <DataTable
        columns={reservationColumns}
        data={data?.reservations ?? []}
        onRowClick={r => navigate(`/reservations/${r.id}`)}
      />
    </div>
  );
}

const reservationColumns: ColumnDef<Reservation>[] = [
  { accessorKey: "confirmationNumber", header: "Confirmation",
    cell: ({ row }) => <code className="text-xs">{row.original.confirmationNumber}</code> },
  { accessorKey: "guest", header: "Guest",
    cell: ({ row }) => <GuestBadge guest={row.original.guest} /> },
  { accessorKey: "roomType", header: "Room Type" },
  { accessorKey: "checkInDate", header: "Check In", cell: ({ row }) => formatDate(row.original.checkInDate) },
  { accessorKey: "nights", header: "Nights" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "source", header: "Source" },
  { accessorKey: "totalRate", header: "Total", cell: ({ row }) => <AmountDisplay amount={row.original.totalRate} /> },
];
```

---

## 15.2 New Reservation Page

Route: `/reservations/new`

```tsx
export function NewReservationPage() {
  const [step, setStep] = useState<"search" | "guest" | "details" | "confirm">("search");
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);
  const [selectedRatePlan, setSelectedRatePlan] = useState<RatePlan | null>(null);
  const [guestData, setGuestData] = useState<GuestData | null>(null);

  // Step 1: Availability search
  if (step === "search") {
    return (
      <AvailabilitySearch
        onResult={(result, checkIn, checkOut, adults) => {
          setAvailability({ result, checkIn, checkOut, adults });
          setStep("guest");
        }}
      />
    );
  }

  // Step 2: Guest profile
  if (step === "guest") {
    return (
      <GuestSearch
        onSelect={guest => { setGuestData(guest); setStep("details"); }}
        onNew={guest => { setGuestData(guest); setStep("details"); }}
      />
    );
  }

  // Step 3: Room type + rate plan selection
  if (step === "details") {
    return (
      <RoomRateSelector
        availability={availability}
        guest={guestData}
        onSelect={(roomType, ratePlan) => { setSelectedRoomType(roomType); setSelectedRatePlan(ratePlan); setStep("confirm"); }}
      />
    );
  }

  // Step 4: Confirm
  return (
    <ReservationConfirm
      availability={availability}
      guest={guestData}
      roomType={selectedRoomType}
      ratePlan={selectedRatePlan}
      onConfirm={() => navigate("/reservations")}
    />
  );
}
```

---

## 15.3 Availability Search Component

```tsx
function AvailabilitySearch({ onResult }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(1);

  const { data: availability, isLoading } = useQuery({
    queryKey: ["availability", checkIn, checkOut, adults],
    queryFn: () => hspApi.get(`/availability?checkInDate=${checkIn}&checkOutDate=${checkOut}&adults=${adults}`),
    enabled: !!(checkIn && checkOut),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <DatePicker label="Check-in" value={checkIn} onChange={setCheckIn} />
        <DatePicker label="Check-out" value={checkOut} onChange={setCheckOut} />
        <NumberInput label="Adults" value={adults} onChange={setAdults} min={1} />
      </div>

      {availability && (
        <div className="space-y-3">
          {availability.roomTypes.map(rt => (
            <div key={rt.id} className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{rt.name}</p>
                <p className="text-sm text-muted-foreground">{rt.available} room{rt.available !== 1 ? "s" : ""} available</p>
                <p className="text-xs text-muted-foreground">Max {rt.maxOccupancy} guests</p>
              </div>
              <Button disabled={rt.available === 0} onClick={() => onResult(rt, checkIn, checkOut, adults)}>
                Select
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 15.4 Reservation Detail Page

Route: `/reservations/:id`

Tabs: Overview | Folio | Activity

```tsx
export function ReservationDetailPage() {
  const { id } = useParams();
  const { data: reservation } = useReservation(id);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <code className="text-sm text-muted-foreground">{reservation?.confirmationNumber}</code>
          <h1 className="text-xl font-semibold">{reservation?.guest.firstName} {reservation?.guest.lastName}</h1>
          <StatusBadge status={reservation?.status} />
        </div>

        <div className="flex gap-2">
          {reservation?.status === "tentative" && (
            <Button onClick={() => confirmReservation(id)}>Confirm</Button>
          )}
          {["tentative", "confirmed"].includes(reservation?.status) && (
            <Button variant="destructive" onClick={() => openCancelDialog(id)}>Cancel</Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsContent value="overview">
          <ReservationOverview reservation={reservation} />
        </TabsContent>
        <TabsContent value="folio">
          {reservation?.folioId
            ? <FolioView folioId={reservation.folioId} />
            : <p className="text-muted-foreground text-sm">Folio created at check-in</p>
          }
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 15.5 Cancel Reservation Dialog

Shows server-computed cancellation penalty before confirming:

```tsx
export function CancelReservationDialog({ reservationId, onClose }) {
  const { data: penalty } = useQuery({
    queryKey: ["cancel-penalty", reservationId],
    queryFn: () => hspApi.get(`/reservations/${reservationId}/cancel-penalty`),
  });
  const cancel = useMutation({ mutationFn: () => hspApi.post(`/reservations/${reservationId}/cancel`) });

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader><DialogTitle>Cancel Reservation</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {penalty?.penalty > 0 ? (
            <Alert variant="destructive">
              <AlertDescription>
                Cancellation fee applies: <AmountDisplay amount={penalty.penalty} />
                <p className="text-xs mt-1">Based on rate plan policy: {penalty.policyDescription}</p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>No cancellation fee. Free cancellation applies.</AlertDescription>
            </Alert>
          )}
          <Button variant="destructive" className="w-full" onClick={() => cancel.mutateAsync().then(onClose)}>
            Confirm Cancellation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

# Phase 13 — Web: FrontDeskApp

---

## 13.1 Arrivals Page

Route: `/front-desk/arrivals`

```tsx
export function ArrivalsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data } = useQuery({
    queryKey: ["arrivals", today],
    queryFn: () => hspApi.get(`/front-desk/arrivals?date=${today}`),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Arrivals — {formatDate(today)}</h1>
        <DatePicker value={today} onChange={setDate} />
      </div>

      <DataTable
        columns={arrivalColumns}
        data={data?.reservations ?? []}
        onRowClick={r => navigate(`/front-desk/checkin/${r.id}`)}
      />
    </div>
  );
}

const arrivalColumns: ColumnDef<Reservation>[] = [
  { accessorKey: "confirmationNumber", header: "Confirmation" },
  { accessorKey: "guestName", header: "Guest",
    cell: ({ row }) => <GuestBadge guest={row.original.guest} /> },
  { accessorKey: "roomType", header: "Room Type" },
  { accessorKey: "roomNumber", header: "Room",
    cell: ({ row }) => row.original.roomId
      ? <RoomStatusChip room={row.original.room} />
      : <span className="text-muted-foreground text-xs">Not assigned</span>
  },
  { accessorKey: "nights", header: "Nights" },
  { accessorKey: "specialRequests", header: "Requests",
    cell: ({ row }) => row.original.specialRequests
      ? <TooltipTrigger content={row.original.specialRequests}><span className="text-amber-500">⚠</span></TooltipTrigger>
      : null
  },
  { id: "action", cell: ({ row }) => (
    <Button size="sm" onClick={() => navigate(`/front-desk/checkin/${row.original.id}`)}>Check In</Button>
  )},
];
```

---

## 13.2 Check-In Page

Route: `/front-desk/checkin/:reservationId`

```tsx
export function CheckInPage() {
  const { reservationId } = useParams();
  const { data: reservation } = useReservation(reservationId);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const checkIn = useMutation({
    mutationFn: (data: { roomId?: string; earlyCheckIn?: boolean; idVerified?: boolean }) =>
      hspApi.post(`/checkin/${reservationId}`, data),
  });

  const { data: availableRooms } = useQuery({
    queryKey: ["inspected-rooms", reservation?.roomTypeId],
    queryFn: () => hspApi.get(`/rooms/status?roomTypeId=${reservation?.roomTypeId}&housekeepingStatus=inspected`),
    enabled: !!reservation,
  });

  if (!reservation) return <Skeleton />;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Check-In — {reservation.confirmationNumber}</h1>

      <GuestInfoCard guest={reservation.guest} showId={true} />

      <div className="space-y-2">
        <Label>Assign Room</Label>
        <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
          <SelectTrigger>
            <SelectValue placeholder="Auto-assign (recommended)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Auto-assign</SelectItem>
            {availableRooms?.rooms.map(r => (
              <SelectItem key={r.id} value={r.id}>
                Room {r.roomNumber} — Floor {r.floor} {r.features?.join(", ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {availableRooms?.rooms.length === 0 && (
          <p className="text-red-500 text-sm">No inspected rooms available. Contact housekeeping.</p>
        )}
      </div>

      <Button
        className="w-full"
        disabled={availableRooms?.rooms.length === 0 || checkIn.isPending}
        onClick={() => checkIn.mutateAsync({ roomId: selectedRoomId || undefined })}
      >
        Complete Check-In
      </Button>

      {checkIn.error && <ErrorAlert error={checkIn.error} />}
    </div>
  );
}
```

---

## 13.3 Departures Page

Route: `/front-desk/departures`

Similar to arrivals but shows `folio.balance` column. Balance > 0 highlighted red.

```tsx
const departureColumns: ColumnDef<Reservation>[] = [
  { accessorKey: "confirmationNumber", header: "Confirmation" },
  { accessorKey: "guestName", header: "Guest" },
  { accessorKey: "roomNumber", header: "Room" },
  { accessorKey: "nights", header: "Nights" },
  { accessorKey: "folio.balance", header: "Balance",
    cell: ({ row }) => (
      <span className={cn("font-mono", parseFloat(row.original.folio?.balance) > 0 ? "text-red-600 font-bold" : "text-green-600")}>
        <AmountDisplay amount={row.original.folio?.balance ?? 0} />
      </span>
    )
  },
  { id: "action", cell: ({ row }) => (
    <Button size="sm" onClick={() => navigate(`/front-desk/checkout/${row.original.id}`)}>Check Out</Button>
  )},
];
```

---

## 13.4 Room Status Board

Route: `/front-desk/rooms`

```tsx
export function RoomStatusBoard() {
  const { data } = useQuery({ queryKey: ["room-board"], queryFn: () => hspApi.get("/front-desk/rooms-board"), refetchInterval: 30_000 });

  return (
    <div className="space-y-8">
      {data?.floors.map(floor => (
        <div key={floor.floor}>
          <h3 className="text-sm font-medium mb-3">Floor {floor.floor}</h3>
          <div className="grid grid-cols-8 gap-2">
            {floor.rooms.map(room => (
              <RoomStatusTile key={room.id} room={room} onClick={() => setSelected(room)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RoomStatusTile({ room, onClick }) {
  const hkColor = {
    inspected: "bg-green-100 border-green-300",
    clean: "bg-green-50 border-green-200",
    dirty: "bg-red-100 border-red-300",
    "cleaning-in-progress": "bg-amber-100 border-amber-300",
    done: "bg-blue-100 border-blue-300",
    "touch-up": "bg-orange-100 border-orange-300",
  }[room.housekeepingStatus];

  return (
    <div className={cn("border rounded p-2 cursor-pointer text-center text-xs", hkColor, room.isBlocked && "opacity-50")} onClick={onClick}>
      <p className="font-bold">{room.roomNumber}</p>
      <p className="text-muted-foreground">{room.roomType}</p>
      {room.status === "occupied" && <p className="text-xs text-zinc-600">Occupied</p>}
    </div>
  );
}
```

---

## 13.5 Folio Page

Route: `/front-desk/reservations/:id/folio`

Shows all charges + payments + balance. Post charge button → PostChargeDialog.

```tsx
export function FolioPage() {
  const { id } = useParams();
  const { data: folio } = useFolio(id);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-semibold">Folio — {folio?.id}</h2>
          <StatusBadge status={folio?.status} />
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold"><AmountDisplay amount={folio?.balance} /></p>
          <p className="text-xs text-muted-foreground">Balance</p>
        </div>
      </div>

      <DataTable columns={chargeColumns} data={folio?.charges ?? []} />

      <div className="flex gap-2">
        <PostChargeDialog folioId={folio?.id} />
        {folio?.balance > 0 && <PostPaymentDialog folioId={folio?.id} balance={folio.balance} />}
      </div>
    </div>
  );
}
```

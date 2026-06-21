# Phase 18 — Web: AdminApp

---

## 18.1 Admin Dashboard

Route: `/hospitality-admin/dashboard`

```tsx
export function HospitalityAdminDashboard() {
  const { data } = useQuery({ queryKey: ["hsp-admin-overview"], queryFn: () => hspApi.get("/revenue/metrics?dateFrom=" + startOfMonth() + "&dateTo=" + today()) });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Occupancy" value={`${data?.occupancy.toFixed(1)}%`} />
        <StatCard label="RevPAR" value={<AmountDisplay amount={data?.revPAR} />} />
        <StatCard label="ADR" value={<AmountDisplay amount={data?.ADR} />} />
        <StatCard label="Revenue (MTD)" value={<AmountDisplay amount={data?.totalRevenue} />} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <OccupancyChart />
        <ChannelMixChart data={data?.channelMix} />
      </div>

      <PendingActionsPanel />
    </div>
  );
}
```

---

## 18.2 Room Management Page

Route: `/hospitality-admin/rooms`

Tabs: Rooms | Room Types

```tsx
export function RoomManagementPage() {
  return (
    <Tabs>
      <TabsContent value="rooms">
        <div className="flex justify-between mb-4">
          <h2 className="font-semibold">Rooms</h2>
          <Button onClick={() => openCreateRoomDialog()}>Add Room</Button>
        </div>
        <DataTable
          columns={[
            { accessorKey: "roomNumber", header: "Room" },
            { accessorKey: "roomType", header: "Type" },
            { accessorKey: "floor", header: "Floor" },
            { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
            { accessorKey: "housekeepingStatus", header: "Housekeeping",
              cell: ({ row }) => <StatusBadge status={row.original.housekeepingStatus} /> },
            { id: "actions", cell: ({ row }) => (
              <div className="flex gap-2">
                {!row.original.isBlocked
                  ? <Button size="sm" variant="outline" onClick={() => blockRoom(row.original.id)}>Block</Button>
                  : <Button size="sm" variant="outline" onClick={() => unblockRoom(row.original.id)}>Unblock</Button>
                }
              </div>
            )},
          ]}
        />
      </TabsContent>

      <TabsContent value="room-types">
        <RoomTypesTable />
      </TabsContent>
    </Tabs>
  );
}
```

---

## 18.3 Maintenance Board Page

Route: `/hospitality-admin/maintenance`

```tsx
export function MaintenanceBoardPage() {
  const { data } = useQuery({ queryKey: ["maintenance-board"], queryFn: () => hspApi.get("/maintenance/board") });

  return (
    <div className="space-y-6">
      {/* Urgent badge */}
      {data?.urgentCount > 0 && (
        <Alert variant="destructive">
          <AlertDescription>{data.urgentCount} urgent maintenance requests require attention</AlertDescription>
        </Alert>
      )}

      {/* Blocked rooms */}
      {data?.blockedRooms.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-amber-600">OOO Rooms ({data.blockedRooms.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.blockedRooms.map(r => (
                <div key={r.roomId} className="flex justify-between text-sm">
                  <span>Room {r.roomNumber}</span>
                  <span className="text-muted-foreground">{r.blockReason}</span>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/hospitality-admin/maintenance/${r.maintenanceRequestId}`)}>
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request board */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(data?.byStatus ?? {}).map(([status, requests]) => (
          <div key={status}>
            <h3 className="text-sm font-medium mb-3 capitalize">{status} ({requests.length})</h3>
            <div className="space-y-2">
              {requests.map(r => <MaintenanceRequestCard key={r.id} request={r} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 18.4 Config Page

Route: `/hospitality-admin/config`

```tsx
export function HospitalityConfigPage() {
  const { data: config } = useQuery({ queryKey: ["hsp-config"], queryFn: () => hspApi.get("/admin/config") });
  const update = useMutation({ mutationFn: (data) => hspApi.patch("/admin/config", data) });

  return (
    <Form onSubmit={data => update.mutateAsync(data)}>
      <FormField label="Default Check-In Time" name="defaultCheckInTime" defaultValue={config?.defaultCheckInTime} />
      <FormField label="Default Check-Out Time" name="defaultCheckOutTime" defaultValue={config?.defaultCheckOutTime} />
      <FormField label="Early Check-In Fee" name="earlyCheckInFee" type="number" defaultValue={config?.earlyCheckInFee} />
      <FormField label="Late Check-Out Fee" name="lateCheckOutFee" type="number" defaultValue={config?.lateCheckOutFee} />
      <FormField label="Tax Rate (%)" name="taxRate" type="number" defaultValue={config?.taxRate} />
      <FormField label="City Tax Per Night" name="cityTaxPerNight" type="number" defaultValue={config?.cityTaxPerNight} />
      <FormField label="WiFi Password" name="wifiPassword" defaultValue={config?.wifiPassword} />
      <FormField label="Currency" name="currency" defaultValue={config?.currency} />
      <Button type="submit">Save Config</Button>
    </Form>
  );
}
```

---

## 18.5 Guest Profile Management

Route: `/hospitality-admin/guests`

```tsx
export function GuestProfilesPage() {
  return (
    <DataTable
      columns={[
        { accessorKey: "name", header: "Name",
          cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}` },
        { accessorKey: "email", header: "Email" },
        { accessorKey: "vipStatus", header: "VIP",
          cell: ({ row }) => row.original.vipStatus !== "standard"
            ? <Badge variant="outline" className="text-amber-600">{row.original.vipStatus.toUpperCase()}</Badge>
            : null
        },
        { accessorKey: "totalStays", header: "Stays" },
        { accessorKey: "totalSpend", header: "Total Spend",
          cell: ({ row }) => <AmountDisplay amount={row.original.totalSpend} /> },
      ]}
      onRowClick={g => navigate(`/hospitality-admin/guests/${g.id}`)}
    />
  );
}
```

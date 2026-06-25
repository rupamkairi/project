import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button, Badge, Input, Switch, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  cn,
} from "@projectx/ui";
import { rstApi, type MenuItem } from "../../../../lib/api/restaurant";
import { useOutletStore } from "../../../../stores/outlet-store";
import { AmountDisplay } from "../../../../components/shared/AmountDisplay";

function MenuItemRow({ item, onToggle86, on86Pending }: {
  item: MenuItem;
  onToggle86: () => void;
  on86Pending: boolean;
}) {
  const available = item.meta?.isAvailable !== false;
  return (
    <div className={cn("flex items-center gap-3 p-3 border-b last:border-0 transition-opacity", !available && "opacity-50")}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{item.name}</p>
          {!available && <Badge variant="destructive" className="text-xs">86'd</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          <AmountDisplay amount={item.meta?.basePrice} />
          {item.meta?.station && <span className="ml-2">· {item.meta.station}</span>}
        </p>
      </div>
      <Switch
        checked={available}
        onCheckedChange={onToggle86}
        disabled={on86Pending}
      />
    </div>
  );
}

function MenuItemDialog({ item, categories, onClose, onSaved }: {
  item: MenuItem | null;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const { outletId } = useOutletStore();
  const isNew = !item;
  const [form, setForm] = useState({
    name: item?.name ?? "",
    price: String(item?.meta?.basePrice ?? ""),
    categoryId: item?.meta?.categoryId ?? "",
    station: item?.meta?.station ?? "",
    description: item?.description ?? "",
  });

  const save = useMutation({
    mutationFn: () => isNew
      ? rstApi.createMenuItem({ outletId: outletId!, name: form.name, description: form.description, type: "menu_item", status: "active", meta: { basePrice: String(parseFloat(form.price)), categoryId: form.categoryId, station: form.station } } as any)
      : rstApi.updateMenuItem(item!.id, { name: form.name, meta: { basePrice: String(parseFloat(form.price)), categoryId: form.categoryId, station: form.station } } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rst-menu"] }); onSaved(); onClose(); },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isNew ? "Add Menu Item" : "Edit Menu Item"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Station (grill, cold, bar…)" value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} />
          <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!form.name || !form.price || save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminMenuPage() {
  const { outletId } = useOutletStore();
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState<MenuItem | null | "new">(null);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const { data: menuData } = useQuery({
    queryKey: ["rst-menu", outletId],
    queryFn: () => rstApi.getMenu(outletId!),
    enabled: !!outletId,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["rst-categories", outletId],
    queryFn: () => rstApi.getCategories(outletId!),
    enabled: !!outletId,
  });

  const toggle86 = useMutation({
    mutationFn: (item: MenuItem) => rstApi.toggle86MenuItem(item.id, !(item.meta?.isAvailable !== false)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rst-menu"] }),
  });

  const items: MenuItem[] = menuData?.data ?? [];
  const cats = categoriesData?.data ?? [];
  const visible = selectedCat ? items.filter((i) => i.meta?.categoryId === selectedCat) : items;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Menu</h1>
        <Button onClick={() => setEditItem("new")}>+ Add Item</Button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setSelectedCat(null)}
          className={cn("text-sm px-3 py-1 rounded-full border whitespace-nowrap", !selectedCat ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
        >
          All ({items.length})
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c.id)}
            className={cn("text-sm px-3 py-1 rounded-full border whitespace-nowrap", selectedCat === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="border rounded-xl overflow-hidden">
        {visible.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No items</p>
        ) : (
          visible.map((item) => (
            <MenuItemRow
              key={item.id}
              item={item}
              onToggle86={() => toggle86.mutate(item)}
              on86Pending={toggle86.isPending && toggle86.variables?.id === item.id}
            />
          ))
        )}
      </div>

      {editItem !== null && (
        <MenuItemDialog
          item={editItem === "new" ? null : editItem}
          categories={cats}
          onClose={() => setEditItem(null)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}

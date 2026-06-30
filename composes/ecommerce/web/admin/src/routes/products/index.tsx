import { createRoute } from "@tanstack/react-router";
import { ecommerceAdminLayoutRoute } from "../admin.layout";
import { useState } from "react";
import { PageHeader, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, DataTable, EmptyState, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@projectx/ui";
import { Plus, Search, Pencil, Archive, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ecommerceAdminApi } from "../../lib/api";

const STATUS_BADGES: Record<string, string> = { draft: "bg-zinc-100 text-zinc-600", published: "bg-green-100 text-green-700", archived: "bg-red-100 text-red-600" };

function ProductForm({ product, onClose }: { product?: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: catData } = useQuery({ queryKey: ["admin-categories"], queryFn: () => ecommerceAdminApi.getCategories() });
  const categories = catData?.data?.data ?? catData?.data ?? [];
  const [form, setForm] = useState({ title: product?.title ?? "", handle: product?.handle ?? "", description: product?.description ?? "", categoryId: product?.categoryId ?? "", status: product?.status ?? "draft", weight: product?.weight ?? "", tags: product?.tags?.join(", ") ?? "" });

  const mutation = useMutation({
    mutationFn: () => product ? ecommerceAdminApi.updateProduct(product.id, form) : ecommerceAdminApi.createProduct(form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); onClose(); },
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{product ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Handle" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
        <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
        </Select>
        <Input placeholder="Weight (g)" type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
        <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => mutation.mutate()} disabled={!form.title || mutation.isPending}>{mutation.isPending ? "Saving..." : "Save"}</Button></DialogFooter>
    </DialogContent>
  );
}

function AdminProducts() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-products", q, statusFilter], queryFn: () => ecommerceAdminApi.getProducts({ q: q || undefined, status: statusFilter !== "all" ? statusFilter : undefined }) });

  const deleteMutation = useMutation({ mutationFn: (id: string) => ecommerceAdminApi.deleteProduct(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }) });

  const products = data?.data?.data ?? data?.data ?? [];
  const columns = [
    { header: "Title", accessorKey: "title" },
    { header: "Handle", accessorKey: "handle" },
    { header: "Status", cell: ({ row }: any) => <Badge className={STATUS_BADGES[row.original.status]}>{row.original.status}</Badge> },
    { header: "Updated", accessorKey: "updatedAt" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Products" actions={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" /> New Product</Button>} />
      <div className="flex items-center gap-3">
        <Input placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
        </Select>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : products.length === 0 ? <EmptyState title="No products" description="Create your first product to get started." /> : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3 font-medium">Title</th><th className="p-3 font-medium">Handle</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Actions</th></tr></thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-3 font-medium">{p.title}</td>
                  <td className="p-3 text-muted-foreground">{p.handle}</td>
                  <td className="p-3"><Badge className={STATUS_BADGES[p.status]}>{p.status}</Badge></td>
                  <td className="p-3 flex gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(p); setDialogOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <ProductForm product={editing} onClose={() => setDialogOpen(false)} />
      </Dialog>
    </div>
  );
}

export const ecoAdminProductsRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: "/products",
  component: AdminProducts,
});

import { createRoute } from "@tanstack/react-router";
import { ecommerceAdminLayoutRoute } from "../admin.layout";
import { useState } from "react";
import { PageHeader, Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Badge } from "@projectx/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ecommerceAdminApi } from "../../lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@projectx/ui";

function CategoryDialog({ category, onClose }: { category?: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: catData } = useQuery({ queryKey: ["admin-categories"], queryFn: () => ecommerceAdminApi.getCategories() });
  const categories = catData?.data?.data ?? catData?.data ?? [];
  const [form, setForm] = useState({ name: category?.name ?? "", slug: category?.slug ?? "", parentId: category?.parentId ?? "", description: category?.description ?? "" });
  const mutation = useMutation({
    mutationFn: () => category ? ecommerceAdminApi.updateCategory(category.id, form) : ecommerceAdminApi.createCategory(form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-categories"] }); onClose(); },
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{category ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })}>
          <SelectTrigger><SelectValue placeholder="Parent (none)" /></SelectTrigger>
          <SelectContent><SelectItem value="None">None</SelectItem>{categories.filter((c: any) => !c.parentId).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => mutation.mutate()} disabled={!form.name || mutation.isPending}>{mutation.isPending ? "Saving..." : "Save"}</Button></DialogFooter>
    </DialogContent>
  );
}

function AdminCategories() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-categories"], queryFn: () => ecommerceAdminApi.getCategories() });
  const deleteMut = useMutation({ mutationFn: (id: string) => ecommerceAdminApi.deleteCategory(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }) });

  const categories = data?.data?.data ?? data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Categories" actions={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" /> New Category</Button>} />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : categories.length === 0 ? <p className="text-sm text-muted-foreground">No categories yet</p> : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Slug</th><th className="p-3 font-medium">Parent</th><th className="p-3 font-medium">Actions</th></tr></thead>
            <tbody>
              {categories.map((cat: any) => {
                const parent = categories.find((c: any) => c.id === cat.parentId);
                return (
                  <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-3 font-medium">{cat.parentId ? <span className="ml-4">↳ {cat.name}</span> : cat.name}</td>
                    <td className="p-3 text-muted-foreground">{cat.slug}</td>
                    <td className="p-3 text-muted-foreground">{parent?.name ?? "—"}</td>
                    <td className="p-3 flex gap-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(cat); setDialogOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(cat.id)}><Trash2 className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <CategoryDialog category={editing} onClose={() => setDialogOpen(false)} />
      </Dialog>
    </div>
  );
}

export const ecoAdminCategoriesRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: "/categories",
  component: AdminCategories,
});

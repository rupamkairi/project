import { createRoute } from "@tanstack/react-router";
import { ecommerceAdminLayoutRoute } from "../admin.layout";
import { useState } from "react";
import { PageHeader, Button, Badge, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@projectx/ui";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "@tanstack/react-router";
import { ecommerceAdminApi } from "../../lib/api";
import { formatCurrency } from "../../lib/format";

function VariantDialog({ productId, variant, onClose }: { productId: string; variant?: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ sku: variant?.sku ?? "", price: variant?.price ? String(variant.price) : "", compareAtPrice: variant?.compareAtPrice ? String(variant.compareAtPrice) : "", stockQty: variant?.stockQty ? String(variant.stockQty) : "0", status: variant?.status ?? "draft", options: variant?.options ? JSON.stringify(variant.options) : "{}" });
  const mutation = useMutation({
    mutationFn: () => variant ? ecommerceAdminApi.updateVariant(productId, variant.id, form) : ecommerceAdminApi.createVariant(productId, form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-product-variants"] }); onClose(); },
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{variant ? "Edit Variant" : "Add Variant"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <Input placeholder="SKU *" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        <Input placeholder="Price (cents) *" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <Input placeholder="Compare-at Price (cents)" type="number" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} />
        <Input placeholder="Stock Qty *" type="number" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} />
        <Input placeholder='Options (JSON) e.g. {"color":"Red","size":"M"}' value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} />
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent>
        </Select>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => mutation.mutate()} disabled={!form.sku || !form.price || mutation.isPending}>{mutation.isPending ? "Saving..." : "Save"}</Button></DialogFooter>
    </DialogContent>
  );
}

function AdminProductDetail() {
  const { id } = useParams({ from: ecoAdminProductDetailRoute });
  const queryClient = useQueryClient();
  const [variantDialog, setVariantDialog] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any>(null);

  const { data: productData } = useQuery({ queryKey: ["admin-product", id], queryFn: () => ecommerceAdminApi.getProduct(id) });
  const { data: variantsData } = useQuery({ queryKey: ["admin-product-variants", id], queryFn: () => ecommerceAdminApi.getVariants(id) });

  const product = productData?.data;
  const variants = variantsData?.data?.data ?? variantsData?.data ?? [];

  const deleteVarMut = useMutation({ mutationFn: (vid: string) => ecommerceAdminApi.deleteVariant(id, vid), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-product-variants"] }) });

  return (
    <div className="space-y-6">
      <PageHeader title={product?.title ?? "Product Detail"} breadcrumbs={[{ label: "Products", href: "/admin/ecommerce/products" }, { label: product?.title ?? "" }]} actions={product && <><Badge className={product.status === "published" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}>{product.status}</Badge></>} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="variants">Variants ({variants.length})</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">{product?.description ?? "No description"}</p>
          {product?.tags?.length > 0 && (
            <div className="flex gap-2 flex-wrap">{product.tags.map((t: string) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
          )}
        </TabsContent>

        <TabsContent value="variants" className="pt-4">
          <div className="space-y-4">
            <Button onClick={() => { setEditingVariant(null); setVariantDialog(true); }}><Plus className="h-4 w-4 mr-1" /> Add Variant</Button>
            {variants.length === 0 ? <p className="text-sm text-muted-foreground">No variants yet</p> : (
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3 font-medium">SKU</th><th className="p-3 font-medium">Options</th><th className="p-3 font-medium">Price</th><th className="p-3 font-medium">Stock</th><th className="p-3 font-medium">Actions</th></tr></thead>
                  <tbody>
                    {variants.map((v: any) => (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="p-3">{v.sku}</td>
                        <td className="p-3 text-muted-foreground text-xs">{v.options ? Object.entries(v.options).map(([k, val]) => `${k}: ${val}`).join(" / ") : "—"}</td>
                        <td className="p-3">{formatCurrency(v.price)}</td>
                        <td className="p-3"><Badge className={v.stockQty < 5 ? "bg-amber-100 text-amber-700" : v.stockQty === 0 ? "bg-red-100 text-red-600" : ""}>{v.stockQty}</Badge></td>
                        <td className="p-3 flex gap-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingVariant(v); setVariantDialog(true); }}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteVarMut.mutate(v.id)}><Trash2 className="h-3 w-3" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="media" className="pt-4">
          <p className="text-sm text-muted-foreground">Media management coming soon.</p>
        </TabsContent>
      </Tabs>

      <Dialog open={variantDialog} onOpenChange={setVariantDialog}>
        <VariantDialog productId={id} variant={editingVariant} onClose={() => setVariantDialog(false)} />
      </Dialog>
    </div>
  );
}

export const ecoAdminProductDetailRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: "/products/$id",
  component: AdminProductDetail,
});

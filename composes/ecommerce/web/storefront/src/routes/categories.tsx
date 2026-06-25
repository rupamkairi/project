import { createRoute } from "@tanstack/react-router";
import { ecommerceStorefrontLayoutRoute } from "./store.layout";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Card, CardContent, Skeleton, Button } from "@projectx/ui";
import { useQuery } from "@tanstack/react-query";
import { ecommerceStorefrontApi } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import { ArrowLeft } from "lucide-react";

function StorefrontCategories() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["store-categories"], queryFn: () => ecommerceStorefrontApi.getCategories() });
  const categories = data?.data?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse products by category</p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : categories.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No categories yet</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat: any) => (
            <Card key={cat.id} className="group cursor-pointer border-0 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 hover:shadow-lg transition-all duration-300" onClick={() => navigate({ to: "/store/categories/$id", params: { id: cat.id } })}>
              <CardContent className="p-6 text-center space-y-2">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <span className="text-2xl">📁</span>
                </div>
                <p className="font-semibold text-lg">{cat.name}</p>
                {cat.description && <p className="text-xs text-muted-foreground line-clamp-2">{cat.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StorefrontCategoryDetail() {
  const { id } = useParams({ from: ecoStoreCategoryDetailRoute });
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["store-products-category", id],
    queryFn: () => ecommerceStorefrontApi.getProducts({ categoryId: id, limit: "50" }),
  });
  const products = data?.data?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/store/categories" })} className="w-fit">
        <ArrowLeft className="h-4 w-4 mr-1" /> All Categories
      </Button>
      <h1 className="text-3xl font-bold tracking-tight">Category</h1>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2"><Skeleton className="aspect-square rounded-xl" /><Skeleton className="h-4 w-3/4" /></div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No products in this category</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((p: any) => (
            <ProductCard key={p.id} product={{
              id: p.id, title: p.title, handle: p.handle ?? p.id, price: p.price ?? 0,
              compareAtPrice: p.compareAtPrice, imageUrl: p.imageUrl, isAvailable: true,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

export const ecoStoreCategoriesRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: "/categories",
  component: StorefrontCategories,
});

export const ecoStoreCategoryDetailRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: "/categories/$id",
  component: StorefrontCategoryDetail,
});

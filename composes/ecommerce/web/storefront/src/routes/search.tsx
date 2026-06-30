import { createRoute } from "@tanstack/react-router";
import { ecommerceStorefrontLayoutRoute } from "./store.layout";
import { useState } from "react";
import { Input, Skeleton, Button } from "@projectx/ui";
import { useQuery } from "@tanstack/react-query";
import { ecommerceStorefrontApi } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import { Search, X } from "lucide-react";

function StorefrontSearch() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["store-search", q],
    queryFn: () => ecommerceStorefrontApi.getProducts({ search: q, limit: 20 }),
    enabled: q.length > 0,
  });

  const products = data?.data?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Search</h1>
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9 h-12 text-base" placeholder="What are you looking for?" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        {q && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setQ("")}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {q && isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2"><Skeleton className="aspect-square rounded-xl" /><Skeleton className="h-4 w-3/4" /></div>
          ))}
        </div>
      )}

      {q && !isLoading && products.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Search className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">No results for "{q}"</p>
          <p className="text-sm text-muted-foreground">Try different keywords or browse our categories</p>
          <Button variant="outline" onClick={() => setQ("")}>Clear Search</Button>
        </div>
      )}

      {products.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">{products.length} result{products.length !== 1 ? "s" : ""} for "{q}"</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p: any) => (
              <ProductCard key={p.id} product={{
                id: p.id, title: p.title, handle: p.handle ?? p.id, price: p.price ?? 0,
                compareAtPrice: p.compareAtPrice, imageUrl: p.imageUrl, isAvailable: true,
              }} />
            ))}
          </div>
        </>
      )}

      {!q && (
        <div className="text-center py-16 space-y-3">
          <Search className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">Search our store</p>
          <p className="text-sm text-muted-foreground">Type above to find products, categories, and more</p>
        </div>
      )}
    </div>
  );
}

export const ecoStoreSearchRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: "/search",
  component: StorefrontSearch,
});

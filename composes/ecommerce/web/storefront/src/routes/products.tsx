import { createRoute } from "@tanstack/react-router";
import { ecommerceStorefrontLayoutRoute } from "./store.layout";
import { useState } from "react";
import { Input, Button, Skeleton, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@projectx/ui";
import { useQuery } from "@tanstack/react-query";
import { ecommerceStorefrontApi } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import { formatCurrency } from "../lib/format";
import { Search, SlidersHorizontal, Grid3X3, List } from "lucide-react";

function StorefrontProducts() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const { data, isLoading } = useQuery({
    queryKey: ["store-products", search, sort],
    queryFn: () => ecommerceStorefrontApi.getProducts({ search: search || undefined, limit: 20 }),
  });

  const products = data?.data?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse our collection of premium products</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("grid")}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-10" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-44 h-10">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Search className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
          <Button variant="outline" onClick={() => { setSearch(""); setSort("newest"); }}>Clear Filters</Button>
        </div>
      ) : (
        <div className={view === "grid"
          ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          : "space-y-4"
        }>
          {products.map((p: any) => (
            view === "grid" ? (
              <ProductCard key={p.id} product={{
                id: p.id, title: p.title, handle: p.handle ?? p.id, price: p.price ?? 0,
                compareAtPrice: p.compareAtPrice, imageUrl: p.imageUrl, isAvailable: true,
              }} />
            ) : (
              <div key={p.id} className="flex gap-4 rounded-xl border p-4 hover:shadow-md transition-shadow">
                <div className="h-24 w-24 rounded-lg bg-zinc-100 shrink-0 flex items-center justify-center text-3xl">
                  {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover rounded-lg" /> : <span>✦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-sm text-muted-foreground">{p.category ?? ""}</p>
                  <p className="text-sm font-bold mt-1">{formatCurrency(p.price ?? 0)}</p>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export const ecoStoreProductsRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: "/products",
  component: StorefrontProducts,
});

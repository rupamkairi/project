import { createRoute } from "@tanstack/react-router";
import { ecommerceStorefrontLayoutRoute } from "./store.layout";
import { useNavigate } from "@tanstack/react-router";
import { Button, Card, CardContent, Skeleton, Badge } from "@projectx/ui";
import { useQuery } from "@tanstack/react-query";
import { ecommerceStorefrontApi } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import { formatCurrency } from "../lib/format";
import { ArrowRight, Sparkles, Truck, RotateCcw, Shield } from "lucide-react";

function StorefrontHome() {
  const navigate = useNavigate();
  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => ecommerceStorefrontApi.getCategories(),
  });
  const { data: prodData, isLoading } = useQuery({
    queryKey: ["products", "trending"],
    queryFn: () =>
      ecommerceStorefrontApi.getProducts({ limit: 6 }),
  });

  const categories = catData?.data?.data ?? [];
  const products = prodData?.data?.data ?? [];

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="max-w-2xl space-y-6">
            <Badge
              variant="outline"
              className="w-fit border-zinc-600 text-zinc-300 bg-zinc-800/50"
            >
              <Sparkles className="h-3 w-3 mr-1" /> New Collection
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Discover Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Perfect Style
              </span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-md leading-relaxed">
              Curated essentials for the modern lifestyle. Premium quality,
              thoughtful design, delivered to your door.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Button
                size="lg"
                className="bg-white text-zinc-900 hover:bg-zinc-200"
                onClick={() => navigate({ to: "/ecommerce/store/products" })}
              >
                Shop Now <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate({ to: "/ecommerce/store/categories" })}
              >
                Browse Categories
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Truck, label: "Free Shipping", desc: "Orders over $50" },
            { icon: RotateCcw, label: "Easy Returns", desc: "30-day returns" },
            { icon: Shield, label: "Secure Checkout", desc: "SSL encrypted" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-lg border bg-card p-4"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Shop by Category
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Find exactly what you need
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/ecommerce/store/categories" })}
            >
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.slice(0, 4).map((cat: any) => (
              <Card
                key={cat.id}
                className="group cursor-pointer border-0 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 hover:shadow-lg transition-all duration-300"
                onClick={() =>
                  navigate({
                    to: "/ecommerce/store/categories/$id",
                    params: { id: cat.id },
                  })
                }
              >
                <CardContent className="p-6 text-center space-y-2">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <span className="text-lg">📁</span>
                  </div>
                  <p className="font-semibold">{cat.name}</p>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {cat.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Trending Now</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Most popular products this week
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/ecommerce/store/products" })}
          >
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No products yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {products.map((p: any) => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  title: p.title,
                  handle: p.handle ?? p.id,
                  price: p.price ?? 0,
                  compareAtPrice: p.compareAtPrice,
                  imageUrl: p.imageUrl,
                  isAvailable: true,
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background border p-8 sm:p-12 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to Upgrade Your Style?
          </h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Join thousands of happy customers. Free shipping on your first
            order.
          </p>
          <Button size="lg" onClick={() => navigate({ to: "/ecommerce/store/products" })}>
            Start Shopping <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}

export const ecommerceStorefrontIndexRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: "/",
  component: StorefrontHome,
});

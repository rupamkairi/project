import { createRoute, useParams } from "@tanstack/react-router";
import { ecommerceStorefrontLayoutRoute } from "./store.layout";
import { useState } from "react";
import { Button, Badge, Skeleton, Separator } from "@projectx/ui";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "../stores/cart";
import { ecommerceStorefrontApi } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { ArrowLeft, ShoppingCart, Heart, Share2, Minus, Plus, Check, Truck, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";

function StorefrontProductDetail() {
  const { id } = useParams({ from: ecoStoreProductDetailRoute });
  const addItem = useCartStore((s) => s.addItem);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["store-product", id],
    queryFn: () => ecommerceStorefrontApi.getProduct(id),
  });

  const product = data?.data;
  const variant = product?.variants?.[0];

  const handleAdd = () => {
    addItem({ variantId: variant?.id ?? product.id, productTitle: product.title, variantTitle: variant?.title ?? "", unitPrice: product.price ?? 0, qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (isLoading) return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Skeleton className="h-4 w-32 mb-6" />
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-6 w-1/4" /><Skeleton className="h-20 w-full" /></div>
      </div>
    </div>
  );
  if (!product) return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
      <p className="text-lg text-muted-foreground">Product not found</p>
      <Button variant="outline" className="mt-4" asChild><Link to="/ecommerce/store/products">Back to Products</Link></Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/ecommerce/store/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center overflow-hidden">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl text-zinc-300 dark:text-zinc-700">✦</span>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            {product.category && (
              <Badge variant="secondary" className="mb-2">{product.category}</Badge>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{product.title}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatCurrency(product.price)}</span>
            {product.compareAtPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatCurrency(product.compareAtPrice)}</span>
                <Badge className="bg-red-500 text-white border-0">
                  -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
                </Badge>
              </>
            )}
          </div>

          <Separator />

          <p className="text-sm text-muted-foreground leading-relaxed">
            {product.description ?? "No description available."}
          </p>

          {product.variants?.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Variants</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v: any) => (
                  <Badge key={v.id} variant="outline" className="px-3 py-1 cursor-pointer hover:bg-accent">
                    {v.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded-lg">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => setQty(Math.max(1, qty - 1))}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-10 text-center text-sm font-medium">{qty}</span>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => setQty(qty + 1)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button size="lg" className="flex-1 h-12 text-base" onClick={handleAdd} disabled={added}>
              {added ? <><Check className="h-5 w-5 mr-2" /> Added!</> : <><ShoppingCart className="h-5 w-5 mr-2" /> Add to Cart</>}
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12">
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" /> Free shipping on orders over {formatCurrency(5000)}</div>
            <div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-muted-foreground" /> Easy 30-day returns</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ecoStoreProductDetailRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: "/products/$id",
  component: StorefrontProductDetail,
});

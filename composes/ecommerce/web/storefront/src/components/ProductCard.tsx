import { Link } from "@tanstack/react-router";
import { Button, Badge } from "@projectx/ui";
import { formatCurrency } from "../lib/format";
import { ShoppingCart } from "lucide-react";

interface ProductCardProduct {
  id: string;
  title: string;
  handle: string;
  price: number;
  compareAtPrice?: number;
  imageUrl?: string;
  category?: string;
  isAvailable: boolean;
}

interface ProductCardProps {
  product: ProductCardProduct;
  onAddToCart?: (variantId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : null;

  return (
    <div className="group relative">
      <Link to="/ecommerce/store/products/$id" params={{ id: product.id }} className="block">
        <div className="aspect-square rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative mb-3">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-600 text-5xl bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900">
              <span>✦</span>
            </div>
          )}
          {discount && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white border-0 text-[10px] px-1.5 py-0">
              -{discount}%
            </Badge>
          )}
          {!product.isAvailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xs font-medium px-3 py-1 rounded-full bg-black/60">Out of Stock</span>
            </div>
          )}
        </div>
      </Link>
      <div className="space-y-1 px-0.5">
        <Link to="/ecommerce/store/products/$id" params={{ id: product.id }}>
          <p className="text-sm font-medium line-clamp-1 hover:text-primary transition-colors">{product.title}</p>
        </Link>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold">{formatCurrency(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.compareAtPrice)}</span>
          )}
        </div>
        {onAddToCart && (
          <Button variant="outline" size="sm" className="w-full mt-2 h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onAddToCart(product.id)}>
            <ShoppingCart className="h-3 w-3 mr-1" /> Add to Cart
          </Button>
        )}
      </div>
    </div>
  );
}

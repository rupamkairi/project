# Phase 17 — Storefront: Home, Catalog & PDP

---

## Home Page — `routes/index.tsx`

Route path: `/store` (layout parent) → `/store/` (index route)

```
┌─ Hero Banner ──────────────────────────────────────────────────┐
│  Full-width image or gradient                                    │
│  H1 headline + subtext + [Shop Now] CTA                        │
│  Background: `bg-gradient-to-br from-zinc-900 to-zinc-700`      │
└────────────────────────────────────────────────────────────────┘

┌─ Featured Categories ──────────────────────────────────────────┐
│  Grid 2-4 cols: category image card + name                      │
│  → navigates to /store/categories/:id                           │
└────────────────────────────────────────────────────────────────┘

┌─ Trending Products ────────────────────────────────────────────┐
│  H2 "Trending Now" + [View All →] link                         │
│  Horizontal scroll row: ProductCard × 6                         │
└────────────────────────────────────────────────────────────────┘

┌─ Promotional Banner ───────────────────────────────────────────┐
│  Full-width accent bg + "Free shipping on orders over $50"      │
└────────────────────────────────────────────────────────────────┘
```

Data:
- `ecommerceStoreApi.getCategories()` — top 4 categories
- `ecommerceStoreApi.getProducts({ limit: 6, sort: "popularity" })` — trending

All products/categories are loaded client-side via TanStack Query, not SSR.

---

## ProductCard Component — `components/ProductCard.tsx`

Used on Home, PLP, search results everywhere.

```typescript
interface ProductCardProps {
  product: {
    id: string;
    title: string;
    handle: string;
    price: number;          // cheapest variant price
    compareAtPrice?: number;
    imageUrl?: string;
    category?: string;
    isAvailable: boolean;
  };
  onAddToCart?: (variantId: string) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Link to="/store/products/$handle" params={{ handle: product.handle }}>
      <div className="group rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="aspect-square bg-zinc-100 relative overflow-hidden">
          {product.imageUrl
            ? <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            : <div className="w-full h-full flex items-center justify-center text-zinc-300 text-4xl">📦</div>
          }
          {!product.isAvailable && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-sm font-medium">Out of stock</span>
            </div>
          )}
        </div>
        {/* Info */}
        <div className="p-3 space-y-1">
          <p className="text-sm font-medium line-clamp-2">{product.title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{formatCurrency(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.compareAtPrice)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
```

`formatCurrency(priceInCents)` → `"$49.99"` — convert from cents.

---

## Product Listing Page (PLP) — `routes/products/index.tsx`

Route path: `/store/products`

```
┌─ Layout: sidebar + main ───────────────────────────────────────┐
│                                                                  │
│  ┌─ Sidebar (w-64) ──────┐  ┌─ Main ─────────────────────────┐│
│  │ Filters               │  │ Sort: [Newest ▼] (18 products) ││
│  │ ─────────────────── │  │                                  ││
│  │ Category              │  │ Grid 2-4 cols (responsive)      ││
│  │ ☐ Footwear (12)       │  │ ProductCard ProductCard ...     ││
│  │ ☑ Accessories (6)     │  │                                 ││
│  │                       │  │ [Load more] or pagination       ││
│  │ Price Range           │  └─────────────────────────────────┘│
│  │ $0 ────●──── $500     │                                      │
│  │                       │                                      │
│  │ Availability          │                                      │
│  │ ☑ In stock only       │                                      │
│  │                       │                                      │
│  │ [Clear filters]       │                                      │
│  └───────────────────────┘                                      │
└────────────────────────────────────────────────────────────────┘
```

Data: `ecommerceStoreApi.getProducts({ categoryId, minPrice, maxPrice, inStock, sort, page })`

Sort options: Newest | Price: Low to High | Price: High to Low | Popularity

Price range: two number inputs or a range slider. Debounce 500ms before re-fetching.

Mobile: sidebar collapses into a bottom sheet or drawer (Filters button).

---

## Category Page — `routes/categories/$id.tsx`

Same layout as PLP but pre-filtered to category. Header shows category name + description.

Route: `/store/categories/:id`

Data:
1. `ecommerceStoreApi.getCategory(id)` — name, description
2. `ecommerceStoreApi.getProducts({ categoryId: id, ...filterParams })`

---

## Product Detail Page (PDP) — `routes/products/detail.tsx`

Route: `/store/products/:handle`

```
┌─ Breadcrumb: Home > Footwear > Sneaker X ──────────────────────┐
│                                                                  │
│  ┌─ Gallery (left 55%) ──────┐  ┌─ Info (right 45%) ──────────┐│
│  │ Main image (aspect-4/3)  │  │ H1: Sneaker X               ││
│  │                           │  │ Category: Footwear           ││
│  │ [prev] [next] thumbnails  │  │                              ││
│  └───────────────────────────┘  │ $49.99  ~~$69.99~~  Save 28%││
│                                 │                              ││
│                                 │ VariantSelector              ││
│                                 │ [Color: Red ▼] [Size: M ▼]   ││
│                                 │                              ││
│                                 │ Stock: ● 12 in stock         ││
│                                 │                              ││
│                                 │ Qty: [- 1 +]                ││
│                                 │                              ││
│                                 │ [Add to Cart ─────────────] ││
│                                 │                              ││
│                                 │ Description block            ││
│                                 └──────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

Data: `ecommerceStoreApi.getProductByHandle(handle)` — returns product + variants.

### Gallery

```typescript
function ProductGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] rounded-lg overflow-hidden bg-zinc-100">
        <img src={images[active]} className="w-full h-full object-cover" />
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {images.map((src, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={cn("h-16 w-16 rounded border-2 overflow-hidden flex-shrink-0",
              i === active ? "border-primary" : "border-transparent")}>
            <img src={src} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
```

If no images: show placeholder `📦` emoji box.

### VariantSelector

```typescript
function VariantSelector({ variants, selected, onSelect }: {
  variants: EcoVariant[];
  selected: string | null;
  onSelect: (variantId: string) => void;
}) {
  // Group unique option keys: { color: ["Red","Blue"], size: ["S","M","L"] }
  const optionGroups = groupVariantOptions(variants);

  return (
    <div className="space-y-3">
      {Object.entries(optionGroups).map(([key, values]) => (
        <div key={key}>
          <p className="text-sm font-medium capitalize mb-1">{key}</p>
          <div className="flex flex-wrap gap-2">
            {values.map(val => {
              const variant = variants.find(v => v.options[key] === val);
              const isSelected = variant?.id === selected;
              const outOfStock = variant?.stockQty === 0;
              return (
                <button key={val}
                  disabled={outOfStock}
                  onClick={() => variant && onSelect(variant.id)}
                  className={cn(
                    "px-3 py-1 text-sm rounded border",
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
                    outOfStock ? "opacity-40 cursor-not-allowed line-through" : ""
                  )}>
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Add to Cart flow

1. User selects variant + quantity
2. Click "Add to Cart"
3. If no `cartId` in store: `ecommerceStoreApi.createCart(defaultRegionId)` → store `cartId`
4. `ecommerceStoreApi.addToCart(cartId, variantId, qty)` → sync response back to cart store
5. Update `useCartStore.addItem(...)` — optimistic local update
6. Toast: "Added to cart" with [View Cart] link

Default `regionId`: store first region from a `useQuery(() => ecommerceStoreApi.getRegions())` called at layout level.

---

## Search Page — `routes/search.tsx`

Route: `/store/search?q=...`

```
┌─ "Results for 'sneaker'" (18 results) ─────────────────────────┐
├─ Same grid + filter sidebar as PLP ─────────────────────────── ┤
└────────────────────────────────────────────────────────────────┘
```

Data: `ecommerceStoreApi.searchProducts(q, { page, categoryId })` — wraps `GET /ecommerce/store/search`.

Auto-focus search input on mount. Debounce 300ms on query param change.

---

## Checks

- Home page loads categories + trending products
- ProductCard shows out-of-stock overlay for zero-stock variants
- PLP filter by category + price + stock works (separate requests per filter change)
- PDP: selecting color=Red + size=M activates that variant's price + stock
- Add to Cart: item appears in cart store, cart badge count increments
- Search page returns results matching query

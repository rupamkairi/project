import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockCategories } from "@/lib/mock-data";
import { Plus, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/categories/",
  component: CategoriesPage,
});

function CategoriesPage() {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize your products into categories"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Category Tree</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockCategories.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                expanded={expandedCategories.includes(category.id)}
                onToggle={() => toggleExpand(category.id)}
                level={0}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryItem({
  category,
  expanded,
  onToggle,
  level,
}: {
  category: (typeof mockCategories)[0];
  expanded: boolean;
  onToggle: () => void;
  level: number;
}) {
  const hasChildren = category.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        <div className="flex items-center gap-2">
          {hasChildren && (
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
              />
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          <span className="font-medium">{category.name}</span>
          <Badge variant="outline">{category.productCount} products</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {category.children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              expanded={false}
              onToggle={() => {}}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

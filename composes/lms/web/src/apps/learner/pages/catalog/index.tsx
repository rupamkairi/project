import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { Input, Button, cn } from "@projectx/ui"
import { Search } from "lucide-react"
import { CourseCard } from "../../../../components/shared/CourseCard"

interface CatalogFilters {
  search?: string
  level?: string
  categoryId?: string
  page?: number
}

function buildQueryString(filters: CatalogFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.level) params.set("level", filters.level)
  if (filters.categoryId) params.set("categoryId", filters.categoryId)
  if (filters.page) params.set("page", String(filters.page))
  return params.toString()
}

const LEVELS = ["beginner", "intermediate", "advanced", "all"]

export function CatalogPage() {
  const [filters, setFilters] = useState<CatalogFilters>({})
  const [searchInput, setSearchInput] = useState("")

  const { data } = useQuery({
    queryKey: ["catalog", filters],
    queryFn: () => lmsApi.get<any>(`/courses?${buildQueryString(filters)}`),
  })

  const courses = data?.courses ?? []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Course Catalog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse available courses
        </p>
      </div>

      <div className="flex gap-6">
        <aside className="w-56 shrink-0 space-y-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 h-8"
            />
          </form>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Level
            </p>
            <div className="space-y-1">
              {LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      level: f.level === level ? undefined : level,
                      page: 1,
                    }))
                  }
                  className={cn(
                    "w-full text-left text-sm px-2 py-1 rounded transition-colors",
                    filters.level === level
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          {courses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No courses found
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {courses.map((course: any) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}

          {data?.total > 12 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={!data?.previousPage}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))
                }
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {filters.page ?? 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!data?.nextPage}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))
                }
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

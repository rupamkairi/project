import { Card, CardContent } from "@projectx/ui"
import { useNavigate } from "@tanstack/react-router"
import { PriceDisplay } from "./PriceDisplay"

interface CourseCardCourse {
  id: string
  slug: string
  title: string
  thumbnailUrl?: string | null
  instructorName?: string
  rating?: number | null
  reviewCount?: number
  price?: number | string | null
  currency?: string
  level?: string
  enrolledCount?: number
}

interface CourseCardProps {
  course: CourseCardCourse
}

export function CourseCard({ course }: CourseCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate({ to: `/lms/learn/courses/${course.slug}` })}
    >
      <div className="aspect-video bg-muted overflow-hidden">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <p className="font-medium line-clamp-2 text-sm">{course.title}</p>
        {course.instructorName && (
          <p className="text-xs text-muted-foreground">{course.instructorName}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-amber-500">★</span>
            <span>{course.rating?.toFixed(1) ?? "—"}</span>
            <span className="text-muted-foreground">
              ({course.reviewCount ?? 0})
            </span>
          </div>
          <PriceDisplay amount={course.price} currency={course.currency} />
        </div>
      </CardContent>
    </Card>
  )
}

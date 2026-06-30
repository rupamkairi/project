import { Card, CardContent, Progress, cn } from "@projectx/ui";
import { useNavigate } from "@tanstack/react-router";

interface CourseProgressCardProps {
  enrollment: {
    id: string;
    courseSlug: string;
    courseTitle: string;
    completionPct: number;
    thumbnailUrl?: string;
  };
}

export function CourseProgressCard({ enrollment }: CourseProgressCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => navigate({ to: `/lms/learn/courses/${enrollment.courseSlug}/continue` })}
    >
      <CardContent className="flex items-center gap-4 p-3">
        {enrollment.thumbnailUrl && (
          <div className="w-16 h-9 rounded overflow-hidden shrink-0 bg-muted">
            <img
              src={enrollment.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{enrollment.courseTitle}</p>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={enrollment.completionPct} className="flex-1 h-1.5" />
            <span className="text-xs text-muted-foreground tabular-nums">
              {enrollment.completionPct}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

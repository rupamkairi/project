import { createRoute } from "@tanstack/react-router";
import { Route as lmsLayoutRoute } from "../layout";
import { PageHeader } from "../../components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { mockCourses } from "../../lib/mock-data";
import { CourseStatusBadge } from "../../components/shared/status-badge";
import { Link } from "@tanstack/react-router";
import { BookOpen, Users, Star, DollarSign, ArrowLeft } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => lmsLayoutRoute,
  path: "/courses/$courseId",
  component: CourseDetail,
});

function CourseDetail() {
  const { courseId } = Route.useParams();
  const course = mockCourses.find((c) => c.id === courseId);

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Course not found</p>
        <Link to="/lms/courses">
          <Button variant="link">Back to courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={course.title}
        description={`by ${course.instructor.name}`}
      >
        <Link to="/lms/courses">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Description
                </p>
                <p className="mt-1">{course.description || "No description"}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Category
                  </p>
                  <p className="mt-1">{course.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Level
                  </p>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {course.level}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Slug
                  </p>
                  <p className="mt-1 font-mono text-sm">{course.slug}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <div className="mt-1">
                    <CourseStatusBadge status={course.status} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Modules ({course.moduleCount})</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This course has {course.moduleCount} modules.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Enrolled</span>
                </div>
                <span className="font-semibold">{course.enrolledCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Rating</span>
                </div>
                <span className="font-semibold">
                  {course.rating > 0 ? course.rating.toFixed(1) : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Reviews</span>
                </div>
                <span className="font-semibold">{course.reviewCount}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Price</span>
                </div>
                <span className="font-semibold">
                  {course.price > 0 ? `$${course.price}` : "Free"}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Instructor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  {course.instructor.name[0]}
                </div>
                <div>
                  <p className="font-medium">{course.instructor.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {course.instructor.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {course.status === "under-review" && (
                <>
                  <Button className="w-full" variant="default">
                    Approve & Publish
                  </Button>
                  <Button className="w-full" variant="destructive">
                    Reject
                  </Button>
                </>
              )}
              {course.status === "published" && (
                <Button className="w-full" variant="outline">
                  Archive Course
                </Button>
              )}
              {course.status === "draft" && (
                <p className="text-sm text-muted-foreground">
                  Course is still in draft. Waiting for instructor to submit for
                  review.
                </p>
              )}
              {course.status === "archived" && (
                <p className="text-sm text-muted-foreground">
                  This course has been archived.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

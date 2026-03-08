import { createRoute } from "@tanstack/react-router";
import { Route as lmsLayoutRoute } from "../layout";
import { PageHeader } from "../../components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { mockLearners, mockEnrollments } from "../../lib/mock-data";
import {
  LearnerStatusBadge,
  EnrollmentStatusBadge,
} from "../../components/shared/status-badge";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Award, Mail } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createRoute({
  getParentRoute: () => lmsLayoutRoute,
  path: "/learners/$learnerId",
  component: LearnerDetail,
});

function LearnerDetail() {
  const { learnerId } = Route.useParams();
  const learner = mockLearners.find((l) => l.id === learnerId);
  const learnerEnrollments = mockEnrollments.filter(
    (e) => e.learnerId === learnerId,
  );

  if (!learner) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Learner not found</p>
        <Link to="/lms/learners">
          <Button variant="link">Back to learners</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={learner.name} description={learner.email}>
        <Link to="/lms/learners">
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
              <CardTitle>Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              {learnerEnrollments.length === 0 ? (
                <p className="text-muted-foreground">No enrollments yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Enrolled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {learnerEnrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-medium">
                          {enrollment.course.title}
                        </TableCell>
                        <TableCell>
                          <EnrollmentStatusBadge status={enrollment.status} />
                        </TableCell>
                        <TableCell>{enrollment.completionPct}%</TableCell>
                        <TableCell>
                          {format(
                            new Date(enrollment.enrolledAt),
                            "MMM d, yyyy",
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
                  {learner.name[0]}
                </div>
                <div>
                  <p className="font-semibold">{learner.name}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {learner.email}
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Status
                </p>
                <div className="mt-1">
                  <LearnerStatusBadge status={learner.status} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Joined
                </p>
                <p className="mt-1">
                  {format(new Date(learner.joinedAt), "MMMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Enrolled Courses</span>
                </div>
                <span className="font-semibold">
                  {learner.enrolledCourseCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Completed</span>
                </div>
                <span className="font-semibold">
                  {learner.completedCourses}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Certificates</span>
                </div>
                <span className="font-semibold">
                  {learner.certificatesEarned}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {learner.status === "active" ? (
                <Button variant="destructive" className="w-full">
                  Suspend Learner
                </Button>
              ) : (
                <Button variant="default" className="w-full">
                  Reactivate Learner
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

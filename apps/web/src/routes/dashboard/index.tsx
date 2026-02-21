import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../__dashboard";
import { KPICard } from "@/components/lms/kpi-card";
import {
  mockDashboardKPIs,
  mockRevenueData,
  mockCourses,
  mockInstructors,
} from "@/lib/mock-data";
import {
  Users,
  BookOpen,
  ShoppingCart,
  DollarSign,
  Award,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@tanstack/react-router";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/",
  component: DashboardIndex,
});

function DashboardIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Platform overview and key metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Active Learners"
          value={mockDashboardKPIs.totalActiveLearners.toLocaleString()}
          icon={Users}
          change="+12%"
          changeType="positive"
        />
        <KPICard
          title="Published Courses"
          value={mockDashboardKPIs.totalCourses.toString()}
          icon={BookOpen}
          change="+3"
          changeType="positive"
        />
        <KPICard
          title="Enrollments (This Month)"
          value={mockDashboardKPIs.enrollmentsThisMonth.toString()}
          icon={ShoppingCart}
          change="+18%"
          changeType="positive"
        />
        <KPICard
          title="Revenue (This Month)"
          value={`$${mockDashboardKPIs.revenueThisMonth.toLocaleString()}`}
          icon={DollarSign}
          change="+8%"
          changeType="positive"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Completion Rate"
          value={`${mockDashboardKPIs.completionRate}%`}
          icon={TrendingUp}
        />
        <KPICard
          title="Certificates Issued"
          value={mockDashboardKPIs.certificatesIssued.toString()}
          icon={Award}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="realized"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.6}
                    name="Realized"
                  />
                  <Area
                    type="monotone"
                    dataKey="deferred"
                    stroke="#eab308"
                    fill="#eab308"
                    fillOpacity={0.6}
                    name="Deferred"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Courses by Enrollment</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Enrolled</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCourses
                  .filter((c) => c.enrolledCount > 0)
                  .sort((a, b) => b.enrolledCount - a.enrolledCount)
                  .slice(0, 5)
                  .map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <Link
                          to="/dashboard/courses/$courseId"
                          params={{ courseId: course.id }}
                          className="font-medium hover:underline"
                        >
                          {course.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        {course.enrolledCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {course.rating > 0 ? course.rating.toFixed(1) : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Instructors by Completion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instructor</TableHead>
                <TableHead className="text-right">Active Courses</TableHead>
                <TableHead className="text-right">Total Enrolled</TableHead>
                <TableHead className="text-right">Completion Rate</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockInstructors
                .sort((a, b) => b.avgCompletionRate - a.avgCompletionRate)
                .slice(0, 5)
                .map((instructor) => (
                  <TableRow key={instructor.id}>
                    <TableCell className="font-medium">
                      {instructor.name}
                    </TableCell>
                    <TableCell className="text-right">
                      {instructor.activeCourses}
                    </TableCell>
                    <TableCell className="text-right">
                      {instructor.totalEnrolled}
                    </TableCell>
                    <TableCell className="text-right">
                      {instructor.avgCompletionRate}%
                    </TableCell>
                    <TableCell className="text-right">
                      ${instructor.totalRevenue.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

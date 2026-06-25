import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { Button, StatusBadge } from "@projectx/ui"
import { AmountDisplay, formatDate } from "../../../../components/shared/PriceDisplay"

export function AdminInstructorsPage() {
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ["admin-instructors"],
    queryFn: () => lmsApi.get<any>("/admin/instructors"),
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      lmsApi.patch(`/admin/instructors/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-instructors"] }),
  })

  const instructors = data?.instructors ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Instructors</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage platform instructors
        </p>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Courses</th>
              <th className="text-left p-3 font-medium">Students</th>
              <th className="text-left p-3 font-medium">Revenue</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Joined</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {instructors.map((i: any) => (
              <tr key={i.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-medium">{i.name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{i.email}</td>
                <td className="p-3">{i.courseCount ?? 0}</td>
                <td className="p-3">{i.totalStudents ?? 0}</td>
                <td className="p-3">
                  <AmountDisplay amount={i.totalRevenue} />
                </td>
                <td className="p-3">
                  <StatusBadge
                    status={i.isActive ? "active" : "inactive"}
                  />
                </td>
                <td className="p-3 text-muted-foreground">
                  {formatDate(i.createdAt)}
                </td>
                <td className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggleStatus.mutate({
                        id: i.id,
                        isActive: !i.isActive,
                      })
                    }
                  >
                    {i.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

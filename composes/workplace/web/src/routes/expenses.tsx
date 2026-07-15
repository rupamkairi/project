import { createRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Route as WorkplaceLayoutRoute } from './layout'
import { useWorkplaceStore } from '../stores/index'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/expenses',
  component: ExpensesPage,
})

function ExpensesPage() {
  const { expenseClaims, loading, fetchExpenseClaims } = useWorkplaceStore()

  useEffect(() => {
    fetchExpenseClaims()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Expenses</h1>

      <Card>
        <CardHeader>
          <CardTitle>Expense Claims</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : expenseClaims.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expense claims.</p>
          ) : (
            <div className="divide-y">
              {expenseClaims.map((claim: any) => (
                <div key={claim.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{claim.title}</p>
                    <p className="text-xs text-muted-foreground">{claim.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium">
                      ₹{Number(claim.totalAmount).toLocaleString()}
                    </p>
                    <Badge variant={claim.status === 'approved' ? 'default' : 'secondary'}>
                      {claim.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

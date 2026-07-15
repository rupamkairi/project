import { createRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Route as WorkplaceLayoutRoute } from './layout'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@projectx/ui'
import { workplaceApi } from '../lib/api/index'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/settings',
  component: SettingsPage,
})

function SettingsPage() {
  const [setupStatus, setSetupStatus] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<string>('wizard')

  useEffect(() => {
    workplaceApi.settings.get().then((res: any) => {
      if (res.data) setSetupStatus(res.data.settings)
    })
  }, [])

  const handleBootstrap = async () => {
    const defaultConfig = {
      departments: [
        { name: 'Management', code: 'MGMT' },
        { name: 'Finance & Accounts', code: 'FIN' },
        { name: 'Human Resources', code: 'HR' },
        { name: 'Sales & Marketing', code: 'SALES' },
        { name: 'Operations', code: 'OPS' },
        { name: 'Information Technology', code: 'IT' },
      ],
      positions: [
        { name: 'CEO', level: 10, departmentId: null, isHead: true },
        { name: 'Department Head', level: 8, departmentId: null, isHead: true },
        { name: 'Manager', level: 7, departmentId: null },
        { name: 'Team Lead', level: 6, departmentId: null },
        { name: 'Senior', level: 5, departmentId: null },
        { name: 'Junior', level: 3, departmentId: null },
      ],
      leaveTypes: [
        {
          name: 'Annual Leave',
          code: 'AL',
          maxDays: 21,
          isPaid: true,
          isCarryForward: true,
          maxCarryForward: 10,
        },
        { name: 'Sick Leave', code: 'SL', maxDays: 12, isPaid: true },
        { name: 'Casual Leave', code: 'CL', maxDays: 7, isPaid: true },
        {
          name: 'Maternity Leave',
          code: 'ML',
          maxDays: 180,
          isPaid: true,
          requiresDocuments: true,
        },
        { name: 'Paternity Leave', code: 'PL', maxDays: 15, isPaid: true },
        { name: 'Unpaid Leave', code: 'LOP', maxDays: 0, isPaid: false },
      ],
      shifts: [
        {
          name: 'General',
          startTime: '09:00',
          endTime: '17:00',
          breakMinutes: 60,
          color: '#3b82f6',
        },
        {
          name: 'Morning',
          startTime: '06:00',
          endTime: '14:00',
          breakMinutes: 60,
          color: '#f59e0b',
        },
        {
          name: 'Evening',
          startTime: '14:00',
          endTime: '22:00',
          breakMinutes: 60,
          color: '#8b5cf6',
        },
      ],
      salaryStructure: {
        name: 'Standard',
        components: {
          earnings: [
            { name: 'Basic', type: 'formula', formula: 'ctc * 0.5' },
            { name: 'HRA', type: 'percentage', basisOf: 'Basic', rate: 40 },
            { name: 'Conveyance', type: 'fixed', value: 1600 },
            { name: 'Medical', type: 'fixed', value: 1250 },
            {
              name: 'Special Allowance',
              type: 'formula',
              formula: 'gross - (Basic + HRA + Conveyance + Medical)',
            },
          ],
          deductions: [
            { name: 'Employee PF', type: 'percentage', basisOf: 'Basic', rate: 12 },
            { name: 'Professional Tax', type: 'fixed', value: 200 },
          ],
        },
      },
      policies: [
        { title: 'Code of Conduct', category: 'governance' },
        { title: 'Leave Policy', category: 'hr' },
        { title: 'IT & Security Policy', category: 'it' },
        { title: 'Travel & Expense Policy', category: 'finance' },
        { title: 'Anti-Harassment Policy', category: 'governance' },
      ],
      rooms: [
        { name: 'Conference Room A', floor: '1st', capacity: 12 },
        { name: 'Conference Room B', floor: '1st', capacity: 8 },
        { name: 'Meeting Room 1', floor: '2nd', capacity: 4 },
        { name: 'Meeting Room 2', floor: '2nd', capacity: 4 },
        { name: 'Board Room', floor: '3rd', capacity: 20 },
        { name: 'Interview Room', floor: '1st', capacity: 3 },
      ],
    }

    const res = await (workplaceApi as any).settings.bootstrap(defaultConfig)
    if (res.data) {
      setSetupStatus({ modules: ['all'] })
    }
  }

  const tabs = [
    { key: 'wizard', label: 'Setup Wizard' },
    { key: 'organization', label: 'Organization' },
    { key: 'leave', label: 'Leave Policy' },
    { key: 'payroll', label: 'Payroll Config' },
    { key: 'shifts', label: 'Shifts' },
    { key: 'policies', label: 'Office Policies' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 text-sm rounded-t-md whitespace-nowrap ${
              activeTab === t.key
                ? 'border-b-2 border-primary font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'wizard' && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bootstrap your workplace with default departments, positions, leave types, shifts,
              payroll structure, policies, and meeting rooms.
            </p>
            <Button onClick={handleBootstrap}>Run Quick Setup</Button>
            {setupStatus && (
              <div className="mt-4">
                <Badge variant="default">Setup complete</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'organization' && (
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage departments, positions, and locations.
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'leave' && (
        <Card>
          <CardHeader>
            <CardTitle>Leave Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure leave types, accrual rules, and carry-forward policy.
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'payroll' && (
        <Card>
          <CardHeader>
            <CardTitle>Payroll Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage pay components, salary structures, and payroll frequency.
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'shifts' && (
        <Card>
          <CardHeader>
            <CardTitle>Work Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define work shift timings and assign employees.
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'policies' && (
        <Card>
          <CardHeader>
            <CardTitle>Office Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Create and publish workplace policies.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

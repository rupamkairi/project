import { createRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Route as projectLayoutRoute } from './layout'
import { projectManagementApi } from '../lib/api'
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Skeleton, Badge } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/boards',
  component: BoardsPage,
})

function BoardsPage() {
  const [boards, setBoards] = useState<any[]>([])
  const [selectedBoard, setSelectedBoard] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await projectManagementApi.getBoards()
      if (res.data) {
        const boardList = res.data.data ?? []
        setBoards(boardList)
        if (boardList.length > 0) {
          const boardDetail = await projectManagementApi.getBoard(boardList[0].id)
          if (boardDetail.data) setSelectedBoard(boardDetail.data)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSelectBoard = async (boardId: string) => {
    const res = await projectManagementApi.getBoard(boardId)
    if (res.data) setSelectedBoard(res.data)
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Boards" description="Scrum and Kanban boards" />

      {boards.length > 0 && (
        <div className="flex gap-2">
          {boards.map((b) => (
            <button
              key={b.id}
              onClick={() => handleSelectBoard(b.id)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                selectedBoard?.id === b.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-accent'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : selectedBoard?.columns ? (
        <div className="grid grid-cols-5 gap-4 overflow-x-auto">
          {selectedBoard.columns.map((col: any) => (
            <Card key={col.id} className="min-w-[240px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold flex items-center justify-between">
                  {col.name}
                  <Badge variant="secondary" className="text-xs">
                    {col.items?.length ?? 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(col.items ?? []).map((item: any) => (
                  <Card key={item.id} className="p-3">
                    <p className="text-xs text-muted-foreground">{item.ref}</p>
                    <p className="text-sm font-medium">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {item.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {item.priority}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">No boards found</p>
      )}
    </div>
  )
}

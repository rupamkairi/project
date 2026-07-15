import Elysia from 'elysia'

export function createWsRoutes() {
  return new Elysia().ws('/ws/pos/:outletId', {
    open(ws: any) {
      const { outletId } = ws.data?.params ?? {}
      if (outletId) ws.subscribe(`pos:${outletId}`)
    },
    close(ws: any) {
      const { outletId } = ws.data?.params ?? {}
      if (outletId) ws.unsubscribe(`pos:${outletId}`)
    },
    message() {},
  })
}

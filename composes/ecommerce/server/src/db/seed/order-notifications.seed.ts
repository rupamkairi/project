import { db } from '@db/client'
import { ntfTemplates } from '@db/schema/notification'

const ORDER_TEMPLATES = [
  {
    key: 'order.placed',
    subject: 'Order {{orderId}} confirmed',
    body: 'Thanks — order {{orderId}} ({{grandTotal}} {{currency}}) is confirmed.',
  },
  {
    key: 'order.confirmed',
    subject: 'Payment received for {{orderId}}',
    body: 'Payment {{gatewayRef}} received for order {{orderId}}.',
  },
  {
    key: 'order.cancelled',
    subject: 'Order {{orderId}} cancelled',
    body: 'Order {{orderId}} was cancelled and any holds released.',
  },
  {
    key: 'payment.failed',
    subject: 'Payment needs attention for {{orderId}}',
    body: 'Payment for order {{orderId}} failed — your cart is kept so you can retry.',
  },
  {
    key: 'order.refunded',
    subject: 'Refund issued for {{orderId}}',
    body: 'Refund {{refundId}} was issued for order {{orderId}}.',
  },
]

export async function seedOrderNotificationTemplates(orgId: string) {
  console.log('Seeding order notification templates...')
  const now = new Date()
  const rows = await db
    .insert(ntfTemplates)
    .values(
      ORDER_TEMPLATES.map((t) => ({
        ...t,
        id: `eco_tpl_${t.key.replace(/\./g, '_')}`,
        organizationId: orgId,
        channel: 'email' as const,
        locale: 'en',
        isSystem: true,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
        deletedAt: null,
      })),
    )
    .onConflictDoNothing()
    .returning()
  console.log(
    'Seeded order notification templates:',
    rows.map((r) => r.key),
  )
  return rows
}

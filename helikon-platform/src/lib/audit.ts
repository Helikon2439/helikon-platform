import { db } from './supabase'

interface AuditParams {
  tenantId: string
  actorId: string
  entityType: string
  entityId: string
  action: string
  previousState?: Record<string, unknown>
  newState?: Record<string, unknown>
  notes?: string
}

export async function writeAudit(params: AuditParams): Promise<void> {
  const { error } = await db.from('audit_log').insert({
    tenant_id: params.tenantId,
    actor_id: params.actorId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    previous_state: params.previousState ?? null,
    new_state: params.newState ?? null,
    notes: params.notes ?? null,
  })
  if (error) console.error('Audit write failed:', error)
}

export async function writeNotification(params: {
  tenantId: string
  recipientId: string
  title: string
  body: string
  type: string
  entityType?: string
  entityId?: string
}): Promise<void> {
  const { error } = await db.from('notifications').insert({
    tenant_id: params.tenantId,
    recipient_id: params.recipientId,
    title: params.title,
    body: params.body,
    type: params.type,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    is_read: false,
  })
  if (error) console.error('Notification write failed:', error)
}

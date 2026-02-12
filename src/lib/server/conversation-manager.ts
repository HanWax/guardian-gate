/**
 * Conversation state CRUD helpers.
 *
 * Each parent has at most one active conversation state row (UNIQUE on parent_id).
 * State tracks where they are in a multi-step WhatsApp flow.
 */

import { createServiceClient } from './auth'
import type { ConversationState } from './message-templates'

export interface ConversationRecord {
  id: string
  parent_id: string
  state: ConversationState
  attendance_id: string | null
  verification_attempts: number
  current_child_index: number
}

export async function getConversationState(
  parentId: string
): Promise<ConversationRecord | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('conversation_state')
    .select('id, parent_id, state, attendance_id, verification_attempts, current_child_index')
    .eq('parent_id', parentId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    parent_id: data.parent_id,
    state: (data.state ?? 'idle') as ConversationState,
    attendance_id: data.attendance_id ?? null,
    verification_attempts: data.verification_attempts ?? 0,
    current_child_index: data.current_child_index ?? 0,
  }
}

export async function setConversationState(
  parentId: string,
  state: ConversationState,
  attendanceId?: string | null
): Promise<void> {
  const supabase = createServiceClient()

  await supabase
    .from('conversation_state')
    .upsert(
      {
        parent_id: parentId,
        state,
        updated_at: new Date().toISOString(),
        verification_attempts: 0,
        attendance_id: attendanceId ?? null,
      },
      { onConflict: 'parent_id' }
    )
}

export async function incrementVerificationAttempts(
  parentId: string
): Promise<number> {
  const supabase = createServiceClient()

  const current = await getConversationState(parentId)
  const newCount = (current?.verification_attempts ?? 0) + 1

  await supabase
    .from('conversation_state')
    .update({
      verification_attempts: newCount,
      updated_at: new Date().toISOString(),
    })
    .eq('parent_id', parentId)

  return newCount
}

export async function resetConversationState(
  parentId: string
): Promise<void> {
  const supabase = createServiceClient()

  await supabase
    .from('conversation_state')
    .upsert(
      {
        parent_id: parentId,
        state: 'idle',
        attendance_id: null,
        verification_attempts: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'parent_id' }
    )
}

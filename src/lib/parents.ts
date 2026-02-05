import { z } from 'zod'
import { supabase } from './supabase'

// Types

export interface Parent {
  id: string
  phone: string
  name: string
  created_at: string
}

export interface CreateParentInput {
  name: string
  phone: string
}

export interface UpdateParentInput {
  name: string
  phone: string
}

// Phone helpers

const ISRAELI_MOBILE_REGEX = /^(\+972|0)5\d[-\s]?\d{3}[-\s]?\d{4}$/

export function normalizePhone(input: string): string {
  const digits = input.replace(/[-\s]/g, '')
  if (digits.startsWith('0')) {
    return '+972' + digits.slice(1)
  }
  return digits
}

export function formatPhoneDisplay(e164: string): string {
  // +9725XXXXXXXX → 05X-XXXXXXX
  const local = '0' + e164.slice(4) // remove +972, prepend 0
  return local.slice(0, 3) + '-' + local.slice(3)
}

// Validation schemas

export const createParentSchema = z.object({
  name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
  phone: z.string().regex(ISRAELI_MOBILE_REGEX, 'מספר טלפון לא תקין'),
})

export const updateParentSchema = z.object({
  name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
  phone: z.string().regex(ISRAELI_MOBILE_REGEX, 'מספר טלפון לא תקין'),
})

// Query helpers

export async function getParents(): Promise<Parent[]> {
  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch parents: ${error.message}`)
  }

  return data as Parent[]
}

export async function getParent(id: string): Promise<Parent> {
  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch parent: ${error.message}`)
  }

  return data as Parent
}

export async function createParent(input: CreateParentInput): Promise<Parent> {
  const { data, error } = await supabase
    .from('parents')
    .insert({ name: input.name, phone: normalizePhone(input.phone) })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create parent: ${error.message}`)
  }

  return data as Parent
}

export async function updateParent(id: string, input: UpdateParentInput): Promise<Parent> {
  const { data, error } = await supabase
    .from('parents')
    .update({ name: input.name, phone: normalizePhone(input.phone) })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update parent: ${error.message}`)
  }

  return data as Parent
}

export async function deleteParent(id: string): Promise<void> {
  const { error } = await supabase
    .from('parents')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete parent: ${error.message}`)
  }
}

import { z } from 'zod'
import { supabase } from './supabase'

// Types

export interface Child {
  id: string
  nursery_id: string
  name: string
  created_at: string
}

export interface CreateChildInput {
  name: string
  nursery_id: string
}

export interface UpdateChildInput {
  name: string
}

// Validation schemas

export const createChildSchema = z.object({
  name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
  nursery_id: z.string().uuid(),
})

export const updateChildSchema = z.object({
  name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים'),
})

// Query helpers

export async function getChildren(nurseryId: string): Promise<Child[]> {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('nursery_id', nurseryId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch children: ${error.message}`)
  }

  return data as Child[]
}

export async function getChild(id: string): Promise<Child> {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch child: ${error.message}`)
  }

  return data as Child
}

export async function createChild(input: CreateChildInput): Promise<Child> {
  const { data, error } = await supabase
    .from('children')
    .insert(input)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create child: ${error.message}`)
  }

  return data as Child
}

export async function updateChild(id: string, input: UpdateChildInput): Promise<Child> {
  const { data, error } = await supabase
    .from('children')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update child: ${error.message}`)
  }

  return data as Child
}

export async function deleteChild(id: string): Promise<void> {
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete child: ${error.message}`)
  }
}

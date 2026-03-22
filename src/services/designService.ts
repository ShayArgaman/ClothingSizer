// ============================================================
// Design Persistence — Supabase CRUD for closet designs
//
// Table: closet_designs
// ──────────────────────────────────────────────────────────
// CREATE TABLE closet_designs (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   customer_name text NOT NULL,
//   customer_phone text NOT NULL,
//   closet_config jsonb NOT NULL,
//   created_at timestamptz DEFAULT now(),
//   updated_at timestamptz DEFAULT now()
// );
// ============================================================

import { supabase } from '../lib/supabase'
import type { ClosetConfig, CustomerDetails } from '../types/closet.types'

export interface DesignRecord {
  id: string
  customer_name: string
  customer_phone: string
  closet_config: ClosetConfig
  created_at: string
  updated_at: string
}

/** Save a new design. Returns the new record ID. */
export async function saveDesign(
  customer: CustomerDetails,
  config: ClosetConfig,
): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase
    .from('closet_designs')
    .insert({
      customer_name: customer.name,
      customer_phone: customer.phone,
      closet_config: config,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/** Update an existing design. */
export async function updateDesign(
  id: string,
  customer: CustomerDetails,
  config: ClosetConfig,
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')

  const { error } = await supabase
    .from('closet_designs')
    .update({
      customer_name: customer.name,
      customer_phone: customer.phone,
      closet_config: config,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

/** Load a design by ID. */
export async function loadDesign(id: string): Promise<DesignRecord | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('closet_designs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as DesignRecord
}

/** Search designs by name or phone (partial match). */
export async function searchDesigns(query: string): Promise<DesignRecord[]> {
  if (!supabase) return []
  if (!query.trim()) return []

  const q = `%${query.trim()}%`

  const { data, error } = await supabase
    .from('closet_designs')
    .select('*')
    .or(`customer_name.ilike.${q},customer_phone.ilike.${q}`)
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error) return []
  return (data ?? []) as DesignRecord[]
}

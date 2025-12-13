/**
 * SiteLedger - Database Query Helpers
 * Centralized database queries with error handling
 */

import { supabase } from '../lib/supabase'

// =====================================================
// PROJECT QUERIES
// =====================================================

export async function getProject() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .single()

  if (error) throw error
  return data
}

// =====================================================
// WINGS, FLOORS, FLATS QUERIES
// =====================================================

export async function getWings() {
  const { data, error } = await supabase
    .from('wings')
    .select('*')
    .order('code')

  if (error) throw error
  return data
}

export async function getFloorsByWing(wingId) {
  const { data, error } = await supabase
    .from('floors')
    .select('*')
    .eq('wing_id', wingId)
    .order('floor_number')

  if (error) throw error
  return data
}

export async function getFlatsByFloor(floorId) {
  const { data, error } = await supabase
    .from('flats')
    .select('*')
    .eq('floor_id', floorId)
    .order('flat_number')

  if (error) throw error
  return data
}

export async function getFlatsComplete() {
  const { data, error } = await supabase
    .from('v_flats_complete')
    .select('*')

  if (error) throw error
  return data
}

export async function getFlatsByWing(wingCode) {
  const { data, error } = await supabase
    .from('v_flats_complete')
    .select('*')
    .eq('wing_code', wingCode)
    .order('floor_number, flat_number')

  if (error) throw error
  return data
}

// =====================================================
// CONFIGURATION & WORK ITEMS
// =====================================================

export async function getActiveConfigVersion() {
  const { data, error } = await supabase
    .from('config_versions')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error) throw error
  return data
}

export async function getWorkItems(configVersionId) {
  const { data, error } = await supabase
    .from('work_items')
    .select('*')
    .eq('config_version_id', configVersionId)
    .eq('is_active', true)
    .order('code')

  if (error) throw error
  return data
}

export async function getActiveWorkItems() {
  const configVersion = await getActiveConfigVersion()
  return getWorkItems(configVersion.id)
}

export async function updateWorkItem(workItemId, updates) {
  const { data, error } = await supabase
    .from('work_items')
    .update(updates)
    .eq('id', workItemId)
    .select()
    .single()

  if (error) throw error
  return data
}

// =====================================================
// PROGRESS ENTRIES
// =====================================================

export async function createProgressEntry(entry) {
  const { data, error } = await supabase
    .from('progress_entries')
    .insert(entry)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getProgressEntriesByFlat(flatId) {
  const { data, error } = await supabase
    .from('progress_entries')
    .select(`
      *,
      work_items:work_item_id (*)
    `)
    .eq('flat_id', flatId)
    .order('entry_date', { ascending: false })

  if (error) throw error
  return data
}

export async function getProgressSummary() {
  const { data, error } = await supabase
    .from('v_progress_summary')
    .select('*')

  if (error) throw error
  return data
}

export async function getProgressSummaryByWing(wingCode) {
  const { data, error } = await supabase
    .from('v_progress_summary')
    .select('*')
    .eq('wing_code', wingCode)

  if (error) throw error
  return data
}

export async function getUnbilledProgressEntries() {
  const { data, error } = await supabase
    .from('progress_entries')
    .select(`
      *,
      flats:flat_id (
        *,
        floors:floor_id (
          *,
          wings:wing_id (*)
        )
      ),
      work_items:work_item_id (*)
    `)
    .eq('is_billed', false)
    .order('entry_date', { ascending: false })

  if (error) throw error
  return data
}

// =====================================================
// INVOICES
// =====================================================

export async function getProformaInvoices() {
  const { data, error } = await supabase
    .from('proforma_invoices')
    .select('*')
    .order('invoice_date', { ascending: false })

  if (error) throw error
  return data
}

export async function getProformaInvoiceById(id) {
  const { data, error } = await supabase
    .from('proforma_invoices')
    .select(`
      *,
      proforma_invoice_items (
        *,
        work_items (*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createProformaInvoice(invoice, items) {
  // Start transaction (Supabase handles this with proper error handling)
  const { data: proformaData, error: proformaError } = await supabase
    .from('proforma_invoices')
    .insert(invoice)
    .select()
    .single()

  if (proformaError) throw proformaError

  // Insert items
  const itemsWithProformaId = items.map(item => ({
    ...item,
    proforma_invoice_id: proformaData.id,
  }))

  const { data: itemsData, error: itemsError } = await supabase
    .from('proforma_invoice_items')
    .insert(itemsWithProformaId)
    .select()

  if (itemsError) throw itemsError

  return { invoice: proformaData, items: itemsData }
}

export async function getTaxInvoices() {
  const { data, error } = await supabase
    .from('tax_invoices')
    .select(`
      *,
      proforma_invoices (*)
    `)
    .order('invoice_date', { ascending: false })

  if (error) throw error
  return data
}

export async function createTaxInvoice(invoice) {
  const { data, error } = await supabase
    .from('tax_invoices')
    .insert(invoice)
    .select()
    .single()

  if (error) throw error
  return data
}

// =====================================================
// STATISTICS & ANALYTICS
// =====================================================

export async function getDashboardStats() {
  // Total flats
  const { count: totalFlats, error: flatsError } = await supabase
    .from('flats')
    .select('*', { count: 'exact', head: true })

  if (flatsError) throw flatsError

  // Active work items
  const { data: workItems, error: workItemsError } = await supabase
    .from('work_items')
    .select('id, total_quantity')
    .eq('is_active', true)

  if (workItemsError) throw workItemsError

  // Progress entries
  const { data: progressEntries, error: progressError } = await supabase
    .from('progress_entries')
    .select('quantity_completed, is_billed')

  if (progressError) throw progressError

  // Calculate overall completion
  const totalExpected = workItems.reduce((sum, item) => sum + item.total_quantity, 0)
  const totalCompleted = progressEntries.reduce((sum, entry) => sum + entry.quantity_completed, 0)
  const overallCompletion = totalExpected > 0 ? (totalCompleted / totalExpected) * 100 : 0

  // Count unbilled entries
  const unbilledCount = progressEntries.filter(e => !e.is_billed).length

  return {
    totalFlats: totalFlats || 0,
    totalWorkItems: workItems.length,
    overallCompletion: Math.round(overallCompletion * 100) / 100,
    unbilledWork: unbilledCount,
    totalExpected,
    totalCompleted,
  }
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

export async function checkDoubleCompletion(flatId, workItemId) {
  // Get work item total quantity
  const { data: workItem, error: workItemError } = await supabase
    .from('work_items')
    .select('total_quantity')
    .eq('id', workItemId)
    .single()

  if (workItemError) throw workItemError

  // Get total completed for this flat+work item
  const { data: entries, error: entriesError } = await supabase
    .from('progress_entries')
    .select('quantity_completed')
    .eq('flat_id', flatId)
    .eq('work_item_id', workItemId)

  if (entriesError) throw entriesError

  const totalCompleted = entries.reduce((sum, e) => sum + e.quantity_completed, 0)

  return {
    totalQuantity: workItem.total_quantity,
    completedQuantity: totalCompleted,
    remainingQuantity: workItem.total_quantity - totalCompleted,
    isFullyCompleted: totalCompleted >= workItem.total_quantity,
  }
}

export async function checkWorkItemApplicability(flatId, workItemId) {
  const { data, error } = await supabase
    .from('work_item_applicability')
    .select('is_applicable')
    .eq('flat_id', flatId)
    .eq('work_item_id', workItemId)
    .maybeSingle()

  if (error) throw error

  // If no record exists, assume applicable (default behavior)
  return data ? data.is_applicable : true
}

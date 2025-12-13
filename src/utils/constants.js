/**
 * SiteLedger - Project Constants
 * Centralized configuration and immutable master data
 */

// Project Details
export const PROJECT = {
  name: 'Abhimanyu Tiling Works - Main Project',
  contractor: 'Abhimanyu Tiling Works',
  areaSqFt: 198174,
  ratePerSqFt: 90,
  cgstRate: 9,
  sgstRate: 9,
}

// Calculate derived values
export const CONTRACT = {
  baseValue: PROJECT.areaSqFt * PROJECT.ratePerSqFt, // 17,835,660
  cgstAmount: (PROJECT.areaSqFt * PROJECT.ratePerSqFt * PROJECT.cgstRate) / 100,
  sgstAmount: (PROJECT.areaSqFt * PROJECT.ratePerSqFt * PROJECT.sgstRate) / 100,
  totalValue: PROJECT.areaSqFt * PROJECT.ratePerSqFt * (1 + (PROJECT.cgstRate + PROJECT.sgstRate) / 100),
}

// Wing Configuration (Immutable Master Data)
export const WINGS = {
  A: {
    code: 'A',
    name: 'Wing A',
    totalFloors: 16,
    flatsPerFloor: 4,
    flatDistribution: '3×2BHK + 1×1BHK',
    totalFlats: 64,
  },
  B: {
    code: 'B',
    name: 'Wing B',
    totalFloors: 16,
    flatsPerFloor: 7,
    flatDistribution: '3×2BHK + 4×1BHK',
    totalFlats: 112,
  },
  C: {
    code: 'C',
    name: 'Wing C',
    totalFloors: 17,
    flatsPerFloor: '6 (floors 1-16) + 4 (floor 17)',
    flatDistribution: 'Varies by floor',
    totalFlats: 100,
  },
}

export const TOTAL_FLATS = 276

// Refuge Flats (Immutable Master Data)
export const REFUGE_FLATS = {
  joint: [
    { wing: 'A', flat: '702', partner: { wing: 'B', flat: '702' }, bathrooms: 1, shared: true },
    { wing: 'B', flat: '702', partner: { wing: 'A', flat: '702' }, bathrooms: 1, shared: true },
    { wing: 'A', flat: '1202', partner: { wing: 'B', flat: '1202' }, bathrooms: 1, shared: true },
    { wing: 'B', flat: '1202', partner: { wing: 'A', flat: '1202' }, bathrooms: 1, shared: true },
  ],
  independent: [
    { wing: 'C', flat: '706', bathrooms: 1, shared: false },
    { wing: 'C', flat: '1206', bathrooms: 1, shared: false },
  ],
}

// Work Items Configuration
export const WORK_ITEMS = {
  LOCKED: ['C', 'D', 'E', 'F', 'G'], // Quantities cannot be changed
  EDITABLE: ['A', 'B', 'H', 'I'], // Can be edited until first proforma
  DEFAULT_QUANTITIES: {
    A: 276,
    B: 276,
    C: 270,
    D: 550,
    E: 270,
    F: 276,
    G: 276,
    H: 276,
    I: 276,
  },
}

// Progress Status Colors
export const PROGRESS_COLORS = {
  PENDING: '#EF4444', // Red - 0%
  PARTIAL: '#F59E0B', // Amber - 1-99%
  COMPLETE: '#10B981', // Green - 100%
  NOT_APPLICABLE: '#9CA3AF', // Gray - N/A
}

// Invoice Types
export const INVOICE_TYPES = {
  PROFORMA: 'proforma',
  TAX: 'tax',
}

// Date Formats
export const DATE_FORMAT = {
  DISPLAY: 'dd MMM yyyy',
  INPUT: 'yyyy-MM-dd',
  INDIAN: 'dd/MM/yyyy',
}

// Validation Rules
export const VALIDATION = {
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 10000,
  MIN_AMOUNT: 0,
  MAX_AMOUNT: 100000000, // 10 Crore
}

// UI Constants
export const UI = {
  MOBILE_BREAKPOINT: 768,
  SIDEBAR_WIDTH: 256,
  MAX_CONTENT_WIDTH: 1280,
  TOAST_DURATION: 3000,
}

// Business Rules
export const BUSINESS_RULES = {
  LOCK_CONFIG_ON_FIRST_PROFORMA: true,
  PREVENT_EDIT_BILLED_WORK: true,
  PREVENT_DELETE_BILLED_WORK: true,
  REQUIRE_APPLICABILITY_CHECK: true,
  ALLOW_PARTIAL_TAX_INVOICE: true,
}

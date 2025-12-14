# SiteLedger Testing Checklist - Enhanced Features

## 🎯 Contractor's Perspective Testing Guide

### Prerequisites
- [x] Database schema executed (enhanced_work_items_schema.sql)
- [ ] Storage bucket "flat-images" created in Supabase Dashboard
- [ ] Storage policies applied (storage_setup.sql)
- [ ] Application running locally or on Vercel

---

## 1. Bulk Update Page - Enhanced Tracking

### Test Work Item B (WC & Bath Frame)
**Expected: 3 checkboxes**
1. Navigate to **Bulk Update** page
2. Select any wing (A, B, or C)
3. Select Work Item **B - WC & Bath Frame**
4. Click on any flat card
5. **✓ Verify Modal Opens** with:
   - Flat number displayed correctly
   - 3 checkboxes visible:
     - [ ] Room Window
     - [ ] Bathroom Window
     - [ ] Bathroom Frame
   - Progress bar shows 0/3 checks (0%)

**Test Actions:**
- [ ] Check "Room Window" → Save → Progress bar shows 1/3 (33%)
- [ ] Check "Bathroom Window" → Save → Progress bar shows 2/3 (67%)
- [ ] Check "Bathroom Frame" → Save → Progress bar shows 3/3 (100%)
- [ ] Verify flat card turns GREEN when all 3 checks complete
- [ ] Reopen modal → Verify all 3 checkboxes remain checked

---

### Test Work Item C (Kitchen Platform)
**Expected: 2 checkboxes**
1. Select Work Item **C - Kitchen Platform**
2. Click any flat card
3. **✓ Verify Modal Opens** with:
   - 2 checkboxes:
     - [ ] Half
     - [ ] Full
   - Progress bar shows 0/2 checks (0%)

**Test Actions:**
- [ ] Check "Half" → Save → Progress bar shows 1/2 (50%)
- [ ] Check "Full" → Save → Progress bar shows 2/2 (100%)
- [ ] Flat card turns GREEN

---

### Test Work Item D (Bathroom Tiles)
**Expected: Different for refugee vs normal flats**

#### Normal Flat (2BHK) - Expected: 2 checkboxes
1. Select Work Item **D - Bathroom Tiles**
2. Click a **normal flat** (not A-702, B-702, A-1202, B-1202)
3. **✓ Verify 2 checkboxes:**
   - [ ] Common Bathroom
   - [ ] Master Bathroom

#### Refugee Flat (1BHK, non-joint) - Expected: 1 checkbox
1. Click a **refugee flat** that is NOT joint (e.g., A-1501)
2. **✓ Verify only 1 checkbox:**
   - [ ] Common Bathroom
   - ❌ Master Bathroom should NOT appear

#### Joint Refugee (A-702/B-702 pair) - Expected: 1 checkbox
1. Click **A-702** or **B-702**
2. **✓ Verify only 1 checkbox:**
   - [ ] Common Bathroom
3. When saved, should record 0.5 quantity (shared bathroom)

---

### Test Work Item E (Platform Tiles)
**Expected: 2 checkboxes**
1. Select Work Item **E - Platform Tiles**
2. **✓ Verify 2 checkboxes:**
   - [ ] Half
   - [ ] Full

---

### Test Work Item F (Room & Balcony Flooring)
**Expected: Different for 1BHK vs 2BHK**

#### 1BHK Flat - Expected: 6 checkboxes
1. Select Work Item **F - Room & Balcony Flooring**
2. Click a **1BHK flat**
3. **✓ Verify 6 checkboxes in 2 categories:**
   
   **Room Flooring:**
   - [ ] Hall
   - [ ] Kitchen
   - [ ] Bedroom
   
   **Balcony Flooring:**
   - [ ] Hall Balcony
   - [ ] Kitchen Balcony
   - [ ] Bedroom Balcony

#### 2BHK Flat - Expected: 8 checkboxes
1. Click a **2BHK flat**
2. **✓ Verify 8 checkboxes in 2 categories:**
   
   **Room Flooring:**
   - [ ] Hall
   - [ ] Kitchen
   - [ ] Bedroom
   - [ ] Master Bedroom ✨ (2BHK only)
   
   **Balcony Flooring:**
   - [ ] Hall Balcony
   - [ ] Kitchen Balcony
   - [ ] Bedroom Balcony
   - [ ] Master Bedroom Balcony ✨ (2BHK only)

**Test Actions:**
- [ ] Check each room individually → Progress updates incrementally
- [ ] All checks complete → Flat card turns GREEN
- [ ] Reopen → All selections persist

---

### Test Work Item G (Skirting)
**Expected: Same structure as Work Item F**

#### 1BHK - 6 checkboxes
**Room Skirting + Balcony Skirting** (same rooms as F)

#### 2BHK - 8 checkboxes
**Room Skirting + Balcony Skirting** (includes Master Bedroom)

---

### Test Work Items A, H, I (Single Check)
**Expected: No modal, simple toggle**
1. Select Work Item **A - Marble Window Patti**
2. Click flat card
3. **✓ Verify:** Flat toggles complete/incomplete directly (no modal)
4. Repeat for **H - Tapa Riser** and **I - Shop Flooring**

---

## 2. Notes Feature

### Test Adding Notes
1. Open any flat modal (Work Items B-G)
2. Scroll to **Notes** section
3. Type a note: "Bathroom tiles damaged, need replacement"
4. Click **Save**
5. **✓ Verify:**
   - Note saves successfully
   - Message confirms save
   - Note persists when reopening modal

### Test Multiple Notes
1. Add another note: "Completed on [today's date]"
2. Save
3. **✓ Verify:**
   - Latest note appears on top
   - Old note still visible below

---

## 3. Image Upload Feature

### Test Single Image Upload
1. Open any flat modal
2. Click **Upload Images** button
3. Select 1 photo from device
4. **✓ Verify:**
   - Upload progress shows
   - Success message appears
   - Image appears in gallery below
   - Image thumbnail is clear

### Test Multiple Images
1. Upload 5 more images (total 6)
2. **✓ Verify:**
   - All 6 images display in grid
   - Each image has delete button (trash icon)

### Test Maximum Limit (10 images)
1. Try uploading 5 more images (would total 11)
2. **✓ Verify:**
   - System blocks upload
   - Error message: "Maximum 10 images allowed"

### Test Image Deletion
1. Click trash icon on any image
2. Confirm deletion
3. **✓ Verify:**
   - Image removed from gallery
   - Image deleted from storage
   - Can now upload more (under 10 limit)

### Test Image Quality
1. Click on an image in the gallery
2. **✓ Verify:**
   - Image opens in new tab (full size)
   - Image is clear and not pixelated
   - Can zoom and view details

---

## 4. 3D Visual Progress - Enhanced Details

### Test Flat Details Sidebar
1. Navigate to **3D Visual Progress**
2. Select "All Work Items" or specific work item
3. Click on any flat in the 3D view
4. **✓ Verify Sidebar Shows:**
   - Flat number (large, prominent)
   - Refugee badge (if applicable)
   - Overall completion percentage
   - Progress bar (color-coded)

### Test Work Items Progress Section
1. In the sidebar, scroll to **Work Items Progress**
2. **✓ Verify for each work item:**
   - Work item code (A, B, C, etc.)
   - Work item name
   - Completion percentage
   - Check count: X/Y checks
   - Progress bar (color-coded)

### Test Detailed Checks Display
1. Find a work item with multiple checks (e.g., Work Item F)
2. **✓ Verify:**
   - List of all checks visible
   - Completed checks have ✓ green checkmark
   - Incomplete checks have ○ gray circle
   - Check names are readable
   - Category labels show (e.g., "room flooring")

### Test Notes Display in 3D View
1. Click a flat that has notes added
2. Scroll to **Notes** section in sidebar
3. **✓ Verify:**
   - Notes icon visible
   - All notes display in yellow cards
   - Note text is readable
   - Date stamp shows when note was added
   - Most recent note appears first

### Test Images Display in 3D View
1. Click a flat that has images uploaded
2. Scroll to **Images** section in sidebar
3. **✓ Verify:**
   - Camera icon visible
   - Image count shown: "Images (X)"
   - Images display in 2-column grid
   - Thumbnails are clear
   - Click image → Opens full size in new tab
   - Captions show if added

---

## 5. Dashboard Integration

### Test Overall Completion
1. Navigate to **Dashboard**
2. **✓ Verify:**
   - Overall project completion reflects new detailed tracking
   - Completed work items count correctly
   - Pending work items accurate

### Test Work Item Breakdown
1. View work item cards on dashboard
2. **✓ Verify for each work item:**
   - Total quantity correct
   - Completed quantity matches detailed checks
   - Progress bar accurate
   - Color coding correct (red/amber/green)

---

## 6. Billing Page - GST Calculation

### Test GST-Inclusive Amount
1. Navigate to **Billing** page
2. Click **Create New Invoice**
3. Select flat and work items
4. Enter Payment Amount: ₹11,800 (including GST)
5. **✓ Verify Invoice Preview:**
   - **Base Amount (Excl. GST):** ₹10,000
   - **CGST @ 9%:** ₹900
   - **SGST @ 9%:** ₹900
   - **Total Amount:** ₹11,800

### Test Calculation Formula
**Formula:** Base = Total / 1.18

Test multiple amounts:
- [ ] ₹5,900 → Base: ₹5,000 (CGST: ₹450, SGST: ₹450)
- [ ] ₹23,600 → Base: ₹20,000 (CGST: ₹1,800, SGST: ₹1,800)
- [ ] ₹11,800 → Base: ₹10,000 (CGST: ₹900, SGST: ₹900)

---

## 7. Mobile Responsiveness

### Test on Mobile Device or Browser Dev Tools
1. Open application on mobile or resize browser to mobile width
2. Test Bulk Update page:
   - [ ] Flat cards stack properly
   - [ ] Modal is full-screen and scrollable
   - [ ] Checkboxes are tap-friendly (large enough)
   - [ ] Images upload from camera/gallery
   - [ ] Bottom navigation doesn't overlap content

3. Test 3D Visual Progress:
   - [ ] 3D view rotates with touch (swipe)
   - [ ] Zoom works (pinch)
   - [ ] Sidebar slides in from right
   - [ ] All content readable without horizontal scroll

4. Test Billing page:
   - [ ] Bottom bar doesn't cover invoice cards (pb-24 padding)
   - [ ] Forms are accessible
   - [ ] Buttons are tap-friendly

---

## 8. Edge Cases & Error Handling

### Test Incomplete Work Item Billing
1. Try to create invoice for flat with incomplete work items
2. **✓ Verify:**
   - System blocks billing
   - Error message: "All checks must be complete before billing"

### Test Storage Bucket Missing
1. If bucket not created, try uploading image
2. **✓ Verify:**
   - Clear error message shown
   - Instructions to create bucket

### Test Network Error
1. Disconnect internet
2. Try to save progress
3. **✓ Verify:**
   - Error message appears
   - Data not lost
   - Can retry when reconnected

### Test Concurrent Edits
1. Open same flat in two browser tabs
2. Make different changes in each
3. **✓ Verify:**
   - Latest save wins
   - No data corruption
   - Reload shows accurate state

---

## 9. Data Integrity

### Test Progress Persistence
1. Complete all checks for Work Item F on a flat
2. Close modal
3. Refresh page
4. Reopen flat
5. **✓ Verify:**
   - All checkboxes still checked
   - Progress bar still at 100%
   - Flat card still green

### Test Cross-Wing Consistency
1. Complete Work Item B for flat A-101
2. Navigate to Dashboard
3. Check Work Item B overall progress
4. **✓ Verify:**
   - Counts reflect the completed flat
   - Percentage updated correctly

---

## 10. Performance

### Test Large Data Loading
1. Open 3D Visual Progress with "All Work Items" selected
2. **✓ Verify:**
   - Page loads within 3-5 seconds
   - 3D view renders smoothly
   - No browser lag or freeze
   - Can rotate/zoom without stutter

### Test Modal Performance
1. Open modal for flat with 8 checks (Work Item F, 2BHK)
2. **✓ Verify:**
   - Modal opens instantly
   - Checkboxes respond immediately
   - Save operation completes within 1-2 seconds

---

## 🚀 Final Deployment Checklist

Before pushing to production:

- [ ] All database tables created
- [ ] Storage bucket configured
- [ ] All RLS policies applied
- [ ] Environment variables set in Vercel
- [ ] Test user account created
- [ ] Sample data for all flat types tested
- [ ] Mobile testing completed
- [ ] Desktop testing completed
- [ ] Error messages are user-friendly
- [ ] Loading states show properly
- [ ] All images load correctly
- [ ] Git commit with clear message
- [ ] Push to GitHub (auto-deploys to Vercel)

---

## 📋 Bug Report Template

If you find any issues, document them:

**Issue:** [Brief description]
**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:** [What should happen]
**Actual Result:** [What actually happened]
**Screenshot:** [If applicable]
**Browser/Device:** [Chrome/Firefox/Safari, Desktop/Mobile]

---

## ✅ Sign-Off

- [ ] All tests passed
- [ ] No critical bugs found
- [ ] Ready for production use
- [ ] User training completed

**Tested By:** ________________
**Date:** ________________
**Sign:** ________________

# SiteLedger Enhancement Plan - December 16, 2025

## ✅ COMPLETED
- [x] Fix Work Item F & G quantity: Always 1.0 per flat (0.5 room + 0.5 balcony)
- [x] Add Note/Image Icons to Flat Cards
  - ✅ Added FileText and Camera badges in BulkUpdate.jsx
  - ✅ Added metadata loading (loadFlatMetadata function)
  - ✅ Display notes/images count badges in top-left corner
  - ✅ Added badges to VisualProgress.jsx sidebar
  - ✅ Blue badge for notes, purple badge for images
- [x] Add Comprehensive Filters to Bulk Update
  - ✅ Completion Status filter (All / Completed / Partial / Pending)
  - ✅ Documentation filter (All / Has Notes / Has Images / Has Both / No Docs)
  - ✅ BHK Type filter (All / 1BHK / 2BHK)
  - ✅ Filter status indicator showing "X of Y flats"
  - ✅ Updated getFilteredFlats() to apply all filters

## 🚧 IN PROGRESS

### 3. Enhanced Dashboard (NEXT PRIORITY)
**New filters to add:**
- Completion Status: All / Completed (100%) / Partial (1-99%) / Pending (0%)
- Documentation: All / Has Notes / Has Images / No Documentation
- BHK Type: All / 1BHK / 2BHK
- Floor Range: All / Custom range (from-to)

**UI Design:**
- Add filter section below work item selection
- Use dropdown/select for each filter
- Show count of flats matching filters
- Combine with existing floor filter

### 3. Enhanced Dashboard
**New Components:**
- Work Item Progress Chart (all 9 items)
- Wing Comparison (A vs B vs C)
- Completion Timeline (trend over time)
- Recent Activity Feed
- Top Performing Floors
- Work Items Needing Attention (< 50%)
- Documentation Coverage (% of flats with notes/images)
- Estimated Completion Date

**Filters:**
- Date Range
- Wing
- Work Item
- Completion Status

**Data Visualizations:**
- Bar charts for wing comparison
- Line charts for trends
- Progress rings for overall completion
- Heat map for floor performance

## 📋 TECHNICAL DETAILS

### Database Queries Needed:
```sql
-- Get notes/images count per flat
SELECT 
  flat_id,
  COUNT(DISTINCT fn.id) as notes_count,
  COUNT(DISTINCT fi.id) as images_count
FROM flats f
LEFT JOIN flat_notes fn ON f.id = fn.flat_id
LEFT JOIN flat_images fi ON f.id = fi.flat_id
GROUP BY flat_id
```

### State Management:
- Add flatMetadata state to store notes/images counts
- Add filter states for all filter types
- Add dashboard filter states

### Performance Considerations:
- Load notes/images counts once per work item selection
- Cache dashboard data with refresh button
- Use indexes on flat_notes and flat_images tables

## 🎯 SUCCESS CRITERIA
- [x] F & G show 1.0 quantity (not 6-8)
- [ ] Icons visible on flat cards showing documentation status
- [ ] All filters working and combinable
- [ ] Dashboard shows comprehensive project data
- [ ] No performance degradation
- [ ] All existing functionality preserved

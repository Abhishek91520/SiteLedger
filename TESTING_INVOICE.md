# Testing Guide: Invoice Features

## Quick Test Plan

### Prerequisites
1. Development server running: `npm run dev`
2. Database migrations executed (see README)
3. Sample data: At least one completed flat with work items

---

## Test 1: Amount in Words Converter

### Manual Console Test
1. Open browser console (F12)
2. Run these tests:

```javascript
// Import the function
import { amountToWords } from './src/utils/amountToWords.js'

// Test cases
console.log(amountToWords(0))           // "Zero Rupees Only"
console.log(amountToWords(100))         // "Rupees One Hundred Only"
console.log(amountToWords(1000))        // "Rupees One Thousand Only"
console.log(amountToWords(100000))      // "Rupees One Lakh Only"
console.log(amountToWords(10000000))    // "Rupees One Crore Only"
console.log(amountToWords(17835660))    // "Rupees One Crore Seventy Eight..."
console.log(amountToWords(1234.50))     // "Rupees One Thousand...Fifty Paise Only"
```

### Expected Results
- Zero shows "Zero Rupees Only"
- Small amounts show in full words
- Lakhs shown correctly (e.g., "One Lakh" not "One Hundred Thousand")
- Crores shown correctly
- Decimals show as paise
- All end with "Only"

---

## Test 2: Proforma Invoice Creation

### Steps
1. Navigate to **Billing** page
2. Click **Proforma Invoices** tab
3. Click **New Proforma Invoice**

### Step 1: Basic Details
- Select Invoice Date
- Select Project (auto-selected if only one)
- Verify config version loaded
- Click **Next**

### Step 2: Work Items
- Work items should show with completed quantities
- Check "Qty Available" shows correct numbers
- Select multiple work items
- Click **Next**

### Step 3: Preview & Submit
✅ **VERIFY:**
- Work items table shows correct data
- Base Amount calculated correctly
- CGST @ 9% calculated correctly
- SGST @ 9% calculated correctly
- Total Amount is correct
- **Amount in Words displayed** (blue box)
- Amount in words is correct for total

**Example:**
If total = ₹17,835,660
Words should show: "Rupees One Crore Seventy Eight Lakh Thirty Five Thousand Six Hundred Sixty Only"

### Create Invoice
- Add optional remarks
- Click **Create Invoice**
- Verify success and redirect

---

## Test 3: PDF Download (Proforma)

### Steps
1. Go to Billing > Proforma Invoices
2. Find created invoice
3. Click **Download icon** (↓)

### Expected Results
✅ PDF downloads automatically
✅ Filename: `PI-0001.pdf` (or similar)
✅ PDF contains:
- Company header with blue gradient
- "PROFORMA INVOICE" title
- Invoice number, date, status
- Project name
- Work items table (Code, Name, Qty, Rate, Amount)
- Base Amount, CGST, SGST, Total
- **Amount in Words section**
- Remarks (if added)
- Authorized Signatory line

### Verify Amount in Words
Open PDF and check that amount in words matches the total and is in proper Indian format.

---

## Test 4: PDF Preview (Proforma)

### Steps
1. Go to Billing > Proforma Invoices
2. Find invoice
3. Click **Eye icon** (👁)

### Expected Results
✅ New browser tab opens
✅ PDF preview loads
✅ All content same as download test
✅ Can print from preview
✅ Can save from preview

---

## Test 5: Tax Invoice Creation

### Steps
1. Navigate to **Billing** > **Tax Invoices** tab
2. Click **New Tax Invoice**

### Form Fields
- Select **Proforma Invoice** from dropdown
- Set **Invoice Date**
- Set **Payment Date**
- Enter **Payment Amount** (excluding GST)
  - e.g., 10,00,000
- Select **Payment Mode** (Bank Transfer)
- Enter **Payment Reference** (e.g., UTR123456789)

### GST Preview
✅ **VERIFY:**
- Payment Amount shows correctly
- CGST @ 9% calculated
- SGST @ 9% calculated
- Total with GST shown
- **Amount in Words displayed** (green box)

**Example:**
If payment = ₹10,00,000 (10 lakhs)
- CGST = ₹90,000
- SGST = ₹90,000
- Total = ₹11,80,000

Words: "Rupees Eleven Lakh Eighty Thousand Only"

### Create Tax Invoice
- Add notes (optional)
- Click **Create Tax Invoice**
- Verify success

---

## Test 6: PDF Download (Tax Invoice)

### Steps
1. Go to Billing > Tax Invoices
2. Find created invoice
3. Click **Download icon**

### Expected Results
✅ PDF downloads: `TI-0001.pdf`
✅ PDF contains:
- Company header with green gradient
- "TAX INVOICE" title
- Tax invoice number
- Proforma reference
- Payment date and mode
- Payment reference
- Work items table
- GST calculation
- **Amount in Words section**
- Payment details
- Authorized Signatory

---

## Test 7: Edge Cases

### Zero Amount
1. Try creating invoice with 0 amount
2. Verify: "Zero Rupees Only"

### Decimal Amounts
1. Enter payment: 1234.50
2. Verify: "Rupees One Thousand Two Hundred Thirty Four and Fifty Paise Only"

### Large Amounts
1. Enter payment: 9,99,99,999
2. Verify: "Rupees Nine Crore Ninety Nine Lakh Ninety Nine Thousand Nine Hundred Ninety Nine Only"

### Joint Refuge Bathrooms
1. Create invoice with Bathroom work item (D)
2. Verify quantity shows as 0.5 for joint refuge flats
3. PDF should show decimal quantity

---

## Test 8: Dark Mode

### Steps
1. Toggle dark mode (moon icon)
2. Go to Billing page
3. Create new invoice
4. Check Step 3 preview

### Expected Results
✅ Amount in words box has dark background
✅ Text is readable
✅ PDF preview still works
✅ Downloaded PDF unaffected (always light theme)

---

## Test 9: Mobile Responsiveness

### Steps
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device (e.g., iPhone 12)
4. Navigate to Billing
5. Try creating invoice

### Expected Results
✅ Invoice cards stack vertically
✅ Download/Preview buttons accessible
✅ Modal forms responsive
✅ Amount in words box fits screen
✅ Tables scroll horizontally if needed

---

## Test 10: Error Handling

### Missing Data
1. Try creating invoice without selecting work items
2. Expected: "Please select at least one work item" error

### Invalid Dates
1. Set invoice date in future
2. Should allow (proforma can be future-dated)

### Zero Quantity Work Items
1. Try selecting work item with 0 completed quantity
2. Should show "0 Available" and prevent selection

---

## Performance Tests

### Large Invoice
1. Create invoice with all 9 work items
2. Each with 50+ flats completed
3. Verify:
   - PDF generates in < 5 seconds
   - No browser lag
   - PDF file size reasonable (< 1MB)

### Multiple Downloads
1. Download 5 invoices consecutively
2. Verify:
   - All PDFs download successfully
   - Correct filenames
   - No memory leaks

---

## Bug Checklist

- [ ] Amount in words shows correctly for all test cases
- [ ] PDF download works in Chrome
- [ ] PDF download works in Firefox
- [ ] PDF download works in Edge
- [ ] PDF preview opens in new tab
- [ ] Preview doesn't block main page
- [ ] Proforma PDF has correct colors (blue)
- [ ] Tax Invoice PDF has correct colors (green)
- [ ] GST calculations are accurate
- [ ] Decimal quantities handled (joint refuge)
- [ ] Dark mode doesn't break functionality
- [ ] Mobile view is usable
- [ ] Error messages are helpful
- [ ] No console errors

---

## Success Criteria

✅ **All features working:**
- Amount in words converter
- PDF generation (Proforma)
- PDF generation (Tax Invoice)
- Download functionality
- Preview functionality
- Dark mode compatibility
- Mobile responsiveness

✅ **No errors:**
- No console errors
- No failed database queries
- No PDF generation failures

✅ **User Experience:**
- Intuitive interface
- Fast performance (< 5s PDF generation)
- Professional PDF appearance
- Accurate calculations

---

## Reporting Issues

If you find any bugs:

1. **Note the issue:**
   - What were you doing?
   - What did you expect?
   - What actually happened?

2. **Check console:**
   - Open DevTools (F12)
   - Look for errors in Console tab
   - Copy error messages

3. **Share details:**
   - Browser and version
   - Screen size (desktop/mobile)
   - Steps to reproduce
   - Screenshots if possible

---

## Next Steps After Testing

1. ✅ Fix any bugs found
2. ✅ Update README with usage instructions
3. ✅ Remove console.log statements
4. ✅ Test on production-like environment
5. ✅ Get user feedback
6. ✅ Deploy to production

---

**Happy Testing! 🧪**

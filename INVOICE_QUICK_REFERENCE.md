# Invoice Quick Reference

## 📋 Proforma Invoice

### What is it?
A preliminary invoice showing work completed, rates, and estimated amount before payment.

### How to Create:
1. Go to **Billing** → **Proforma Invoices**
2. Click **+ New Proforma Invoice**
3. Follow 3-step wizard:
   - **Step 1:** Select date and project
   - **Step 2:** Choose completed work items
   - **Step 3:** Review and submit

### Features:
- ✅ Auto-calculates GST (9% CGST + 9% SGST = 18% total)
- ✅ Shows **Amount in Words** (Indian format)
- ✅ Professional PDF with company branding
- ✅ Download PDF (📥 icon)
- ✅ Preview in browser (👁 icon)

---

## 💰 Tax Invoice (GST Invoice)

### What is it?
Official GST invoice issued after receiving payment. Required for tax compliance.

### How to Create:
1. Go to **Billing** → **Tax Invoices**
2. Click **+ New Tax Invoice**
3. Fill details:
   - Select **Proforma Invoice**
   - Enter **Payment Amount** (excluding GST)
   - Set **Payment Date**
   - Choose **Payment Mode**
   - Add **Payment Reference** (UTR/Cheque No.)
4. Review amount with GST
5. Click **Create Tax Invoice**

### Features:
- ✅ Links to Proforma Invoice
- ✅ Tracks payment details
- ✅ Shows **Amount in Words**
- ✅ Green-themed PDF
- ✅ GST breakup with payment info

---

## 💡 Tips & Tricks

### Amount in Words
The system automatically converts amounts to Indian English:
- ₹10,00,000 → "Rupees Ten Lakh Only"
- ₹1,50,00,000 → "Rupees One Crore Fifty Lakh Only"
- ₹1,234.50 → "Rupees One Thousand Two Hundred Thirty Four and Fifty Paise Only"

### Joint Refuge Flats
- Regular flat bathroom = 1 quantity
- Joint refuge bathroom = 0.5 quantity (shared between 2 flats)
- System automatically handles this in billing

### GST Calculation
- **Base Amount:** Your work value
- **CGST @ 9%:** Central GST
- **SGST @ 9%:** State GST
- **Total:** Base + CGST + SGST (18% tax)

### PDF Actions
- **👁 Eye Icon:** Preview PDF in new tab (no download)
- **📥 Download Icon:** Save PDF to your device
- **File Name:** PI-0001.pdf (Proforma) or TI-0001.pdf (Tax)

---

## 🎨 Invoice Themes

### Proforma Invoice
- **Color:** Blue theme
- **Header:** Primary blue gradient
- **Purpose:** Estimation before payment

### Tax Invoice
- **Color:** Green theme
- **Header:** Green gradient
- **Purpose:** Official GST invoice after payment

---

## 📝 Required Information

### For Proforma:
- ✅ Invoice date
- ✅ Project selection
- ✅ At least one work item
- ⚪ Remarks (optional)

### For Tax Invoice:
- ✅ Proforma invoice reference
- ✅ Payment amount
- ✅ Payment date
- ✅ Payment mode
- ⚪ Payment reference (recommended)
- ⚪ Notes (optional)

---

## ⚠️ Common Issues

### "No completed work items found"
**Solution:** Mark some flats as completed in Bulk Update first.

### "Rate is 0"
**Solution:** Ensure work items have `rate_per_unit` set in database.

### PDF not downloading
**Solution:** Check browser's download permissions and pop-up blocker.

### Amount in words is wrong
**Solution:** This shouldn't happen! Report it with the amount value.

---

## 🔢 Work Item Codes

| Code | Work Item | Rate |
|------|-----------|------|
| A | Marble Window Patti | ₹0 |
| B | WC & Bath Frame | ₹0 |
| C | Kitchen Platform | ₹5,285 |
| D | Bathroom Tiles | ₹6,161 |
| E | Platform Tiles | ₹5,945 |
| F | Room & Balcony Flooring | ₹14,217 |
| G | Skirting | ₹5,170 |
| H | Tapa Riser | ₹0 |
| I | Shop Flooring | ₹0 |

**Note:** Zero-rate items are tracked but not billed.

---

## 📞 Need Help?

1. **Check the README:** Full documentation available
2. **Test Mode:** Use development server to test before production
3. **Browser Console:** Press F12 to see error messages
4. **PDF Issues:** Try different browser (Chrome recommended)

---

## 🎯 Best Practices

1. **Create Proforma First:** Always create proforma before tax invoice
2. **Verify Amounts:** Double-check totals in Step 3 preview
3. **Add Remarks:** Include payment terms or special notes
4. **Download PDFs:** Keep backup copies of all invoices
5. **Track Payments:** Use clear payment references (UTR numbers)
6. **Regular Backups:** Download invoices periodically

---

## 📊 Invoice Workflow

```
1. Complete Work
   ↓
2. Bulk Update (mark flats completed)
   ↓
3. Create Proforma Invoice
   ↓
4. Send to Client
   ↓
5. Receive Payment
   ↓
6. Create Tax Invoice
   ↓
7. Download & File PDFs
```

---

## ✨ Pro Features

### Batch Selection
In Step 2, select multiple work items at once to save time.

### Auto-Fill
System remembers your last project selection.

### Dark Mode
All features work in dark mode - toggle anytime!

### Mobile Access
Create and download invoices from phone or tablet.

---

**For Detailed Documentation:** See `INVOICE_IMPLEMENTATION.md`  
**For Testing Guide:** See `TESTING_INVOICE.md`  
**For Setup Instructions:** See `README.md`

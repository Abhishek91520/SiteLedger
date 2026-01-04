import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { amountToWords, formatCurrency } from './amountToWords'

/**
 * Generate Proforma Invoice PDF
 */
export function generateProformaPDF(invoice, items, project) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Company Header
  doc.setFillColor(79, 70, 229) // Primary color
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('ABHIMANYU TILING WORKS', pageWidth / 2, 15, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Premium Tiling & Flooring Solutions', pageWidth / 2, 22, { align: 'center' })
  doc.text('GST: 27XXXXXXXXXXXXX | PAN: XXXXX0000X', pageWidth / 2, 28, { align: 'center' })
  doc.text('Contact: +91-XXXXXXXXXX | Email: contact@abhimanyutiling.com', pageWidth / 2, 34, { align: 'center' })
  
  // Reset text color
  doc.setTextColor(0, 0, 0)
  
  // Invoice Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('PROFORMA INVOICE', pageWidth / 2, 50, { align: 'center' })
  
  // Invoice Details Box
  let yPos = 60
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  // Left side - Invoice details
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice No:', 15, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.invoice_number, 50, yPos)
  
  yPos += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Date:', 15, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(invoice.invoice_date).toLocaleDateString('en-IN'), 50, yPos)
  
  yPos += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Status:', 15, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.status?.toUpperCase() || 'N/A', 50, yPos)
  
  // Right side - Project details
  yPos = 60
  doc.setFont('helvetica', 'bold')
  doc.text('Project:', 120, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(project.name || 'N/A', 145, yPos, { maxWidth: 50 })
  
  // Items Table
  yPos += 15
  
  const tableData = items.map(item => [
    item.work_items?.code || 'N/A',
    item.work_items?.name || 'N/A',
    item.quantity_billed || 0,
    formatCurrency(item.rate || 0),
    formatCurrency(item.amount || 0)
  ])
  
  autoTable(doc, {
    startY: yPos,
    head: [['Code', 'Work Item', 'Quantity', 'Rate', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 9,
      cellPadding: 5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { halign: 'left', cellWidth: 70 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 35 }
    }
  })
  
  // Summary Box
  yPos = doc.lastAutoTable.finalY + 10
  const summaryX = pageWidth - 75
  
  doc.setFillColor(245, 245, 245)
  doc.rect(summaryX - 5, yPos - 5, 65, 45, 'F')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Base Amount:', summaryX, yPos)
  doc.text(formatCurrency(invoice.base_amount), pageWidth - 15, yPos, { align: 'right' })
  
  yPos += 7
  doc.text(`CGST (${invoice.cgst_rate || 9}%):`, summaryX, yPos)
  doc.text(formatCurrency(invoice.cgst_amount), pageWidth - 15, yPos, { align: 'right' })
  
  yPos += 7
  doc.text(`SGST (${invoice.sgst_rate || 9}%):`, summaryX, yPos)
  doc.text(formatCurrency(invoice.sgst_amount), pageWidth - 15, yPos, { align: 'right' })
  
  yPos += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total Amount:', summaryX, yPos)
  doc.text(formatCurrency(invoice.total_amount), pageWidth - 15, yPos, { align: 'right' })
  
  // Amount in Words
  yPos += 12
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Amount in Words:', 15, yPos)
  doc.setFont('helvetica', 'normal')
  const words = amountToWords(invoice.total_amount)
  doc.text(words, 15, yPos + 7, { maxWidth: pageWidth - 30 })
  
  // Remarks (if any)
  if (invoice.remarks) {
    yPos += 20
    doc.setFont('helvetica', 'bold')
    doc.text('Remarks:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.remarks, 15, yPos + 7, { maxWidth: pageWidth - 30 })
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 30
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100, 100, 100)
  doc.text('This is a computer generated proforma invoice and does not require signature.', pageWidth / 2, footerY, { align: 'center' })
  doc.text('For any queries, please contact us at the above mentioned details.', pageWidth / 2, footerY + 5, { align: 'center' })
  
  // Signature section
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.line(pageWidth - 70, footerY - 10, pageWidth - 15, footerY - 10)
  doc.text('Authorized Signatory', pageWidth - 42.5, footerY - 5, { align: 'center' })
  
  return doc
}

/**
 * Generate Tax Invoice PDF
 */
export function generateTaxInvoicePDF(invoice, items, project, proforma) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Company Header
  doc.setFillColor(22, 163, 74) // Green color for tax invoice
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('ABHIMANYU TILING WORKS', pageWidth / 2, 15, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Premium Tiling & Flooring Solutions', pageWidth / 2, 22, { align: 'center' })
  doc.text('GST: 27XXXXXXXXXXXXX | PAN: XXXXX0000X', pageWidth / 2, 28, { align: 'center' })
  doc.text('Contact: +91-XXXXXXXXXX | Email: contact@abhimanyutiling.com', pageWidth / 2, 34, { align: 'center' })
  
  // Reset text color
  doc.setTextColor(0, 0, 0)
  
  // Invoice Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('TAX INVOICE', pageWidth / 2, 50, { align: 'center' })
  
  // Invoice Details
  let yPos = 60
  doc.setFontSize(10)
  
  // Left side
  doc.setFont('helvetica', 'bold')
  doc.text('Tax Invoice No:', 15, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.invoice_number, 55, yPos)
  
  yPos += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Date:', 15, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(invoice.invoice_date).toLocaleDateString('en-IN'), 55, yPos)
  
  yPos += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Proforma Ref:', 15, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(proforma?.invoice_number || 'N/A', 55, yPos)
  
  // Right side
  yPos = 60
  doc.setFont('helvetica', 'bold')
  doc.text('Project:', 120, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(project.name || 'N/A', 145, yPos, { maxWidth: 50 })
  
  yPos += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Payment Date:', 120, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(invoice.payment_date).toLocaleDateString('en-IN'), 145, yPos)
  
  // Items Table
  yPos += 15
  
  const tableData = items.map(item => [
    item.work_items?.code || 'N/A',
    item.work_items?.name || 'N/A',
    item.quantity_billed || 0,
    formatCurrency(item.rate || 0),
    formatCurrency(item.amount || 0)
  ])
  
  autoTable(doc, {
    startY: yPos,
    head: [['Code', 'Work Item', 'Quantity', 'Rate', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 9,
      cellPadding: 5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { halign: 'left', cellWidth: 70 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 35 }
    }
  })
  
  // Summary Box
  yPos = doc.lastAutoTable.finalY + 10
  const summaryX = pageWidth - 75
  
  doc.setFillColor(240, 253, 244)
  doc.rect(summaryX - 5, yPos - 5, 65, 45, 'F')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Base Amount:', summaryX, yPos)
  doc.text(formatCurrency(invoice.base_amount_received), pageWidth - 15, yPos, { align: 'right' })
  
  yPos += 7
  doc.text(`CGST (${invoice.cgst_rate || 9}%):`, summaryX, yPos)
  doc.text(formatCurrency(invoice.cgst_amount_received), pageWidth - 15, yPos, { align: 'right' })
  
  yPos += 7
  doc.text(`SGST (${invoice.sgst_rate || 9}%):`, summaryX, yPos)
  doc.text(formatCurrency(invoice.sgst_amount_received), pageWidth - 15, yPos, { align: 'right' })
  
  yPos += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total Received:', summaryX, yPos)
  doc.text(formatCurrency(invoice.total_amount_received), pageWidth - 15, yPos, { align: 'right' })
  
  // Amount in Words
  yPos += 12
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Amount in Words:', 15, yPos)
  doc.setFont('helvetica', 'normal')
  const words = amountToWords(invoice.total_amount_received)
  doc.text(words, 15, yPos + 7, { maxWidth: pageWidth - 30 })
  
  // Payment Details
  if (invoice.payment_reference) {
    yPos += 20
    doc.setFont('helvetica', 'bold')
    doc.text('Payment Reference:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.payment_reference, 15, yPos + 7)
  }
  
  // Remarks
  if (invoice.remarks) {
    yPos += 15
    doc.setFont('helvetica', 'bold')
    doc.text('Remarks:', 15, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.remarks, 15, yPos + 7, { maxWidth: pageWidth - 30 })
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 30
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100, 100, 100)
  doc.text('This is a computer generated tax invoice and does not require signature.', pageWidth / 2, footerY, { align: 'center' })
  doc.text('Payment received with thanks. Subject to Mumbai jurisdiction.', pageWidth / 2, footerY + 5, { align: 'center' })
  
  // Signature section
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.line(pageWidth - 70, footerY - 10, pageWidth - 15, footerY - 10)
  doc.text('Authorized Signatory', pageWidth - 42.5, footerY - 5, { align: 'center' })
  
  return doc
}

/**
 * Download PDF
 */
export function downloadPDF(doc, filename) {
  doc.save(filename)
}

/**
 * Preview PDF in new tab
 */
export function previewPDF(doc) {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

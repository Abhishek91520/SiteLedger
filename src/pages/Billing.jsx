import { useState, useEffect } from 'react'
import { FileText, Receipt, Plus, Eye, Download, X, CheckCircle, AlertCircle } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { generateProformaPDF, generateTaxInvoicePDF, downloadPDF, previewPDF } from '../utils/pdfGenerator'
import { amountToWords } from '../utils/amountToWords'

export default function Billing() {
  const [activeTab, setActiveTab] = useState('proforma')
  const { isDark } = useTheme()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-soft via-white to-primary-50/30 dark:from-dark-bg dark:via-dark-bg dark:to-dark-card pb-24 md:pb-6 transition-colors duration-300">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-blue-700 text-white px-4 py-8 md:px-6 md:py-10 shadow-soft-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Billing</h1>
          <p className="text-primary-100 dark:text-primary-200 mt-2 text-lg">Generate Proforma & Tax Invoices</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-lg border-b border-neutral-200 dark:border-dark-border shadow-soft transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex gap-2">
          <button
            onClick={() => setActiveTab('proforma')}
            className={`px-6 py-4 font-bold border-b-4 transition-all ${
              activeTab === 'proforma'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-dark-text hover:border-neutral-300 dark:hover:border-dark-border'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText size={22} />
              <span>Proforma Invoices</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`px-6 py-4 font-bold border-b-4 transition-all ${
              activeTab === 'tax'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-dark-text hover:border-neutral-300 dark:hover:border-dark-border'
            }`}
          >
            <div className="flex items-center gap-3">
              <Receipt size={22} />
              <span>Tax Invoices</span>
            </div>
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {activeTab === 'proforma' ? <ProformaInvoices /> : <TaxInvoices />}
      </div>
    </div>
  )
}

function ProformaInvoices() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('proforma_invoices')
        .select(`
          *,
          projects(name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = () => {
    setShowCreateModal(false)
    loadInvoices()
  }

  const handleDownloadPDF = async (invoice) => {
    try {
      // Load invoice items
      const { data: items, error: itemsError } = await supabase
        .from('proforma_invoice_items')
        .select(`
          *,
          work_items(code, name)
        `)
        .eq('proforma_invoice_id', invoice.id)

      if (itemsError) throw itemsError

      // Load project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', invoice.project_id)
        .single()

      if (projectError) throw projectError

      // Add GST rates to invoice object if not present
      const invoiceWithRates = {
        ...invoice,
        cgst_rate: invoice.cgst_rate || 9,
        sgst_rate: invoice.sgst_rate || 9
      }

      // Generate and download PDF
      const doc = generateProformaPDF(invoiceWithRates, items, project)
      downloadPDF(doc, `${invoice.invoice_number}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  const handlePreviewPDF = async (invoice) => {
    try {
      // Load invoice items
      const { data: items, error: itemsError } = await supabase
        .from('proforma_invoice_items')
        .select(`
          *,
          work_items(code, name)
        `)
        .eq('proforma_invoice_id', invoice.id)

      if (itemsError) throw itemsError

      // Load project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', invoice.project_id)
        .single()

      if (projectError) throw projectError

      // Add GST rates to invoice object if not present
      const invoiceWithRates = {
        ...invoice,
        cgst_rate: invoice.cgst_rate || 9,
        sgst_rate: invoice.sgst_rate || 9
      }

      // Generate and preview PDF
      const doc = generateProformaPDF(invoiceWithRates, items, project)
      previewPDF(doc)
    } catch (error) {
      console.error('Error generating PDF preview:', error)
      alert('Failed to preview PDF. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800 dark:text-dark-text">Proforma Invoices</h2>
          <p className="text-neutral-600 dark:text-dark-muted mt-1">Create invoices for completed work items</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary text-lg py-3 px-6 flex items-center gap-2"
        >
          <Plus size={20} />
          New Proforma Invoice
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-neutral-200 dark:border-dark-border p-12 md:p-16 transition-colors duration-300">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-2xl mx-auto flex items-center justify-center">
              <FileText size={48} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-neutral-800 dark:text-dark-text mb-3">No Invoices Yet</p>
              <p className="text-neutral-600 dark:text-dark-muted mb-4">Create your first proforma invoice to get started</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn-primary py-3 px-6 inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Create First Invoice
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white dark:bg-dark-card rounded-xl shadow-md border border-neutral-200 dark:border-dark-border p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-neutral-800 dark:text-dark-text">
                      {invoice.invoice_number}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      invoice.status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      invoice.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {invoice.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-dark-muted space-y-1">
                    <p>Date: {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</p>
                    <p>Project: {invoice.projects?.name}</p>
                    <p className="text-lg font-semibold text-neutral-800 dark:text-dark-text mt-2">
                      ₹{invoice.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handlePreviewPDF(invoice)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                    title="Preview PDF"
                  >
                    <Eye size={20} className="text-neutral-600 dark:text-dark-muted" />
                  </button>
                  <button 
                    onClick={() => handleDownloadPDF(invoice)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    <Download size={20} className="text-neutral-600 dark:text-dark-muted" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateProformaModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  )
}

function TaxInvoices() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_invoices')
        .select(`
          *,
          proforma_invoices(invoice_number, projects(name))
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error loading tax invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = () => {
    setShowCreateModal(false)
    loadInvoices()
  }

  const handleDownloadPDF = async (invoice) => {
    try {
      // Load invoice items (from proforma)
      const { data: items, error: itemsError } = await supabase
        .from('proforma_invoice_items')
        .select(`
          *,
          work_items(code, name)
        `)
        .eq('proforma_invoice_id', invoice.proforma_invoice_id)

      if (itemsError) throw itemsError

      // Load project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', invoice.project_id)
        .single()

      if (projectError) throw projectError

      // Load proforma invoice
      const { data: proforma, error: proformaError } = await supabase
        .from('proforma_invoices')
        .select('invoice_number')
        .eq('id', invoice.proforma_invoice_id)
        .single()

      if (proformaError) throw proformaError

      // Add GST rates and payment_date to invoice object if not present
      const invoiceWithRates = {
        ...invoice,
        cgst_rate: invoice.cgst_rate || 9,
        sgst_rate: invoice.sgst_rate || 9,
        payment_date: invoice.payment_date || invoice.invoice_date,
        payment_reference: invoice.transaction_reference || ''
      }

      // Generate and download PDF
      const doc = generateTaxInvoicePDF(invoiceWithRates, items, project, proforma)
      downloadPDF(doc, `${invoice.invoice_number}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  const handlePreviewPDF = async (invoice) => {
    try {
      // Load invoice items (from proforma)
      const { data: items, error: itemsError } = await supabase
        .from('proforma_invoice_items')
        .select(`
          *,
          work_items(code, name)
        `)
        .eq('proforma_invoice_id', invoice.proforma_invoice_id)

      if (itemsError) throw itemsError

      // Load project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', invoice.project_id)
        .single()

      if (projectError) throw projectError

      // Load proforma invoice
      const { data: proforma, error: proformaError } = await supabase
        .from('proforma_invoices')
        .select('invoice_number')
        .eq('id', invoice.proforma_invoice_id)
        .single()

      if (proformaError) throw proformaError

      // Add GST rates and payment_date to invoice object if not present
      const invoiceWithRates = {
        ...invoice,
        cgst_rate: invoice.cgst_rate || 9,
        sgst_rate: invoice.sgst_rate || 9,
        payment_date: invoice.payment_date || invoice.invoice_date,
        payment_reference: invoice.transaction_reference || ''
      }

      // Generate and preview PDF
      const doc = generateTaxInvoicePDF(invoiceWithRates, items, project, proforma)
      previewPDF(doc)
    } catch (error) {
      console.error('Error generating PDF preview:', error)
      alert('Failed to preview PDF. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800 dark:text-dark-text">Tax Invoices</h2>
          <p className="text-neutral-600 dark:text-dark-muted mt-1">GST invoices for received payments</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary text-lg py-3 px-6 flex items-center gap-2"
        >
          <Plus size={20} />
          New Tax Invoice
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-neutral-200 dark:border-dark-border p-12 md:p-16 transition-colors duration-300">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl mx-auto flex items-center justify-center">
              <Receipt size={48} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-neutral-800 dark:text-dark-text mb-3">No Tax Invoices Yet</p>
              <p className="text-neutral-600 dark:text-dark-muted mb-4">Create your first tax invoice for received payments</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn-primary py-3 px-6 inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Create First Tax Invoice
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white dark:bg-dark-card rounded-xl shadow-md border border-neutral-200 dark:border-dark-border p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-neutral-800 dark:text-dark-text">
                      {invoice.invoice_number}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      invoice.status === 'issued' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {invoice.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-dark-muted space-y-1">
                    <p>Date: {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</p>
                    <p>Proforma: {invoice.proforma_invoices?.invoice_number}</p>
                    <p>Payment: ₹{invoice.base_amount_received?.toLocaleString('en-IN')}</p>
                    <p className="text-lg font-semibold text-neutral-800 dark:text-dark-text mt-2">
                      Total: ₹{invoice.total_amount_received?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handlePreviewPDF(invoice)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                    title="Preview PDF"
                  >
                    <Eye size={20} className="text-neutral-600 dark:text-dark-muted" />
                  </button>
                  <button 
                    onClick={() => handleDownloadPDF(invoice)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    <Download size={20} className="text-neutral-600 dark:text-dark-muted" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTaxInvoiceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  )
}

// Create Proforma Invoice Modal Component
function CreateProformaModal({ onClose, onSuccess }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    projectId: '',
    configVersionId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    selectedWorkItems: [],
    cgstRate: 9,
    sgstRate: 9,
    remarks: ''
  })

  const [projects, setProjects] = useState([])
  const [configVersions, setConfigVersions] = useState([])
  const [workItems, setWorkItems] = useState([])
  const [completedWork, setCompletedWork] = useState([])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (formData.projectId) {
      loadConfigVersions()
    }
  }, [formData.projectId])

  useEffect(() => {
    if (formData.configVersionId) {
      loadWorkItemsWithRates()
      loadCompletedWork()
    }
  }, [formData.configVersionId])

  const loadInitialData = async () => {
    try {
      const [projectsRes, workItemsRes] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('work_items').select('*').eq('is_active', true).order('code')
      ])

      setProjects(projectsRes.data || [])
      setWorkItems(workItemsRes.data || [])
      
      // Auto-select first project if available
      if (projectsRes.data && projectsRes.data.length > 0) {
        setFormData(prev => ({ ...prev, projectId: projectsRes.data[0].id }))
      }
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  const loadConfigVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('config_versions')
        .select('*')
        .eq('project_id', formData.projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setConfigVersions(data || [])
      
      // Auto-select first config version if available
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, configVersionId: data[0].id }))
      }
    } catch (err) {
      console.error('Error loading config versions:', err)
    }
  }

  const loadWorkItemsWithRates = async () => {
    try {
      // Load work items for the selected config version
      const { data: workItemsData, error } = await supabase
        .from('work_items')
        .select('*')
        .eq('config_version_id', formData.configVersionId)
        .eq('is_active', true)
        .order('code')

      if (error) throw error

      console.log('Work items with rates:', workItemsData)
      setWorkItems(workItemsData || [])
    } catch (err) {
      console.error('Error loading work items with rates:', err)
    }
  }

  const loadCompletedWork = async () => {
    try {
      // Load all progress entries with work item details
      const { data: entries, error } = await supabase
        .from('progress_entries')
        .select(`
          id,
          flat_id,
          work_item_id,
          quantity_completed,
          work_items!inner(id, code, name)
        `)
        .gt('quantity_completed', 0)

      if (error) {
        console.error('Error querying progress entries:', error)
        throw error
      }

      console.log('Loaded progress entries:', entries)

      // Group by work item and sum quantities
      // Note: Joint refuge flats have quantity_completed = 0.5 for bathrooms
      const workItemMap = {}
      entries?.forEach(entry => {
        const code = entry.work_items?.code
        if (!code) {
          console.log('Entry missing work item code:', entry)
          return
        }

        if (!workItemMap[code]) {
          workItemMap[code] = {
            work_item_code: code,
            work_item_name: entry.work_items.name,
            completed_quantity: 0,
            flats: []
          }
        }
        // Sum the quantity_completed (handles 0.5 for joint refuge bathrooms)
        if (!workItemMap[code].flats.includes(entry.flat_id)) {
          workItemMap[code].flats.push(entry.flat_id)
          workItemMap[code].completed_quantity += (entry.quantity_completed || 1)
        }
      })

      const completedWorkArray = Object.values(workItemMap)
      console.log('Completed work summary:', completedWorkArray)
      setCompletedWork(completedWorkArray)
    } catch (err) {
      console.error('Error loading completed work:', err)
    }
  }

  const calculateTotals = () => {
    const selectedItems = formData.selectedWorkItems
      .map(itemId => {
        const workItem = workItems.find(w => w.id === itemId)
        if (!workItem) return null
        
        const completedFlats = completedWork.filter(w => w.work_item_code === workItem.code)
        const totalQty = completedFlats.reduce((sum, f) => sum + (f.completed_quantity || 0), 0)
        const amount = totalQty * (workItem.rate_per_unit || 0)
        return { workItem, totalQty, amount }
      })
      .filter(item => item !== null)

    const baseAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0)
    const cgstAmount = (baseAmount * formData.cgstRate) / 100
    const sgstAmount = (baseAmount * formData.sgstRate) / 100
    const total = baseAmount + cgstAmount + sgstAmount

    return { selectedItems, baseAmount, cgstAmount, sgstAmount, total }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      if (!formData.projectId || !formData.configVersionId || formData.selectedWorkItems.length === 0) {
        throw new Error('Please select project, config version and at least one work item')
      }

      const { selectedItems, baseAmount, cgstAmount, sgstAmount, total } = calculateTotals()

      // Generate invoice number
      const { data: lastInvoice } = await supabase
        .from('proforma_invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const lastNum = lastInvoice ? parseInt(lastInvoice.invoice_number.split('-')[1]) : 0
      const invoiceNumber = `PI-${String(lastNum + 1).padStart(4, '0')}`

      // Insert invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('proforma_invoices')
        .insert({
          invoice_number: invoiceNumber,
          invoice_date: formData.invoiceDate,
          project_id: formData.projectId,
          config_version_id: formData.configVersionId,
          base_amount: baseAmount,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          total_amount: total,
          remarks: formData.remarks,
          created_by: user.id
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Insert invoice items
      const items = selectedItems.map(item => ({
        proforma_invoice_id: invoice.id,
        work_item_id: item.workItem.id,
        quantity_billed: Math.round(item.totalQty),
        rate: item.workItem.rate_per_unit,
        amount: item.amount
      }))

      const { error: itemsError } = await supabase
        .from('proforma_invoice_items')
        .insert(items)

      if (itemsError) throw itemsError

      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const { selectedItems, baseAmount, cgstAmount, sgstAmount, total } = calculateTotals()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-card border-b border-neutral-200 dark:border-dark-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-800 dark:text-dark-text">Create Proforma Invoice</h2>
            <p className="text-sm text-neutral-600 dark:text-dark-muted mt-1">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-dark-text">Basic Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                  Project *
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
                >
                  <option value="">Select Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                  Config Version *
                </label>
                <select
                  value={formData.configVersionId}
                  onChange={(e) => setFormData({ ...formData, configVersionId: e.target.value })}
                  disabled={!formData.projectId}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text disabled:opacity-50"
                >
                  <option value="">Select Config Version</option>
                  {configVersions.map(config => (
                    <option key={config.id} value={config.id}>
                      Version {config.version_number} - {new Date(config.created_at).toLocaleDateString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                    CGST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cgstRate}
                    onChange={(e) => setFormData({ ...formData, cgstRate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                    SGST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sgstRate}
                    onChange={(e) => setFormData({ ...formData, sgstRate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-dark-text">Select Work Items</h3>
              
              {!formData.configVersionId ? (
                <div className="text-center py-8 text-neutral-600 dark:text-dark-muted">
                  Please select a config version first
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {workItems.filter(item => {
                    // Only show items with completed work
                    const completedFlats = completedWork.filter(w => w.work_item_code === item.code)
                    const totalQty = completedFlats.reduce((sum, f) => sum + (f.completed_quantity || 0), 0)
                    return totalQty > 0
                  }).map(item => {
                    const completedFlats = completedWork.filter(w => w.work_item_code === item.code)
                    const totalQty = completedFlats.reduce((sum, f) => sum + (f.completed_quantity || 0), 0)
                    const isSelected = formData.selectedWorkItems.includes(item.id)
                    const ratePerUnit = item.rate_per_unit || 0
                    const amount = totalQty * ratePerUnit

                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-neutral-200 dark:border-dark-border hover:border-primary-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedWorkItems: [...formData.selectedWorkItems, item.id]
                              })
                            } else {
                              setFormData({
                                ...formData,
                                selectedWorkItems: formData.selectedWorkItems.filter(id => id !== item.id)
                              })
                            }
                          }}
                          className="w-5 h-5"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-neutral-800 dark:text-dark-text">
                            {item.code} - {item.name}
                          </p>
                          <p className="text-sm text-neutral-600 dark:text-dark-muted">
                            {totalQty.toFixed(2)} {item.unit || 'units'} × ₹{ratePerUnit.toLocaleString('en-IN')} = ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                  {workItems.filter(item => {
                    const completedFlats = completedWork.filter(w => w.work_item_code === item.code)
                    const totalQty = completedFlats.reduce((sum, f) => sum + (f.completed_quantity || 0), 0)
                    return totalQty > 0
                  }).length === 0 && (
                    <div className="text-center py-8 text-neutral-600 dark:text-dark-muted">
                      <p className="font-medium mb-2">No completed work items found</p>
                      <p className="text-sm">Please complete some work in Daily Progress first</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-dark-text">Preview & Submit</h3>
              
              {/* Invoice Items */}
              <div className="border border-neutral-200 dark:border-dark-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-dark-hover">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-700 dark:text-dark-text">Item</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-neutral-700 dark:text-dark-text">Qty</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-neutral-700 dark:text-dark-text">Rate</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-neutral-700 dark:text-dark-text">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-dark-border">
                    {selectedItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-neutral-800 dark:text-dark-text">
                          {item.workItem.code} - {item.workItem.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-neutral-800 dark:text-dark-text">
                          {item.totalQty.toFixed(2)} {item.workItem.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-neutral-800 dark:text-dark-text">
                          ₹{item.workItem.rate_per_unit.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-neutral-800 dark:text-dark-text">
                          ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-neutral-50 dark:bg-dark-hover">
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-sm text-right font-medium text-neutral-700 dark:text-dark-text">Base Amount:</td>
                      <td className="px-4 py-2 text-sm text-right font-semibold text-neutral-800 dark:text-dark-text">
                        ₹{baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-sm text-right text-neutral-600 dark:text-dark-muted">CGST @ {formData.cgstRate}%:</td>
                      <td className="px-4 py-2 text-sm text-right text-neutral-800 dark:text-dark-text">
                        ₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-sm text-right text-neutral-600 dark:text-dark-muted">SGST @ {formData.sgstRate}%:</td>
                      <td className="px-4 py-2 text-sm text-right text-neutral-800 dark:text-dark-text">
                        ₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-t-2 border-neutral-300 dark:border-dark-border">
                      <td colSpan="3" className="px-4 py-3 text-base text-right font-bold text-neutral-800 dark:text-dark-text">Total Amount:</td>
                      <td className="px-4 py-3 text-base text-right font-bold text-primary-600 dark:text-primary-400">
                        ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Amount in Words */}
              <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
                <p className="text-sm font-semibold text-neutral-700 dark:text-dark-text mb-1">Amount in Words:</p>
                <p className="text-base font-medium text-primary-700 dark:text-primary-400">
                  {amountToWords(total)}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text resize-none"
                  placeholder="Add any additional notes..."
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text resize-none"
                  placeholder="Add any additional remarks..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-dark-card border-t border-neutral-200 dark:border-dark-border p-6 flex justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-6 py-3 border border-neutral-300 dark:border-dark-border rounded-xl font-semibold text-neutral-700 dark:text-dark-text hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          <button
            onClick={() => step < 3 ? setStep(step + 1) : handleSubmit()}
            disabled={loading || (step === 1 && (!formData.projectId || !formData.configVersionId)) || (step === 2 && formData.selectedWorkItems.length === 0)}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </>
            ) : step === 3 ? (
              <>
                <CheckCircle size={20} />
                Create Invoice
              </>
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Create Tax Invoice Modal Component
function CreateTaxInvoiceModal({ onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [proformaInvoices, setProformaInvoices] = useState([])
  
  const [formData, setFormData] = useState({
    proformaInvoiceId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    paymentAmount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'bank_transfer',
    paymentReference: '',
    cgstRate: 9,
    sgstRate: 9,
    notes: ''
  })

  useEffect(() => {
    loadProformaInvoices()
  }, [])

  const loadProformaInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('proforma_invoices')
        .select('*, projects(name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProformaInvoices(data || [])
    } catch (err) {
      console.error('Error loading proforma invoices:', err)
    }
  }

  const calculateTotals = () => {
    // User enters GST-inclusive amount
    const totalAmount = parseFloat(formData.paymentAmount) || 0
    
    // Calculate base amount by removing GST
    // Total = Base + (Base * 18%)
    // Total = Base * 1.18
    // Base = Total / 1.18
    const gstMultiplier = 1 + (formData.cgstRate + formData.sgstRate) / 100
    const baseAmount = totalAmount / gstMultiplier
    const cgstAmount = (baseAmount * formData.cgstRate) / 100
    const sgstAmount = (baseAmount * formData.sgstRate) / 100
    const total = totalAmount

    return { baseAmount, cgstAmount, sgstAmount, total }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      if (!formData.proformaInvoiceId || !formData.paymentAmount) {
        throw new Error('Please fill all required fields')
      }

      const { baseAmount, cgstAmount, sgstAmount, total } = calculateTotals()

      // Generate invoice number
      const { data: lastInvoice } = await supabase
        .from('tax_invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const lastNum = lastInvoice ? parseInt(lastInvoice.invoice_number.split('-')[1]) : 0
      const invoiceNumber = `TI-${String(lastNum + 1).padStart(4, '0')}`

      // Get project_id from proforma invoice
      const proformaInvoice = proformaInvoices.find(inv => inv.id === formData.proformaInvoiceId)

      // Insert tax invoice
      const { error: invoiceError } = await supabase
        .from('tax_invoices')
        .insert({
          invoice_number: invoiceNumber,
          invoice_date: formData.invoiceDate,
          project_id: proformaInvoice.project_id,
          proforma_invoice_id: formData.proformaInvoiceId,
          base_amount_received: baseAmount,
          payment_mode: formData.paymentMode,
          transaction_reference: formData.paymentReference,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          total_amount_received: total,
          remarks: formData.notes,
          status: 'issued',
          created_by: user.id
        })

      if (invoiceError) throw invoiceError

      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const { baseAmount, cgstAmount, sgstAmount, total } = calculateTotals()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-card border-b border-neutral-200 dark:border-dark-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-800 dark:text-dark-text">Create Tax Invoice</h2>
            <p className="text-sm text-neutral-600 dark:text-dark-muted mt-1">Generate GST invoice for received payment</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
              Proforma Invoice *
            </label>
            <select
              value={formData.proformaInvoiceId}
              onChange={(e) => setFormData({ ...formData, proformaInvoiceId: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
            >
              <option value="">Select Proforma Invoice</option>
              {proformaInvoices.map(invoice => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} - {invoice.projects?.name} - ₹{invoice.total_amount.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Invoice Date *
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Payment Date *
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
              Payment Amount * (Including GST)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.paymentAmount}
              onChange={(e) => setFormData({ ...formData, paymentAmount: parseFloat(e.target.value) })}
              className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
              placeholder="Enter total amount received (with GST)"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Enter the total amount including 18% GST (CGST 9% + SGST 9%)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Payment Mode *
              </label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Payment Reference
              </label>
              <input
                type="text"
                value={formData.paymentReference}
                onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
                placeholder="UTR/Cheque No."
              />
            </div>
          </div>

          {/* GST Calculation Preview */}
          <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600 dark:text-dark-muted">Base Amount (Excl. GST):</span>
              <span className="font-semibold text-neutral-800 dark:text-dark-text">₹{baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600 dark:text-dark-muted">CGST @ {formData.cgstRate}%:</span>
              <span className="text-neutral-800 dark:text-dark-text">₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600 dark:text-dark-muted">SGST @ {formData.sgstRate}%:</span>
              <span className="text-neutral-800 dark:text-dark-text">₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-neutral-200 dark:border-dark-border">
              <span className="text-neutral-800 dark:text-dark-text">Total with GST:</span>
              <span className="text-primary-600 dark:text-primary-400">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Amount in Words */}
          {total > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <p className="text-sm font-semibold text-neutral-700 dark:text-dark-text mb-1">Amount in Words:</p>
              <p className="text-base font-medium text-green-700 dark:text-green-400">
                {amountToWords(total)}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="3"
              className="w-full px-4 py-3 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text resize-none"
              placeholder="Add any additional notes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-dark-card border-t border-neutral-200 dark:border-dark-border p-6 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-neutral-300 dark:border-dark-border rounded-xl font-semibold text-neutral-700 dark:text-dark-text hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.proformaInvoiceId || !formData.paymentAmount}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <Receipt size={20} />
                Create Tax Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

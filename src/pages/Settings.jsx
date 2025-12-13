import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import { Lock, Unlock, Save, AlertCircle } from 'lucide-react'

export default function Settings() {
  const { isDark } = useTheme()
  const [configVersion, setConfigVersion] = useState(null)
  const [workItems, setWorkItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadConfigData()
  }, [])

  const loadConfigData = async () => {
    try {
      setLoading(true)

      // Get active config version
      const { data: version } = await supabase
        .from('config_versions')
        .select('*')
        .eq('is_active', true)
        .single()

      setConfigVersion(version)

      // Get work items for this version
      const { data: items } = await supabase
        .from('work_items')
        .select('*')
        .eq('config_version_id', version.id)
        .order('code')

      setWorkItems(items || [])
    } catch (err) {
      console.error('Error loading config:', err)
      setError('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleWorkItemChange = (index, field, value) => {
    const updated = [...workItems]
    updated[index] = { ...updated[index], [field]: value }
    setWorkItems(updated)
  }

  const handleSave = async () => {
    if (configVersion?.is_locked) {
      setError('Configuration is locked. Create a new version to make changes.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Update work items
      for (const item of workItems) {
        const { error: updateError } = await supabase
          .from('work_items')
          .update({
            name: item.name,
            total_quantity: item.total_quantity,
          })
          .eq('id', item.id)

        if (updateError) throw updateError
      }

      setSuccess('Configuration saved successfully!')
      await loadConfigData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background-soft via-white to-primary-50/30 dark:from-dark-bg dark:via-dark-bg dark:to-dark-card">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-soft via-white to-primary-50/30 dark:from-dark-bg dark:via-dark-bg dark:to-dark-card pb-20 md:pb-6 transition-colors duration-300">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-blue-700 text-white px-4 py-8 md:px-6 md:py-10 shadow-soft-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Project Configuration</h1>
          <p className="text-primary-100 dark:text-primary-200 mt-2 text-lg">Manage work items and project settings</p>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
        {/* Configuration Status */}
        <div className={`bg-white dark:bg-dark-card rounded-2xl shadow-soft dark:shadow-none border dark:border-dark-border p-6 transition-all ${configVersion?.is_locked ? 'border-2 border-progress-partial' : 'border-2 border-progress-complete'}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text flex items-center gap-3 mb-3">
                Configuration Version {configVersion?.version_number}
                {configVersion?.is_locked ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-progress-partial/10 text-progress-partial rounded-xl text-sm font-semibold">
                    <Lock size={18} />
                    Locked
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-progress-complete/10 text-progress-complete rounded-xl text-sm font-semibold">
                    <Unlock size={18} />
                    Active
                  </div>
                )}
              </h2>
              <p className="text-neutral-600 dark:text-dark-muted">
                {configVersion?.is_locked
                  ? `Locked on ${new Date(configVersion.locked_at).toLocaleDateString('en-IN')} - No changes allowed`
                  : 'Active and editable until first proforma invoice is generated'}
              </p>
            </div>
          </div>
        </div>

        {/* Work Items Configuration */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft dark:shadow-none border border-neutral-100 dark:border-dark-border hover:shadow-soft-md transition-all">
          <div className="p-4 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-neutral-800 dark:text-dark-text mb-4 md:mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
              Work Items Configuration
            </h2>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto -mx-8 px-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-neutral-200 dark:border-dark-border">
                    <th className="text-left py-4 px-3 text-sm font-bold text-neutral-700 dark:text-dark-muted uppercase tracking-wide">Code</th>
                    <th className="text-left py-4 px-3 text-sm font-bold text-neutral-700 dark:text-dark-muted uppercase tracking-wide">Name</th>
                    <th className="text-left py-4 px-3 text-sm font-bold text-neutral-700 dark:text-dark-muted uppercase tracking-wide">Unit</th>
                    <th className="text-left py-4 px-3 text-sm font-bold text-neutral-700 dark:text-dark-muted uppercase tracking-wide">Total Qty</th>
                    <th className="text-left py-4 px-3 text-sm font-bold text-neutral-700 dark:text-dark-muted uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workItems.map((item, index) => (
                    <tr key={item.id} className="border-b border-neutral-100 dark:border-dark-border hover:bg-primary-50/30 dark:hover:bg-dark-hover transition-colors">
                      <td className="py-4 px-3">
                        <span className="px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold rounded-lg font-mono text-sm">
                          {item.code}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleWorkItemChange(index, 'name', e.target.value)}
                          disabled={configVersion?.is_locked}
                          className="input-field w-full bg-white dark:bg-dark-hover dark:border-dark-border dark:text-dark-text"
                        />
                      </td>
                      <td className="py-4 px-3 text-neutral-600 dark:text-dark-muted font-medium">
                        {item.unit}
                      </td>
                      <td className="py-4 px-3">
                        <input
                          type="number"
                          value={item.total_quantity}
                          onChange={(e) => handleWorkItemChange(index, 'total_quantity', parseInt(e.target.value) || 0)}
                          disabled={configVersion?.is_locked || item.is_quantity_locked}
                          className="input-field w-28 bg-white dark:bg-dark-hover dark:border-dark-border dark:text-dark-text"
                        />
                      </td>
                      <td className="py-4 px-3">
                        {item.is_quantity_locked ? (
                          <span className="badge-danger">
                            <Lock size={14} /> Locked
                          </span>
                        ) : (
                          <span className="badge-success">
                            <Unlock size={14} /> Editable
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {workItems.map((item, index) => (
                <div key={item.id} className="bg-gradient-to-br from-neutral-50 to-white dark:from-dark-hover dark:to-dark-card border-2 border-neutral-200 dark:border-dark-border rounded-xl p-4 shadow-sm">
                  {/* Header with Code and Status */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold rounded-lg font-mono text-lg">
                      {item.code}
                    </span>
                    {item.is_quantity_locked ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold">
                        <Lock size={14} /> Locked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-xs font-semibold">
                        <Unlock size={14} /> Editable
                      </span>
                    )}
                  </div>

                  {/* Name Field */}
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-dark-muted mb-1.5 uppercase tracking-wide">
                      Work Item Name
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleWorkItemChange(index, 'name', e.target.value)}
                      disabled={configVersion?.is_locked}
                      className="w-full px-3 py-2.5 bg-white dark:bg-dark-bg border-2 border-neutral-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-medium text-neutral-800 dark:text-dark-text transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Unit and Quantity Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 dark:text-dark-muted mb-1.5 uppercase tracking-wide">
                        Unit
                      </label>
                      <div className="px-3 py-2.5 bg-neutral-100 dark:bg-dark-bg border-2 border-neutral-200 dark:border-dark-border rounded-lg text-sm font-semibold text-neutral-700 dark:text-dark-text">
                        {item.unit}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 dark:text-dark-muted mb-1.5 uppercase tracking-wide">
                        Total Quantity
                      </label>
                      <input
                        type="number"
                        value={item.total_quantity}
                        onChange={(e) => handleWorkItemChange(index, 'total_quantity', parseInt(e.target.value) || 0)}
                        disabled={configVersion?.is_locked || item.is_quantity_locked}
                        className="w-full px-3 py-2.5 bg-white dark:bg-dark-bg border-2 border-neutral-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-semibold text-neutral-800 dark:text-dark-text transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="mx-4 md:mx-8 mb-4 md:mb-8 p-4 md:p-6 bg-gradient-to-r from-blue-50 to-primary-50 dark:from-blue-900/20 dark:to-primary-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex-shrink-0">
                <AlertCircle size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-neutral-800 dark:text-dark-text mb-2 md:mb-3 text-base md:text-lg">Important Notes:</p>
                <ul className="space-y-2 text-sm md:text-base text-neutral-700 dark:text-dark-muted">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                    <span>Items C, D, E, F, G have locked quantities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                    <span>Items A, B, H, I can be edited before first invoice</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
                    <span>After first invoice, all items are locked</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-progress-pending/10 border-2 border-progress-pending text-progress-pending px-6 py-4 rounded-2xl flex items-start gap-3 shadow-soft">
            <AlertCircle size={24} className="flex-shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-progress-complete/10 border-2 border-progress-complete text-progress-complete px-6 py-4 rounded-2xl font-medium shadow-soft">
            {success}
          </div>
        )}

        {/* Save Button */}
        {!configVersion?.is_locked && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-3"
          >
            <Save size={24} />
            {saving ? 'Saving Changes...' : 'Save Configuration'}
          </button>
        )}
      </div>
    </div>
  )
}

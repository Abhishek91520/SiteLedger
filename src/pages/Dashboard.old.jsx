import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatIndianCurrency, calculatePercentage, formatPercentage } from '../utils/format'
import { TrendingUp, Building2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function Dashboard() {
  const [project, setProject] = useState(null)
  const [stats, setStats] = useState({
    totalFlats: 0,
    totalWorkItems: 0,
    overallCompletion: 0,
    unbilledWork: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .single()

      if (projectError) throw projectError

      // Count total flats
      const { count: flatCount } = await supabase
        .from('flats')
        .select('*', { count: 'exact', head: true })

      // Count active work items
      const { data: workItems } = await supabase
        .from('work_items')
        .select('id, total_quantity')
        .eq('is_active', true)

      // Calculate overall completion
      const { data: progressData } = await supabase
        .from('progress_entries')
        .select('quantity_completed, work_item_id')

      // Calculate total expected and completed
      const totalExpected = (workItems || []).reduce((sum, item) => sum + item.total_quantity, 0)
      const totalCompleted = (progressData || []).reduce((sum, entry) => sum + entry.quantity_completed, 0)
      const overallCompletion = calculatePercentage(totalCompleted, totalExpected)

      // Count unbilled entries
      const { count: unbilledCount } = await supabase
        .from('progress_entries')
        .select('*', { count: 'exact', head: true })
        .eq('is_billed', false)

      setProject(projectData)
      setStats({
        totalFlats: flatCount || 0,
        totalWorkItems: workItems?.length || 0,
        overallCompletion: overallCompletion || 0,
        unbilledWork: unbilledCount || 0,
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          No project found. Please check database setup.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-soft via-white to-primary-50/30 pb-20 md:pb-6">
      {/* Header with Modern Gradient */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-8 md:px-6 md:py-10 shadow-soft-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-primary-100 mt-2 text-lg">Construction Execution & Billing Dashboard</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
        {/* Project Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Contract Value */}
          <div className="stat-card group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-500 mb-2">Contract Value (with GST)</p>
                <p className="text-2xl md:text-3xl font-bold text-neutral-800 mb-3">
                  {formatIndianCurrency(project.total_value)}
                </p>
                <p className="text-xs text-neutral-400">
                  {project.area_sqft.toLocaleString('en-IN')} sq ft × ₹{project.rate_per_sqft}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl group-hover:scale-110 transition-transform">
                <Building2 className="text-primary-600" size={28} />
              </div>
            </div>
          </div>

          {/* Overall Completion */}
          <div className="stat-card group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-500 mb-2">Overall Completion</p>
                <p className="text-2xl md:text-3xl font-bold text-neutral-800 mb-1">
                  {formatPercentage(stats.overallCompletion)}
                </p>
                {/* Progress Bar */}
                <div className="progress-bar mt-3">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${stats.overallCompletion}%` }}
                  ></div>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl group-hover:scale-110 transition-transform">
                <TrendingUp className="text-green-600" size={28} />
              </div>
            </div>
          </div>

          {/* Total Flats */}
          <div className="stat-card group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-500 mb-2">Total Flats</p>
                <p className="text-2xl md:text-3xl font-bold text-neutral-800 mb-3">{stats.totalFlats}</p>
                <p className="text-xs text-neutral-400">Across 3 wings</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl group-hover:scale-110 transition-transform">
                <CheckCircle2 className="text-blue-600" size={28} />
              </div>
            </div>
          </div>

          {/* Unbilled Work */}
          <div className="stat-card group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-500 mb-2">Unbilled Entries</p>
                <p className="text-2xl md:text-3xl font-bold text-neutral-800 mb-3">{stats.unbilledWork}</p>
                <p className="text-xs text-neutral-400">Ready for billing</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl group-hover:scale-110 transition-transform">
                <AlertCircle className="text-amber-600" size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Contract Details */}
        <div className="card hover-glow">
          <div className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-neutral-800 mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
              Contract Breakdown
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-4 border-b border-neutral-100">
                <span className="text-neutral-600 font-medium">Base Value</span>
                <span className="font-bold text-neutral-800 text-lg">{formatIndianCurrency(project.base_value)}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-neutral-100">
                <span className="text-neutral-600 font-medium">CGST ({project.cgst_rate}%)</span>
                <span className="font-bold text-neutral-800 text-lg">
                  {formatIndianCurrency(project.base_value * (project.cgst_rate / 100))}
                </span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-neutral-100">
                <span className="text-neutral-600 font-medium">SGST ({project.sgst_rate}%)</span>
                <span className="font-bold text-neutral-800 text-lg">
                  {formatIndianCurrency(project.base_value * (project.sgst_rate / 100))}
                </span>
              </div>
              <div className="flex justify-between items-center py-5 mt-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl px-4">
                <span className="text-lg font-bold text-neutral-800">Total Contract Value</span>
                <span className="text-2xl font-extrabold text-primary-600">
                  {formatIndianCurrency(project.total_value)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Wing Summary */}
        <div className="card hover-glow">
          <div className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-neutral-800 mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
              Wing Summary
            </h2>
            <div className="space-y-4">
              <WingSummaryRow wing="A" floors={16} flatsPerFloor="4 (3×2BHK + 1×1BHK)" totalFlats={64} />
              <WingSummaryRow wing="B" floors={16} flatsPerFloor="7 (3×2BHK + 4×1BHK)" totalFlats={112} />
              <WingSummaryRow wing="C" floors={17} flatsPerFloor="6+4 (varies)" totalFlats={100} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-neutral-800 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a href="/daily-progress" className="card hover-glow group cursor-pointer p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="text-primary-600" size={24} />
                </div>
                <h3 className="font-bold text-neutral-800 text-lg">Add Progress Entry</h3>
              </div>
              <p className="text-neutral-600">Record daily construction progress with work items</p>
            </a>
            <a href="/visual-progress" className="card hover-glow group cursor-pointer p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl group-hover:scale-110 transition-transform">
                  <Building2 className="text-purple-600" size={24} />
                </div>
                <h3 className="font-bold text-neutral-800 text-lg">View Progress</h3>
              </div>
              <p className="text-neutral-600">3D visualization of work status across all wings</p>
            </a>
            <a href="/billing" className="card hover-glow group cursor-pointer p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
                <h3 className="font-bold text-neutral-800 text-lg">Generate Invoice</h3>
              </div>
              <p className="text-neutral-600">Create proforma or tax invoices for completed work</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function WingSummaryRow({ wing, floors, flatsPerFloor, totalFlats }) {
  return (
    <div className="flex items-center justify-between py-5 px-6 bg-gradient-to-r from-neutral-50 to-primary-50/30 hover:from-primary-50 hover:to-primary-100/30 rounded-xl border border-neutral-100 transition-all group">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-soft group-hover:scale-110 transition-transform">
          {wing}
        </div>
        <div>
          <p className="font-bold text-neutral-800 text-lg mb-1">Wing {wing}</p>
          <p className="text-sm text-neutral-600">{floors} floors • {flatsPerFloor}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-3xl font-bold text-primary-600">{totalFlats}</p>
        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">total flats</p>
      </div>
    </div>
  )
}

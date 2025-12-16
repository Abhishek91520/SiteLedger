import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import { Moon, Sun, TrendingUp, CheckCircle2, Clock, AlertCircle, Activity, Layers, Filter, FileText, Camera, Award, Calendar, BarChart3, Download, Target, Zap, Users, X } from 'lucide-react'
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart 
} from 'recharts'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import html2canvas from 'html2canvas'
import { format, subDays, parseISO } from 'date-fns'

const WING_COLORS = ['#0EA5E9', '#A855F7', '#14B8A6']

export default function Dashboard() {
  const { isDark, toggleTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState(null)
  const [workItemsProgress, setWorkItemsProgress] = useState([])
  const [wingProgress, setWingProgress] = useState([])
  const [recentEntries, setRecentEntries] = useState([])
  const [completionTimeline, setCompletionTimeline] = useState([])
  const [topPerformingFloors, setTopPerformingFloors] = useState([])
  const [documentationStats, setDocumentationStats] = useState({ withNotes: 0, withImages: 0, withBoth: 0, noDocs: 0 })
  const [overallStats, setOverallStats] = useState({
    totalFlats: 0,
    completedFlats: 0,
    inProgressFlats: 0,
    overallCompletion: 0,
    totalEntries: 0,
  })
  
  // Filter states
  const [filterWing, setFilterWing] = useState('ALL')
  const [filterWorkItem, setFilterWorkItem] = useState('ALL')
  const [filterDateRange, setFilterDateRange] = useState(30) // Last 30 days
  const [wings, setWings] = useState([])
  
  // Modal states for interactive cards
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [modalData, setModalData] = useState(null)
  const [modalTitle, setModalTitle] = useState('')

  useEffect(() => {
    loadDashboardData()
  }, [])
  
  // Reload data when filters change
  useEffect(() => {
    if (!loading) {
      loadFilteredData()
    }
  }, [filterWing, filterWorkItem, filterDateRange])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load project
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .single()

      setProject(projectData)

      // Load work items progress
      const { data: workItems } = await supabase
        .from('work_items')
        .select('*')
        .eq('is_active', true)
        .order('code')

      // Get all progress entries
      const { data: allProgressEntries } = await supabase
        .from('progress_entries')
        .select('work_item_id, quantity_completed')

      const workItemsWithProgress = (workItems || []).map(item => {
        const itemEntries = (allProgressEntries || []).filter(entry => entry.work_item_id === item.id)
        const completed = itemEntries.reduce((sum, entry) => sum + entry.quantity_completed, 0)
        const percentage = item.total_quantity > 0 ? (completed / item.total_quantity) * 100 : 0
        return {
          name: item.code,
          fullName: item.name,
          completed,
          total: item.total_quantity,
          percentage: Math.round(percentage),
          remaining: item.total_quantity - completed,
        }
      })
      setWorkItemsProgress(workItemsWithProgress)

      // Load wing progress
      const { data: wings } = await supabase
        .from('wings')
        .select('id, code, name')
        .order('code')

      // Get flats per wing
      const { data: allFlatsWithProgress } = await supabase
        .from('flats')
        .select(`
          id,
          floor_id,
          floors!inner(wing_id)
        `)

      // Get progress entries per flat
      const { data: flatProgressCounts } = await supabase
        .from('progress_entries')
        .select('flat_id')

      const wingData = (wings || []).map(wing => {
        const wingFlats = (allFlatsWithProgress || []).filter(flat => flat.floors.wing_id === wing.id)
        const totalFlats = wingFlats.length
        const flatsWithProgress = wingFlats.filter(flat => 
          (flatProgressCounts || []).some(p => p.flat_id === flat.id)
        ).length
        const completionPercentage = totalFlats > 0 ? (flatsWithProgress / totalFlats) * 100 : 0
        
        return {
          name: `Wing ${wing.code}`,
          totalFlats,
          withProgress: flatsWithProgress,
          pending: totalFlats - flatsWithProgress,
          completion: Math.round(completionPercentage),
        }
      })
      setWingProgress(wingData)

      // Load recent entries
      const { data: entries } = await supabase
        .from('progress_entries')
        .select('*, flats(flat_number, floors(wings(code))), work_items(code, name)')
        .order('entry_date', { ascending: false })
        .limit(10)

      // Transform the data structure
      const transformedEntries = (entries || []).map(entry => ({
        ...entry,
        flat: {
          flat_number: entry.flats?.flat_number,
          wing: {
            code: entry.flats?.floors?.wings?.code
          }
        },
        work_item: entry.work_items
      }))

      setRecentEntries(transformedEntries)

      // Calculate overall stats
      const { count: totalFlats } = await supabase
        .from('flats')
        .select('*', { count: 'exact', head: true })

      const { data: flatsWithEntries } = await supabase
        .from('progress_entries')
        .select('flat_id')

      const uniqueFlatsWithProgress = new Set((flatsWithEntries || []).map(e => e.flat_id))
      const flatsWithSomeProgress = uniqueFlatsWithProgress.size

      const { count: totalProgressEntries } = await supabase
        .from('progress_entries')
        .select('*', { count: 'exact', head: true })
      
      // Calculate overall completion based on work items
      const overallCompletion = workItemsWithProgress.length > 0
        ? workItemsWithProgress.reduce((sum, item) => sum + item.percentage, 0) / workItemsWithProgress.length
        : 0

      setOverallStats({
        totalFlats,
        completedFlats: 0,
        inProgressFlats: flatsWithSomeProgress,
        overallCompletion: Math.round(overallCompletion),
        totalEntries: totalProgressEntries,
      })

      setWings(wings || [])

      // Load completion timeline (last 30 days)
      await loadCompletionTimeline()
      
      // Load top performing floors
      await loadTopPerformingFloors()
      
      // Load documentation stats
      await loadDocumentationStats()

    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFilteredData = async () => {
    try {
      // Reload timeline, top floors with current filters
      await loadCompletionTimeline()
      await loadTopPerformingFloors()
    } catch (error) {
      console.error('Error loading filtered data:', error)
    }
  }

  const loadCompletionTimeline = async () => {
    try {
      const daysAgo = filterDateRange
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)
      
      let query = supabase
        .from('progress_entries')
        .select('entry_date, quantity_completed, flat_id, work_item_id, flats!inner(floor_id, floors!inner(wing_id, wings(code)))')
        .gte('entry_date', startDate.toISOString().split('T')[0])
      
      // Apply wing filter
      if (filterWing !== 'ALL') {
        query = query.eq('flats.floors.wings.code', filterWing)
      }
      
      // Apply work item filter
      if (filterWorkItem !== 'ALL') {
        const workItem = workItemsProgress.find(w => w.name === filterWorkItem)
        if (workItem) {
          const { data: wiData } = await supabase
            .from('work_items')
            .select('id')
            .eq('code', workItem.name)
            .single()
          if (wiData) {
            query = query.eq('work_item_id', wiData.id)
          }
        }
      }
      
      query = query.order('entry_date')
      const { data } = await query

      // Group by date
      const grouped = {}
      data?.forEach(entry => {
        const date = entry.entry_date
        if (!grouped[date]) {
          grouped[date] = { date, count: 0, quantity: 0 }
        }
        grouped[date].count += 1
        grouped[date].quantity += entry.quantity_completed
      })

      const timeline = Object.values(grouped).map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        entries: item.count,
        quantity: Math.round(item.quantity)
      }))

      setCompletionTimeline(timeline)
    } catch (error) {
      console.error('Error loading timeline:', error)
    }
  }

  const loadTopPerformingFloors = async () => {
    try {
      const { data: floors } = await supabase
        .from('floors')
        .select(`
          id,
          floor_number,
          wings(code),
          flats(id)
        `)
        .order('floor_number')

      const floorStats = await Promise.all((floors || []).map(async (floor) => {
        const flatIds = floor.flats.map(f => f.id)
        if (flatIds.length === 0) return null

        const { data: progress } = await supabase
          .from('progress_entries')
          .select('flat_id, work_item_id')
          .in('flat_id', flatIds)

        const { data: workItems } = await supabase
          .from('work_items')
          .select('id')
          .eq('is_active', true)

        const totalPossible = flatIds.length * (workItems?.length || 0)
        const completed = new Set(progress?.map(p => `${p.flat_id}-${p.work_item_id}`) || []).size
        const percentage = totalPossible > 0 ? (completed / totalPossible) * 100 : 0

        return {
          floor: `Wing ${floor.wings.code} - Floor ${floor.floor_number}`,
          completion: Math.round(percentage),
          flats: flatIds.length
        }
      }))

      const validStats = floorStats.filter(s => s !== null)
      const sorted = validStats.sort((a, b) => b.completion - a.completion).slice(0, 10)
      setTopPerformingFloors(sorted)
    } catch (error) {
      console.error('Error loading floor stats:', error)
    }
  }

  const loadDocumentationStats = async () => {
    try {
      const { data: allFlats } = await supabase.from('flats').select('id')
      const { data: notes } = await supabase.from('flat_notes').select('flat_id')
      const { data: images } = await supabase.from('flat_images').select('flat_id')

      const flatsWithNotes = new Set(notes?.map(n => n.flat_id) || [])
      const flatsWithImages = new Set(images?.map(i => i.flat_id) || [])
      const flatsWithBoth = [...flatsWithNotes].filter(id => flatsWithImages.has(id))
      const flatsWithAny = new Set([...flatsWithNotes, ...flatsWithImages])
      const totalFlats = allFlats?.length || 0

      setDocumentationStats({
        withNotes: flatsWithNotes.size,
        withImages: flatsWithImages.size,
        withBoth: flatsWithBoth.length,
        noDocs: totalFlats - flatsWithAny.size,
        total: totalFlats
      })
    } catch (error) {
      console.error('Error loading documentation stats:', error)
    }
  }

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      
      // Title
      pdf.setFontSize(20)
      pdf.text(project?.name || 'Project Dashboard', pageWidth / 2, 20, { align: 'center' })
      pdf.setFontSize(12)
      pdf.text(`Generated: ${format(new Date(), 'PPP')}`, pageWidth / 2, 28, { align: 'center' })
      
      // Overall Stats
      pdf.setFontSize(14)
      pdf.text('Overall Statistics', 14, 40)
      const statsData = [
        ['Total Flats', overallStats.totalFlats],
        ['In Progress', overallStats.inProgressFlats],
        ['Overall Completion', `${overallStats.overallCompletion}%`],
        ['Total Entries', overallStats.totalEntries]
      ]
      pdf.autoTable({ startY: 45, head: [['Metric', 'Value']], body: statsData, theme: 'grid' })
      
      // Work Items Progress
      pdf.text('Work Items Progress', 14, pdf.lastAutoTable.finalY + 15)
      const workItemsData = workItemsProgress.map(item => [
        item.name,
        item.fullName,
        `${item.completed}/${item.total}`,
        `${item.percentage}%`
      ])
      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 20,
        head: [['Code', 'Name', 'Progress', 'Completion']],
        body: workItemsData,
        theme: 'striped'
      })
      
      pdf.save(`${project?.name || 'Dashboard'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF')
    }
  }

  const exportToCSV = () => {
    try {
      let csv = 'Work Item,Name,Completed,Total,Percentage\n'
      workItemsProgress.forEach(item => {
        csv += `${item.name},"${item.fullName}",${item.completed},${item.total},${item.percentage}%\n`
      })
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project?.name || 'Dashboard'}_${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV')
    }
  }

  const calculateProjection = () => {
    if (completionTimeline.length < 7) return null
    
    const recentData = completionTimeline.slice(-7)
    const avgDailyProgress = recentData.reduce((sum, d) => sum + d.quantity, 0) / recentData.length
    
    const remainingWork = workItemsProgress.reduce((sum, item) => sum + item.remaining, 0)
    const daysToComplete = avgDailyProgress > 0 ? Math.ceil(remainingWork / avgDailyProgress) : null
    
    return {
      avgDailyProgress: Math.round(avgDailyProgress * 10) / 10,
      estimatedCompletion: daysToComplete ? format(addDays(new Date(), daysToComplete), 'PPP') : 'N/A',
      daysRemaining: daysToComplete
    }
  }

  const addDays = (date, days) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-soft via-white to-primary-50/30 dark:from-dark-bg dark:via-dark-bg dark:to-dark-card pb-20 md:pb-6 transition-colors duration-300">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-blue-700 text-white px-4 py-8 md:px-6 md:py-10 shadow-soft-lg"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{project?.name}</h1>
            <p className="text-primary-100 dark:text-primary-200 mt-2 text-lg">Work Progress Analytics</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-colors"
          >
            {isDark ? <Sun size={24} /> : <Moon size={24} />}
          </motion.button>
        </div>
      </motion.div>

      <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
        {/* Filters & Export */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-card rounded-2xl shadow-soft border border-neutral-200 dark:border-dark-border p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text">Filters & Export</h2>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors"
              >
                <Download size={16} />
                PDF
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors"
              >
                <Download size={16} />
                CSV
              </motion.button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Wing
              </label>
              <select
                value={filterWing}
                onChange={(e) => setFilterWing(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
              >
                <option value="ALL">All Wings</option>
                {wings.map(wing => (
                  <option key={wing.id} value={wing.code}>Wing {wing.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Timeline Range
              </label>
              <select
                value={filterDateRange}
                onChange={(e) => {
                  setFilterDateRange(Number(e.target.value))
                  loadCompletionTimeline()
                }}
                className="w-full px-4 py-2.5 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="60">Last 60 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-dark-text mb-2">
                Work Item
              </label>
              <select
                value={filterWorkItem}
                onChange={(e) => setFilterWorkItem(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-dark-hover border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
              >
                <option value="ALL">All Work Items</option>
                {workItemsProgress.map(item => (
                  <option key={item.name} value={item.name}>{item.name} - {item.fullName}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Circular Progress Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl shadow-soft border border-blue-200 dark:border-blue-800 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Target size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-neutral-800 dark:text-dark-text">Overall Progress</h3>
            </div>
            <div className="w-48 h-48 mx-auto">
              <CircularProgressbar
                value={overallStats.overallCompletion}
                text={`${overallStats.overallCompletion}%`}
                styles={buildStyles({
                  textSize: '20px',
                  pathColor: '#0EA5E9',
                  textColor: isDark ? '#F1F5F9' : '#1E293B',
                  trailColor: isDark ? '#334155' : '#E2E8F0',
                  pathTransitionDuration: 1.5
                })}
              />
            </div>
            <p className="text-center text-sm text-neutral-600 dark:text-dark-muted mt-4">
              {overallStats.totalEntries} total entries recorded
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl shadow-soft border border-green-200 dark:border-green-800 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-600 rounded-lg">
                <Zap size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-neutral-800 dark:text-dark-text">Active Flats</h3>
            </div>
            <div className="w-48 h-48 mx-auto">
              <CircularProgressbar
                value={(overallStats.inProgressFlats / overallStats.totalFlats) * 100}
                text={`${overallStats.inProgressFlats}`}
                styles={buildStyles({
                  textSize: '24px',
                  pathColor: '#10B981',
                  textColor: isDark ? '#F1F5F9' : '#1E293B',
                  trailColor: isDark ? '#334155' : '#E2E8F0',
                  pathTransitionDuration: 1.5
                })}
              />
            </div>
            <p className="text-center text-sm text-neutral-600 dark:text-dark-muted mt-4">
              of {overallStats.totalFlats} total flats
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl shadow-soft border border-purple-200 dark:border-purple-800 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Award size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-neutral-800 dark:text-dark-text">Documentation</h3>
            </div>
            <div className="w-48 h-48 mx-auto">
              <CircularProgressbar
                value={documentationStats.total > 0 ? ((documentationStats.withNotes + documentationStats.withImages) / documentationStats.total) * 100 : 0}
                text={`${documentationStats.total > 0 ? Math.round(((documentationStats.withNotes + documentationStats.withImages) / documentationStats.total) * 100) : 0}%`}
                styles={buildStyles({
                  textSize: '20px',
                  pathColor: '#A855F7',
                  textColor: isDark ? '#F1F5F9' : '#1E293B',
                  trailColor: isDark ? '#334155' : '#E2E8F0',
                  pathTransitionDuration: 1.5
                })}
              />
            </div>
            <p className="text-center text-sm text-neutral-600 dark:text-dark-muted mt-4">
              {documentationStats.withNotes + documentationStats.withImages} flats documented
            </p>
          </motion.div>
        </div>

        {/* Project Projection */}
        {(() => {
          const projection = calculateProjection()
          return projection && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-2xl shadow-lg p-6 text-white"
            >
              <div className="flex items-center gap-3 mb-4">
                <Calendar size={28} />
                <h2 className="text-2xl font-bold">Project Projection</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-indigo-100 text-sm mb-1">Avg Daily Progress</p>
                  <p className="text-3xl font-bold">{projection.avgDailyProgress}</p>
                  <p className="text-indigo-200 text-xs mt-1">units/day</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-indigo-100 text-sm mb-1">Days Remaining</p>
                  <p className="text-3xl font-bold">{projection.daysRemaining || 'N/A'}</p>
                  <p className="text-indigo-200 text-xs mt-1">estimated days</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-indigo-100 text-sm mb-1">Est. Completion</p>
                  <p className="text-xl font-bold">{projection.estimatedCompletion}</p>
                  <p className="text-indigo-200 text-xs mt-1">projected date</p>
                </div>
              </div>
            </motion.div>
          )
        })()}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Layers}
            label="Total Flats"
            value={overallStats.totalFlats}
            color="blue"
            delay={0.5}
            onClick={() => {
              setModalTitle('Total Flats Breakdown')
              setModalData({
                'Total Flats': overallStats.totalFlats,
                'In Progress': overallStats.inProgressFlats,
                'Not Started': overallStats.totalFlats - overallStats.inProgressFlats,
                'Completion Rate': `${Math.round((overallStats.inProgressFlats / overallStats.totalFlats) * 100)}%`
              })
              setShowDetailModal(true)
            }}
          />
          <StatCard
            icon={Activity}
            label="In Progress"
            value={overallStats.inProgressFlats}
            subtitle={`${overallStats.totalEntries} entries`}
            color="amber"
            delay={0.6}
            onClick={() => {
              setModalTitle('Activity Details')
              setModalData({
                'Flats in Progress': overallStats.inProgressFlats,
                'Total Entries': overallStats.totalEntries,
                'Avg Entries per Flat': Math.round(overallStats.totalEntries / overallStats.inProgressFlats * 10) / 10,
                'Completion Rate': `${overallStats.overallCompletion}%`
              })
              setShowDetailModal(true)
            }}
          />
          <StatCard
            icon={TrendingUp}
            label="Overall Progress"
            value={`${overallStats.overallCompletion}%`}
            progress={overallStats.overallCompletion}
            color="green"
            delay={0.2}
            onClick={() => {
              setModalTitle('Progress Insights')
              setModalData({
                'Overall Completion': `${overallStats.overallCompletion}%`,
                'Remaining': `${100 - overallStats.overallCompletion}%`,
                'Work Items > 75%': workItemsProgress.filter(i => i.percentage >= 75).length,
                'Work Items < 50%': workItemsProgress.filter(i => i.percentage < 50).length,
                'Total Quantity Done': workItemsProgress.reduce((sum, i) => sum + i.completed, 0)
              })
              setShowDetailModal(true)
            }}
          />
          <StatCard
            icon={CheckCircle2}
            label="Work Items"
            value={workItemsProgress.length}
            subtitle="Active items"
            color="purple"
            delay={0.3}
            onClick={() => {
              const avgCompletion = workItemsProgress.reduce((sum, i) => sum + i.percentage, 0) / workItemsProgress.length
              setModalTitle('Work Items Summary')
              setModalData({
                'Total Work Items': workItemsProgress.length,
                'Average Completion': `${Math.round(avgCompletion)}%`,
                'Completed (100%)': workItemsProgress.filter(i => i.percentage === 100).length,
                'In Progress (1-99%)': workItemsProgress.filter(i => i.percentage > 0 && i.percentage < 100).length,
                'Not Started (0%)': workItemsProgress.filter(i => i.percentage === 0).length
              })
              setShowDetailModal(true)
            }}
          />
        </div>

        {/* Wing Performance Heat Map */}
        <ChartCard title="Wing Performance Matrix" delay={0.35}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {wingProgress.map((wing, index) => (
              <motion.div
                key={wing.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className={`p-6 rounded-xl text-center shadow-lg ${
                  wing.completion >= 75
                    ? 'bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700'
                    : wing.completion >= 50
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700'
                    : wing.completion >= 25
                    ? 'bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700'
                    : 'bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700'
                }`}
              >
                <h3 className="text-white font-bold text-2xl mb-2">{wing.name}</h3>
                <div className="text-5xl font-black text-white mb-3">{wing.completion}%</div>
                <p className="text-white/90 text-sm font-semibold mb-2">
                  {wing.withProgress} / {wing.totalFlats} flats active
                </p>
                <div className="mt-4 h-3 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${wing.completion}%` }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
                    className="h-full bg-white rounded-full shadow-inner"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </ChartCard>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Work Items Progress Chart */}
          <ChartCard title="Work Items Completion" delay={0.7}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workItemsProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E5E5E5'} />
                <XAxis dataKey="name" stroke={isDark ? '#94A3B8' : '#737373'} />
                <YAxis stroke={isDark ? '#94A3B8' : '#737373'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    border: `1px solid ${isDark ? '#334155' : '#E5E5E5'}`,
                    borderRadius: '12px',
                    color: isDark ? '#F1F5F9' : '#262626'
                  }}
                />
                <Legend wrapperStyle={{ color: isDark ? '#F1F5F9' : '#262626' }} />
                <Bar dataKey="percentage" fill="#0EA5E9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Wing Progress Pie Chart */}
          <ChartCard title="Progress by Wing" delay={0.5}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={wingProgress}
                  dataKey="withProgress"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: ${entry.completion}%`}
                  labelStyle={{ fill: isDark ? '#F1F5F9' : '#262626', fontSize: '12px', fontWeight: 'bold' }}
                >
                  {wingProgress.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={WING_COLORS[index % WING_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    border: `1px solid ${isDark ? '#334155' : '#E5E5E5'}`,
                    borderRadius: '12px',
                    color: isDark ? '#F1F5F9' : '#262626'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Completion Timeline */}
        <ChartCard title="Completion Timeline" delay={0.6}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={completionTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E5E7EB'} />
              <XAxis 
                dataKey="date" 
                stroke={isDark ? '#94A3B8' : '#6B7280'}
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke={isDark ? '#94A3B8' : '#6B7280'}
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#334155' : '#E5E5E5'}`,
                  borderRadius: '12px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="entries" 
                stroke="#0EA5E9" 
                strokeWidth={3}
                name="Entries"
                dot={{ fill: '#0EA5E9', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="quantity" 
                stroke="#10B981" 
                strokeWidth={3}
                name="Quantity"
                dot={{ fill: '#10B981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Documentation Statistics */}
        <ChartCard title="Documentation Coverage" delay={0.65}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
              <FileText className="mx-auto mb-2 text-blue-600 dark:text-blue-400" size={28} />
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{documentationStats.withNotes}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">With Notes</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
              <Camera className="mx-auto mb-2 text-purple-600 dark:text-purple-400" size={28} />
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{documentationStats.withImages}</p>
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">With Images</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
              <CheckCircle2 className="mx-auto mb-2 text-green-600 dark:text-green-400" size={28} />
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{documentationStats.withBoth}</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">With Both</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">
              <AlertCircle className="mx-auto mb-2 text-red-600 dark:text-red-400" size={28} />
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{documentationStats.noDocs}</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">No Docs</p>
            </div>
          </div>
          {documentationStats.total > 0 && (
            <div className="mt-4 p-3 bg-neutral-50 dark:bg-dark-hover rounded-lg">
              <p className="text-sm text-neutral-600 dark:text-dark-muted text-center">
                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {Math.round(((documentationStats.withNotes + documentationStats.withImages) / documentationStats.total) * 100)}%
                </span> flats have documentation
              </p>
            </div>
          )}
        </ChartCard>

        {/* Top Performing Floors */}
        <ChartCard title="Top Performing Floors" delay={0.7}>
          <div className="space-y-3">
            {topPerformingFloors.slice(0, 10).map((floor, index) => (
              <motion.div
                key={floor.floor}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.05, duration: 0.3 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-neutral-50 dark:bg-dark-hover"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary-500 to-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-neutral-800 dark:text-dark-text">{floor.floor}</p>
                  <p className="text-xs text-neutral-600 dark:text-dark-muted">{floor.flats} flats</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary-600 dark:text-primary-400">{floor.completion}%</p>
                </div>
              </motion.div>
            ))}
          </div>
        </ChartCard>

        {/* Work Items Detailed Progress */}
        <ChartCard title="Detailed Work Item Status" delay={0.75}>
          <div className="space-y-4">
            {workItemsProgress.map((item, index) => (
              <WorkItemProgress key={item.name} item={item} delay={0.8 + index * 0.05} />
            ))}
          </div>
        </ChartCard>

        {/* Recent Activity */}
        <ChartCard title="Recent Progress Entries" delay={0.9}>
          <div className="space-y-3">
            {recentEntries.slice(0, 8).map((entry, index) => (
              <RecentEntry key={entry.id} entry={entry} delay={0.95 + index * 0.02} />
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Detail Modal */}
      <DetailModal
        show={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={modalTitle}
        data={modalData}
      />
    </div>
  )
}

// Professional Loading Screen with CSS animations
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background-soft via-white to-primary-50/30 dark:from-dark-bg dark:via-dark-bg dark:to-dark-card flex flex-col items-center justify-center">
      <div className="flex space-x-3 mb-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full bg-primary-500 dark:bg-primary-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <p className="text-lg font-medium text-neutral-600 dark:text-dark-muted animate-pulse">
        Loading dashboard...
      </p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, subtitle, color, progress, delay, onClick }) {
  const colorClasses = {
    blue: 'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30',
    amber: 'from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30',
    green: 'from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30',
    purple: 'from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30',
  }

  const iconColors = {
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={onClick}
      className={`bg-white dark:bg-dark-card rounded-2xl shadow-soft dark:shadow-none border border-neutral-100 dark:border-dark-border p-6 transition-all ${onClick ? 'cursor-pointer hover:border-primary-500 dark:hover:border-primary-500' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-500 dark:text-dark-muted mb-2">{label}</p>
          <p className="text-3xl font-bold text-neutral-800 dark:text-dark-text mb-2">{value}</p>
          {subtitle && <p className="text-xs text-neutral-400 dark:text-dark-muted">{subtitle}</p>}
          {progress !== undefined && (
            <div className="mt-3 h-2 bg-neutral-200 dark:bg-dark-hover rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: delay + 0.2, duration: 1 }}
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
              />
            </div>
          )}
        </div>
        <div className={`p-4 bg-gradient-to-br ${colorClasses[color]} rounded-2xl animate-breathe`}>
          <Icon className={iconColors[color]} size={28} />
        </div>
      </div>
    </motion.div>
  )
}

function ChartCard({ title, children, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white dark:bg-dark-card rounded-2xl shadow-soft dark:shadow-none border border-neutral-100 dark:border-dark-border p-6 md:p-8 transition-all"
    >
      <h2 className="text-xl font-bold text-neutral-800 dark:text-dark-text mb-6">{title}</h2>
      {children}
    </motion.div>
  )
}

function WorkItemProgress({ item, delay }) {
  const { isDark } = useTheme()
  
  const getStatusColor = (percentage) => {
    if (percentage === 0) return isDark ? '#EF4444' : '#FF6B6B'
    if (percentage < 100) return isDark ? '#F59E0B' : '#FFB84D'
    return isDark ? '#10B981' : '#51CF66'
  }

  const getStatusIcon = (percentage) => {
    if (percentage === 0) return <Clock size={16} className="text-progress-pending" />
    if (percentage < 100) return <Activity size={16} className="text-progress-partial" />
    return <CheckCircle2 size={16} className="text-progress-complete" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-dark-hover hover:bg-neutral-100 dark:hover:bg-dark-border transition-colors"
    >
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center font-bold">
          {item.name}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {getStatusIcon(item.percentage)}
          <p className="font-bold text-neutral-800 dark:text-dark-text truncate">{item.fullName}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-600 dark:text-dark-muted">
            {item.completed} / {item.total} completed
          </span>
          <span className="text-neutral-400 dark:text-dark-muted">•</span>
          <span className="font-semibold" style={{ color: getStatusColor(item.percentage) }}>
            {item.percentage}%
          </span>
        </div>
        <div className="mt-2 h-2 bg-neutral-200 dark:bg-dark-bg rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${item.percentage}%` }}
            transition={{ delay: delay + 0.1, duration: 0.8 }}
            style={{ backgroundColor: getStatusColor(item.percentage) }}
            className="h-full rounded-full"
          />
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-2xl font-bold text-neutral-800 dark:text-dark-text">{item.percentage}%</p>
        <p className="text-xs text-neutral-500 dark:text-dark-muted">{item.remaining} left</p>
      </div>
    </motion.div>
  )
}

function RecentEntry({ entry, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-dark-hover hover:bg-neutral-100 dark:hover:bg-dark-border transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg flex items-center justify-center font-bold text-sm">
          {entry.work_item?.code}
        </div>
        <div>
          <p className="font-semibold text-neutral-800 dark:text-dark-text">
            {entry.work_item?.name}
          </p>
          <p className="text-sm text-neutral-600 dark:text-dark-muted">
            Wing {entry.flat?.wing?.code} - Flat {entry.flat?.flat_number}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-neutral-800 dark:text-dark-text">
          {entry.quantity_completed} nos
        </p>
        <p className="text-xs text-neutral-500 dark:text-dark-muted">
          {new Date(entry.entry_date).toLocaleDateString('en-IN')}
        </p>
      </div>
    </motion.div>
  )
}

function DetailModal({ show, onClose, title, data }) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neutral-800 dark:text-dark-text">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
          >
            <X size={24} className="text-neutral-600 dark:text-dark-muted" />
          </button>
        </div>
        <div className="space-y-4">
          {data && typeof data === 'object' && Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-dark-hover rounded-lg">
              <span className="font-medium text-neutral-700 dark:text-dark-text capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-neutral-900 dark:text-white font-bold">{value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

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
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
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
    if (!loading && wings.length > 0 && workItemsProgress.length > 0) {
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
      const workItemsWithProgress = await loadWorkItemsProgress()
      setWorkItemsProgress(workItemsWithProgress)

      // Load wing progress
      const wingData = await loadWingProgress()
      setWingProgress(wingData)

      // Load recent entries
      await loadRecentEntries()

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

  const loadWorkItemsProgress = async () => {
    try {
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
      
      return workItemsWithProgress
    } catch (error) {
      console.error('Error loading work items progress:', error)
      return []
    }
  }

  const loadWingProgress = async () => {
    try {
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
          wing: wing.code,
          name: `Wing ${wing.code}`,
          totalFlats,
          withProgress: flatsWithProgress,
          pending: totalFlats - flatsWithProgress,
          completion: Math.round(completionPercentage),
        }
      })
      
      return wingData
    } catch (error) {
      console.error('Error loading wing progress:', error)
      return []
    }
  }

  const loadRecentEntries = async () => {
    try {
      let query = supabase
        .from('progress_entries')
        .select('*, flats!inner(flat_number, floors!inner(wings!inner(code))), work_items(code, name)')
      
      // Apply wing filter
      if (filterWing !== 'ALL') {
        query = query.eq('flats.floors.wings.code', filterWing)
      }
      
      // Apply work item filter
      if (filterWorkItem !== 'ALL') {
        const { data: wiData } = await supabase
          .from('work_items')
          .select('id')
          .eq('code', filterWorkItem)
          .single()
        if (wiData) {
          query = query.eq('work_item_id', wiData.id)
        }
      }
      
      query = query.order('entry_date', { ascending: false }).limit(10)
      const { data: entries } = await query

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
    } catch (error) {
      console.error('Error loading recent entries:', error)
    }
  }

  const loadFilteredData = async () => {
    try {
      setLoading(true)
      
      // Reload timeline with filters
      await loadCompletionTimeline()
      
      // Reload top floors with filters
      await loadTopPerformingFloors()
      
      // Reload recent entries with filters
      await loadRecentEntries()
      
      // Re-filter work items progress display
      if (filterWorkItem !== 'ALL') {
        const fullWorkItems = await loadWorkItemsProgress()
        const filtered = fullWorkItems.filter(wi => wi.name === filterWorkItem)
        setWorkItemsProgress(filtered)
      } else {
        setWorkItemsProgress(await loadWorkItemsProgress())
      }
      
      // Re-filter wing progress display
      if (filterWing !== 'ALL') {
        const fullWings = await loadWingProgress()
        const filtered = fullWings.filter(w => w.wing === filterWing)
        setWingProgress(filtered)
      } else {
        setWingProgress(await loadWingProgress())
      }
      
    } catch (error) {
      console.error('Error loading filtered data:', error)
    } finally {
      setLoading(false)
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
        const { data: wiData } = await supabase
          .from('work_items')
          .select('id')
          .eq('code', filterWorkItem)
          .single()
        if (wiData) {
          query = query.eq('work_item_id', wiData.id)
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
      let query = supabase
        .from('floors')
        .select(`
          id,
          floor_number,
          wings!inner(code),
          flats(id)
        `)
        .order('floor_number')
      
      // Apply wing filter
      if (filterWing !== 'ALL') {
        query = query.eq('wings.code', filterWing)
      }
      
      const { data: floors } = await query

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
      setLoading(true)
      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      
      // Title Page
      doc.setFontSize(20)
      doc.text(project?.name || 'Project Dashboard', pageWidth / 2, 20, { align: 'center' })
      doc.setFontSize(14)
      doc.text('Comprehensive Flat-Wise Progress Report', pageWidth / 2, 30, { align: 'center' })
      doc.setFontSize(12)
      doc.text(`Generated: ${format(new Date(), 'PPP')}`, pageWidth / 2, 38, { align: 'center' })
      
      // Overall Summary
      doc.setFontSize(14)
      doc.text('Project Summary', 14, 50)
      const statsData = [
        ['Total Flats', overallStats.totalFlats],
        ['Flats In Progress', overallStats.inProgressFlats],
        ['Overall Completion', `${overallStats.overallCompletion}%`],
        ['Total Progress Entries', overallStats.totalEntries]
      ]
      autoTable(doc, { 
        startY: 55, 
        head: [['Metric', 'Value']], 
        body: statsData, 
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      })
      
      // Work Items Summary
      let finalY = doc.lastAutoTable?.finalY || 55
      doc.setFontSize(14)
      doc.text('Work Items Summary', 14, finalY + 10)
      const workItemsData = workItemsProgress.map(item => [
        item.name,
        item.fullName,
        `${item.completed}/${item.total}`,
        `${item.percentage}%`
      ])
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Code', 'Name', 'Progress', 'Completion']],
        body: workItemsData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      })
      
      // Fetch all flats with complete details
      const { data: allFlats, error: flatsError } = await supabase
        .from('flats')
        .select(`
          id,
          flat_number,
          bhk_type,
          is_refuge,
          is_joint_refuge,
          floors!inner(
            floor_number,
            wings!inner(code, name)
          )
        `)
        .order('flat_number')
      
      if (flatsError) {
        console.error('Error fetching flats:', flatsError)
        alert('Error loading flat data for PDF')
        setLoading(false)
        return
      }
      
      console.log('Total flats for PDF:', allFlats?.length)
      
      // Sort flats by wing, floor, flat number
      const sortedFlats = (allFlats || []).sort((a, b) => {
        const wingCompare = (a.floors?.wings?.code || '').localeCompare(b.floors?.wings?.code || '')
        if (wingCompare !== 0) return wingCompare
        
        const floorCompare = (a.floors?.floor_number || 0) - (b.floors?.floor_number || 0)
        if (floorCompare !== 0) return floorCompare
        
        return (a.flat_number || 0) - (b.flat_number || 0)
      })
      
      // Fetch all work items
      const { data: allWorkItems } = await supabase
        .from('work_items')
        .select('id, code, name')
        .eq('is_active', true)
        .order('code')
      
      // Fetch all progress entries
      const { data: allProgress } = await supabase
        .from('progress_entries')
        .select('flat_id, work_item_id, quantity_completed, entry_date')
      
      // Fetch all detail progress
      const { data: allDetailProgress } = await supabase
        .from('work_item_details_progress')
        .select('flat_id, work_item_id, detail_config_id, is_completed, work_item_detail_configs(name)')
      
      // Fetch notes and images count
      const { data: allNotes } = await supabase
        .from('flat_notes')
        .select('flat_id')
      
      const { data: allImages } = await supabase
        .from('flat_images')
        .select('flat_id')
      
      // Create Work Item-Wise Summary Table
      doc.addPage()
      doc.setFontSize(16)
      doc.text('Work Item-Wise Completion Summary', 14, 20)
      
      // Build work item summary
      const workItemSummaryData = []
      
      for (const workItem of allWorkItems || []) {
        // Group by wing and floor
        const wingFloorMap = {}
        
        for (const flat of sortedFlats) {
          const wingCode = flat.floors?.wings?.code || 'Unknown'
          const floorNumber = flat.floors?.floor_number || 0
          const key = `${wingCode}-${floorNumber}`
          
          if (!wingFloorMap[key]) {
            wingFloorMap[key] = {
              wing: wingCode,
              floor: floorNumber,
              completed: [],
              pending: []
            }
          }
          
          // Check if this work item is completed for this flat
          const progress = (allProgress || []).find(
            p => p.flat_id === flat.id && p.work_item_id === workItem.id
          )
          
          if (progress && progress.quantity_completed > 0) {
            wingFloorMap[key].completed.push(flat.flat_number)
          } else {
            wingFloorMap[key].pending.push(flat.flat_number)
          }
        }
        
        // Convert to sorted array
        const sortedWingFloors = Object.values(wingFloorMap).sort((a, b) => {
          const wingCompare = a.wing.localeCompare(b.wing)
          if (wingCompare !== 0) return wingCompare
          return a.floor - b.floor
        })
        
        // Add rows for this work item
        sortedWingFloors.forEach((item, index) => {
          workItemSummaryData.push([
            index === 0 ? `${workItem.code} - ${workItem.name}` : '',
            `Wing ${item.wing}`,
            `Floor ${item.floor}`,
            item.completed.length > 0 ? item.completed.sort((a, b) => a - b).join(', ') : '-',
            item.pending.length > 0 ? item.pending.sort((a, b) => a - b).join(', ') : '-'
          ])
        })
      }
      
      autoTable(doc, {
        startY: 28,
        head: [['Work Item', 'Wing', 'Floor', 'Completed Flats', 'Pending Flats']],
        body: workItemSummaryData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [34, 197, 94], fontSize: 9, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 20 },
          2: { cellWidth: 20 },
          3: { cellWidth: 50 },
          4: { cellWidth: 50 }
        }
      })
      
      // Start detailed flat-wise report
      doc.addPage()
      doc.setFontSize(16)
      doc.text('Detailed Flat-Wise Progress Report', 14, 20)
      
      let currentY = 30
      
      for (const flat of sortedFlats) {
        // Check if we need a new page
        if (currentY > 250) {
          doc.addPage()
          currentY = 20
        }
        
        // Flat Header
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        const flatInfo = `Wing ${flat.floors?.wings?.code} - Floor ${flat.floors?.floor_number} - Flat ${flat.flat_number}`
        doc.text(flatInfo, 14, currentY)
        currentY += 7
        
        doc.setFontSize(10)
        doc.setFont(undefined, 'normal')
        const flatDetails = `BHK: ${flat.bhk_type || 'N/A'} | Type: ${flat.is_joint_refuge ? 'Joint Refuge' : flat.is_refuge ? 'Refuge' : 'Normal'}`
        doc.text(flatDetails, 14, currentY)
        currentY += 3
        
        // Notes and Images count
        const notesCount = (allNotes || []).filter(n => n.flat_id === flat.id).length
        const imagesCount = (allImages || []).filter(i => i.flat_id === flat.id).length
        const docsInfo = `Documentation: ${notesCount} Notes, ${imagesCount} Images`
        doc.text(docsInfo, 14, currentY)
        currentY += 8
        
        // Work items for this flat
        const flatWorkItemsData = []
        
        for (const workItem of allWorkItems || []) {
          const progress = (allProgress || []).find(
            p => p.flat_id === flat.id && p.work_item_id === workItem.id
          )
          
          const detailProgress = (allDetailProgress || []).filter(
            d => d.flat_id === flat.id && d.work_item_id === workItem.id
          )
          
          const completedDetails = detailProgress.filter(d => d.is_completed).length
          const totalDetails = detailProgress.length
          
          const status = progress?.quantity_completed > 0 ? 'Completed' : 'Pending'
          const detailsInfo = totalDetails > 0 
            ? `${completedDetails}/${totalDetails} checks` 
            : '-'
          const lastUpdate = progress?.entry_date 
            ? format(new Date(progress.entry_date), 'dd/MM/yyyy')
            : '-'
          
          flatWorkItemsData.push([
            workItem.code,
            workItem.name,
            status,
            detailsInfo,
            lastUpdate
          ])
        }
        
        // Add work items table for this flat
        autoTable(doc, {
          startY: currentY,
          head: [['Code', 'Work Item', 'Status', 'Details', 'Last Update']],
          body: flatWorkItemsData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [99, 102, 241], fontSize: 9, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 60 },
            2: { cellWidth: 25 },
            3: { cellWidth: 35 },
            4: { cellWidth: 30 }
          },
          margin: { top: 20, left: 14, right: 14 },
          pageBreak: 'auto',
          showHead: 'everyPage'
        })
        
        currentY = doc.lastAutoTable?.finalY + 10
        
        // Add spacing between flats
        if (currentY > 250) {
          doc.addPage()
          currentY = 20
        }
      }
      
      // Save PDF
      console.log('PDF generation complete, saving...')
      doc.save(`${project?.name || 'Project'}_Comprehensive_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
      setLoading(false)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF: ' + error.message)
      setLoading(false)
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
        </motion.div>

        {/* Project Health Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-2xl shadow-lg p-8 text-white"
        >
          <h2 className="text-2xl font-bold mb-6">Project Health Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100">Overall Completion</span>
                <CheckCircle2 size={24} />
              </div>
              <div className="text-4xl font-bold mb-1">{overallStats.overallCompletion}%</div>
              <div className="text-sm text-blue-100">
                {overallStats.totalEntries} entries recorded
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100">Pending Work</span>
                <Clock size={24} />
              </div>
              <div className="text-4xl font-bold mb-1">{100 - overallStats.overallCompletion}%</div>
              <div className="text-sm text-blue-100">
                {overallStats.totalFlats - overallStats.inProgressFlats} flats not started
              </div>
            </div>
          </div>
        </motion.div>

        {/* Simple Stats Cards */}
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

        {/* Pending Work Concentration - Where is work pending? */}
        <ChartCard title="Pending Work Concentration by Wing & Floor" delay={0.6}>
          <div className="space-y-3">
            {wingProgress.map((wing, idx) => (
              <div key={idx} className="p-4 bg-neutral-50 dark:bg-dark-hover rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-neutral-800 dark:text-dark-text">{wing.name}</h4>
                  <span className="text-sm text-neutral-600 dark:text-dark-muted">
                    {wing.pending} flats pending
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(wing.pending / wing.totalFlats) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Work Items - Attention List */}
        <ChartCard title="Work Items Requiring Attention" delay={0.65}>
          <div className="space-y-2">
            {workItemsProgress
              .filter(item => item.percentage < 100 && item.percentage > 0)
              .sort((a, b) => a.percentage - b.percentage)
              .slice(0, 5)
              .map((item, idx) => (
                <div key={idx} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-neutral-800 dark:text-dark-text">
                        {item.name} - {item.fullName}
                      </span>
                      <p className="text-sm text-neutral-600 dark:text-dark-muted mt-1">
                        {item.remaining} units remaining ({item.percentage}% complete)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {item.remaining}
                      </div>
                      <div className="text-xs text-neutral-500">pending</div>
                    </div>
                  </div>
                </div>
              ))}
            {workItemsProgress.filter(item => item.percentage === 0).length > 0 && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
                <p className="text-sm font-bold text-red-700 dark:text-red-300">
                  ⚠️ {workItemsProgress.filter(item => item.percentage === 0).length} work items not started yet
                </p>
              </div>
            )}
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

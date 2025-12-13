import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import { Moon, Sun, TrendingUp, CheckCircle2, Clock, AlertCircle, Activity, Layers } from 'lucide-react'
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'

const WING_COLORS = ['#0EA5E9', '#A855F7', '#14B8A6']

export default function Dashboard() {
  const { isDark, toggleTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState(null)
  const [workItemsProgress, setWorkItemsProgress] = useState([])
  const [wingProgress, setWingProgress] = useState([])
  const [recentEntries, setRecentEntries] = useState([])
  const [overallStats, setOverallStats] = useState({
    totalFlats: 0,
    completedFlats: 0,
    inProgressFlats: 0,
    overallCompletion: 0,
    totalEntries: 0,
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

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

    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
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
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Layers}
            label="Total Flats"
            value={overallStats.totalFlats}
            color="blue"
            delay={0}
          />
          <StatCard
            icon={Activity}
            label="In Progress"
            value={overallStats.inProgressFlats}
            subtitle={`${overallStats.totalEntries} entries`}
            color="amber"
            delay={0.1}
          />
          <StatCard
            icon={TrendingUp}
            label="Overall Progress"
            value={`${overallStats.overallCompletion}%`}
            progress={overallStats.overallCompletion}
            color="green"
            delay={0.2}
          />
          <StatCard
            icon={CheckCircle2}
            label="Work Items"
            value={workItemsProgress.length}
            subtitle="Active items"
            color="purple"
            delay={0.3}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Work Items Progress Chart */}
          <ChartCard title="Work Items Completion" delay={0.4}>
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

        {/* Work Items Detailed Progress */}
        <ChartCard title="Detailed Work Item Status" delay={0.6}>
          <div className="space-y-4">
            {workItemsProgress.map((item, index) => (
              <WorkItemProgress key={item.name} item={item} delay={0.7 + index * 0.05} />
            ))}
          </div>
        </ChartCard>

        {/* Recent Activity */}
        <ChartCard title="Recent Progress Entries" delay={0.8}>
          <div className="space-y-3">
            {recentEntries.slice(0, 8).map((entry, index) => (
              <RecentEntry key={entry.id} entry={entry} delay={0.9 + index * 0.02} />
            ))}
          </div>
        </ChartCard>
      </div>
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

function StatCard({ icon: Icon, label, value, subtitle, color, progress, delay }) {
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
      className="bg-white dark:bg-dark-card rounded-2xl shadow-soft dark:shadow-none border border-neutral-100 dark:border-dark-border p-6 transition-all"
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

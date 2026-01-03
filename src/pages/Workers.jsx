import { useState, useEffect } from 'react'
import { Users, Plus, Search, Phone, MessageCircle, Edit, UserX, UserCheck, Eye, Calendar } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AddEditWorkerModal from '../components/labour/AddEditWorkerModal'
import WorkerDetailsModal from '../components/labour/WorkerDetailsModal'
import ReleaseWorkerModal from '../components/labour/ReleaseWorkerModal'

export default function Workers() {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showReleaseModal, setShowReleaseModal] = useState(false)

  useEffect(() => {
    loadWorkers()
  }, [statusFilter])

  const loadWorkers = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('workers')
        .select('*, projects(name)')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error('Error loading workers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSuccess = () => {
    setShowAddModal(false)
    setSelectedWorker(null)
    loadWorkers()
  }

  const handleEdit = (worker) => {
    setSelectedWorker(worker)
    setShowAddModal(true)
  }

  const handleViewDetails = (worker) => {
    setSelectedWorker(worker)
    setShowDetailsModal(true)
  }

  const handleRelease = (worker) => {
    setSelectedWorker(worker)
    setShowReleaseModal(true)
  }

  const handleReactivate = async (worker) => {
    if (!confirm(`Reactivate ${worker.full_name}? They will need a new joining date.`)) return

    try {
      const newJoiningDate = prompt('Enter new joining date (YYYY-MM-DD):')
      if (!newJoiningDate) return

      const { error } = await supabase
        .from('workers')
        .update({
          status: 'active',
          joining_date: newJoiningDate,
          last_working_date: null,
          release_reason: null
        })
        .eq('id', worker.id)

      if (error) throw error
      loadWorkers()
    } catch (error) {
      console.error('Error reactivating worker:', error)
      alert('Failed to reactivate worker')
    }
  }

  const filteredWorkers = workers.filter(worker =>
    worker.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    worker.primary_mobile.includes(searchQuery) ||
    worker.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-soft via-white to-primary-50/30 dark:from-dark-bg dark:via-dark-bg dark:to-dark-card pb-24 md:pb-6 transition-colors duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-blue-700 text-white px-4 py-8 md:px-6 md:py-10 shadow-soft-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Workers</h1>
              <p className="text-primary-100 dark:text-primary-200 mt-2 text-lg">
                Manage labour records & profiles
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedWorker(null)
                setShowAddModal(true)
              }}
              className="bg-white text-primary-600 px-4 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-primary-50 transition-all shadow-lg"
            >
              <Plus size={20} />
              <span className="hidden md:inline">Add Worker</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-4 md:p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, mobile, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 text-neutral-800 dark:text-dark-text"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { value: 'active', label: 'Active', icon: UserCheck },
              { value: 'released', label: 'Released', icon: UserX },
              { value: 'all', label: 'All', icon: Users }
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
                  statusFilter === value
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-dark-text hover:bg-neutral-200 dark:hover:bg-dark-border'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Workers List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-neutral-600 dark:text-dark-muted mt-4">Loading workers...</p>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-12 text-center">
            <Users size={64} className="text-neutral-300 dark:text-dark-border mx-auto mb-4" />
            <p className="text-xl font-semibold text-neutral-800 dark:text-dark-text mb-2">
              No workers found
            </p>
            <p className="text-neutral-600 dark:text-dark-muted mb-6">
              {searchQuery ? 'Try a different search term' : 'Add your first worker to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Add Worker
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredWorkers.map(worker => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                onEdit={handleEdit}
                onViewDetails={handleViewDetails}
                onRelease={handleRelease}
                onReactivate={handleReactivate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddEditWorkerModal
          worker={selectedWorker}
          onClose={() => {
            setShowAddModal(false)
            setSelectedWorker(null)
          }}
          onSuccess={handleAddSuccess}
        />
      )}

      {showDetailsModal && selectedWorker && (
        <WorkerDetailsModal
          worker={selectedWorker}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedWorker(null)
          }}
        />
      )}

      {showReleaseModal && selectedWorker && (
        <ReleaseWorkerModal
          worker={selectedWorker}
          onClose={() => {
            setShowReleaseModal(false)
            setSelectedWorker(null)
          }}
          onSuccess={() => {
            setShowReleaseModal(false)
            setSelectedWorker(null)
            loadWorkers()
          }}
        />
      )}
    </div>
  )
}

function WorkerCard({ worker, onEdit, onViewDetails, onRelease, onReactivate }) {
  const isActive = worker.status === 'active'

  const handleCall = (mobile) => {
    window.location.href = `tel:${mobile}`
  }

  const handleWhatsApp = (mobile) => {
    window.open(`https://wa.me/91${mobile}`, '_blank')
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft hover:shadow-lg transition-all overflow-hidden">
      {/* Header */}
      <div className={`p-4 ${isActive ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-neutral-400 to-neutral-500'} text-white`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-lg">{worker.full_name}</h3>
            <p className="text-sm opacity-90">{worker.category} • Age {worker.age}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isActive 
              ? 'bg-white/20' 
              : 'bg-black/20'
          }`}>
            {isActive ? 'Active' : 'Released'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Wage Info */}
        <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-dark-border">
          <span className="text-sm text-neutral-600 dark:text-dark-muted">Daily Wage</span>
          <span className="font-bold text-neutral-800 dark:text-dark-text">₹{worker.base_daily_wage}</span>
        </div>
        {worker.travel_allowance > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-dark-border">
            <span className="text-sm text-neutral-600 dark:text-dark-muted">Travel Allowance</span>
            <span className="font-bold text-neutral-800 dark:text-dark-text">₹{worker.travel_allowance}</span>
          </div>
        )}

        {/* Contact Buttons */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => handleCall(worker.primary_mobile)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Phone size={16} />
              <span className="text-sm font-medium">Call</span>
            </button>
            <button
              onClick={() => handleWhatsApp(worker.primary_mobile)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <MessageCircle size={16} />
              <span className="text-sm font-medium">WhatsApp</span>
            </button>
          </div>
          {worker.secondary_mobile && (
            <div className="flex gap-2">
              <button
                onClick={() => handleCall(worker.secondary_mobile)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-dark-hover text-neutral-600 dark:text-dark-muted rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-border transition-colors"
              >
                <Phone size={14} />
                <span className="text-xs">{worker.secondary_mobile}</span>
              </button>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="text-xs text-neutral-600 dark:text-dark-muted space-y-1">
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            <span>Joined: {new Date(worker.joining_date).toLocaleDateString('en-IN')}</span>
          </div>
          {worker.last_working_date && (
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              <span>Last Day: {new Date(worker.last_working_date).toLocaleDateString('en-IN')}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onViewDetails(worker)}
            className="flex-1 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors flex items-center justify-center gap-2"
          >
            <Eye size={16} />
            <span className="text-sm font-medium">Details</span>
          </button>
          {isActive ? (
            <>
              <button
                onClick={() => onEdit(worker)}
                className="px-3 py-2 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-dark-text rounded-lg hover:bg-neutral-200 dark:hover:bg-dark-border transition-colors"
                title="Edit"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => onRelease(worker)}
                className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                title="Release Worker"
              >
                <UserX size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={() => onReactivate(worker)}
              className="flex-1 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center justify-center gap-2"
            >
              <UserCheck size={16} />
              <span className="text-sm font-medium">Reactivate</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

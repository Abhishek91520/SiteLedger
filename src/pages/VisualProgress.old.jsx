import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { supabase } from '../lib/supabase'

export default function VisualProgress() {
  const [selectedWing, setSelectedWing] = useState('A')
  const [selectedWorkItem, setSelectedWorkItem] = useState('ALL')
  const [workItems, setWorkItems] = useState([])
  const [flatsData, setFlatsData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [selectedWing, selectedWorkItem])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load work items
      const { data: items } = await supabase
        .from('work_items')
        .select('*')
        .eq('is_active', true)
        .order('code')

      setWorkItems(items || [])

      // Load flats with progress
      // This will be implemented with the v_progress_summary view
      // For now, placeholder
      setFlatsData([])
    } catch (error) {
      console.error('Error loading visual progress:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-soft via-white to-primary-50/30 flex flex-col pb-20 md:pb-6">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-8 md:px-6 md:py-10 shadow-soft-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Visual Progress</h1>
          <p className="text-primary-100 mt-2 text-lg">3D Floor & Flat Progress Visualization</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-neutral-200 px-4 py-4 md:px-6 shadow-soft">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4">
          {/* Wing Selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-neutral-700">Wing:</label>
            <div className="flex gap-2">
              {['A', 'B', 'C'].map((wing) => (
                <button
                  key={wing}
                  onClick={() => setSelectedWing(wing)}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all ${
                    selectedWing === wing
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-soft'
                      : 'bg-white text-neutral-700 hover:bg-primary-50 border-2 border-neutral-200'
                  }`}
                >
                  {wing}
                </button>
              ))}
            </div>
          </div>

          {/* Work Item Filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-neutral-700">Work Item:</label>
            <select
              value={selectedWorkItem}
              onChange={(e) => setSelectedWorkItem(e.target.value)}
              className="input-field w-64"
            >
              <option value="ALL">All Items</option>
              {workItems.map((item) => (
                <option key={item.id} value={item.code}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-neutral-200 px-4 py-4 md:px-6 shadow-soft">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-progress-pending rounded-lg shadow-soft"></div>
            <span className="text-neutral-700 font-semibold">Pending (0%)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-progress-partial rounded-lg shadow-soft"></div>
            <span className="text-neutral-700 font-semibold">Partial (1-99%)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-progress-complete rounded-lg shadow-soft"></div>
            <span className="text-neutral-700 font-semibold">Complete (100%)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-progress-notApplicable rounded-lg shadow-soft"></div>
            <span className="text-neutral-700 font-semibold">Not Applicable</span>
          </div>
        </div>
      </div>

      {/* 3D Visualization Area */}
      <div className="flex-1 relative m-4 md:m-6">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600"></div>
          </div>
        ) : (
          <div className="card hover-glow h-full min-h-[500px] flex items-center justify-center bg-gradient-to-b from-sky-50 to-primary-50">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl mx-auto flex items-center justify-center">
                <div className="text-5xl">🏗️</div>
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-800 mb-2">3D Visualization</p>
                <p className="text-neutral-600">(React Three Fiber implementation pending)</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Flat Details (Bottom Sheet - Placeholder) */}
      <div className="md:hidden bg-white/95 backdrop-blur-lg border-t border-neutral-200 p-4 shadow-soft-lg">
        <p className="text-sm text-neutral-600 text-center font-medium">Tap on a flat to view details</p>
      </div>
    </div>
  )
}

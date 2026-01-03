import { X, Phone, MessageCircle, Calendar, MapPin, FileText, Image as ImageIcon } from 'lucide-react'

export default function WorkerDetailsModal({ worker, onClose }) {
  const handleCall = (mobile) => {
    window.location.href = `tel:${mobile}`
  }

  const handleWhatsApp = (mobile) => {
    window.open(`https://wa.me/91${mobile}`, '_blank')
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className={`p-6 rounded-t-2xl ${
          worker.status === 'active' 
            ? 'bg-gradient-to-r from-green-500 to-green-600' 
            : 'bg-gradient-to-r from-neutral-400 to-neutral-500'
        } text-white`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{worker.full_name}</h2>
              <p className="text-lg opacity-90 mt-1">{worker.category} • Age {worker.age}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`px-4 py-2 rounded-full font-semibold ${
              worker.status === 'active'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400'
            }`}>
              {worker.status === 'active' ? '✓ Active' : '✕ Released'}
            </span>
          </div>

          {/* Wage Information */}
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-neutral-800 dark:text-dark-text mb-3">Wage Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-600 dark:text-dark-muted">Base Daily Wage</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-dark-text">₹{worker.base_daily_wage}</p>
              </div>
              {worker.travel_allowance > 0 && (
                <div>
                  <p className="text-sm text-neutral-600 dark:text-dark-muted">Travel Allowance</p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-dark-text">₹{worker.travel_allowance}</p>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-primary-200 dark:border-primary-800">
              <p className="text-sm text-neutral-600 dark:text-dark-muted">Total Per Day (P)</p>
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                ₹{parseFloat(worker.base_daily_wage) + parseFloat(worker.travel_allowance || 0)}
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-neutral-800 dark:text-dark-text">Contact Details</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone size={18} className="text-neutral-500" />
                <span className="text-neutral-800 dark:text-dark-text font-medium">{worker.primary_mobile}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCall(worker.primary_mobile)}
                  className="flex-1 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Phone size={16} />
                  Call
                </button>
                <button
                  onClick={() => handleWhatsApp(worker.primary_mobile)}
                  className="flex-1 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
              </div>
            </div>

            {worker.secondary_mobile && (
              <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-dark-border">
                <div className="flex items-center gap-2">
                  <Phone size={18} className="text-neutral-500" />
                  <span className="text-neutral-800 dark:text-dark-text font-medium">{worker.secondary_mobile}</span>
                  <span className="text-xs text-neutral-500 dark:text-dark-muted">(Secondary)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCall(worker.secondary_mobile)}
                    className="flex-1 px-4 py-2 bg-neutral-50 dark:bg-dark-hover text-neutral-700 dark:text-dark-text rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-border transition-colors flex items-center justify-center gap-2"
                  >
                    <Phone size={16} />
                    Call
                  </button>
                  <button
                    onClick={() => handleWhatsApp(worker.secondary_mobile)}
                    className="flex-1 px-4 py-2 bg-neutral-50 dark:bg-dark-hover text-neutral-700 dark:text-dark-text rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-border transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <h3 className="font-semibold text-neutral-800 dark:text-dark-text">Timeline</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={16} className="text-green-600" />
                <span className="text-neutral-600 dark:text-dark-muted">Joined:</span>
                <span className="font-medium text-neutral-800 dark:text-dark-text">
                  {new Date(worker.joining_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              {worker.last_working_date && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={16} className="text-red-600" />
                  <span className="text-neutral-600 dark:text-dark-muted">Last Day:</span>
                  <span className="font-medium text-neutral-800 dark:text-dark-text">
                    {new Date(worker.last_working_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
              {worker.release_reason && (
                <div className="mt-2 p-3 bg-neutral-50 dark:bg-dark-hover rounded-lg">
                  <p className="text-sm font-medium text-neutral-700 dark:text-dark-text mb-1">Release Reason:</p>
                  <p className="text-sm text-neutral-600 dark:text-dark-muted">{worker.release_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Project Assignment */}
          {worker.projects && (
            <div className="space-y-2">
              <h3 className="font-semibold text-neutral-800 dark:text-dark-text">Current Project</h3>
              <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-dark-hover rounded-lg">
                <MapPin size={18} className="text-primary-600" />
                <span className="font-medium text-neutral-800 dark:text-dark-text">{worker.projects.name}</span>
              </div>
            </div>
          )}

          {/* Documents */}
          {(worker.worker_photo_url || worker.aadhaar_front_url || worker.aadhaar_back_url) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-neutral-800 dark:text-dark-text">Documents</h3>
              <div className="grid grid-cols-3 gap-3">
                {worker.worker_photo_url && (
                  <div>
                    <p className="text-xs text-neutral-600 dark:text-dark-muted mb-1">Photo</p>
                    <a
                      href={worker.worker_photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-lg overflow-hidden border-2 border-neutral-200 dark:border-dark-border hover:border-primary-500 transition-colors"
                    >
                      <img src={worker.worker_photo_url} alt="Worker" className="w-full h-full object-cover" />
                    </a>
                  </div>
                )}
                {worker.aadhaar_front_url && (
                  <div>
                    <p className="text-xs text-neutral-600 dark:text-dark-muted mb-1">Aadhaar Front</p>
                    <a
                      href={worker.aadhaar_front_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-lg overflow-hidden border-2 border-neutral-200 dark:border-dark-border hover:border-primary-500 transition-colors"
                    >
                      <img src={worker.aadhaar_front_url} alt="Aadhaar Front" className="w-full h-full object-cover" />
                    </a>
                  </div>
                )}
                {worker.aadhaar_back_url && (
                  <div>
                    <p className="text-xs text-neutral-600 dark:text-dark-muted mb-1">Aadhaar Back</p>
                    <a
                      href={worker.aadhaar_back_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-lg overflow-hidden border-2 border-neutral-200 dark:border-dark-border hover:border-primary-500 transition-colors"
                    >
                      <img src={worker.aadhaar_back_url} alt="Aadhaar Back" className="w-full h-full object-cover" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 dark:border-dark-border">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-dark-text rounded-xl font-semibold hover:bg-neutral-200 dark:hover:bg-dark-border transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

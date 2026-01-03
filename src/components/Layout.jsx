import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { LayoutDashboard, Eye, ClipboardList, CheckSquare, FileText, Users, Calendar, DollarSign, BarChart3, Settings as SettingsIcon, LogOut, Menu, X } from 'lucide-react'

export default function Layout() {
  const { signOut } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/visual-progress', icon: Eye, label: 'Visual Progress' },
    { path: '/bulk-update', icon: CheckSquare, label: 'Bulk Update' },
    { path: '/billing', icon: FileText, label: 'Billing' },
    { path: '/workers', icon: Users, label: 'Workers' },
    { path: '/daily-attendance', icon: Calendar, label: 'Attendance' },
    { path: '/settlements', icon: DollarSign, label: 'Settlements' },
    { path: '/labour-reports', icon: BarChart3, label: 'Labour Reports' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ]

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background-soft dark:bg-dark-bg transition-colors duration-300">
      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-blue-700 text-white p-4 flex items-center justify-between shadow-soft-lg fixed top-0 left-0 right-0 z-40">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-bold">SiteLedger</h1>
        <button onClick={handleSignOut} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <LogOut size={20} />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`md:hidden fixed top-0 left-0 bottom-0 w-72 bg-gradient-to-b from-primary-600 via-primary-700 to-primary-800 dark:from-dark-card dark:via-dark-card dark:to-dark-bg text-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SiteLedger</h1>
            <p className="text-primary-200 text-xs mt-1 font-medium">Abhimanyu Tiling Works</p>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3.5 rounded-xl mb-2 transition-all group ${
                  isActive
                    ? 'bg-white text-primary-600 shadow-soft font-semibold'
                    : 'text-primary-100 hover:bg-white/10 hover:text-white hover:translate-x-1'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-primary-100' : 'bg-white/10 group-hover:bg-white/20'} transition-colors`}>
                    <item.icon size={20} />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <button
            onClick={() => {
              setMobileMenuOpen(false)
              handleSignOut()
            }}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl w-full text-primary-100 hover:bg-white/10 hover:text-white transition-all group hover:translate-x-1"
          >
            <div className="p-2 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
              <LogOut size={20} />
            </div>
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-72 bg-gradient-to-b from-primary-600 via-primary-700 to-primary-800 dark:from-dark-card dark:via-dark-card dark:to-dark-bg text-white shadow-glow dark:border-r dark:border-dark-border">
        <div className="p-8 border-b border-white/10">
          <h1 className="text-3xl font-bold tracking-tight">SiteLedger</h1>
          <p className="text-primary-200 text-sm mt-2 font-medium">Abhimanyu Tiling Works</p>
          <div className="w-12 h-1 bg-gradient-to-r from-white to-primary-300 rounded-full mt-4"></div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3.5 rounded-xl mb-2 transition-all group ${
                  isActive
                    ? 'bg-white text-primary-600 shadow-soft font-semibold'
                    : 'text-primary-100 hover:bg-white/10 hover:text-white hover:translate-x-1'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-primary-100' : 'bg-white/10 group-hover:bg-white/20'} transition-colors`}>
                    <item.icon size={20} />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl w-full text-primary-100 hover:bg-white/10 hover:text-white transition-all group hover:translate-x-1"
          >
            <div className="p-2 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
              <LogOut size={20} />
            </div>
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0">
        <Outlet />
      </main>
    </div>
  )
}

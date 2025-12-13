import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { LayoutDashboard, Eye, ClipboardList, CheckSquare, FileText, Settings as SettingsIcon, LogOut } from 'lucide-react'

export default function Layout() {
  const { signOut } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()

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
    // { path: '/daily-progress', icon: ClipboardList, label: 'Daily Entry' }, // Hidden - using bulk update instead
    { path: '/bulk-update', icon: CheckSquare, label: 'Bulk Update' },
    { path: '/billing', icon: FileText, label: 'Billing' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ]

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background-soft dark:bg-dark-bg transition-colors duration-300">
      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-blue-700 text-white p-4 flex items-center justify-between shadow-soft-lg">
        <h1 className="text-xl font-bold">SiteLedger</h1>
        <button onClick={handleSignOut} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <LogOut size={20} />
        </button>
      </div>

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
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-dark-card/95 backdrop-blur-lg border-t border-neutral-200 dark:border-dark-border shadow-soft-lg z-50">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-all min-w-[60px] ${
                  isActive ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400 dark:text-dark-muted hover:text-neutral-600 dark:hover:text-dark-text'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-primary-100 dark:bg-primary-900/30' : ''} transition-colors`}>
                    <item.icon size={20} />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isActive ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

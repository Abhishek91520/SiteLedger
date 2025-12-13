import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'

export default function DarkModeDebug() {
  const { isDark, toggleTheme } = useTheme()
  const [htmlHasDarkClass, setHtmlHasDarkClass] = useState(false)

  useEffect(() => {
    // Check if the html element actually has the dark class
    const checkDarkClass = () => {
      setHtmlHasDarkClass(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkClass()
    
    // Watch for changes
    const observer = new MutationObserver(checkDarkClass)
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    })
    
    return () => observer.disconnect()
  }, [])

  return (
    <div 
      className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-lg text-xs font-mono z-50"
      style={{ minWidth: '250px' }}
    >
      <div className="font-bold mb-2 text-gray-900 dark:text-white">🔧 Dark Mode Debug</div>
      <div className="space-y-1 text-gray-700 dark:text-gray-300">
        <div>isDark context: <span className="font-bold">{isDark ? 'true' : 'false'}</span></div>
        <div>HTML class: <span className="font-bold">{htmlHasDarkClass ? 'HAS dark' : 'NO dark'}</span></div>
        <div>localStorage: <span className="font-bold">{localStorage.getItem('theme') || 'null'}</span></div>
        <div>System: <span className="font-bold">
          {window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}
        </span></div>
      </div>
      <button
        onClick={toggleTheme}
        className="mt-3 w-full px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded font-bold text-sm"
      >
        Toggle Theme
      </button>
    </div>
  )
}

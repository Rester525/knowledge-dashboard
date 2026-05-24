import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Notes from './pages/Notes.jsx'
import Tools from './pages/Tools.jsx'
import Settings from './pages/Settings.jsx'
import Account from './pages/Account.jsx'
import Analytics from './pages/Analytics.jsx'
import Calculator from './pages/Calculator.jsx'

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' },
  { path: '/notes', label: 'Notes', icon: 'notes' },
  { path: '/tools', label: 'Tools', icon: 'tools' },
  { path: '/analytics', label: 'Analytics', icon: 'analytics' },
  { path: '/calculator', label: 'Calculator', icon: 'calculator' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
  { path: '/account', label: 'Account', icon: 'account' },
]

export default function App() {
  return (
    <div className="flex h-screen bg-slate-300 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <Sidebar items={navItems} />
      <main className="flex-1 overflow-auto p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </main>
    </div>
  )
}

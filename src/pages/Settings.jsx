import { useState } from 'react'

export default function Settings() {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: true,
    pomodoroDuration: '25',
    language: 'en',
    autoSync: false,
  })

  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure your dashboard preferences.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Notifications</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Receive study reminders and alerts</p>
          </div>
          <button
            onClick={() => toggle('notifications')}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.notifications ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.notifications ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Dark Mode</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Use dark color scheme</p>
          </div>
          <button
            onClick={() => toggle('darkMode')}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.darkMode ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Auto-Sync</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Synchronize data across devices</p>
          </div>
          <button
            onClick={() => toggle('autoSync')}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.autoSync ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.autoSync ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Pomodoro Duration</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Default focus session length (minutes)</p>
          </div>
          <select
            value={settings.pomodoroDuration}
            onChange={(e) => setSettings((s) => ({ ...s, pomodoroDuration: e.target.value }))}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="15">15 min</option>
            <option value="25">25 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
          </select>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Language</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Interface language</p>
          </div>
          <select
            value={settings.language}
            onChange={(e) => setSettings((s) => ({ ...s, language: e.target.value }))}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="en">English</option>
            <option value="es">Espanol</option>
            <option value="fr">Francais</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
      </div>
    </div>
  )
}

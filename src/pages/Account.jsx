export default function Account() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Account</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your profile and account details.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-5 pb-5 border-b border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
            <svg className="w-8 h-8 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Researcher</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">researcher@knowledge-dashboard.io</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
              Premium
            </span>
          </div>
        </div>

        <div className="pt-5 space-y-4">
          {[
            { label: 'Full Name', value: 'Alex Researcher' },
            { label: 'Email', value: 'researcher@knowledge-dashboard.io' },
            { label: 'Role', value: 'Data Analyst' },
            { label: 'Member Since', value: 'January 2026' },
            { label: 'Total Study Hours', value: '187.5 hrs' },
          ].map((field) => (
            <div key={field.label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
              <span className="text-sm text-slate-500 dark:text-slate-400">{field.label}</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{field.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Study Statistics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Modules', value: '12' },
            { label: 'Flashcards', value: '340' },
            { label: 'Quizzes Passed', value: '28' },
            { label: 'Streak Days', value: '7' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
              <div className="text-xl font-bold text-sky-600 dark:text-sky-400">{stat.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

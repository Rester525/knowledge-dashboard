const weeklyData = [
  { day: 'Mon', hours: 2.5, topics: 3 },
  { day: 'Tue', hours: 3.0, topics: 4 },
  { day: 'Wed', hours: 1.5, topics: 2 },
  { day: 'Thu', hours: 4.0, topics: 5 },
  { day: 'Fri', hours: 2.0, topics: 3 },
  { day: 'Sat', hours: 5.0, topics: 6 },
  { day: 'Sun', hours: 3.5, topics: 4 },
]

const subjectBreakdown = [
  { name: 'Data Structures', hours: 8.5, color: 'bg-sky-500' },
  { name: 'Linear Algebra', hours: 5.0, color: 'bg-violet-500' },
  { name: 'Operating Systems', hours: 3.5, color: 'bg-emerald-500' },
  { name: 'Network Protocols', hours: 4.5, color: 'bg-amber-500' },
  { name: 'Database Systems', hours: 6.0, color: 'bg-rose-500' },
]

const maxHours = Math.max(...weeklyData.map((d) => d.hours))
const totalSubjectHours = subjectBreakdown.reduce((s, d) => s + d.hours, 0)

export default function Analytics() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Analytics</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Detailed study metrics and performance tracking.</p>
      </div>

      {/* Weekly Overview */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-6">Weekly Study Time</h2>
        <div className="flex items-end gap-3 h-48">
          {weeklyData.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-[10px] text-slate-400 font-medium">{d.topics} topics</span>
              <div
                className="w-full rounded-t-md bg-sky-500/80 dark:bg-sky-400/70 transition-all"
                style={{ height: `${(d.hours / maxHours) * 100}%` }}
                title={`${d.hours}h`}
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subject Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Subject Breakdown</h2>
          <div className="space-y-4">
            {subjectBreakdown.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-300">{s.name}</span>
                  <span className="text-slate-400">{s.hours}h</span>
                </div>
                <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${(s.hours / totalSubjectHours) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Quick Stats</h2>
          <div className="space-y-4">
            {[
              { label: 'Total Study Time', value: '21.5 hours', change: '+12%' },
              { label: 'Topics Covered', value: '27 topics', change: '+5' },
              { label: 'Avg Session', value: '47 min', change: '+8%' },
              { label: 'Completion Rate', value: '83%', change: '+3%' },
              { label: 'Flashcards Reviewed', value: '142 cards', change: '+22' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <span className="text-sm text-slate-600 dark:text-slate-300">{stat.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{stat.value}</span>
                  <span className="text-xs font-medium text-emerald-500">{stat.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

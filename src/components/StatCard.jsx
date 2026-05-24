export default function StatCard({ title, value, subtitle, icon, trend }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {icon && (
          <svg className="w-5 h-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
      {subtitle && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
      )}
      {trend && (
        <div className={`text-xs font-medium mt-2 ${trend.startsWith('+') ? 'text-emerald-500' : 'text-red-400'}`}>
          {trend} from last week
        </div>
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'
import StatCard from '../components/StatCard.jsx'
import ModuleCard from '../components/ModuleCard.jsx'

const icons = {
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  streak: 'M13 10V3L4 14h7v7l9-11h-7z',
}

const modules = [
  { title: 'Data Structures', description: 'Arrays, trees, graphs, hash maps and algorithm analysis', progress: 72, color: 'sky', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { title: 'Linear Algebra', description: 'Vectors, matrices, transformations and eigenvalues', progress: 45, color: 'violet', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
  { title: 'Operating Systems', description: 'Process scheduling, memory management, file systems', progress: 38, color: 'emerald', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { title: 'Network Protocols', description: 'TCP/IP, HTTP, DNS, routing and security fundamentals', progress: 55, color: 'amber', icon: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0' },
  { title: 'Database Systems', description: 'SQL, normalization, indexing, transactions and optimization', progress: 60, color: 'rose', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4' },
  { title: 'Software Engineering', description: 'Design patterns, testing, CI/CD and agile methodologies', progress: 25, color: 'sky', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
]

export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back. Here is your study overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Study Time" value="24.5 hrs" subtitle="This week" trend="+12%" icon={icons.clock} />
        <StatCard title="Completed" value="18" subtitle="Modules finished" trend="+3" icon={icons.check} />
        <StatCard title="Current Streak" value="7 days" subtitle="Best: 14 days" icon={icons.streak} />
        <StatCard title="Active Modules" value="6" subtitle="In progress" icon={icons.book} />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Study Modules</h2>
          <Link to="/notes" className="text-sm text-sky-600 dark:text-sky-400 hover:underline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((m) => (
            <ModuleCard key={m.title} {...m} />
          ))}
        </div>
      </div>
    </div>
  )
}

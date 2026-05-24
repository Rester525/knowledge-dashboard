import { useState } from 'react'

const initialNotes = [
  { id: 1, title: 'Binary Search Trees', category: 'Data Structures', content: 'BST property: left < root < right. Inorder traversal yields sorted order. Balanced vs unbalanced trees. AVL and Red-Black self-balancing variants.', date: '2026-05-15', color: 'sky' },
  { id: 2, title: 'Process Scheduling', category: 'Operating Systems', content: 'Round Robin, FCFS, SJF, Priority Scheduling. Context switch overhead. Multi-level feedback queue for interactive systems.', date: '2026-05-14', color: 'emerald' },
  { id: 3, title: 'TCP Handshake', category: 'Network Protocols', content: 'SYN -> SYN-ACK -> ACK. Three-way handshake establishes connection. Sequence numbers, window sizing, congestion control.', date: '2026-05-13', color: 'amber' },
  { id: 4, title: 'Matrix Operations', category: 'Linear Algebra', content: 'Matrix multiplication: A(m×n) * B(n×p) = C(m×p). Determinant, inverse, rank. Eigenvectors satisfy Av = λv.', date: '2026-05-12', color: 'violet' },
  { id: 5, title: 'SQL Joins', category: 'Database Systems', content: 'INNER JOIN, LEFT/RIGHT OUTER JOIN, CROSS JOIN. Join vs subquery performance. Indexed nested loop vs hash join.', date: '2026-05-11', color: 'rose' },
]

const categories = ['All', 'Data Structures', 'Operating Systems', 'Network Protocols', 'Linear Algebra', 'Database Systems']

const colorMap = {
  sky: 'border-l-sky-500',
  emerald: 'border-l-emerald-500',
  amber: 'border-l-amber-500',
  violet: 'border-l-violet-500',
  rose: 'border-l-rose-500',
}

export default function Notes() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = initialNotes.filter((note) => {
    const matchCategory = activeCategory === 'All' || note.category === activeCategory
    const matchSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Study Notes</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Browse and search your curated study notes.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((note) => (
          <div
            key={note.id}
            className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-l-4 ${colorMap[note.color]} p-5`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{note.title}</h3>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                  {note.category}
                </span>
              </div>
              <span className="text-xs text-slate-400">{note.date}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">{note.content}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <p>No notes found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}

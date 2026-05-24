import { useState, useEffect, useRef } from 'react'

function PomodoroTimer() {
  const [time, setTime] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTime((t) => (t > 0 ? t - 1 : (clearInterval(intervalRef.current), setRunning(false), 0)))
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  const mins = Math.floor(time / 60)
  const secs = time % 60

  const reset = () => { clearInterval(intervalRef.current); setRunning(false); setTime(25 * 60) }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Pomodoro Timer</h3>
      <div className="text-center">
        <div className="text-5xl font-bold text-sky-600 dark:text-sky-400 tabular-nums font-mono">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={() => setRunning(!running)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            running ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
          }`}>
            {running ? 'Pause' : 'Start'}
          </button>
          <button onClick={reset} className="px-5 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

function FlashcardPreview() {
  const cards = [
    { q: 'What is Big O of binary search?', a: 'O(log n)' },
    { q: 'What is a deadlock?', a: 'Two processes each waiting for a resource held by the other' },
    { q: 'What does ACID stand for?', a: 'Atomicity, Consistency, Isolation, Durability' },
    { q: 'What is the TCP congestion control algorithm?', a: 'AIMD (Additive Increase Multiplicative Decrease)' },
  ]
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const card = cards[idx % cards.length]

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Flashcard Review</h3>
      <div
        className="min-h-[120px] flex items-center justify-center cursor-pointer rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-6 select-none"
        onClick={() => setFlipped(!flipped)}
      >
        <p className="text-center text-sm font-medium text-slate-700 dark:text-slate-200">
          {flipped ? card.a : card.q}
        </p>
      </div>
      <p className="text-xs text-center text-slate-400 mt-2">Click to {flipped ? 'see question' : 'reveal answer'}</p>
      <div className="mt-4 flex justify-center gap-3">
        <button onClick={() => { setFlipped(false); setIdx((i) => (i - 1 + cards.length) % cards.length) }} className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
          Previous
        </button>
        <button onClick={() => { setFlipped(false); setIdx((i) => (i + 1) % cards.length) }} className="px-4 py-2 rounded-lg text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 transition-colors">
          Next
        </button>
      </div>
    </div>
  )
}

function ProgressTracker() {
  const items = [
    { label: 'Data Structures', pct: 72 },
    { label: 'Linear Algebra', pct: 45 },
    { label: 'Operating Systems', pct: 38 },
    { label: 'Network Protocols', pct: 55 },
    { label: 'Database Systems', pct: 60 },
  ]

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Module Progress</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
              <span className="text-slate-400">{item.pct}%</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${item.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Tools() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Study Tools</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Pomodoro timer, flashcards, and progress tracking.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PomodoroTimer />
        <FlashcardPreview />
      </div>

      <ProgressTracker />
    </div>
  )
}

import { useEffect, useRef, useState, useCallback } from 'react'

const API_KEY = import.meta.env.VITE_DESMOS_API_KEY
const API_URL = `https://www.desmos.com/api/v1.12/calculator.js?apiKey=${API_KEY}`

const presets = [
  { id: 'quadratic', label: 'Quadratic', latex: 'y = x^2', color: '#3b82f6' },
  { id: 'sine', label: 'Sine Wave', latex: 'y = \\sin\\left(x\\right)', color: '#10b981' },
  { id: 'cosine', label: 'Cosine', latex: 'y = \\cos\\left(x\\right)', color: '#f59e0b' },
  { id: 'cubic', label: 'Cubic', latex: 'y = x^3', color: '#8b5cf6' },
  { id: 'circle', label: 'Unit Circle', latex: 'x^2 + y^2 = 1', color: '#ef4444' },
  { id: 'exponential', label: 'Exponential', latex: 'y = e^{x}', color: '#06b6d4' },
  { id: 'hyperbola', label: 'Hyperbola', latex: 'y = \\frac{1}{x}', color: '#f97316' },
  { id: 'log', label: 'Logarithm', latex: 'y = \\log_{10}\\left(x\\right)', color: '#ec4899' },
  { id: 'sqrt', label: 'Square Root', latex: 'y = \\sqrt{x}', color: '#14b8a6' },
  { id: 'absolute', label: 'Absolute Value', latex: 'y = |x|', color: '#a855f7' },
  { id: 'sinc', label: 'Sinc', latex: 'y = \\frac{\\sin\\left(x\\right)}{x}', color: '#f43f5e' },
  { id: 'derivative', label: 'Derivative', latex: 'y = \\frac{d}{dx}\\left(x^3\\right)', color: '#0ea5e9' },
  { id: 'integral', label: 'Definite Integral', latex: '\\int_{0}^{5}x^2dx', color: '#84cc16' },
  { id: 'trig-ident', label: 'Trig Identity', latex: '\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)', color: '#22d3ee' },
  { id: 'tangent', label: 'Tangent', latex: 'y = \\tan\\left(x\\right)', color: '#fb923c' },
  { id: 'natural-log', label: 'Natural Log', latex: 'y = \\ln\\left(x\\right)', color: '#a78bfa' },
  { id: 'gaussian', label: 'Gaussian', latex: 'y = e^{-x^2}', color: '#34d399' },
  { id: 'step', label: 'Step Function', latex: 'y = \\operatorname{floor}\\left(x\\right)', color: '#f472b6' },
  { id: 'rational', label: 'Rational', latex: 'y = \\frac{x^2 - 1}{x - 1}', color: '#2dd4bf' },
  { id: 'parametric', label: 'Parametric', latex: '\\left(\\cos\\left(t\\right),\\sin\\left(t\\right)\\right)', color: '#e879f9' },
  { id: 'polar', label: 'Polar Rose', latex: 'r = 2\\cos\\left(3\\theta\\right)', color: '#facc15' },
  { id: 'slider', label: 'Slider Demo', latex: 'y = a\\sin\\left(bx + c\\right)', color: '#38bdf8' },
  { id: 'bezier', label: 'Bezier Curve', latex: '\\left(\\left(1-t\\right)^{3},3t\\left(1-t\\right)^{2},3t^{2}\\left(1-t\\right),t^{3}\\right)', color: '#818cf8' },
]

const multiPresets = [
  {
    label: 'Function Family',
    expressions: [
      { id: 'mf1', latex: 'y = x^2', color: '#3b82f6' },
      { id: 'mf2', latex: 'y = 2x^2', color: '#10b981' },
      { id: 'mf3', latex: 'y = \\frac{1}{2}x^2', color: '#f59e0b' },
      { id: 'mf4', latex: 'y = -x^2', color: '#ef4444' },
      { id: 'mf5', latex: 'y = -2x^2', color: '#8b5cf6' },
    ],
  },
  {
    label: 'Trig Waveforms',
    expressions: [
      { id: 'tw1', latex: 'y = \\sin\\left(x\\right)', color: '#3b82f6' },
      { id: 'tw2', latex: 'y = 2\\sin\\left(x\\right)', color: '#10b981' },
      { id: 'tw3', latex: 'y = \\sin\\left(2x\\right)', color: '#f59e0b' },
      { id: 'tw4', latex: 'y = \\sin\\left(x+\\frac{\\pi}{2}\\right)', color: '#ef4444' },
    ],
  },
  {
    label: 'Intersections',
    expressions: [
      { id: 'in1', latex: 'y = x^2', color: '#3b82f6' },
      { id: 'in2', latex: 'y = 2x + 3', color: '#ef4444' },
    ],
  },
]

export default function Calculator() {
  const containerRef = useRef(null)
  const calcRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)
  const [activePreset, setActivePreset] = useState(null)

  const loadScript = useCallback(() => {
    if (typeof window.Desmos !== 'undefined') {
      initCalc()
      return
    }

    const existing = document.querySelector(`script[src="${API_URL}"]`)
    if (existing && existing.dataset.loaded === 'true') {
      initCalc()
      return
    }

    const script = document.createElement('script')
    script.src = API_URL
    script.dataset.loaded = 'false'
    script.onload = () => {
      script.dataset.loaded = 'true'
      initCalc()
    }
    script.onerror = () => {
      setError('Failed to load Desmos API. Check your internet connection.')
    }
    document.head.appendChild(script)
  }, [])

  const initCalc = useCallback(() => {
    if (!containerRef.current || calcRef.current) return
    try {
      const calc = window.Desmos.GraphingCalculator(containerRef.current, {
        expressions: true,
        settingsMenu: true,
        zoomButtons: true,
        expressionsTopbar: true,
        border: false,
        showGrid: true,
        showXAxis: true,
        showYAxis: true,
        xAxisNumbers: true,
        yAxisNumbers: true,
        fontSize: 14,
        keypad: true,
        degreeMode: false,
        projectorMode: true,
        trace: true,
      })
      calcRef.current = calc
      setLoaded(true)
    } catch (e) {
      setError('Failed to initialize calculator.')
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(loadScript, 100)
    return () => {
      clearTimeout(timer)
      if (calcRef.current) {
        calcRef.current.destroy()
        calcRef.current = null
      }
    }
  }, [loadScript])

  const loadPreset = useCallback((preset) => {
    if (!calcRef.current) return
    calcRef.current.setBlank()
    setActivePreset(preset.id)
    setTimeout(() => {
      calcRef.current.setExpression({ id: preset.id, latex: preset.latex, color: preset.color })
    }, 50)
  }, [])

  const loadMultiPreset = useCallback((group) => {
    if (!calcRef.current) return
    calcRef.current.setBlank()
    setActivePreset(group.label)
    setTimeout(() => {
      calcRef.current.setExpressions(group.expressions)
    }, 50)
  }, [])

  const clearAll = useCallback(() => {
    if (!calcRef.current) return
    calcRef.current.setBlank()
    setActivePreset(null)
  }, [])

  const getScreenshot = useCallback(() => {
    if (!calcRef.current) return
    const img = calcRef.current.screenshot()
    const link = document.createElement('a')
    link.download = 'desmos-graph.png'
    link.href = img
    link.click()
  }, [])

  return (
    <div className="h-full flex flex-col -m-6">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">Graphing Calculator</h1>
          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto flex-wrap">
            <button
              onClick={clearAll}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activePreset === null
                  ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              Blank
            </button>
            {presets.slice(0, 7).map((p) => (
              <button
                key={p.id}
                onClick={() => loadPreset(p)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  activePreset === p.id
                    ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={getScreenshot}
            disabled={!loaded}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-40"
          >
            Export PNG
          </button>
        </div>
      </div>

      {/* Presets bar (second row on mobile) */}
      <div className="md:hidden px-6 py-2 bg-white/40 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <button
            onClick={clearAll}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              activePreset === null
                ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
          >
            Blank
          </button>
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => loadPreset(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activePreset === p.id
                  ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-preset groups */}
      <div className="px-6 py-2 bg-white/40 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 whitespace-nowrap">Multi-Expression:</span>
          {multiPresets.map((g) => (
            <button
              key={g.label}
              onClick={() => loadMultiPreset(g)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activePreset === g.label
                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              {g.label}
            </button>
          ))}
          <span className="text-[11px] text-slate-400 ml-2 whitespace-nowrap">
            More presets below
          </span>
        </div>
      </div>

      {/* Calculator container */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0 bg-white dark:bg-slate-800">
          <div ref={containerRef} className="w-full h-full" />
          {!loaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-800">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading Desmos Calculator...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-800">
              <div className="text-center max-w-md px-6">
                <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-red-500 font-medium">{error}</p>
                <button onClick={loadScript} className="mt-3 px-4 py-1.5 rounded-lg text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* More presets bar */}
      <div className="px-6 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 flex-wrap">
          {presets.slice(7).map((p) => (
            <button
              key={p.id}
              onClick={() => loadPreset(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activePreset === p.id
                  ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

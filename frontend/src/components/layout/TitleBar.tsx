import { Minus, Square, X } from 'lucide-react'

export function TitleBar() {
  const handleMinimize = () => {
    if (window.electronAPI?.minimize) {
      window.electronAPI.minimize()
    }
  }

  const handleMaximize = () => {
    if (window.electronAPI?.maximize) {
      window.electronAPI.maximize()
    }
  }

  const handleClose = () => {
    if (window.electronAPI?.close) {
      window.electronAPI.close()
    }
  }

  return (
    <div
      className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between select-none z-50 pointer-events-none"
    >
      {/* Drag Region & Logo */}
      <div 
        className="flex-1 h-full flex items-center px-6 pointer-events-auto" 
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">J</span>
          </div>
          <span className="font-bold text-base text-zinc-900 tracking-tight">Journal Hub.</span>
        </div>
      </div>

      {/* Window Controls */}
      <div className="flex h-full pointer-events-auto" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={handleMinimize}
          className="h-full px-4 hover:bg-black/5 transition-colors flex items-center justify-center text-zinc-500 hover:text-zinc-800"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-4 hover:bg-black/5 transition-colors flex items-center justify-center text-zinc-500 hover:text-zinc-800"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleClose}
          className="h-full px-4 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center group text-zinc-500"
        >
          <X className="w-4 h-4 group-hover:text-white" />
        </button>
      </div>
    </div>
  )
}

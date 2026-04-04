'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Square, Clock } from 'lucide-react'

interface TimeTimerProps {
  onStop: (hours: number) => void
  disabled?: boolean
}

export default function TimeTimer({ onStop, disabled }: TimeTimerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0) // seconds
  const [startTime, setStartTime] = useState<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Restore timer from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('we_timer')
    if (saved) {
      try {
        const { start, running } = JSON.parse(saved)
        if (running && start) {
          setStartTime(start)
          setIsRunning(true)
          setElapsed(Math.floor((Date.now() - start) / 1000))
        }
      } catch {}
    }
  }, [])

  // Tick every second
  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, startTime])

  // Persist timer state
  useEffect(() => {
    if (isRunning && startTime) {
      localStorage.setItem('we_timer', JSON.stringify({ start: startTime, running: true }))
    } else {
      localStorage.removeItem('we_timer')
    }
  }, [isRunning, startTime])

  const handleStart = () => {
    const now = Date.now()
    setStartTime(now)
    setElapsed(0)
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
    const hours = Math.round((elapsed / 3600) * 100) / 100 // round to 2 decimals
    setElapsed(0)
    setStartTime(null)
    onStop(hours)
  }

  const formatElapsed = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (disabled) return null

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
      isRunning
        ? 'bg-red-50 border-red-200'
        : 'bg-gray-50 border-gray-200'
    }`}>
      <Clock className={`h-4 w-4 ${isRunning ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />

      {isRunning ? (
        <>
          <span className="font-mono text-lg font-bold text-red-600 min-w-[80px]">
            {formatElapsed(elapsed)}
          </span>
          <button
            onClick={handleStop}
            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
          >
            <Square className="h-3 w-3" />
            Stop
          </button>
        </>
      ) : (
        <>
          <span className="text-sm text-gray-600">Timer</span>
          <button
            onClick={handleStart}
            className="flex items-center gap-1 px-3 py-1 bg-[#e31c79] text-white rounded text-sm font-medium hover:bg-[#c91865]"
          >
            <Play className="h-3 w-3" />
            Start
          </button>
        </>
      )}
    </div>
  )
}

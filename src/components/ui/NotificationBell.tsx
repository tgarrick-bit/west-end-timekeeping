'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Check, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  created_at: string
  metadata: Record<string, any>
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (user?.id) loadNotifications()
  }, [user?.id])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [user?.id])

  const loadNotifications = async () => {
    // Try notifications table first, fall back to in_app_notifications
    let result = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (result.error) {
      result = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20)
    }

    if (result.data) {
      setNotifications(result.data as Notification[])
      setUnreadCount(result.data.filter((n: any) => !n.is_read).length)
    }
  }

  const tableName = 'notifications'

  const markAsRead = async (id: string) => {
    await supabase.from(tableName).update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase.from(tableName).update({ is_read: true }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  const TypeIcon = ({ type }: { type: string }) => {
    const size = 12
    const sw = 1.5
    switch (type) {
      case 'success': return <CheckCircle size={size} strokeWidth={sw} style={{ color: '#2d9b6e' }} />
      case 'warning': return <AlertTriangle size={size} strokeWidth={sw} style={{ color: '#d4a017' }} />
      case 'error': return <XCircle size={size} strokeWidth={sw} style={{ color: '#b91c1c' }} />
      default: return <Info size={size} strokeWidth={sw} style={{ color: '#6b7280' }} />
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center transition-colors duration-150"
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: isOpen ? '#FAFAF8' : 'transparent',
          color: '#999',
          border: 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = '#FAFAF8' }}
        onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.color = '#999'; e.currentTarget.style.background = 'transparent' } }}
      >
        <Bell size={16} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#e31c79',
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            borderRadius: 8,
            padding: '0 4px',
            lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: 6,
          width: 320,
          background: '#fff',
          border: '0.5px solid #e8e4df',
          borderRadius: 10,
          overflow: 'hidden',
          zIndex: 50,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '0.5px solid #f0ece7',
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  color: '#e31c79',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <Check size={11} strokeWidth={2} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 11, color: '#ccc' }}>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markAsRead(n.id)
                    const link = n.metadata?.link
                    if (link) window.location.href = link
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '11px 16px',
                    borderBottom: '0.5px solid #f5f2ee',
                    cursor: 'pointer',
                    background: !n.is_read ? '#FDFCFB' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FAFAF8' }}
                  onMouseLeave={e => { e.currentTarget.style.background = !n.is_read ? '#FDFCFB' : 'transparent' }}
                >
                  <div style={{ marginTop: 2, flexShrink: 0 }}>
                    <TypeIcon type={n.type} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 12,
                      fontWeight: !n.is_read ? 600 : 400,
                      color: '#1a1a1a',
                      margin: 0,
                      lineHeight: 1.3,
                    }}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p style={{
                        fontSize: 11,
                        color: '#999',
                        margin: '2px 0 0',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {n.message}
                      </p>
                    )}
                    <p style={{ fontSize: 10, color: '#c0bab2', margin: '3px 0 0' }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#e31c79',
                      flexShrink: 0,
                      marginTop: 5,
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

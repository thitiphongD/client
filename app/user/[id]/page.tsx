'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'

interface User {
  id: string
  is_active: boolean
  platform_role: string
  email: string
}

interface Message {
  type: string
  data?: Record<string, unknown>
  timestamp: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'error' | 'warning' | 'success'
  created_at: string
}

interface CronJob {
  id: string
  name: string
  cronExpression: string
  isActive: boolean
}

const getNotificationStyles = (type: Notification['type']) => {
  const styles = {
    info: 'border-l-blue-500 bg-blue-50',
    error: 'border-l-red-500 bg-red-50',
    warning: 'border-l-yellow-500 bg-yellow-50',
    success: 'border-l-green-500 bg-green-50'
  }
  return styles[type] || styles.info
}

const getNotificationIcon = (type: Notification['type']) => {
  const icons = {
    info: '📘',
    error: '❌',
    warning: '⚠️',
    success: '✅'
  }
  return icons[type] || icons.info
}

export default function UserDashboard() {
  const params = useParams()
  const router = useRouter()
  const user_id = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [wsActivity, setWsActivity] = useState(0)

  // Form states
  const [systemTitle, setSystemTitle] = useState('')
  const [systemMessage, setSystemMessage] = useState('')
  const [systemType, setSystemType] = useState('info')

  const [userTitle, setUserTitle] = useState('')
  const [userMessage, setUserMessage] = useState('')
  const [userType, setUserType] = useState('info')
  const [recipient_id, setRecipientId] = useState('')

  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, notifications])

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/test-notification`)
        const data = await response.json()
        setAllUsers(data || [])
        const foundUser = data?.find((u: User) => u.id === user_id)
        if (foundUser) {
          setUser(foundUser)
          // Auto-connect WebSocket for this user
          connectWebSocket()
          // Fetch cronjobs if admin
          if (foundUser.platform_role === 'platform_admin') {
            fetchCronJobs()
          }
        } else {
          router.push('/')
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error)
        router.push('/')
      }
    }

    fetchUserInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user_id, router])

  const connectWebSocket = () => {
    console.log('🔌 Attempting to connect WebSocket...')
    if (socket) {
      socket.close()
    }

    const ws = new WebSocket(WS_URL)
    console.log('📡 WebSocket created, waiting for connection...')

    ws.onopen = () => {
      console.log('✅ WebSocket connected successfully!')
      setIsConnected(true)
      setSocket(ws)
      const registerMessage = { type: 'register', user_id: user_id }
      console.log('📤 Sending register message:', registerMessage)
      ws.send(JSON.stringify(registerMessage))
      addMessage({ type: 'connection', data: { message: `Connected as ${user_id}` }, timestamp: new Date().toISOString() })
      setWsActivity(prev => prev + 1)
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      addMessage(message)
      setWsActivity(prev => prev + 1)

      if (message.type === 'notification') {
        setNotifications(prev => [message.data, ...prev])
      }

      if (message.type === 'cronjob_status') {
        fetchCronJobs() // Refresh cronjobs on status update
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      setSocket(null)
      addMessage({ type: 'connection', data: { message: 'Disconnected' }, timestamp: new Date().toISOString() })
    }

    ws.onerror = () => {
      addMessage({ type: 'error', data: { message: 'WebSocket error' }, timestamp: new Date().toISOString() })
    }
  }

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, { ...message, timestamp: new Date().toISOString() }])
  }

  const fetchCronJobs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/config/cronjobs`)
      const data = await response.json()
      setCronJobs(data.cronJobs)
    } catch {
      console.error('Failed to fetch cronjobs')
    }
  }

  const createSystemNotification = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: systemTitle,
          message: systemMessage,
          type: systemType,
          category: 'system'
        })
      })

      if (response.ok) {
        setSystemTitle('')
        setSystemMessage('')
        addMessage({ type: 'api', data: { message: 'System notification created (should appear in real-time)' }, timestamp: new Date().toISOString() })
      }
    } catch {
      addMessage({ type: 'error', data: { message: 'Failed to create notification' }, timestamp: new Date().toISOString() })
    }
  }

  const createUserNotification = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_user_id: recipient_id,
          from_user_id: user_id,
          title: userTitle,
          message: userMessage,
          type: userType,
          category: 'user-to-user'
        })
      })

      if (response.ok) {
        setUserTitle('')
        setUserMessage('')
        addMessage({ type: 'api', data: { message: `User notification sent to ${recipient_id} (check their dashboard for real-time update)` }, timestamp: new Date().toISOString() })
      }
    } catch {
      addMessage({ type: 'error', data: { message: 'Failed to create notification' }, timestamp: new Date().toISOString() })
    }
  }

  const toggleCronJob = async (jobId: string, action: 'start' | 'stop') => {
    try {
      const response = await fetch(`${API_URL}/api/config/cronjobs/${jobId}/${action}`, {
        method: 'POST'
      })

      if (response.ok) {
        addMessage({ type: 'api', data: { message: `CronJob ${action}ed (status update should appear in real-time)` }, timestamp: new Date().toISOString() })
        fetchCronJobs()
      }
    } catch {
      addMessage({ type: 'error', data: { message: `Failed to ${action} cronjob` }, timestamp: new Date().toISOString() })
    }
  }

  const markAsRead = (notificationId: string) => {
    if (socket) {
      socket.send(JSON.stringify({ type: 'markAsRead', notificationId }))
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/mark-all-read/${user_id}`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications([]) // Clear all notifications from UI
        addMessage({ type: 'api', data: { message: `${data.message}` }, timestamp: new Date().toISOString() })
      }
    } catch {
      addMessage({ type: 'error', data: { message: 'Failed to mark all as read' }, timestamp: new Date().toISOString() })
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🔄 Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {user.platform_role === 'admin' ? '👑' : '👤'} {user.is_active} Dashboard
          </h1>
          <p className="text-gray-600">{user.email} • {user.platform_role}</p>
        </div>
        <div className="flex gap-2">
          {user.platform_role === 'admin' && (
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 border rounded hover:opacity-70"
            >
              👑 Admin Panel
            </button>
          )}
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 border rounded hover:opacity-70"
          >
            ← Back to User Selection
          </button>
        </div>
      </div>

      {/* WebSocket Status */}
      <div className="mb-6 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">WebSocket Status</h2>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full text-sm border">
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
            <span className="text-sm border px-2 py-1 rounded">
              Activity: {wsActivity} messages
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Forms */}
        <div className="space-y-6">
          {/* Admin Only - System Notification */}
          {user.platform_role === 'admin' && (
            <div className="p-4 border rounded-lg">
              <h3 className="text-lg font-semibold mb-4">📢 System Notification (Broadcast to All)</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Title"
                  value={systemTitle}
                  onChange={(e) => setSystemTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
                <textarea
                  placeholder="Message"
                  value={systemMessage}
                  onChange={(e) => setSystemMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded h-20"
                />
                <select value={systemType} onChange={(e) => setSystemType(e.target.value)} className="w-full px-3 py-2 border rounded">
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
                <button
                  onClick={createSystemNotification}
                  className="w-full px-4 py-2 border rounded hover:opacity-70"
                  disabled={!systemTitle || !systemMessage}
                >
                  Send System Notification
                </button>
              </div>
            </div>
          )}

          {/* User-to-User Notification */}
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">💬 User-to-User Notification</h3>
            <div className="space-y-3">
              <select value={recipient_id} onChange={(e) => setRecipientId(e.target.value)} className="w-full px-3 py-2 border rounded">
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    Send to {u.email} ({u.platform_role})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Title"
                value={userTitle}
                onChange={(e) => setUserTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
              <textarea
                placeholder="Message"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                className="w-full px-3 py-2 border rounded h-20"
              />
              <select value={userType} onChange={(e) => setUserType(e.target.value)} className="w-full px-3 py-2 border rounded">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
              <button
                onClick={createUserNotification}
                className="w-full px-4 py-2 border rounded hover:opacity-70"
                disabled={!userTitle || !userMessage}
              >
                Send User Notification
              </button>
            </div>
          </div>

          {/* Admin Only - CronJob Management */}
          {user.platform_role === 'admin' && (
            <div className="p-4 border rounded-lg">
              <h3 className="text-lg font-semibold mb-4">⏰ CronJob Management</h3>
              <div className="space-y-2">
                {cronJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">{job.name}</div>
                      <div className="text-xs text-gray-500">{job.cronExpression}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${job.isActive ? 'border' : 'border opacity-50'}`}>
                        {job.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => toggleCronJob(job.id, job.isActive ? 'stop' : 'start')}
                        className="px-2 py-1 text-xs border rounded hover:opacity-70"
                      >
                        {job.isActive ? 'Stop' : 'Start'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Real-time Display */}
        <div className="space-y-6">
          {/* Received Notifications */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">🔔 Real-time Notifications ({notifications.length})</h3>
              <button
                onClick={markAllAsRead}
                className="px-3 py-1 text-sm border rounded hover:opacity-70 disabled:opacity-50"
                disabled={notifications.length === 0}
              >
                ✅ Mark All Read
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {notifications.map((notif, index) => (
                <div key={index} className={`p-3 rounded border-l-4 ${getNotificationStyles(notif.type)}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{getNotificationIcon(notif.type)}</span>
                    <div className="flex-1">
                      <div className="font-semibold">{notif.title}</div>
                      <div className="text-sm text-gray-600">{notif.message}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">{new Date(notif.created_at).toLocaleTimeString()}</span>
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="text-xs px-2 py-1 border rounded hover:opacity-70"
                        >
                          Mark Read
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-gray-500 text-center py-4">No notifications received yet</div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* WebSocket Activity Log */}
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">📝 WebSocket Activity Log ({messages.length})</h3>
            <div className="space-y-1 max-h-60 overflow-y-auto text-sm font-mono">
              {messages.map((msg, index) => (
                <div key={index} className="p-2 rounded border">
                  <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  <span className="ml-2 font-semibold">[{msg.type}]</span>
                  <div className="mt-1">{JSON.stringify(msg.data || msg, null, 2)}</div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-gray-500 text-center py-4">No WebSocket activity yet</div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
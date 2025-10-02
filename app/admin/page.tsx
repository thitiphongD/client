'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws'

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
  createdAt: string
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

export default function AdminDashboard() {
  const router = useRouter()
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [wsActivity, setWsActivity] = useState(0)

  // System Notification Form
  const [systemTitle, setSystemTitle] = useState('')
  const [systemMessage, setSystemMessage] = useState('')
  const [systemType, setSystemType] = useState('info')
  const [systemScheduledDate, setSystemScheduledDate] = useState<Date | undefined>(undefined)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, notifications])

  useEffect(() => {
    // Auto-connect as admin user (user1)
    connectWebSocket()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connectWebSocket = () => {
    console.log('🔌 Admin connecting WebSocket...')
    if (socket) {
      socket.close()
    }

    const ws = new WebSocket(WS_URL)
    console.log('📡 Admin WebSocket created, waiting for connection...')

    ws.onopen = () => {
      console.log('✅ Admin WebSocket connected successfully!')
      setIsConnected(true)
      setSocket(ws)
      const registerMessage = { type: 'register', userId: 'user1' }
      console.log('📤 Admin sending register message:', registerMessage)
      ws.send(JSON.stringify(registerMessage))
      addMessage({ type: 'connection', data: { message: `Connected as admin (user1)` }, timestamp: new Date().toISOString() })
      setWsActivity(prev => prev + 1)
    }

    ws.onmessage = (event) => {
      console.log('📨 Admin received WebSocket message:', event.data)
      const message = JSON.parse(event.data)
      addMessage(message)
      setWsActivity(prev => prev + 1)

      if (message.type === 'notification') {
        console.log('🔔 Admin received notification:', message.data)
        setNotifications(prev => [message.data, ...prev])
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

  const createSystemNotification = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: systemTitle,
          message: systemMessage,
          type: systemType,
          category: 'system',
          scheduledAt: systemScheduledDate?.toISOString()
        })
      })

      if (response.ok) {
        setSystemTitle('')
        setSystemMessage('')
        setSystemScheduledDate(undefined)
        const scheduleText = systemScheduledDate ? ' and scheduled' : ' to all users'
        addMessage({ type: 'api', data: { message: `✅ System notification created${scheduleText}` }, timestamp: new Date().toISOString() })
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to create notification'
        addMessage({ type: 'error', data: { message: `❌ ${errorMessage}` }, timestamp: new Date().toISOString() })
      }
    } catch {
      addMessage({ type: 'error', data: { message: '❌ Network error: Failed to create notification' }, timestamp: new Date().toISOString() })
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
      const response = await fetch(`${API_URL}/api/notifications/mark-all-read/user1`, {
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">👑 Admin Dashboard</h1>
          <p className="text-gray-600">System Administration Panel</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/cronjobs')}
            variant="outline"
          >
            ⏰ CronJob Manager
          </Button>
          <Button
            onClick={() => router.push('/')}
            variant="outline"
          >
            ← Back to User Selection
          </Button>
        </div>
      </div>

      {/* WebSocket Status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>WebSocket Status</CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? '🟢 Connected as Admin' : '🔴 Disconnected'}
              </Badge>
              <Badge variant="outline">
                Activity: {wsActivity} messages
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Panel - System Notification Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📢 System Notification</CardTitle>
              <CardDescription>Broadcast to all users instantly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="text"
                placeholder="Notification Title"
                value={systemTitle}
                onChange={(e) => setSystemTitle(e.target.value)}
              />
              <Textarea
                placeholder="Notification Message"
                value={systemMessage}
                onChange={(e) => setSystemMessage(e.target.value)}
                className="h-24"
              />
              <Select value={systemType} onValueChange={setSystemType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">📘 Info</SelectItem>
                  <SelectItem value="warning">⚠️ Warning</SelectItem>
                  <SelectItem value="success">✅ Success</SelectItem>
                  <SelectItem value="error">❌ Error</SelectItem>
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <Label>Schedule (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {systemScheduledDate ? (
                        format(systemScheduledDate, "PPP 'at' p")
                      ) : (
                        <span className="text-muted-foreground">Send immediately or pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={systemScheduledDate}
                      onSelect={setSystemScheduledDate}
                      disabled={(date) => date < new Date()}
                    />
                    {systemScheduledDate && (
                      <div className="p-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">
                            {format(systemScheduledDate, "PPP 'at' p")}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSystemScheduledDate(undefined)}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                onClick={createSystemNotification}
                className="w-full"
                disabled={!systemTitle || !systemMessage}
              >
                {systemScheduledDate ? '📅 Schedule Notification' : '🚀 Send Immediately'}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>⚡ Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => router.push('/cronjobs')}
                variant="outline"
                className="w-full justify-start"
              >
                ⏰ Manage CronJobs
              </Button>
              <Button
                onClick={() => window.open(`${API_URL}/swagger`, '_blank')}
                variant="outline"
                className="w-full justify-start"
              >
                📚 API Documentation
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Real-time Display */}
        <div className="space-y-6">
          {/* Received Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>🔔 Admin Notifications</CardTitle>
                  <CardDescription>{notifications.length} notifications received</CardDescription>
                </div>
                <Button
                  onClick={markAllAsRead}
                  variant="outline"
                  size="sm"
                  disabled={notifications.length === 0}
                >
                  ✅ Mark All Read
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-60">
                <div className="space-y-2">
                  {notifications.map((notif, index) => (
                    <Card key={index} className={`p-3 border-l-4 ${getNotificationStyles(notif.type)}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-xl">{getNotificationIcon(notif.type)}</span>
                        <div className="flex-1">
                          <div className="font-semibold">{notif.title}</div>
                          <div className="text-sm text-muted-foreground">{notif.message}</div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-muted-foreground">{new Date(notif.createdAt).toLocaleTimeString()}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsRead(notif.id)}
                            >
                              Mark Read
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {notifications.length === 0 && (
                    <div className="text-muted-foreground text-center py-4">No notifications yet</div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* WebSocket Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle>📝 System Activity Log</CardTitle>
              <CardDescription>{messages.length} messages logged</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-60">
                <div className="space-y-1 text-sm font-mono">
                  {messages.map((msg, index) => (
                    <Card key={index} className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        <Badge variant="outline">[{msg.type}]</Badge>
                      </div>
                      <Separator className="my-1" />
                      <div className="text-xs">{JSON.stringify(msg.data || msg, null, 2)}</div>
                    </Card>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-muted-foreground text-center py-4">No activity yet</div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
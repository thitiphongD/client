'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [wsActivity, setWsActivity] = useState(0)

  // System Notification Form
  const [systemTitle, setSystemTitle] = useState('')
  const [systemMessage, setSystemMessage] = useState('')
  const [systemType, setSystemType] = useState('info')
  const [systemScheduledDate, setSystemScheduledDate] = useState<Date | undefined>(undefined)

  // CronJob Form
  const [cronJobName, setCronJobName] = useState('')
  const [cronJobDescription, setCronJobDescription] = useState('')
  const [cronExpression, setCronExpression] = useState('* * * * *')
  const [cronError, setCronError] = useState('')
  const [jobType, setJobType] = useState('notification_check')
  const [jobData, setJobData] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isOneTime, setIsOneTime] = useState(false)
  const [oneTimeDate, setOneTimeDate] = useState<Date | undefined>(undefined)
  const [oneTimeTime, setOneTimeTime] = useState('')

  const [cronJobs, setCronJobs] = useState<any[]>([])

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
    fetchCronJobs()
  }, [])

  const connectWebSocket = () => {
    console.log('🔌 Admin connecting WebSocket...')
    if (socket) {
      socket.close()
    }

    const ws = new WebSocket('ws://localhost:3001/ws')
    console.log('📡 Admin WebSocket created, waiting for connection...')

    ws.onopen = () => {
      console.log('✅ Admin WebSocket connected successfully!')
      setIsConnected(true)
      setSocket(ws)
      const registerMessage = { type: 'register', userId: 'user1' }
      console.log('📤 Admin sending register message:', registerMessage)
      ws.send(JSON.stringify(registerMessage))
      addMessage({ type: 'connection', data: { message: `Connected as admin (user1)`, timestamp: new Date().toISOString() } })
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

      if (message.type === 'cronjob_status') {
        fetchCronJobs() // Refresh cronjobs on status update
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      setSocket(null)
      addMessage({ type: 'connection', data: { message: 'Disconnected', timestamp: new Date().toISOString() } })
    }

    ws.onerror = () => {
      addMessage({ type: 'error', data: { message: 'WebSocket error', timestamp: new Date().toISOString() } })
    }
  }

  const addMessage = (message: any) => {
    setMessages(prev => [...prev, { ...message, timestamp: new Date().toISOString() }])
  }

  const validateCronExpression = (expression: string) => {
    const cronRegex = /^(\*|([0-5]?\d)|\*\/([0-5]?\d)|([0-5]?\d)-([0-5]?\d)|([0-5]?\d),([0-5]?\d))\s+(\*|([01]?\d|2[0-3])|\*\/([01]?\d|2[0-3])|([01]?\d|2[0-3])-([01]?\d|2[0-3])|([01]?\d|2[0-3]),([01]?\d|2[0-3]))\s+(\*|([12]?\d|3[01])|\*\/([12]?\d|3[01])|([12]?\d|3[01])-([12]?\d|3[01])|([12]?\d|3[01]),([12]?\d|3[01]))\s+(\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])|([1-9]|1[0-2])-([1-9]|1[0-2])|([1-9]|1[0-2]),([1-9]|1[0-2]))\s+(\*|[0-6]|\*\/[0-6]|[0-6]-[0-6]|[0-6],[0-6])$/

    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) {
      return 'Cron expression must have exactly 5 parts (minute hour day month weekday)'
    }

    if (!cronRegex.test(expression)) {
      return 'Invalid cron expression format'
    }

    return ''
  }

  const handleCronExpressionChange = (value: string) => {
    setCronExpression(value)
    const error = validateCronExpression(value)
    setCronError(error)
  }

  const getCronDescription = (expression: string) => {
    const presets = {
      '* * * * *': 'Every minute',
      '0 * * * *': 'Every hour',
      '0 0 * * *': 'Daily at midnight',
      '0 9 * * *': 'Daily at 9:00 AM',
      '0 18 * * *': 'Daily at 6:00 PM',
      '*/5 * * * *': 'Every 5 minutes',
      '*/15 * * * *': 'Every 15 minutes',
      '*/30 * * * *': 'Every 30 minutes',
      '0 */2 * * *': 'Every 2 hours',
      '0 */6 * * *': 'Every 6 hours',
      '0 0 * * 0': 'Weekly on Sunday',
      '0 0 1 * *': 'Monthly on 1st day',
      '0 2 * * 0': 'Weekly cleanup (Sunday 2:00 AM)'
    }
    return presets[expression as keyof typeof presets] || 'Custom schedule'
  }

  const fetchCronJobs = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/cronjobs')
      const data = await response.json()
      setCronJobs(data.cronJobs)
    } catch (error) {
      console.error('Failed to fetch cronjobs:', error)
    }
  }

  const createSystemNotification = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/notifications', {
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
        addMessage({ type: 'api', data: { message: `System notification created${scheduleText}`, timestamp: new Date().toISOString() } })
      }
    } catch (error) {
      addMessage({ type: 'error', data: { message: 'Failed to create notification', timestamp: new Date().toISOString() } })
    }
  }

  const createCronJob = async () => {
    try {
      // สำหรับ one-time job ใช้ cron expression จาก date และ time
      let finalCronExpression = cronExpression
      if (isOneTime && oneTimeDate && oneTimeTime) {
        const date = new Date(oneTimeDate)
        const [timeHour, timeMinute] = oneTimeTime.split(':').map(Number)

        // สร้าง Date object ด้วย local timezone (เวลาไทย)
        const localDateTime = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          timeHour,
          timeMinute
        )

        // ใช้ UTC time ของ local datetime โดยตรง (แก้ไข: ไม่ต้อง convert)
        finalCronExpression = `${localDateTime.getUTCMinutes()} ${localDateTime.getUTCHours()} ${localDateTime.getUTCDate()} ${localDateTime.getUTCMonth() + 1} *`
      }

      const response = await fetch('http://localhost:3001/api/cronjobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cronJobName,
          description: cronJobDescription,
          cronExpression: finalCronExpression,
          jobType,
          jobData: jobData || null,
          isActive
        })
      })

      if (response.ok) {
        setCronJobName('')
        setCronJobDescription('')
        setJobData('')
        setIsOneTime(false)
        setOneTimeDate(undefined)
        setOneTimeTime('')
        const scheduleText = isOneTime ? ' (one-time)' : ' (recurring)'
        addMessage({ type: 'api', data: { message: `CronJob created successfully${scheduleText}`, timestamp: new Date().toISOString() } })
        fetchCronJobs()
      }
    } catch (error) {
      addMessage({ type: 'error', data: { message: 'Failed to create cronjob', timestamp: new Date().toISOString() } })
    }
  }

  const toggleCronJob = async (jobId: string, action: 'start' | 'stop') => {
    try {
      const response = await fetch(`http://localhost:3001/api/cronjobs/${jobId}/${action}`, {
        method: 'POST'
      })

      if (response.ok) {
        addMessage({ type: 'api', data: { message: `CronJob ${action}ed successfully`, timestamp: new Date().toISOString() } })
        fetchCronJobs()
      }
    } catch (error) {
      addMessage({ type: 'error', data: { message: `Failed to ${action} cronjob`, timestamp: new Date().toISOString() } })
    }
  }

  const deleteCronJob = async (jobId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/cronjobs/${jobId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        addMessage({ type: 'api', data: { message: 'CronJob deleted successfully', timestamp: new Date().toISOString() } })
        fetchCronJobs()
      }
    } catch (error) {
      addMessage({ type: 'error', data: { message: 'Failed to delete cronjob', timestamp: new Date().toISOString() } })
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
      const response = await fetch('http://localhost:3001/api/notifications/mark-all-read/user1', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications([]) // Clear all notifications from UI
        addMessage({ type: 'api', data: { message: `${data.message}`, timestamp: new Date().toISOString() } })
      }
    } catch (error) {
      addMessage({ type: 'error', data: { message: 'Failed to mark all as read', timestamp: new Date().toISOString() } })
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
        <Button
          onClick={() => router.push('/')}
          variant="outline"
        >
          ← Back to User Selection
        </Button>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Panel - Forms */}
        <div className="space-y-6">
          <Tabs defaultValue="notification" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="notification">📢 Notification</TabsTrigger>
              <TabsTrigger value="cronjob">⏰ CronJob</TabsTrigger>
            </TabsList>

            <TabsContent value="notification">
              <Card>
                <CardHeader>
                  <CardTitle>System Notification</CardTitle>
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
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
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
                    {systemScheduledDate ? 'Schedule Notification' : 'Send Immediately'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cronjob">
              <Card>
                <CardHeader>
                  <CardTitle>Create CronJob</CardTitle>
                  <CardDescription>Schedule automated tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Job Name"
                    value={cronJobName}
                    onChange={(e) => setCronJobName(e.target.value)}
                  />
                  <Textarea
                    placeholder="Job Description"
                    value={cronJobDescription}
                    onChange={(e) => setCronJobDescription(e.target.value)}
                    className="h-16"
                  />
                  <div>
                    <Input
                      type="text"
                      placeholder="Cron Expression (minute hour day month weekday)"
                      value={cronExpression}
                      onChange={(e) => handleCronExpressionChange(e.target.value)}
                      className={cronError ? 'border-red-500' : ''}
                    />
                    {cronError && (
                      <div className="text-xs text-red-500 mt-1">
                        {cronError}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      <div className="font-medium">Current: {getCronDescription(cronExpression)}</div>
                      <div className="mt-1">
                        <div><code>* * * * *</code> = Every minute</div>
                        <div><code>0 9 * * *</code> = Daily at 9:00 AM</div>
                        <div><code>*/5 * * * *</code> = Every 5 minutes</div>
                        <div><code>0 */2 * * *</code> = Every 2 hours</div>
                        <div><code>0 0 * * 0</code> = Weekly on Sunday</div>
                      </div>
                    </div>
                  </div>
                  <Select value={jobType} onValueChange={setJobType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notification_check">Notification Check</SelectItem>
                      <SelectItem value="daily_summary">Daily Summary</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Job Data (JSON format, optional)"
                    value={jobData}
                    onChange={(e) => setJobData(e.target.value)}
                    className="h-16"
                  />

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isOneTime"
                        checked={isOneTime}
                        onCheckedChange={(checked) => setIsOneTime(checked === true)}
                      />
                      <Label htmlFor="isOneTime">One-time schedule (run once)</Label>
                    </div>

                    {isOneTime && (
                      <div className="space-y-3">
                        <Label>Select Date & Time</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {oneTimeDate ? (
                                <span>
                                  {format(oneTimeDate, "PPP")}
                                  {oneTimeTime && ` at ${oneTimeTime}`}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Pick date and time</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={oneTimeDate}
                              onSelect={setOneTimeDate}
                              disabled={(date) => date < new Date()}
                            />
                            {oneTimeDate && (
                              <div className="p-3 border-t space-y-3">
                                <div>
                                  <Label className="text-sm font-medium">Time</Label>
                                  <Input
                                    type="time"
                                    value={oneTimeTime}
                                    onChange={(e) => setOneTimeTime(e.target.value)}
                                    className="mt-1"
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">
                                    {format(oneTimeDate, "PPP")}
                                    {oneTimeTime && ` at ${oneTimeTime}`}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setOneTimeDate(undefined)
                                      setOneTimeTime('')
                                    }}
                                  >
                                    Clear
                                  </Button>
                                </div>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isActive"
                        checked={isActive}
                        onCheckedChange={(checked) => setIsActive(checked === true)}
                      />
                      <Label htmlFor="isActive">Start immediately</Label>
                    </div>
                  </div>

                  <Button
                    onClick={createCronJob}
                    className="w-full"
                    disabled={!cronJobName || (!isOneTime && (!cronExpression || !!cronError)) || (isOneTime && (!oneTimeDate || !oneTimeTime))}
                  >
                    {isOneTime ? 'Schedule One-time Job' : 'Create Recurring Job'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Middle Panel - CronJob Management */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>⚙️ CronJob Management</CardTitle>
              <CardDescription>{cronJobs.length} jobs configured</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {cronJobs.map((job) => (
                    <Card key={job.id} className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium">{job.name}</div>
                          <div className="text-sm text-muted-foreground">{job.description}</div>
                          <div className="text-xs text-muted-foreground">{job.cronExpression}</div>
                          <div className="text-xs text-muted-foreground">Type: {job.jobType}</div>
                        </div>
                        <Badge variant={job.isActive ? "default" : "secondary"}>
                          {job.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleCronJob(job.id, job.isActive ? 'stop' : 'start')}
                        >
                          {job.isActive ? 'Stop' : 'Start'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteCronJob(job.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {cronJobs.length === 0 && (
                    <div className="text-muted-foreground text-center py-4">No cron jobs created yet</div>
                  )}
                </div>
              </ScrollArea>
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
                    <Card key={index} className="p-3 border-l-4">
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
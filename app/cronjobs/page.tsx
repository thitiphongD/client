'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import { Edit, Trash2, Play, Pause, Clock, X } from 'lucide-react'

interface CronJob {
  id: string
  name: string
  description: string
  cronExpression: string
  isActive: boolean
  jobType: string
  jobData: string | null
  lastRun: string | null
  nextRun: string | null
  createdAt: string
  updatedAt: string
}

export default function CronJobsPage() {
  const router = useRouter()
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Form states
  const [cronJobName, setCronJobName] = useState('')
  const [cronJobDescription, setCronJobDescription] = useState('')
  const [scheduleType, setScheduleType] = useState('minutes')
  const [scheduleValue, setScheduleValue] = useState('5')
  const [dailyTime, setDailyTime] = useState('09:00')
  const [weeklyDay, setWeeklyDay] = useState('0')
  const [monthlyDay, setMonthlyDay] = useState('1')
  const [cronError, setCronError] = useState('')
  const [jobType, setJobType] = useState('notification_check')
  const [jobData, setJobData] = useState('')
  const [jobDataError, setJobDataError] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isOneTime, setIsOneTime] = useState(false)
  const [oneTimeDate, setOneTimeDate] = useState<Date | undefined>(undefined)
  const [oneTimeTime, setOneTimeTime] = useState('')

  useEffect(() => {
    fetchCronJobs()
  }, [])

  const fetchCronJobs = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/cronjobs')
      const data = await response.json()
      setCronJobs(data.cronJobs || [])
    } catch (error) {
      console.error('Failed to fetch cronjobs:', error)
    } finally {
      setLoading(false)
    }
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

  // Convert user-friendly schedule to cron expression
  const convertToCronExpression = () => {
    switch (scheduleType) {
      case 'minutes':
        return `*/${scheduleValue} * * * *`
      case 'hourly':
        return `0 */${scheduleValue} * * *`
      case 'daily':
        const [hour, minute] = dailyTime.split(':')
        return `${parseInt(minute)} ${parseInt(hour)} * * *`
      case 'weekly':
        const [weekHour, weekMinute] = dailyTime.split(':')
        return `${parseInt(weekMinute)} ${parseInt(weekHour)} * * ${weeklyDay}`
      case 'monthly':
        const [monthHour, monthMinute] = dailyTime.split(':')
        return `${parseInt(monthMinute)} ${parseInt(monthHour)} ${monthlyDay} * *`
      case 'custom':
        return scheduleValue // For custom, use scheduleValue as raw cron
      default:
        return '*/5 * * * *'
    }
  }

  const handleScheduleChange = () => {
    const cronExpression = convertToCronExpression()
    const error = validateCronExpression(cronExpression)
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

  const validateJobData = () => {
    if (jobType === 'notification_check') {
      try {
        const data = JSON.parse(jobData || '{}')
        if (!data.title || !data.message) {
          setJobDataError('Title and Message are required for notification_check jobs')
          return false
        }
      } catch {
        setJobDataError('Invalid JSON format')
        return false
      }
    }
    setJobDataError('')
    return true
  }

  const resetForm = () => {
    setCronJobName('')
    setCronJobDescription('')
    setScheduleType('minutes')
    setScheduleValue('5')
    setDailyTime('09:00')
    setWeeklyDay('0')
    setMonthlyDay('1')
    setCronError('')
    setJobType('notification_check')
    setJobData('')
    setJobDataError('')
    setIsActive(true)
    setIsOneTime(false)
    setOneTimeDate(undefined)
    setOneTimeTime('')
    setSelectedJob(null)
    setIsEditing(false)
    setIsCreating(false)
  }

  // Convert cron expression back to user-friendly format for editing
  const parseCronExpression = (cronExpression: string) => {
    const parts = cronExpression.trim().split(/\s+/)
    if (parts.length !== 5) return { type: 'custom', value: cronExpression }

    const [minute, hour, day, month, weekday] = parts

    // Every X minutes
    if (hour === '*' && day === '*' && month === '*' && weekday === '*' && minute.startsWith('*/')) {
      return { type: 'minutes', value: minute.replace('*/', '') }
    }

    // Every X hours
    if (minute === '0' && day === '*' && month === '*' && weekday === '*' && hour.startsWith('*/')) {
      return { type: 'hourly', value: hour.replace('*/', '') }
    }

    // Daily at specific time
    if (day === '*' && month === '*' && weekday === '*' && !minute.includes('*') && !hour.includes('*')) {
      return { type: 'daily', time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}` }
    }

    // Weekly
    if (day === '*' && month === '*' && !weekday.includes('*') && !minute.includes('*') && !hour.includes('*')) {
      return { type: 'weekly', time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, weekday }
    }

    // Monthly
    if (month === '*' && weekday === '*' && !day.includes('*') && !minute.includes('*') && !hour.includes('*')) {
      return { type: 'monthly', time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, day }
    }

    // Default to custom
    return { type: 'custom', value: cronExpression }
  }

  const loadJobToForm = (job: CronJob) => {
    setCronJobName(job.name)
    setCronJobDescription(job.description || '')

    const parsed = parseCronExpression(job.cronExpression)
    setScheduleType(parsed.type)

    if (parsed.type === 'minutes' || parsed.type === 'hourly') {
      setScheduleValue(parsed.value || '5')
    } else if (parsed.type === 'daily') {
      setDailyTime(parsed.time || '09:00')
    } else if (parsed.type === 'weekly') {
      setDailyTime(parsed.time || '09:00')
      setWeeklyDay(parsed.weekday || '0')
    } else if (parsed.type === 'monthly') {
      setDailyTime(parsed.time || '09:00')
      setMonthlyDay(parsed.day || '1')
    } else {
      setScheduleValue(parsed.value || job.cronExpression)
    }

    setJobType(job.jobType)
    setJobData(job.jobData || '')
    setIsActive(job.isActive)
    setSelectedJob(job)
    setIsEditing(true)
    setCronError('')
    setJobDataError('')
  }

  const createCronJob = async () => {
    if (!validateJobData()) return

    setIsCreating(true)
    try {
      let finalCronExpression = convertToCronExpression()
      if (isOneTime && oneTimeDate && oneTimeTime) {
        const date = new Date(oneTimeDate)
        const [timeHour, timeMinute] = oneTimeTime.split(':').map(Number)

        const localDateTime = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          timeHour,
          timeMinute
        )

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
        resetForm()
        fetchCronJobs()
        alert('✅ CronJob created successfully!')
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to create cronjob'
        alert(`❌ ${errorMessage}`)
      }
    } catch (error) {
      alert('❌ Network error: Failed to create cronjob')
    } finally {
      setIsCreating(false)
    }
  }

  const updateCronJob = async () => {
    if (!selectedJob || !validateJobData()) return

    setIsCreating(true)
    try {
      const response = await fetch(`http://localhost:3001/api/cronjobs/${selectedJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cronJobName,
          description: cronJobDescription,
          cronExpression: convertToCronExpression(),
          jobType,
          jobData: jobData || null,
          isActive
        })
      })

      if (response.ok) {
        resetForm()
        fetchCronJobs()
        alert('✅ CronJob updated successfully!')
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to update cronjob'
        alert(`❌ ${errorMessage}`)
      }
    } catch (error) {
      alert('❌ Network error: Failed to update cronjob')
    } finally {
      setIsCreating(false)
    }
  }

  const toggleCronJob = async (jobId: string, action: 'start' | 'stop') => {
    try {
      const response = await fetch(`http://localhost:3001/api/cronjobs/${jobId}/${action}`, {
        method: 'POST'
      })

      if (response.ok) {
        fetchCronJobs()
        alert(`✅ CronJob ${action}ed successfully`)
      } else {
        alert(`❌ Failed to ${action} cronjob`)
      }
    } catch (error) {
      alert(`❌ Network error: Failed to ${action} cronjob`)
    }
  }

  const deleteCronJob = async (jobId: string, jobName: string) => {
    if (!confirm(`Are you sure you want to delete "${jobName}"?`)) return

    try {
      const response = await fetch(`http://localhost:3001/api/cronjobs/${jobId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchCronJobs()
        if (selectedJob?.id === jobId) {
          resetForm()
        }
        alert('✅ CronJob deleted successfully')
      } else {
        alert('❌ Failed to delete cronjob')
      }
    } catch (error) {
      alert('❌ Network error: Failed to delete cronjob')
    }
  }

  const executeJob = async (jobId: string, jobName: string) => {
    if (!confirm(`Execute "${jobName}" now?`)) return

    try {
      const response = await fetch(`http://localhost:3001/api/cronjobs/${jobId}/execute`, {
        method: 'POST'
      })

      if (response.ok) {
        alert('✅ Job executed successfully')
      } else {
        alert('❌ Failed to execute job')
      }
    } catch (error) {
      alert('❌ Network error: Failed to execute job')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🔄 Loading CronJobs...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">⏰ CronJob Management</h1>
          <p className="text-gray-600">Create, manage, and monitor scheduled tasks</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/admin')}
            variant="outline"
          >
            👑 Admin Panel
          </Button>
          <Button
            onClick={() => router.push('/')}
            variant="outline"
          >
            ← Back to Home
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Panel - Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {isEditing ? '✏️ Edit CronJob' : '➕ Create CronJob'}
                  </CardTitle>
                  <CardDescription>
                    {isEditing ? 'Modify existing scheduled task' : 'Schedule a new automated task'}
                  </CardDescription>
                </div>
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="text"
                placeholder="Job Name *"
                value={cronJobName}
                onChange={(e) => setCronJobName(e.target.value)}
              />

              <Textarea
                placeholder="Job Description"
                value={cronJobDescription}
                onChange={(e) => setCronJobDescription(e.target.value)}
                className="h-16"
              />

              {/* Schedule Configuration */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">⏰ Schedule Configuration</Label>

                <Select value={scheduleType} onValueChange={(value) => {
                  setScheduleType(value)
                  setTimeout(handleScheduleChange, 100)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Schedule Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">⏱️ Every X Minutes</SelectItem>
                    <SelectItem value="hourly">🕐 Every X Hours</SelectItem>
                    <SelectItem value="daily">📅 Daily at specific time</SelectItem>
                    <SelectItem value="weekly">🗓️ Weekly on specific day</SelectItem>
                    <SelectItem value="monthly">📆 Monthly on specific date</SelectItem>
                    <SelectItem value="custom">🔧 Custom cron expression</SelectItem>
                  </SelectContent>
                </Select>

                {scheduleType === 'minutes' && (
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm">Every</Label>
                    <Input
                      type="number"
                      min="1"
                      max="59"
                      value={scheduleValue}
                      onChange={(e) => {
                        setScheduleValue(e.target.value)
                        setTimeout(handleScheduleChange, 100)
                      }}
                      className="w-20"
                    />
                    <Label className="text-sm">minutes</Label>
                  </div>
                )}

                {scheduleType === 'hourly' && (
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm">Every</Label>
                    <Input
                      type="number"
                      min="1"
                      max="23"
                      value={scheduleValue}
                      onChange={(e) => {
                        setScheduleValue(e.target.value)
                        setTimeout(handleScheduleChange, 100)
                      }}
                      className="w-20"
                    />
                    <Label className="text-sm">hours</Label>
                  </div>
                )}

                {scheduleType === 'daily' && (
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm">Daily at</Label>
                    <Input
                      type="time"
                      value={dailyTime}
                      onChange={(e) => {
                        setDailyTime(e.target.value)
                        setTimeout(handleScheduleChange, 100)
                      }}
                      className="w-32"
                    />
                  </div>
                )}

                {scheduleType === 'weekly' && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">Every</Label>
                      <Select value={weeklyDay} onValueChange={(value) => {
                        setWeeklyDay(value)
                        setTimeout(handleScheduleChange, 100)
                      }}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Sunday</SelectItem>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">at</Label>
                      <Input
                        type="time"
                        value={dailyTime}
                        onChange={(e) => {
                          setDailyTime(e.target.value)
                          setTimeout(handleScheduleChange, 100)
                        }}
                        className="w-32"
                      />
                    </div>
                  </div>
                )}

                {scheduleType === 'monthly' && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">Day</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={monthlyDay}
                        onChange={(e) => {
                          setMonthlyDay(e.target.value)
                          setTimeout(handleScheduleChange, 100)
                        }}
                        className="w-20"
                      />
                      <Label className="text-sm">of every month</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">at</Label>
                      <Input
                        type="time"
                        value={dailyTime}
                        onChange={(e) => {
                          setDailyTime(e.target.value)
                          setTimeout(handleScheduleChange, 100)
                        }}
                        className="w-32"
                      />
                    </div>
                  </div>
                )}

                {scheduleType === 'custom' && (
                  <div>
                    <Input
                      type="text"
                      placeholder="Cron Expression (minute hour day month weekday) *"
                      value={scheduleValue}
                      onChange={(e) => {
                        setScheduleValue(e.target.value)
                        const error = validateCronExpression(e.target.value)
                        setCronError(error)
                      }}
                      className={cronError ? 'border-red-500' : ''}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      <div><code>* * * * *</code> = Every minute</div>
                      <div><code>0 9 * * *</code> = Daily at 9:00 AM</div>
                      <div><code>*/5 * * * *</code> = Every 5 minutes</div>
                    </div>
                  </div>
                )}

                {cronError && (
                  <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-200">
                    ❌ {cronError}
                  </div>
                )}

                <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                  <div className="font-medium">Generated Cron: <code>{convertToCronExpression()}</code></div>
                  <div>Description: {getCronDescription(convertToCronExpression())}</div>
                </div>
              </div>

              <Select value={jobType} onValueChange={(value) => {
                setJobType(value)
                setJobDataError('')
                if (value === 'notification_check' && !jobData) {
                  setJobData('{"title": "", "message": "", "type": "info"}')
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notification_check">🔔 Notification Check</SelectItem>
                  <SelectItem value="daily_summary">📊 Daily Summary</SelectItem>
                  <SelectItem value="custom">🔧 Custom</SelectItem>
                </SelectContent>
              </Select>

              {jobType === 'notification_check' ? (
                <div className="space-y-3 p-3 border rounded bg-blue-50">
                  <Label className="text-sm font-medium text-blue-900">🔔 Notification Data (Required)</Label>
                  <Input
                    type="text"
                    placeholder="Notification Title *"
                    value={jobData ? (() => {
                      try {
                        const data = JSON.parse(jobData)
                        return data.title || ''
                      } catch {
                        return ''
                      }
                    })() : ''}
                    onChange={(e) => {
                      try {
                        const currentData = jobData ? JSON.parse(jobData) : {}
                        const newData = { ...currentData, title: e.target.value }
                        setJobData(JSON.stringify(newData, null, 0))
                      } catch {
                        setJobData(JSON.stringify({ title: e.target.value }, null, 0))
                      }
                    }}
                    className="border-blue-200 focus:border-blue-400"
                  />
                  <Textarea
                    placeholder="Notification Message *"
                    value={jobData ? (() => {
                      try {
                        const data = JSON.parse(jobData)
                        return data.message || ''
                      } catch {
                        return ''
                      }
                    })() : ''}
                    onChange={(e) => {
                      try {
                        const currentData = jobData ? JSON.parse(jobData) : {}
                        const newData = { ...currentData, message: e.target.value }
                        setJobData(JSON.stringify(newData, null, 0))
                      } catch {
                        setJobData(JSON.stringify({ message: e.target.value }, null, 0))
                      }
                    }}
                    className="h-16 border-blue-200 focus:border-blue-400"
                  />
                  <Select
                    value={jobData ? (() => {
                      try {
                        const data = JSON.parse(jobData)
                        return data.type || 'info'
                      } catch {
                        return 'info'
                      }
                    })() : 'info'}
                    onValueChange={(value) => {
                      try {
                        const currentData = jobData ? JSON.parse(jobData) : {}
                        const newData = { ...currentData, type: value }
                        setJobData(JSON.stringify(newData, null, 0))
                      } catch {
                        setJobData(JSON.stringify({ type: value }, null, 0))
                      }
                    }}
                  >
                    <SelectTrigger className="border-blue-200 focus:border-blue-400">
                      <SelectValue placeholder="Notification Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">🔵 Info</SelectItem>
                      <SelectItem value="success">🟢 Success</SelectItem>
                      <SelectItem value="warning">🟡 Warning</SelectItem>
                      <SelectItem value="error">🔴 Error</SelectItem>
                    </SelectContent>
                  </Select>
                  {jobDataError && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      ❌ {jobDataError}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Textarea
                    placeholder="Job Data (JSON format, optional)"
                    value={jobData}
                    onChange={(e) => setJobData(e.target.value)}
                    className="h-16"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Optional JSON data for custom job logic
                  </div>
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

              <Button
                onClick={isEditing ? updateCronJob : createCronJob}
                className="w-full"
                disabled={isCreating || !cronJobName || !!cronError || (jobType === 'notification_check' && !!jobDataError) || !convertToCronExpression()}
              >
                {isCreating ? '⏳ Processing...' : (isEditing ? '💾 Update CronJob' : '➕ Create CronJob')}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - CronJob List */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>📋 All CronJobs</CardTitle>
                  <CardDescription>{cronJobs.length} jobs configured</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchCronJobs}>
                  🔄 Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {cronJobs.map((job) => (
                    <Card key={job.id} className={`p-4 ${selectedJob?.id === job.id ? 'border-blue-500 bg-blue-50' : ''}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{job.name}</h4>
                            <Badge variant={job.isActive ? "default" : "secondary"}>
                              {job.isActive ? '🟢 Active' : '🔴 Inactive'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-1">{job.description}</div>
                          <div className="text-xs text-muted-foreground">
                            <div><strong>Schedule:</strong> {job.cronExpression}</div>
                            <div><strong>Description:</strong> {getCronDescription(job.cronExpression)}</div>
                            <div><strong>Type:</strong> {job.jobType}</div>
                            {job.lastRun && (
                              <div><strong>Last Run:</strong> {format(new Date(job.lastRun), 'PPp')}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator className="my-2" />

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadJobToForm(job)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleCronJob(job.id, job.isActive ? 'stop' : 'start')}
                        >
                          {job.isActive ? (
                            <>
                              <Pause className="w-3 h-3 mr-1" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 mr-1" />
                              Start
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => executeJob(job.id, job.name)}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Run Now
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteCronJob(job.id, job.name)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {cronJobs.length === 0 && (
                    <div className="text-muted-foreground text-center py-8">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <div>No cron jobs created yet</div>
                      <div className="text-sm">Create your first scheduled task!</div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
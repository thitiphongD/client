'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface User {
  id: string
  name: string
  role: string
  email: string
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:3001/')
        const data = await response.json()
        setUsers(data.users.available)
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const selectUser = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user?.role === 'admin') {
      router.push('/admin')
    } else {
      router.push(`/user/${userId}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🔄 Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-2">🚀 Notification System</h1>
        <p className="text-xl mb-8">Select a user to view their dashboard</p>

        <div className="grid gap-4 md:grid-cols-3">
          {users.map((user) => (
            <Card
              key={user.id}
              onClick={() => selectUser(user.id)}
              className="cursor-pointer hover:opacity-70 transition-opacity"
            >
              <CardHeader className="text-center">
                <div className="text-3xl mb-2">
                  {user.role === 'admin' ? '👑' : '👤'}
                </div>
                <CardTitle>{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Badge variant="outline" className="mb-2">
                  {user.role}
                </Badge>
                <div className="text-xs">
                  {user.role === 'admin' ? 'Click to open Admin Panel' : 'Click to open User Dashboard'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 text-left">
          <CardHeader>
            <CardTitle>🔍 System Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div><strong>Admin:</strong> Can create system notifications & manage cron jobs</div>
            <div><strong>User:</strong> Can view notifications & send user-to-user messages</div>
            <div><strong>WebSocket:</strong> Real-time notifications for all users</div>
          </CardContent>
        </Card>

        <div className="mt-4 text-sm text-gray-500">
          Choose a user above to start testing the notification system
        </div>
      </div>
    </div>
  )
}
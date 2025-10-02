# Notification System Client - Testing Interface

## Requirement
Create UI Interface for testing Real-time Notification, CronJob and WebSocket systems

**IMPORTANT**: Must demonstrate actual WebSocket usage and real-time functionality

## Tech Stack (Use existing)
- **Frontend**: Next.js
- **WebSocket**: Native WebSocket API
- **HTTP Client**: fetch API

## UI Components Required

### 1. WebSocket Connection Panel
- **Connection Status**: Display connection state (Connected/Disconnected)
- **User Registration**: Input field for userId + Connect button
- **Real-time Log**: Display received WebSocket messages (scrollable)
- **Connection Info**: Show timestamp of connection

### 2. Notification Testing Panel

#### Create System Notification
```jsx
// Form fields:
- Title (text input)
- Message (textarea)
- Type (select: info, warning, success, error)
- Scheduled At (datetime input - optional)
```

#### Create User-to-User Notification
```jsx
// Form fields:
- Recipient User ID (text input)
- Sender User ID (text input)
- Title (text input)
- Message (textarea)
- Type (select: info, warning, success, error)
- Scheduled At (datetime input - optional)
```

### 3. Real-time Notification Display
- **Notification Cards**: Display notifications received via WebSocket
- **Auto-scroll**: Latest notifications appear at top
- **Mark as Read**: Button to mark notification as read
- **Timestamp**: Show when notification was received

### 4. CronJob Management Panel (Admin)

#### List CronJobs
- **Table View**: Display name, expression, status, type
- **Real-time Status**: Update status via WebSocket
- **Action Buttons**: Start, Stop, Edit, Delete

#### Create CronJob
```jsx
// Form fields:
- Name (text input)
- Description (textarea)
- Cron Expression (text input with helper)
- Job Type (select: notification_check, daily_summary, custom)
- Job Data (textarea - JSON)
- Is Active (checkbox)
```

### 5. WebSocket Message Monitor
- **Raw Messages**: Display WebSocket messages as JSON
- **Message Filter**: Filter messages by type
- **Export Log**: Download WebSocket log

## Key Features Required

### Real-time Verification
1. **Visual Indicators**:
   - 🟢 Connected to WebSocket
   - 🔴 Disconnected
   - 🟡 Connecting

2. **Message Tracking**:
   - Show timestamp of every WebSocket message
   - Show difference between HTTP response and WebSocket message
   - Show count of notifications received via WebSocket

3. **Real-time Updates**:
   - Notifications created via form must appear in real-time display immediately
   - CronJob status changes must update in real-time
   - No page refresh required

### Testing Scenarios

#### Scenario 1: System Notification Broadcasting
1. Connect WebSocket with multiple userIds (open multiple tabs)
2. Create System Notification
3. All tabs must receive notification simultaneously

#### Scenario 2: User-to-User Notification
1. Connect WebSocket with userId = "user1"
2. Create User-to-User notification sent to "user1"
3. Must receive notification via WebSocket

#### Scenario 3: CronJob Status Updates
1. Connect WebSocket with admin user
2. Start/Stop CronJob
3. Must receive cronjob_status message immediately

## UI Layout
```
┌─ Navigation Bar ─────────────────────────────────┐
├─ WebSocket Connection Panel (always on top)      │
├─ Tabs: [Notifications] [CronJobs] [Monitor]      │
├─ Tab Content Area:                               │
│  ┌─ Left Panel (40%) ──┐ ┌─ Right Panel (60%) ─┐│
│  │ Create Forms        │ │ Real-time Display   ││
│  │ - System Noti       │ │ - Notification List ││
│  │ - User-to-User Noti │ │ - WebSocket Log     ││
│  │ - CronJob Form      │ │ - Status Updates    ││
│  └─────────────────────┘ └─────────────────────┘│
└─ Footer: API Status, Total Messages, Timestamp ─┘
```

## Implementation Guide

### 1. WebSocket Hook
```jsx
// hooks/useWebSocket.js
const useWebSocket = (userId) => {
  const [socket, setSocket] = useState(null)
  const [messages, setMessages] = useState([])
  const [isConnected, setIsConnected] = useState(false)

  // Connect, disconnect, send message functions
  // Message handler for different types
  // Return socket state and functions
}
```

### 2. API Functions
```jsx
// api/notifications.js
export const createSystemNotification = (data) => fetch(...)
export const createUserNotification = (data) => fetch(...)
export const getUserNotifications = (userId) => fetch(...)

// api/cronjobs.js
export const getCronJobs = () => fetch(...)
export const createCronJob = (data) => fetch(...)
export const updateCronJob = (id, data) => fetch(...)
```

### 3. Main Components
- `components/WebSocketPanel.jsx`
- `components/NotificationForm.jsx`
- `components/NotificationDisplay.jsx`
- `components/CronJobManager.jsx`
- `components/MessageMonitor.jsx`

## Success Criteria
✅ **Real-time Verification**: Clearly show WebSocket is being used
✅ **System Broadcasting**: Notification sent to everyone simultaneously
✅ **User-specific**: User-to-user notification sent to specific person
✅ **CronJob Status**: Real-time status updates for admin
✅ **Message Tracking**: See timestamp and message flow
✅ **No Refresh Required**: Everything updates in real-time

## Testing Checklist
- [ ] WebSocket connection/disconnection works
- [ ] System notification broadcast to everyone
- [ ] User-to-user notification sent to specific person
- [ ] CronJob CRUD operations have real-time feedback
- [ ] Message log shows WebSocket activity
- [ ] UI responsive and easy to use
- [ ] Error handling for WebSocket disconnect

## API Endpoints (Reference)
- **Server**: `http://localhost:5006`
- **WebSocket**: `ws://localhost:5006/ws`
- **Docs**: `http://localhost:5006/swagger`

### Test Users (from seed data)
- **user1** (admin): alice@example.com
- **user2** (user): bob@example.com
- **user3** (user): charlie@example.com
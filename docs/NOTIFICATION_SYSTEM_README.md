# West End Workforce Notification System

## Overview

The West End Workforce platform features a comprehensive, enterprise-grade notification system that covers all phases of timesheet and expense management workflows. The system includes real-time notifications, email integration, cross-checking logic, and automated scheduling.

## Features

### Phase 1 - Essential Notifications ✅
- **Timesheet submission** → Manager notification
- **Timesheet approval** → Employee AND Admin notification  
- **Timesheet rejection** → Employee with detailed reason
- **Expense submission** → Manager notification
- **Expense approval** → Employee AND Admin notification
- **Expense rejection** → Employee with detailed reason
- **Cross-check: Timesheet approved but expenses pending** → Employee & Manager notification
- **Overdue timesheet alerts** → Employee, Manager, AND Admin
- **Manager pending approval reminders** → Manager dashboard

### Phase 2 - Important Notifications ✅
- **Period completion** → Employee & Admin (when both timesheet AND expenses approved)
- **Timesheet/Expense rejection** → Employee with detailed reason
- **New employee added** → Assigned manager notification
- **All admin visibility** → Admin sees ALL approval activities
- **Email notification system** → Critical notifications via email
- **Manager pending summaries** → Daily/weekly pending counts

### Phase 3 - Advanced Notifications ✅
- **Deadline reminder system** → 3 days, 1 day, same day alerts
- **Payroll cutoff reminders** → 3 days before cutoff
- **Unusual hours alerts** → Overtime detection, long shifts
- **Custom notification preferences** → Per user settings
- **Bulk notification management** → Admin can send company-wide
- **Integration notifications** → Payroll/accounting sync alerts
- **Performance reminders** → Training, reviews, anniversaries

## Architecture

### Core Components

#### 1. Notification Provider (`/contexts/NotificationContext.tsx`)
- Central notification context with real-time updates
- localStorage persistence for offline support
- User preference management
- Quiet hours and frequency controls

#### 2. Notification Service (`/lib/notificationService.ts`)
- Core notification creation and management
- Cross-checking logic for timesheet/expense validation
- Email notification integration
- Template-based notification system

#### 3. Email Service (`/lib/emailService.ts`)
- Gmail SMTP integration using nodemailer
- Professional HTML email templates
- Bulk email sending capabilities
- Error handling and fallbacks

#### 4. Notification Scheduler (`/lib/notificationScheduler.ts`)
- Automated deadline checking
- Overdue timesheet detection
- Payroll cutoff reminders
- Manager pending approval summaries

### API Endpoints

#### `/api/notifications`
- `GET` - Retrieve user notifications with filtering
- `POST` - Create new notifications
- `PUT` - Update notification status (mark as read)
- `DELETE` - Delete notifications

#### `/api/notifications/test-email`
- `POST` - Test email configuration and send test emails
- `GET` - Get email service status

#### `/api/notifications/bulk`
- `POST` - Send bulk notifications to multiple users
- `GET` - Get bulk notification statistics

#### `/api/notifications/preferences`
- `GET` - Retrieve user notification preferences
- `POST` - Create/update user preferences
- `PUT` - Update specific preference settings
- `DELETE` - Reset preferences to defaults

## Email Configuration

### Environment Variables
```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tgarrick@westendworkforce.com
SMTP_PASS=ixan edkv dsde clou

# Email Settings
EMAIL_FROM=notifications@westendworkforce.com
EMAIL_FROM_NAME=West End Workforce
EMAIL_REPLY_TO=support@westendworkforce.com
```

### Email Templates
The system includes professional HTML email templates for:
- Timesheet submissions, approvals, and rejections
- Expense submissions, approvals, and rejections
- Overdue timesheet alerts
- Deadline reminders
- Period completion notifications
- Manager pending summaries
- System announcements

## Integration

### Using Notifications in Components

#### Basic Usage
```tsx
import { useNotifications } from '@/contexts/NotificationContext';

function MyComponent() {
  const { createNotification } = useNotifications();
  
  const handleAction = () => {
    createNotification(
      'timesheet_submitted',
      'manager-id',
      'timesheet-id',
      'timesheet',
      { employeeName: 'John Doe', period: '2025-01-13' }
    );
  };
}
```

#### Advanced Integration Hook
```tsx
import { useNotificationIntegration } from '@/hooks/useNotificationIntegration';

function TimesheetComponent() {
  const { notifyTimesheetSubmitted, notifyTimesheetApproved } = useNotificationIntegration();
  
  const handleSubmit = () => {
    notifyTimesheetSubmitted('manager-id', 'John Doe', '2025-01-13', 40);
  };
  
  const handleApprove = () => {
    notifyTimesheetApproved('employee-id', 'Jane Manager', '2025-01-13', 40);
  };
}
```

### Cross-Checking Logic

The system automatically checks for:
1. **Timesheet approved but expenses pending** → Notifies employee to submit expenses
2. **Period completion** → Notifies employee and admin when both approved
3. **Overdue items** → Escalates to manager and admin after deadlines

## User Preferences

### Notification Settings
Users can configure:
- **Email notifications** - Receive emails for important events
- **Browser notifications** - In-app notification display
- **Notification types** - Choose which categories to receive
- **Frequency** - Immediate, daily, or weekly summaries
- **Quiet hours** - Set time ranges to suppress non-critical notifications

### Default Preferences
```typescript
const defaultPreferences = {
  email: true,
  browser: true,
  timesheets: true,
  expenses: true,
  deadlines: true,
  system: true,
  frequency: 'immediate',
  quietHours: {
    start: '22:00',
    end: '08:00',
    enabled: false
  }
};
```

## Testing

### Test Page
Visit `/test-notifications` to:
- Test all notification types
- Verify email configuration
- Send test notifications
- Test bulk notification system
- Monitor system status

### API Testing
```bash
# Test email configuration
curl -X POST /api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{"testType": "configuration"}'

# Test notification email
curl -X POST /api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{"testType": "notification", "toEmail": "test@example.com"}'

# Send bulk notification
curl -X POST /api/notifications/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "type": "system_integration",
    "userIds": ["user1", "user2"],
    "title": "Test Announcement",
    "message": "This is a test bulk notification"
  }'
```

## Dependencies

### Required Packages
```json
{
  "nodemailer": "^6.9.0",
  "@types/nodemailer": "^6.4.0",
  "date-fns": "^4.1.0"
}
```

### Installation
```bash
npm install nodemailer @types/nodemailer
```

## Security & Best Practices

### Email Security
- Uses Gmail App Passwords (not account passwords)
- TLS encryption for all email communications
- Rate limiting to prevent abuse
- Error handling for failed deliveries

### Data Privacy
- Notifications stored locally (localStorage)
- No sensitive data in notification content
- User preference isolation
- Audit trail for admin actions

### Performance
- Lazy loading of notification components
- Efficient filtering and search
- Background processing for scheduled tasks
- Memory management for large notification lists

## Monitoring & Maintenance

### System Health Checks
- Email service connectivity
- Notification scheduler status
- User preference synchronization
- Cross-check logic validation

### Logging
- Email delivery confirmations
- Failed notification attempts
- User preference changes
- System integration events

### Troubleshooting
1. **Email not sending** - Check SMTP credentials and Gmail settings
2. **Notifications not appearing** - Verify user preferences and context setup
3. **Scheduler not running** - Check development mode and interval settings
4. **Cross-check failures** - Validate timesheet/expense data structure

## Future Enhancements

### Planned Features
- **Push notifications** - Mobile app integration
- **SMS notifications** - Critical alerts via text
- **Slack integration** - Team communication
- **Advanced analytics** - Notification engagement metrics
- **AI-powered insights** - Smart notification timing

### Scalability
- **Database storage** - Replace localStorage with persistent storage
- **Queue system** - Handle high-volume notification processing
- **Microservices** - Separate notification service deployment
- **CDN integration** - Global email delivery optimization

## Support

### Documentation
- API reference available at `/api/notifications`
- Test page at `/test-notifications`
- Component examples in `/components/notifications`

### Configuration
- Email settings in `.env.local`
- Notification preferences in user settings
- Admin controls in admin dashboard

### Issues
- Check browser console for errors
- Verify environment variables
- Test email configuration
- Review notification preferences

---

**The West End Workforce notification system provides enterprise-grade functionality with comprehensive coverage of all timesheet and expense workflows, ensuring users stay informed and managers maintain oversight of critical business processes.**

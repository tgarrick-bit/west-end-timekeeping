// src/app/api/notifications/send/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notificationService';
import { emailService } from '@/lib/emailService';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// POST /api/notifications/send - Send notification reminders for monitoring
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions (admin or manager only)
    const { data: employee } = await supabase
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!employee || (employee.role !== 'admin' && employee.role !== 'manager')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, recipient_id, recipient_email, data } = body;

    // Validate required fields
    if (!type || !recipient_id || !recipient_email) {
      return NextResponse.json(
        { error: 'Type, recipient_id, and recipient_email are required' },
        { status: 400 }
      );
    }

    // Create notification using your existing service
    // Fix: Use 'timesheet' as relatedType for both reminder types since they're timesheet-related
    const notification = notificationService.createNotification(
      type,
      recipient_id,
      data.week_ending || `pending_${data.pending_count}`, // relatedId
      'timesheet', // relatedType - using 'timesheet' for both types since they're timesheet-related
      {
        ...data,
        sent_by: user.id,
        sent_at: new Date().toISOString()
      }
    );

    // Prepare email data based on notification type
    let emailData = {
      to: recipient_email,
      subject: '',
      html: ''
    };

    switch (type) {
      case 'timecard_reminder':
        emailData.subject = 'Timecard Submission Reminder';
        emailData.html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #e31c79; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">West End Workforce</h1>
            </div>
            <div style="background-color: #f5f5f5; padding: 20px;">
              <h2 style="color: #05202E;">Timecard Submission Reminder</h2>
              <p>Hello ${data.employee_name || 'Employee'},</p>
              <p>This is a reminder that your timecard for the week ending <strong>${data.week_ending}</strong> has not been submitted yet.</p>
              <p>Your timecard is currently in <strong>draft</strong> status.</p>
              <p>Please log in to submit your timecard as soon as possible.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
                   style="background-color: #e31c79; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Submit Timecard
                </a>
              </div>
            </div>
            <div style="background-color: #05202E; padding: 15px; text-align: center;">
              <p style="color: white; margin: 0; font-size: 12px;">© 2025 West End Workforce</p>
            </div>
          </div>
        `;
        break;

      case 'approval_reminder':
        emailData.subject = 'Pending Timecard Approvals';
        emailData.html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #e31c79; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">West End Workforce</h1>
            </div>
            <div style="background-color: #f5f5f5; padding: 20px;">
              <h2 style="color: #05202E;">Pending Approvals Reminder</h2>
              <p>Hello ${data.manager_name || 'Manager'},</p>
              <p>You have <strong style="color: #e31c79;">${data.pending_count}</strong> timecard(s) pending your approval.</p>
              <p>Please review and approve these timecards at your earliest convenience to ensure timely payroll processing.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin" 
                   style="background-color: #e31c79; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Review Timecards
                </a>
              </div>
            </div>
            <div style="background-color: #05202E; padding: 15px; text-align: center;">
              <p style="color: white; margin: 0; font-size: 12px;">© 2025 West End Workforce</p>
            </div>
          </div>
        `;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type for sending' },
          { status: 400 }
        );
    }

    // Send email using your existing email service
    let emailSent = false;
    try {
      // Use your existing emailService if it has a send method
      
      // Or call your send-email endpoint
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });
      
      emailSent = emailResponse.ok;
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // Continue even if email fails - notification is still created
    }

    // Log the reminder action in the database (optional - only if you have this table)
    try {
      await supabase.from('notification_logs').insert({
        type: 'reminder_sent',
        notification_type: type,
        recipient_id,
        recipient_email,
        sent_by: user.id,
        sent_at: new Date().toISOString(),
        email_sent: emailSent,
        metadata: data
      });
    } catch (logError) {
      // Logging is optional, don't fail if table doesn't exist
      console.log('Could not log notification (table might not exist):', logError);
    }

    return NextResponse.json({
      success: true,
      notification_id: notification.id,
      email_sent: emailSent,
      message: `Reminder sent successfully${emailSent ? ' with email' : ' (notification created, email pending)'}`
    });

  } catch (error) {
    console.error('Error sending notification reminder:', error);
    return NextResponse.json(
      { error: 'Failed to send notification reminder' },
      { status: 500 }
    );
  }
}
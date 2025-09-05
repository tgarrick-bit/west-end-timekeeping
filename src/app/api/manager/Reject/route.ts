import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { employee, type, action, managerName, employeeData, reason } = await req.json();
    
    if (!employee || !type || !action) {
      return NextResponse.json({ 
        error: "employee, type, and action required" 
      }, { status: 400 });
    }

    // For demo purposes, simulate successful rejection
    if (action === 'reject') {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Send notification and email for timesheet rejection
      if (type === 'timesheet') {
        try {
          // Send email notification to admin (for testing)
          const emailResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: 'tgarrick@westendworkforce.com',
              notification: {
                id: `timesheet_rejected_${Date.now()}`,
                type: 'timesheet_rejected',
                title: 'Timesheet Rejected - Action Required',
                message: `Timesheet has been rejected by ${managerName || 'Manager'}`,
                priority: 'high',
                userId: employee,
                relatedId: `timesheet_${Date.now()}`,
                relatedType: 'timesheet',
                isRead: false,
                isEmailSent: false,
                createdAt: new Date(),
                metadata: {
                  employeeName: employeeData?.name || 'Employee',
                  managerName: managerName || 'Manager',
                  rejectedDate: new Date().toLocaleDateString(),
                  period: employeeData?.period || 'Current Period',
                  reason: reason || 'Please review and correct issues',
                  totalHours: employeeData?.hours || 0
                }
              },
              customData: {
                employeeName: employeeData?.name || 'Employee',
                managerName: managerName || 'Manager',
                rejectedDate: new Date().toLocaleDateString(),
                period: employeeData?.period || 'Current Period',
                reason: reason || 'Please review and correct issues',
                totalHours: employeeData?.hours || 0
              }
            }),
          });

          if (emailResponse.ok) {
          } else {
            console.warn('Failed to send email notification for timesheet rejection');
          }
        } catch (error) {
          console.error('Error sending email notification for timesheet rejection:', error);
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Successfully rejected ${type} for employee ${employee}`,
        type,
        employee,
        timestamp: new Date().toISOString(),
        notificationsSent: true
      });
    }

    return NextResponse.json({ 
      error: "Invalid action. Must be 'reject'" 
    }, { status: 400 });

  } catch (error) {
    console.error('Rejection error:', error);
    return NextResponse.json({ 
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}

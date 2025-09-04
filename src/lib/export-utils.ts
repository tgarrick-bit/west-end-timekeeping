// Export utility functions for West End Workforce reporting system
// Provides CSV, Excel, and custom format exports for EOR, ATS, and compliance

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf'
  filename?: string
  includeHeaders?: boolean
  dateFormat?: string
  currencyFormat?: string
}

export interface PayrollExportData {
  employeeId: string
  firstName: string
  lastName: string
  client: string
  project: string
  weekStarting: string
  weekEnding: string
  regularHours: number
  overtimeHours: number
  weekendHours: number
  holidayHours: number
  hourlyRate: number
  totalGross: number
  approvalDate: string
  approverName: string
}

export interface BillingExportData {
  clientName: string
  projectName: string
  projectCode: string
  employeeName: string
  employeeId: string
  date: string
  hours: number
  hourlyRate: number
  totalAmount: number
  isBillable: boolean
  approvalStatus: string
  approvalDate: string
}

export interface ComplianceExportData {
  projectName: string
  grantNumber: string
  fundingSource: string
  fundingPeriod: string
  totalBudget: number
  hoursUsed: number
  amountBilled: number
  remainingBudget: number
  complianceStatus: string
  lastAudit: string
  nextAudit: string
  contractorCount: number
}

// CSV Export Functions
export function exportToCSV<T>(
  data: T[],
  options: ExportOptions = { format: 'csv' }
): void {
  if (data.length === 0) {
    alert('No data to export')
    return
  }

  const headers = Object.keys(data[0] as object)
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = (row as any)[header]
        // Handle special characters and commas in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  downloadFile(csvContent, 'text/csv', options.filename || 'export.csv')
}

// Excel Export Functions (using CSV format that Excel can open)
export function exportToExcel<T>(
  data: T[],
  options: ExportOptions = { format: 'excel' }
): void {
  if (data.length === 0) {
    alert('No data to export')
    return
  }

  const headers = Object.keys(data[0] as object)
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = (row as any)[header]
        // Handle special characters and commas in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  downloadFile(csvContent, 'text/csv', options.filename || 'export.xls')
}

// JSON Export Functions
export function exportToJSON<T>(
  data: T[],
  options: ExportOptions = { format: 'json' }
): void {
  if (data.length === 0) {
    alert('No data to export')
    return
  }

  const jsonContent = JSON.stringify(data, null, 2)
  downloadFile(jsonContent, 'application/json', options.filename || 'export.json')
}

// Generic file download function
function downloadFile(content: string, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// Payroll Export Functions
export function exportPayrollData(
  data: PayrollExportData[],
  format: 'csv' | 'excel' | 'eor' = 'csv'
): void {
  if (data.length === 0) {
    alert('No payroll data to export')
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exportData: any[]
  let filename: string

  switch (format) {
    case 'eor':
      // EOR-specific format for payroll systems
      exportData = data.map(item => ({
        'Employee_ID': item.employeeId,
        'First_Name': item.firstName,
        'Last_Name': item.lastName,
        'Client': item.client,
        'Project': item.project,
        'Week_Starting': item.weekStarting,
        'Week_Ending': item.weekEnding,
        'Regular_Hours': item.regularHours,
        'Overtime_Hours': item.overtimeHours,
        'Weekend_Hours': item.weekendHours,
        'Holiday_Hours': item.holidayHours,
        'Hourly_Rate': item.hourlyRate,
        'Total_Gross': item.totalGross,
        'Approval_Date': item.approvalDate,
        'Approver_Name': item.approverName
      }))
      filename = `payroll-export-eor-${new Date().toISOString().split('T')[0]}.csv`
      break

    case 'excel':
      exportData = data.map(item => ({
        'Employee ID': item.employeeId,
        'First Name': item.firstName,
        'Last Name': item.lastName,
        'Client': item.client,
        'Project': item.project,
        'Week Starting': item.weekStarting,
        'Week Ending': item.weekEnding,
        'Regular Hours': item.regularHours,
        'Overtime Hours': item.overtimeHours,
        'Weekend Hours': item.weekendHours,
        'Holiday Hours': item.holidayHours,
        'Hourly Rate': item.hourlyRate,
        'Total Gross': item.totalGross,
        'Approval Date': item.approvalDate,
        'Approver Name': item.approverName
      }))
      filename = `payroll-export-${new Date().toISOString().split('T')[0]}.xls`
      break

    default:
      exportData = data
      filename = `payroll-export-${new Date().toISOString().split('T')[0]}.csv`
  }

  exportToCSV(exportData, { format: 'csv', filename })
}

// Billing Export Functions
export function exportBillingData(
  data: BillingExportData[],
  format: 'csv' | 'excel' | 'ats' = 'csv'
): void {
  if (data.length === 0) {
    alert('No billing data to export')
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exportData: any[]
  let filename: string

  switch (format) {
    case 'ats':
      // ATS-specific format for client billing
      exportData = data.map(item => ({
        'Client': item.clientName,
        'Project': item.projectName,
        'Project_Code': item.projectCode,
        'Employee': item.employeeName,
        'Employee_ID': item.employeeId,
        'Date': item.date,
        'Hours': item.hours,
        'Hourly_Rate': item.hourlyRate,
        'Total_Amount': item.totalAmount,
        'Billable': item.isBillable ? 'Yes' : 'No',
        'Approval_Status': item.approvalStatus,
        'Approval_Date': item.approvalDate
      }))
      filename = `billing-export-ats-${new Date().toISOString().split('T')[0]}.csv`
      break

    case 'excel':
      exportData = data.map(item => ({
        'Client': item.clientName,
        'Project': item.projectName,
        'Project Code': item.projectCode,
        'Employee': item.employeeName,
        'Employee ID': item.employeeId,
        'Date': item.date,
        'Hours': item.hours,
        'Hourly Rate': item.hourlyRate,
        'Total Amount': item.totalAmount,
        'Billable': item.isBillable ? 'Yes' : 'No',
        'Approval Status': item.approvalStatus,
        'Approval Date': item.approvalDate
      }))
      filename = `billing-export-${new Date().toISOString().split('T')[0]}.xls`
      break

    default:
      exportData = data
      filename = `billing-export-${new Date().toISOString().split('T')[0]}.csv`
  }

  exportToCSV(exportData, { format: 'csv', filename })
}

// Compliance Export Functions
export function exportComplianceData(
  data: ComplianceExportData[],
  format: 'csv' | 'excel' | 'audit' = 'csv'
): void {
  if (data.length === 0) {
    alert('No compliance data to export')
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exportData: any[]
  let filename: string

  switch (format) {
    case 'audit':
      // Audit-specific format for government compliance
      exportData = data.map(item => ({
        'Project_Name': item.projectName,
        'Grant_Number': item.grantNumber,
        'Funding_Source': item.fundingSource,
        'Funding_Period': item.fundingPeriod,
        'Total_Budget': item.totalBudget,
        'Hours_Used': item.hoursUsed,
        'Amount_Billed': item.amountBilled,
        'Remaining_Budget': item.remainingBudget,
        'Compliance_Status': item.complianceStatus,
        'Last_Audit': item.lastAudit,
        'Next_Audit': item.nextAudit,
        'Contractor_Count': item.contractorCount
      }))
      filename = `compliance-audit-${new Date().toISOString().split('T')[0]}.csv`
      break

    case 'excel':
      exportData = data.map(item => ({
        'Project Name': item.projectName,
        'Grant Number': item.grantNumber,
        'Funding Source': item.fundingSource,
        'Funding Period': item.fundingPeriod,
        'Total Budget': item.totalBudget,
        'Hours Used': item.hoursUsed,
        'Amount Billed': item.amountBilled,
        'Remaining Budget': item.remainingBudget,
        'Compliance Status': item.complianceStatus,
        'Last Audit': item.lastAudit,
        'Next Audit': item.nextAudit,
        'Contractor Count': item.contractorCount
      }))
      filename = `compliance-export-${new Date().toISOString().split('T')[0]}.xls`
      break

    default:
      exportData = data
      filename = `compliance-export-${new Date().toISOString().split('T')[0]}.csv`
  }

  exportToCSV(exportData, { format: 'csv', filename })
}

// Utility function to format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

// Utility function to format dates
export function formatDate(date: string | Date, format: string = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  switch (format) {
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    case 'iso':
      return dateObj.toISOString().split('T')[0]
    default:
      return dateObj.toLocaleDateString('en-US')
  }
}

// Utility function to generate export filename
export function generateExportFilename(
  prefix: string,
  format: string,
  includeDate: boolean = true
): string {
  const date = includeDate ? `-${new Date().toISOString().split('T')[0]}` : ''
  return `${prefix}-export-${format}${date}.${format === 'excel' ? 'xls' : format}`
}

// Batch export function for multiple formats
export function batchExport<T>(
  data: T[],
  formats: ('csv' | 'excel' | 'json')[],
  prefix: string
): void {
  formats.forEach(format => {
    switch (format) {
      case 'csv':
        exportToCSV(data, { format, filename: generateExportFilename(prefix, 'csv') })
        break
      case 'excel':
        exportToExcel(data, { format, filename: generateExportFilename(prefix, 'excel') })
        break
      case 'json':
        exportToJSON(data, { format, filename: generateExportFilename(prefix, 'json') })
        break
    }
  })
}








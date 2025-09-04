import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date utilities
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getWeekDates(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

export function getMonthDates(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  
  return { start, end }
}

// Time utilities
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100
}

export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60)
}

export function formatTimeRange(start: string, end: string): string {
  return `${start} - ${end}`
}

export function calculateHours(start: string, end: string): number {
  const startTime = new Date(`2000-01-01T${start}`)
  const endTime = new Date(`2000-01-01T${end}`)
  
  if (endTime < startTime) {
    endTime.setDate(endTime.getDate() + 1)
  }
  
  const diffMs = endTime.getTime() - startTime.getTime()
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export function isValidAmount(amount: number): boolean {
  return amount > 0 && amount <= 999999.99
}

// Currency formatting
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Status utilities
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'draft':
      return 'text-gray-600 bg-gray-100'
    case 'submitted':
      return 'text-blue-600 bg-blue-100'
    case 'client_approved':
      return 'text-yellow-600 bg-yellow-100'
    case 'payroll_approved':
      return 'text-green-600 bg-green-100'
    case 'rejected':
      return 'text-red-600 bg-red-100'
    case 'pending':
      return 'text-orange-600 bg-orange-100'
    case 'approved':
      return 'text-green-600 bg-green-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export function getStatusBadge(status: string): string {
  const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full'
  const colorClasses = getStatusColor(status)
  return `${baseClasses} ${colorClasses}`
}

// File utilities
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

export function isValidFileSize(file: File, maxSizeMB: number): boolean {
  return file.size <= maxSizeMB * 1024 * 1024
}

// Array utilities
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key])
    groups[group] = groups[group] || []
    groups[group].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

// Debounce utility
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Type conversion utilities
export function convertEnhancedUserToAppUser(enhancedUser: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  hireDate: string;
}): {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  client_id: undefined;
  is_active: boolean;
  created_at: string;
  updated_at: string;
} | null {
  if (!enhancedUser) return null;
  
  return {
    id: enhancedUser.id,
    email: enhancedUser.email,
    first_name: enhancedUser.firstName,
    last_name: enhancedUser.lastName,
    role: enhancedUser.role === 'manager' ? 'admin' : enhancedUser.role,
    client_id: undefined,
    is_active: enhancedUser.isActive,
    created_at: enhancedUser.hireDate,
    updated_at: enhancedUser.hireDate
  };
}





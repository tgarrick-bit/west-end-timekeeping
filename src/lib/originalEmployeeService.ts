// Original Employee Service - Manages the core 4 employees
import { User } from '@/types';

// Original 4 employees that should always remain in the system
export const ORIGINAL_EMPLOYEES: User[] = [
  {
    id: 'emp1',
    email: 'mike.chen@westendworkforce.com',
    first_name: 'Mike',
    last_name: 'Chen',
    role: 'employee',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'emp2',
    email: 'sarah.johnson@westendworkforce.com',
    first_name: 'Sarah',
    last_name: 'Johnson',
    role: 'employee',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'emp3',
    email: 'tom.wilson@westendworkforce.com',
    first_name: 'Tom',
    last_name: 'Wilson',
    role: 'manager',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'emp4',
    email: 'lisa.garcia@westendworkforce.com',
    first_name: 'Lisa',
    last_name: 'Garcia',
    role: 'employee',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

export class OriginalEmployeeService {
  private static instance: OriginalEmployeeService;
  private storageKey = 'west_end_original_employees';

  static getInstance(): OriginalEmployeeService {
    if (!OriginalEmployeeService.instance) {
      OriginalEmployeeService.instance = new OriginalEmployeeService();
    }
    return OriginalEmployeeService.instance;
  }

  // Get the original 4 employees
  getOriginalEmployees(): User[] {
    return [...ORIGINAL_EMPLOYEES];
  }

  // Check if an employee is one of the original 4
  isOriginalEmployee(employeeId: string): boolean {
    return ORIGINAL_EMPLOYEES.some(emp => emp.id === employeeId);
  }

  // Check if an employee is one of the original 4 by email
  isOriginalEmployeeByEmail(email: string): boolean {
    return ORIGINAL_EMPLOYEES.some(emp => emp.email === email);
  }

  // Get original employee by ID
  getOriginalEmployeeById(employeeId: string): User | undefined {
    return ORIGINAL_EMPLOYEES.find(emp => emp.id === employeeId);
  }

  // Get original employee by email
  getOriginalEmployeeByEmail(email: string): User | undefined {
    return ORIGINAL_EMPLOYEES.find(emp => emp.email === email);
  }

  // Reset employee data to only original 4 employees
  resetToOriginalEmployees(): { success: boolean; message: string; removedCount: number } {
    try {
      // Clear any cached employee data
      this.clearCachedEmployeeData();
      
      // Store only the original employees
      localStorage.setItem(this.storageKey, JSON.stringify(ORIGINAL_EMPLOYEES));
      
      // Clear any other employee-related data
      this.clearImportedEmployeeData();
      
      return {
        success: true,
        message: 'Successfully reset to original 4 employees',
        removedCount: this.getImportedEmployeeCount()
      };
    } catch (error) {
      console.error('Failed to reset to original employees:', error);
      return {
        success: false,
        message: `Failed to reset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        removedCount: 0
      };
    }
  }

  // Get count of imported employees (non-original)
  getImportedEmployeeCount(): number {
    try {
      const allEmployees = this.getAllStoredEmployees();
      const importedEmployees = allEmployees.filter(emp => !this.isOriginalEmployee(emp.id));
      return importedEmployees.length;
    } catch (error) {
      console.error('Failed to get imported employee count:', error);
      return 0;
    }
  }

  // Get all stored employees (original + imported)
  getAllStoredEmployees(): User[] {
    try {
      // Check for employees in various storage locations
      const locations = [
        'west_end_employees',
        'employees',
        'users',
        this.storageKey
      ];

      for (const location of locations) {
        const stored = localStorage.getItem(location);
        if (stored) {
          try {
            const employees = JSON.parse(stored);
            if (Array.isArray(employees) && employees.length > 0) {
              return employees;
            }
          } catch (e) {
            // Invalid JSON, try next location
            continue;
          }
        }
      }

      // If no stored employees found, return original employees
      return [...ORIGINAL_EMPLOYEES];
    } catch (error) {
      console.error('Failed to get all stored employees:', error);
      return [...ORIGINAL_EMPLOYEES];
    }
  }

  // Clear cached employee data
  private clearCachedEmployeeData(): void {
    try {
      const cacheKeys = [
        'west_end_employees',
        'employees',
        'users',
        'employee_cache',
        'user_cache'
      ];

      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Failed to clear cached employee data:', error);
    }
  }

  // Clear imported employee data
  private clearImportedEmployeeData(): void {
    try {
      // Clear any imported employee data from localStorage
      const allEmployees = this.getAllStoredEmployees();
      const originalEmployees = this.getOriginalEmployees();
      
      // Keep only original employees
      localStorage.setItem(this.storageKey, JSON.stringify(originalEmployees));
      
      // Clear other employee storage locations
      localStorage.removeItem('west_end_employees');
      localStorage.removeItem('employees');
      localStorage.removeItem('users');
      
      // Clear any employee-related counters or statistics
      const counterKeys = [
        'total_employees',
        'employee_count',
        'imported_employees',
        'employee_stats'
      ];

      counterKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Failed to clear imported employee data:', error);
    }
  }

  // Backup current employee data before reset
  backupCurrentEmployees(): { success: boolean; backupData: User[] | null; message: string } {
    try {
      const currentEmployees = this.getAllStoredEmployees();
      const backupKey = `employee_backup_${Date.now()}`;
      
      localStorage.setItem(backupKey, JSON.stringify(currentEmployees));
      
      return {
        success: true,
        backupData: currentEmployees,
        message: `Backup created with key: ${backupKey}`
      };
    } catch (error) {
      console.error('Failed to backup current employees:', error);
      return {
        success: false,
        backupData: null,
        message: `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Restore employee data from backup
  restoreFromBackup(backupKey: string): { success: boolean; message: string } {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        return {
          success: false,
          message: 'Backup not found'
        };
      }

      const employees = JSON.parse(backupData);
      if (!Array.isArray(employees)) {
        return {
          success: false,
          message: 'Invalid backup data format'
        };
      }

      // Restore the backup
      localStorage.setItem('west_end_employees', backupData);
      
      return {
        success: true,
        message: `Successfully restored ${employees.length} employees from backup`
      };
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return {
        success: false,
        message: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Get list of available backups
  getAvailableBackups(): string[] {
    try {
      const backups: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('employee_backup_')) {
          backups.push(key);
        }
      }
      return backups.sort().reverse(); // Most recent first
    } catch (error) {
      console.error('Failed to get available backups:', error);
      return [];
    }
  }

  // Validate employee data integrity
  validateEmployeeData(): { isValid: boolean; issues: string[] } {
    try {
      const allEmployees = this.getAllStoredEmployees();
      const issues: string[] = [];

      // Check for duplicate IDs
      const ids = allEmployees.map(emp => emp.id);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        issues.push(`Duplicate employee IDs found: ${duplicateIds.join(', ')}`);
      }

      // Check for duplicate emails
      const emails = allEmployees.map(emp => emp.email);
      const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
      if (duplicateEmails.length > 0) {
        issues.push(`Duplicate emails found: ${duplicateEmails.join(', ')}`);
      }

      // Check for missing required fields
      allEmployees.forEach((emp, index) => {
        if (!emp.id || !emp.email || !emp.first_name || !emp.last_name) {
          issues.push(`Employee at index ${index} missing required fields`);
        }
      });

      // Check if all original employees are present
      const originalIds = ORIGINAL_EMPLOYEES.map(emp => emp.id);
      const missingOriginal = originalIds.filter(id => !ids.includes(id));
      if (missingOriginal.length > 0) {
        issues.push(`Missing original employees: ${missingOriginal.join(', ')}`);
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Failed to validate employee data:', error);
      return {
        isValid: false,
        issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // Get employee statistics
  getEmployeeStats(): {
    total: number;
    original: number;
    imported: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  } {
    try {
      const allEmployees = this.getAllStoredEmployees();
      const originalCount = ORIGINAL_EMPLOYEES.length;
      const importedCount = allEmployees.length - originalCount;

      const stats = {
        total: allEmployees.length,
        original: originalCount,
        imported: importedCount,
        active: allEmployees.filter(emp => emp.is_active).length,
        inactive: allEmployees.filter(emp => !emp.is_active).length,
        byRole: {} as Record<string, number>
      };

      // Count by role
      allEmployees.forEach(emp => {
        stats.byRole[emp.role] = (stats.byRole[emp.role] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get employee stats:', error);
      return {
        total: 0,
        original: 0,
        imported: 0,
        active: 0,
        inactive: 0,
        byRole: {}
      };
    }
  }
}

export const originalEmployeeService = OriginalEmployeeService.getInstance();

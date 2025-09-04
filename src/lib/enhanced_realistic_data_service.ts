// Enhanced Realistic Data Service - Combined Real Employee Data
// This combines your original timesheet data with the weekly report employee data
import { EmployeeDashboardStats } from '@/types'

export interface User {
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'manager' | 'employee';
    department: string;
    position: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    hireDate: string;
    salary?: number;
    isActive: boolean;
  }
  
  export interface Project {
    id: string;
    name: string;
    code: string;
    description: string;
    client: string;
    startDate: string;
    endDate?: string;
    status: 'active' | 'completed' | 'on-hold';
    budget?: number;
    department: string;
  }
  
  export interface TimeEntry {
    id: string;
    userId: string;
    projectId: string;
    date: string;
    hours: number;
    description: string;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    submittedAt?: string;
    approvedAt?: string;
    approvedBy?: string;
  }
  
  // Real Employee Data from Weekly Report + Original Data
  const ENHANCED_USERS: User[] = [
    // Admin Users
    {
      id: 'admin-001',
      email: 'admin@westendworkforce.com',
      password: 'admin123',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      department: 'Administration',
      position: 'System Administrator',
      phone: '405-555-0001',
      address: '123 Admin St',
      city: 'Ada',
      state: 'OK',
      zipCode: '74820',
      hireDate: '2020-01-01',
      salary: 75000,
      isActive: true
    },
  
    // Real Employees from Weekly Report - Health Department
    {
      id: 'emp-001',
      email: 'kathyvaughn2022@gmail.com',
      password: 'demo123',
      firstName: 'Katherine',
      lastName: 'Brock Vaughn',
      role: 'employee',
      department: 'Health',
      position: 'Health Specialist',
      phone: '580-436-8321',
      address: '1234 Health Dr',
      city: 'Ada',
      state: 'OK',
      zipCode: '74820',
      hireDate: '2022-03-15',
      salary: 52000,
      isActive: true
    },
    {
      id: 'emp-002',
      email: 'jenniferjeanjohnston.jj@gmail.com',
      password: 'demo123',
      firstName: 'Jennifer',
      lastName: 'Johnston',
      role: 'manager',
      department: 'Health',
      position: 'Health Services Manager',
      phone: '580-436-8322',
      address: '2345 Wellness Way',
      city: 'Ada',
      state: 'OK',
      zipCode: '74820',
      hireDate: '2021-08-10',
      salary: 65000,
      isActive: true
    },
    {
      id: 'emp-003',
      email: 'kristen.linebarger99@gmail.com',
      password: 'demo123',
      firstName: 'Kristen',
      lastName: 'Linebarger',
      role: 'employee',
      department: 'Health',
      position: 'Public Health Coordinator',
      phone: '580-436-8323',
      address: '3456 Community Blvd',
      city: 'Ardmore',
      state: 'OK',
      zipCode: '73401',
      hireDate: '2023-01-20',
      salary: 48000,
      isActive: true
    },
    {
      id: 'emp-004',
      email: 'Michael.R.Hall@live.com',
      password: 'demo123',
      firstName: 'Michael',
      lastName: 'Hall',
      role: 'employee',
      department: 'Health',
      position: 'Environmental Health Inspector',
      phone: '580-436-8324',
      address: '4567 Safety St',
      city: 'Ada',
      state: 'OK',
      zipCode: '74820',
      hireDate: '2022-06-01',
      salary: 55000,
      isActive: true
    },
  
    // Commerce Department Employees
    {
      id: 'emp-005',
      email: 'sarah.martinez@westend.com',
      password: 'demo123',
      firstName: 'Sarah',
      lastName: 'Martinez',
      role: 'manager',
      department: 'Commerce',
      position: 'Business Development Manager',
      phone: '580-436-8325',
      address: '5678 Business Park Dr',
      city: 'Reno',
      state: 'NV',
      zipCode: '89501',
      hireDate: '2021-04-15',
      salary: 72000,
      isActive: true
    },
    {
      id: 'emp-006',
      email: 'james.wilson@westend.com',
      password: 'demo123',
      firstName: 'James',
      lastName: 'Wilson',
      role: 'employee',
      department: 'Commerce',
      position: 'Economic Development Specialist',
      phone: '580-436-8326',
      address: '6789 Commerce Way',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75201',
      hireDate: '2022-09-12',
      salary: 58000,
      isActive: true
    },
    {
      id: 'emp-007',
      email: 'lisa.thompson@westend.com',
      password: 'demo123',
      firstName: 'Lisa',
      lastName: 'Thompson',
      role: 'employee',
      department: 'Commerce',
      position: 'Trade Compliance Officer',
      phone: '580-436-8327',
      address: '7890 Trade Center Blvd',
      city: 'Austin',
      state: 'TX',
      zipCode: '73301',
      hireDate: '2023-02-28',
      salary: 61000,
      isActive: true
    },
  
    // Operations Department
    {
      id: 'emp-008',
      email: 'robert.davis@westend.com',
      password: 'demo123',
      firstName: 'Robert',
      lastName: 'Davis',
      role: 'manager',
      department: 'Operations',
      position: 'Operations Manager',
      phone: '580-436-8328',
      address: '8901 Operations Center',
      city: 'Ada',
      state: 'OK',
      zipCode: '74820',
      hireDate: '2020-11-01',
      salary: 68000,
      isActive: true
    },
    {
      id: 'emp-009',
      email: 'maria.garcia@westend.com',
      password: 'demo123',
      firstName: 'Maria',
      lastName: 'Garcia',
      role: 'employee',
      department: 'Operations',
      position: 'Administrative Coordinator',
      phone: '580-436-8329',
      address: '9012 Admin Plaza',
      city: 'Ardmore',
      state: 'OK',
      zipCode: '73401',
      hireDate: '2021-12-15',
      salary: 42000,
      isActive: true
    },
    {
      id: 'emp-010',
      email: 'david.brown@westend.com',
      password: 'demo123',
      firstName: 'David',
      lastName: 'Brown',
      role: 'employee',
      department: 'Operations',
      position: 'IT Support Specialist',
      phone: '580-436-8330',
      address: '0123 Tech Park',
      city: 'Remote',
      state: 'OK',
      zipCode: '74820',
      hireDate: '2022-04-10',
      salary: 50000,
      isActive: true
    }
  ];
  
  // Real Projects Based on Department Work
  const ENHANCED_PROJECTS: Project[] = [
    // Health Department Projects
    {
      id: 'proj-001',
      name: 'Community Health Assessment',
      code: 'CHA-2024',
      description: 'Comprehensive health assessment for tribal communities',
      client: 'Chickasaw Nation Health System',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'active',
      budget: 150000,
      department: 'Health'
    },
    {
      id: 'proj-002',
      name: 'Environmental Health Monitoring',
      code: 'EHM-2024',
      description: 'Water quality and environmental safety monitoring',
      client: 'EPA Region 6',
      startDate: '2024-02-01',
      endDate: '2024-11-30',
      status: 'active',
      budget: 125000,
      department: 'Health'
    },
    {
      id: 'proj-003',
      name: 'Public Health Emergency Preparedness',
      code: 'PHEP-2024',
      description: 'Emergency response planning and training',
      client: 'Oklahoma State Department of Health',
      startDate: '2024-03-01',
      endDate: '2024-09-30',
      status: 'active',
      budget: 75000,
      department: 'Health'
    },
  
    // Commerce Department Projects
    {
      id: 'proj-004',
      name: 'Small Business Development Initiative',
      code: 'SBDI-2024',
      description: 'Supporting tribal small business growth',
      client: 'Chickasaw Nation Commerce',
      startDate: '2024-01-15',
      endDate: '2024-12-15',
      status: 'active',
      budget: 200000,
      department: 'Commerce'
    },
    {
      id: 'proj-005',
      name: 'Tourism Development Strategy',
      code: 'TDS-2024',
      description: 'Developing cultural tourism opportunities',
      client: 'Oklahoma Tourism Department',
      startDate: '2024-02-15',
      endDate: '2024-10-31',
      status: 'active',
      budget: 180000,
      department: 'Commerce'
    },
    {
      id: 'proj-006',
      name: 'Trade Compliance Review',
      code: 'TCR-2024',
      description: 'Regulatory compliance assessment',
      client: 'U.S. Department of Commerce',
      startDate: '2024-04-01',
      endDate: '2024-08-31',
      status: 'active',
      budget: 95000,
      department: 'Commerce'
    },
  
    // Operations Projects
    {
      id: 'proj-007',
      name: 'Digital Infrastructure Upgrade',
      code: 'DIU-2024',
      description: 'IT systems modernization',
      client: 'Internal Operations',
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      status: 'active',
      budget: 120000,
      department: 'Operations'
    },
    {
      id: 'proj-008',
      name: 'Administrative Process Improvement',
      code: 'API-2024',
      description: 'Streamlining administrative workflows',
      client: 'Internal Operations',
      startDate: '2024-03-01',
      endDate: '2024-09-30',
      status: 'active',
      budget: 65000,
      department: 'Operations'
    }
  ];
  
  // Generate realistic time entries for the past 4 weeks (deterministic)
  function generateTimeEntries(): TimeEntry[] {
    const entries: TimeEntry[] = [];
    // Use fixed date for consistency
    const startDate = new Date('2024-07-15'); // Fixed start date
    
    // Simple deterministic random function based on seed
    function seededRandom(seed: number): number {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }
  
    ENHANCED_USERS.filter(user => user.role !== 'admin').forEach((user, userIndex) => {
      // Get projects for user's department
      const departmentProjects = ENHANCED_PROJECTS.filter(p => p.department === user.department);
      
      for (let day = 0; day < 28; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day);
        
        // Skip weekends
        if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;
        
        // Deterministic "random" based on user and day
        const seed = userIndex * 1000 + day;
        const workProbability = seededRandom(seed);
        
        // 90% chance of working each day
        if (workProbability < 0.9) {
          const projectIndex = Math.floor(seededRandom(seed + 1) * departmentProjects.length);
          const project = departmentProjects[projectIndex];
          const hoursRandom = seededRandom(seed + 2);
          const hours = Math.round((6 + hoursRandom * 3) * 4) / 4; // 6-9 hours, rounded to 0.25
          
          const descriptions = [
            'Client meeting and project planning',
            'Data analysis and reporting',
            'Field work and site visits',
            'Documentation and compliance review',
            'Team collaboration and coordination',
            'Research and development activities',
            'Training and professional development',
            'Quality assurance and testing'
          ];
  
          const descIndex = Math.floor(seededRandom(seed + 3) * descriptions.length);
          const statusRandom = seededRandom(seed + 4);
          const submittedRandom = seededRandom(seed + 5);
          const approvedRandom = seededRandom(seed + 6);
  
          entries.push({
            id: `time-${user.id}-${day}-${seed}`,
            userId: user.id,
            projectId: project.id,
            date: currentDate.toISOString().split('T')[0],
            hours: hours,
            description: descriptions[descIndex],
            status: statusRandom < 0.8 ? 'approved' : (statusRandom < 0.6 ? 'submitted' : 'draft'),
            submittedAt: submittedRandom < 0.8 ? currentDate.toISOString() : undefined,
            approvedAt: approvedRandom < 0.7 ? currentDate.toISOString() : undefined,
            approvedBy: approvedRandom < 0.7 ? 'manager-001' : undefined
          });
        }
      }
    });
  
    return entries;
  }
  
  // Enhanced Data Service Class
  class EnhancedDataService {
    private users: User[] = ENHANCED_USERS;
    private projects: Project[] = ENHANCED_PROJECTS;
    private timeEntries: TimeEntry[] = generateTimeEntries();
  
    // User Management
    async getUsers(): Promise<User[]> {
      return new Promise(resolve => {
        setTimeout(() => resolve(this.users), 100);
      });
    }
  
    async getUserById(id: string): Promise<User | undefined> {
      return new Promise(resolve => {
        setTimeout(() => resolve(this.users.find(user => user.id === id)), 50);
      });
    }
  
    async getUserByEmail(email: string): Promise<User | undefined> {
      return new Promise(resolve => {
        setTimeout(() => resolve(this.users.find(user => user.email === email)), 50);
      });
    }
  
    async authenticateUser(email: string, password: string): Promise<User | null> {
      return new Promise(resolve => {
        setTimeout(() => {
          const user = this.users.find(u => u.email === email && u.password === password && u.isActive);
          resolve(user || null);
        }, 200);
      });
    }
  
    // Project Management
    async getProjects(): Promise<Project[]> {
      return new Promise(resolve => {
        setTimeout(() => resolve(this.projects), 100);
      });
    }
  
    async getProjectsByDepartment(department: string): Promise<Project[]> {
      return new Promise(resolve => {
        setTimeout(() => resolve(this.projects.filter(p => p.department === department)), 50);
      });
    }
  
    async getProjectById(id: string): Promise<Project | undefined> {
      return new Promise(resolve => {
        setTimeout(() => resolve(this.projects.find(p => p.id === id)), 50);
      });
    }
  
    // Time Entry Management
    async getTimeEntries(): Promise<TimeEntry[]> {
      return new Promise(resolve => {
        setTimeout(() => resolve(this.timeEntries), 100);
      });
    }
  
    async getTimeEntriesByUser(userId: string): Promise<TimeEntry[]> {
      return new Promise(resolve => {
        setTimeout(() => resolve(this.timeEntries.filter(entry => entry.userId === userId)), 50);
      });
    }
  
    async getTimeEntriesByDateRange(startDate: string, endDate: string): Promise<TimeEntry[]> {
      return new Promise(resolve => {
        setTimeout(() => {
          const entries = this.timeEntries.filter(entry => 
            entry.date >= startDate && entry.date <= endDate
          );
          resolve(entries);
        }, 50);
      });
    }
  
    async getTimeEntriesForApproval(managerId: string): Promise<TimeEntry[]> {
      // Get users managed by this manager (same department)
      const manager = this.users.find(u => u.id === managerId);
      if (!manager) return [];
  
      const departmentUsers = this.users.filter(u => 
        u.department === manager.department && u.role === 'employee'
      );
  
      return new Promise(resolve => {
        setTimeout(() => {
          const entries = this.timeEntries.filter(entry => 
            departmentUsers.some(user => user.id === entry.userId) &&
            entry.status === 'submitted'
          );
          resolve(entries);
        }, 50);
      });
    }
  
    async addTimeEntry(entry: Omit<TimeEntry, 'id'>): Promise<TimeEntry> {
      return new Promise(resolve => {
        setTimeout(() => {
          // Use timestamp + counter for consistent IDs
          const timestamp = new Date().getTime();
          const counter = this.timeEntries.length;
          const newEntry: TimeEntry = {
            ...entry,
            id: `time-${timestamp}-${counter}`
          };
          this.timeEntries.push(newEntry);
          resolve(newEntry);
        }, 100);
      });
    }
  
    async updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry | null> {
      return new Promise(resolve => {
        setTimeout(() => {
          const index = this.timeEntries.findIndex(entry => entry.id === id);
          if (index !== -1) {
            this.timeEntries[index] = { ...this.timeEntries[index], ...updates };
            resolve(this.timeEntries[index]);
          } else {
            resolve(null);
          }
        }, 100);
      });
    }
  
    // Analytics and Reporting
    async getDashboardStats(userId: string): Promise<EmployeeDashboardStats | null> {
      const user = await this.getUserById(userId);
      if (!user) return null;
  
      return new Promise(resolve => {
        setTimeout(() => {
          const userEntries = this.timeEntries.filter(entry => entry.userId === userId);
          const thisWeekStart = new Date();
          thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
          const thisWeekEnd = new Date(thisWeekStart);
          thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
  
          const thisWeekEntries = userEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= thisWeekStart && entryDate <= thisWeekEnd;
          });
  
          const thisWeekHours = thisWeekEntries.reduce((sum, entry) => sum + entry.hours, 0);
          const pendingApprovals = userEntries.filter(entry => entry.status === 'submitted').length;
          const totalProjects = [...new Set(userEntries.map(entry => entry.projectId))].length;
  
          resolve({
            thisWeekHours,
            pendingApprovals,
            totalProjects,
            totalEntries: userEntries.length
          });
        }, 100);
      });
    }
  
    // Department Analytics
    async getDepartmentStats(department: string): Promise<{
      totalEmployees: number;
      totalHours: number;
      pendingApprovals: number;
      activeProjects: number;
    } | null> {
      return new Promise(resolve => {
        setTimeout(() => {
          const departmentUsers = this.users.filter(u => u.department === department);
          const departmentEntries = this.timeEntries.filter(entry => 
            departmentUsers.some(user => user.id === entry.userId)
          );
  
          const totalHours = departmentEntries.reduce((sum, entry) => sum + entry.hours, 0);
          const pendingApprovals = departmentEntries.filter(entry => entry.status === 'submitted').length;
          const activeProjects = this.projects.filter(p => p.department === department && p.status === 'active').length;
  
          resolve({
            totalEmployees: departmentUsers.length,
            totalHours,
            pendingApprovals,
            activeProjects
          });
        }, 100);
      });
    }
  }
  
  // Export the enhanced data service instance
  export const enhancedDataService = new EnhancedDataService();
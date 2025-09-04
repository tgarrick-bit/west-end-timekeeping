'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useNotificationIntegration } from '@/hooks/useNotificationIntegration';
import { 
  Receipt, 
  Plus, 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  FileText, 
  Upload, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  Camera,
  FileImage,
  AlertCircle,
  CheckSquare,
  Square,
  Send,
  Save,
  BarChart3,
  TrendingUp,
  CreditCard,
  Car,
  Utensils,
  Briefcase,
  Home,
  Plane,
  Train,
  Bus
} from 'lucide-react';
import Link from 'next/link';

interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  project?: string;
  receipt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'draft';
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  comments?: string;
  isBillable: boolean;
  vendor?: string;
  location?: string;
  mileage?: number;
  receiptFile?: File;
  tags: string[];
  approvalChain?: string[];
  budgetCategory?: string;
  taxAmount?: number;
  currency: string;
}

interface Project {
  id: string;
  name: string;
}

type TabType = 'submit' | 'history' | 'receipts';

export default function ExpensesPage() {
  const { appUser } = useAuth();
  const { notifyExpenseSubmitted } = useNotificationIntegration();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('submit');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    subcategory: '',
    description: '',
    project: '',
    receipt: null as File | null,
    isBillable: true,
    vendor: '',
    location: '',
    mileage: '',
    tags: [] as string[],
    budgetCategory: '',
    taxAmount: '',
    currency: 'USD'
  });

  useEffect(() => {
    if (!appUser) {
      router.push('/auth/signin');
    } else {
      setIsLoading(false);
      loadSampleExpenses();
    }
  }, [appUser, router]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + N to add new expense
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        handleAddExpense();
      }
      // Ctrl/Cmd + F to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search expenses..."]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      // Escape to close modal
      if (event.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showModal]);

  // Sample project data
  const projects: Project[] = [
    { id: 'metro', name: 'Metro Hospital' },
    { id: 'downtown', name: 'Downtown Office' },
    { id: 'cityschools', name: 'City Schools' },
    { id: 'riverside', name: 'Riverside Manufacturing' }
  ];

  // Enhanced expense categories with icons and subcategories
  const categories = [
    { 
      name: 'Meals & Entertainment',
      icon: Utensils,
      subcategories: ['Business Lunch', 'Client Dinner', 'Coffee/Refreshments', 'Team Meals', 'Conference Food']
    },
    { 
      name: 'Travel & Transportation',
      icon: Plane,
      subcategories: ['Airfare', 'Hotel', 'Car Rental', 'Taxi/Uber', 'Parking', 'Tolls']
    },
    { 
      name: 'Office Supplies',
      icon: Briefcase,
      subcategories: ['Paper & Ink', 'Electronics', 'Furniture', 'Software', 'Books & Training']
    },
    { 
      name: 'Gas & Mileage',
      icon: Car,
      subcategories: ['Fuel', 'Mileage Reimbursement', 'Vehicle Maintenance', 'Insurance']
    },
    { 
      name: 'Equipment & Technology',
      icon: FileImage,
      subcategories: ['Computers', 'Phones', 'Cameras', 'Audio/Video', 'Tools']
    },
    { 
      name: 'Professional Development',
      icon: TrendingUp,
      subcategories: ['Training Courses', 'Certifications', 'Conferences', 'Workshops', 'Memberships']
    },
    { 
      name: 'Utilities & Services',
      icon: Home,
      subcategories: ['Internet', 'Phone', 'Electricity', 'Cleaning', 'Security']
    },
    { 
      name: 'Other',
      icon: AlertCircle,
      subcategories: ['Miscellaneous', 'Emergency', 'Special Projects']
    }
  ];

  // Load sample expenses with enhanced data
  const loadSampleExpenses = () => {
    const sampleExpenses: Expense[] = [
      {
        id: '1',
        date: '2025-01-15',
        amount: 45.20,
        category: 'Gas & Mileage',
        description: 'Client visit to Metro Hospital - 45 miles round trip',
        project: 'metro',
        status: 'approved',
        submittedAt: '2025-01-15T10:30:00Z',
        approvedAt: '2025-01-16T14:20:00Z',
        approvedBy: 'Manager',
        isBillable: true,
        vendor: 'Shell Gas Station',
        location: 'Ada, OK',
        mileage: 45,
        tags: ['client-visit', 'mileage'],
        budgetCategory: 'Transportation',
        taxAmount: 0,
        currency: 'USD'
      },
      {
        id: '2',
        date: '2025-01-14',
        amount: 28.50,
        category: 'Meals & Entertainment',
        description: 'Business lunch with Metro Hospital client team',
        project: 'metro',
        status: 'pending',
        submittedAt: '2025-01-14T18:45:00Z',
        isBillable: true,
        vendor: 'Downtown Bistro',
        location: 'Oklahoma City, OK',
        tags: ['client-meeting', 'business-lunch'],
        budgetCategory: 'Client Relations',
        taxAmount: 2.85,
        currency: 'USD'
      },
      {
        id: '3',
        date: '2025-01-13',
        amount: 67.89,
        category: 'Office Supplies',
        description: 'Printer paper, ink cartridges, and office supplies',
        project: 'cityschools',
        status: 'approved',
        submittedAt: '2025-01-13T09:15:00Z',
        approvedAt: '2025-01-14T11:30:00Z',
        approvedBy: 'Manager',
        isBillable: false,
        vendor: 'Office Depot',
        location: 'Ada, OK',
        tags: ['office-supplies', 'printer'],
        budgetCategory: 'Office Operations',
        taxAmount: 5.43,
        currency: 'USD'
      },
      {
        id: '4',
        date: '2025-01-12',
        amount: 156.00,
        category: 'Travel & Transportation',
        description: 'Hotel accommodation for Riverside Manufacturing conference',
        project: 'riverside',
        status: 'rejected',
        submittedAt: '2025-01-12T16:20:00Z',
        comments: 'Please use approved hotel chain - Marriott or Hilton preferred',
        isBillable: true,
        vendor: 'Holiday Inn Express',
        location: 'Tulsa, OK',
        tags: ['conference', 'travel'],
        budgetCategory: 'Professional Development',
        taxAmount: 12.48,
        currency: 'USD'
      },
      {
        id: '5',
        date: '2025-01-11',
        amount: 89.99,
        category: 'Equipment & Technology',
        description: 'Wireless presentation remote for client presentations',
        project: 'downtown',
        status: 'approved',
        submittedAt: '2025-01-11T14:20:00Z',
        approvedAt: '2025-01-12T09:15:00Z',
        approvedBy: 'Manager',
        isBillable: true,
        vendor: 'Amazon',
        location: 'Online',
        tags: ['client-meeting', 'presentation'],
        budgetCategory: 'Technology',
        taxAmount: 0,
        currency: 'USD'
      }
    ];
    setExpenses(sampleExpenses);
    setFilteredExpenses(sampleExpenses);
  };

  // Filter expenses based on search and filters
  useEffect(() => {
    let filtered = expenses;
    
    if (searchTerm) {
      filtered = filtered.filter(expense => 
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(expense => expense.category === selectedCategory);
    }
    
    if (selectedStatus) {
      filtered = filtered.filter(expense => expense.status === selectedStatus);
    }
    
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(expense => 
        expense.date >= dateRange.start && expense.date <= dateRange.end
      );
    }
    
    setFilteredExpenses(filtered);
  }, [expenses, searchTerm, selectedCategory, selectedStatus, dateRange]);

  const handleAddExpense = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      category: '',
      subcategory: '',
      description: '',
      project: '',
      receipt: null,
      isBillable: true,
      vendor: '',
      location: '',
      mileage: '',
      tags: [],
      budgetCategory: '',
      taxAmount: '',
      currency: 'USD'
    });
    setShowModal(true);
  };

  const handleSaveExpense = () => {
    if (!formData.date || !formData.amount || !formData.category || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    const newExpense: Expense = {
      id: Date.now().toString(),
      date: formData.date,
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description,
      project: formData.project || undefined,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      isBillable: formData.isBillable,
      vendor: formData.vendor || undefined,
      location: formData.location || undefined,
      mileage: formData.mileage ? parseFloat(formData.mileage) : undefined,
      tags: formData.tags,
      budgetCategory: formData.budgetCategory || undefined,
      taxAmount: formData.taxAmount ? parseFloat(formData.taxAmount) : 0,
      currency: formData.currency
    };

    setExpenses(prev => [newExpense, ...prev]);
    setShowModal(false);
    setIsSubmitted(true);
    
    // Notify manager about expense submission
    if (appUser?.manager_id) {
      notifyExpenseSubmitted(
        appUser.manager_id,
        `${appUser.first_name} ${appUser.last_name}` || 'Employee',
        newExpense.amount,
        newExpense.description
      );
    }
    
    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      category: '',
      subcategory: '',
      description: '',
      project: '',
      receipt: null,
      isBillable: true,
      vendor: '',
      location: '',
      mileage: '',
      tags: [],
      budgetCategory: '',
      taxAmount: '',
      currency: 'USD'
    });

    // Auto-hide success message after 3 seconds
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  const handleCancel = () => {
    setShowModal(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      category: '',
      subcategory: '',
      description: '',
      project: '',
      receipt: null,
      isBillable: true,
      vendor: '',
      location: '',
      mileage: '',
      tags: [],
      budgetCategory: '',
      taxAmount: '',
      currency: 'USD'
    });
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      setExpenses(prev => prev.filter(expense => expense.id !== id));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, receipt: file }));
    }
  };

  const handleReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      // In a real app, you'd upload to cloud storage here
    }
  };

  const handleReceiptCapture = () => {
    // In a real app, this would open camera
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return 'No Project';
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : projectId;
  };

  // Enhanced utility functions
  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category ? category.icon : AlertCircle;
  };

  const getSubcategories = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category ? category.subcategories : [];
  };

  const handleBulkAction = () => {
    if (bulkAction === 'delete' && selectedExpenses.length > 0) {
      if (confirm(`Are you sure you want to delete ${selectedExpenses.length} expenses?`)) {
        setExpenses(prev => prev.filter(expense => !selectedExpenses.includes(expense.id)));
        setSelectedExpenses([]);
        setBulkAction('');
      }
    } else if (bulkAction === 'submit' && selectedExpenses.length > 0) {
      const submittedExpenses = expenses.filter(expense => selectedExpenses.includes(expense.id));
      
      setExpenses(prev => prev.map(expense => 
        selectedExpenses.includes(expense.id) 
          ? { ...expense, status: 'pending' as const }
          : expense
      ));
      
      // Notify manager about bulk expense submission
      if (appUser?.manager_id && submittedExpenses.length > 0) {
        const totalAmount = submittedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        notifyExpenseSubmitted(
          appUser.manager_id,
          `${appUser.first_name} ${appUser.last_name}` || 'Employee',
          totalAmount,
          `${submittedExpenses.length} expenses submitted for approval`
        );
      }
      
      setSelectedExpenses([]);
      setBulkAction('');
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 3000);
    } else if (bulkAction === 'export' && selectedExpenses.length > 0) {
      // Export selected expenses to CSV
      const selectedExpenseData = expenses.filter(expense => selectedExpenses.includes(expense.id));
      exportToCSV(selectedExpenseData, 'selected-expenses');
      setSelectedExpenses([]);
      setBulkAction('');
    }
  };

  const exportToCSV = (expenseData: Expense[], filename: string) => {
    const headers = ['Date', 'Amount', 'Category', 'Description', 'Project', 'Status', 'Vendor', 'Billable'];
    const csvContent = [
      headers.join(','),
      ...expenseData.map(expense => [
        expense.date,
        expense.amount,
        expense.category,
        expense.description,
        getProjectName(expense.project),
        expense.status,
        expense.vendor || '',
        expense.isBillable ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleExpenseSelection = (expenseId: string) => {
    setSelectedExpenses(prev => 
      prev.includes(expenseId) 
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const selectAllExpenses = () => {
    if (selectedExpenses.length === filteredExpenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(filteredExpenses.map(expense => expense.id));
    }
  };

  const getTotalAmount = (expenseList: Expense[]) => {
    return expenseList.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getTotalWithTax = (expenseList: Expense[]) => {
    return expenseList.reduce((sum, expense) => sum + expense.amount + (expense.taxAmount || 0), 0);
  };

  const getTotalTax = (expenseList: Expense[]) => {
    return expenseList.reduce((sum, expense) => sum + (expense.taxAmount || 0), 0);
  };

  const getPendingAmount = () => {
    return expenses.filter(expense => expense.status === 'pending')
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getApprovedAmount = () => {
    return expenses.filter(expense => expense.status === 'approved')
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getBillableAmount = () => {
    return expenses.filter(expense => expense.isBillable)
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getNonBillableAmount = () => {
    return expenses.filter(expense => !expense.isBillable)
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  return (
    <ProtectedRoute allowedRoles={['employee']}>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center text-pink-600 hover:text-pink-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
              <div className="h-8 w-px bg-gray-300"></div>
              <h1 className="text-3xl font-bold text-gray-900">Expense Management</h1>
            </div>
          </div>
          <p className="text-gray-600 mt-2">
            Track and submit your business expenses for approval
          </p>
        </div>

        {/* Notification Banner */}
        {expenses.filter(e => e.status === 'pending').length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  You have {expenses.filter(e => e.status === 'pending').length} pending expenses awaiting approval
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Total pending amount: ${getPendingAmount().toFixed(2)}
                </p>
              </div>
              <button className="text-yellow-800 hover:text-yellow-900">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Success Notification */}
        {isSubmitted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  Expense submitted successfully!
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Your expense has been submitted for approval and is now pending review.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Expense Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-pink-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-pink-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${getTotalAmount(expenses).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  +${getTotalTax(expenses).toFixed(2)} tax
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${getPendingAmount().toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {expenses.filter(e => e.status === 'pending').length} items
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Billable Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${getBillableAmount().toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {expenses.filter(e => e.isBillable).length} expenses
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-[#E5DDD8]/50 rounded-lg">
                <BarChart3 className="h-6 w-6 text-[#05202E]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(expenses.map(e => e.category)).size}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {expenses.length} total expenses
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Analytics Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Top Categories</h4>
              {(() => {
                const categoryTotals = expenses.reduce((acc, expense) => {
                  acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
                  return acc;
                }, {} as Record<string, number>);
                
                const topCategories = Object.entries(categoryTotals)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3);
                
                return topCategories.map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{category}</span>
                    <span className="text-sm font-medium text-gray-900">${amount.toFixed(2)}</span>
                  </div>
                ));
              })()}
            </div>
            
            {/* Project Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Project Spending</h4>
              {(() => {
                const projectTotals = expenses.reduce((acc, expense) => {
                  if (expense.project) {
                    acc[expense.project] = (acc[expense.project] || 0) + expense.amount;
                  }
                  return acc;
                }, {} as Record<string, number>);
                
                const topProjects = Object.entries(projectTotals)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3);
                
                return topProjects.map(([projectId, amount]) => (
                  <div key={projectId} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{getProjectName(projectId)}</span>
                    <span className="text-sm font-medium text-gray-900">${amount.toFixed(2)}</span>
                  </div>
                ));
              })()}
            </div>
            
            {/* Monthly Trend */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Monthly Trend</h4>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600">
                  ${(getTotalAmount(expenses) / 12).toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">Avg. Monthly</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('submit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'submit'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Submit Expenses
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'history'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Expense History
              </button>
              <button
                onClick={() => setActiveTab('receipts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'receipts'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Receipts
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Submit Expenses Tab */}
            {activeTab === 'submit' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Submit New Expense</h2>
                  <div className="flex items-center space-x-3">
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Keyboard shortcuts:</span> 
                      <span className="ml-2 bg-gray-100 px-2 py-1 rounded">Ctrl+N</span> Add Expense, 
                      <span className="ml-2 bg-gray-100 px-2 py-1 rounded">Ctrl+F</span> Search
                    </div>
                    <button
                      onClick={handleAddExpense}
                      className="bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-flex items-center"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Expense
                    </button>
                  </div>
                </div>

                {/* Quick Expense Form */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Expense Entry</h3>
                  
                  {/* Smart Date Picker */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <div className="flex space-x-2">
                        <input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                        <button
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
                          }))}
                          className="px-2 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                          title="Yesterday"
                        >
                          Yesterday
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        <option value="">Select category</option>
                        {categories.map(category => (
                          <option key={category.name} value={category.name}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={handleSaveExpense}
                        disabled={!formData.date || !formData.amount || !formData.category}
                        className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Add Expense
                      </button>
                    </div>
                  </div>
                  
                  {/* Enhanced Description with Smart Suggestions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="Describe the expense..."
                      />
                      {/* Smart Suggestions */}
                      {formData.category && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(() => {
                            const suggestions = {
                              'Meals & Entertainment': ['Business lunch', 'Client dinner', 'Team meeting'],
                              'Travel & Transportation': ['Hotel accommodation', 'Airfare', 'Car rental'],
                              'Office Supplies': ['Printer paper', 'Ink cartridges', 'Stationery'],
                              'Gas & Mileage': ['Client visit', 'Business trip', 'Site inspection']
                            };
                            return suggestions[formData.category as keyof typeof suggestions]?.map(suggestion => (
                              <button
                                key={suggestion}
                                onClick={() => setFormData(prev => ({ ...prev, description: suggestion }))}
                                className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded hover:bg-pink-200 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Project (Optional)</label>
                      <select
                        value={formData.project}
                        onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        <option value="">No Project</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Auto-save Indicator */}
                  <div className="mt-3 text-xs text-gray-500 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Auto-save enabled
                  </div>
                </div>

                {/* Recent Expenses with Bulk Actions */}
                <div>
                                  <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Recent Expenses</h3>
                  <div className="flex items-center space-x-3">
                    {selectedExpenses.length > 0 && (
                      <>
                        <span className="text-sm text-gray-600">
                          {selectedExpenses.length} selected
                        </span>
                        <select
                          value={bulkAction}
                          onChange={(e) => setBulkAction(e.target.value)}
                          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                        >
                          <option value="">Bulk Actions</option>
                          <option value="submit">Submit for Approval</option>
                          <option value="delete">Delete Selected</option>
                          <option value="export">Export Selected</option>
                        </select>
                        <button
                          onClick={handleBulkAction}
                          disabled={!bulkAction}
                          className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white px-3 py-1 rounded-md text-sm transition-colors"
                        >
                          Apply
                        </button>
                      </>
                    )}
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      <Download className="h-4 w-4 mr-2" />
                      Export All
                    </button>
                  </div>
                </div>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <input
                                type="checkbox"
                                checked={selectedExpenses.length === filteredExpenses.length && filteredExpenses.length > 0}
                                onChange={selectAllExpenses}
                                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                              />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {expenses.slice(0, 10).map((expense) => (
                            <tr key={expense.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <input
                                  type="checkbox"
                                  checked={selectedExpenses.includes(expense.id)}
                                  onChange={() => toggleExpenseSelection(expense.id)}
                                  className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(expense.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                ${expense.amount.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center space-x-2">
                                  {(() => {
                                    const Icon = getCategoryIcon(expense.category);
                                    return <Icon className="h-4 w-4 text-gray-400" />;
                                  })()}
                                  <span>{expense.category}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                                <div>
                                  <div className="font-medium">{expense.description}</div>
                                  {expense.vendor && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Vendor: {expense.vendor}
                                    </div>
                                  )}
                                  {expense.mileage && (
                                    <div className="text-xs text-gray-500">
                                      Mileage: {expense.mileage} mi
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div>
                                  <div>{getProjectName(expense.project)}</div>
                                  {expense.isBillable && (
                                    <div className="text-xs text-green-600 font-medium">
                                      Billable
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(expense.status)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Expense History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Expense History</h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                    </button>
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </button>
                  </div>
                </div>

                {/* Enhanced Filters */}
                {showFilters && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            placeholder="Search expenses..."
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        >
                          <option value="">All Categories</option>
                          {categories.map(category => (
                            <option key={category.name} value={category.name}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        >
                          <option value="">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                        <select
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        >
                          <option value="">All Projects</option>
                          {projects.map(project => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="border border-gray-300 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                          <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="border border-gray-300 rounded-md px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Date Presets */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const today = new Date();
                          const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                          setDateRange({
                            start: lastWeek.toISOString().split('T')[0],
                            end: today.toISOString().split('T')[0]
                          });
                        }}
                        className="text-xs bg-pink-100 text-pink-700 px-3 py-1 rounded hover:bg-pink-200 transition-colors"
                      >
                        Last 7 Days
                      </button>
                      <button
                        onClick={() => {
                          const today = new Date();
                          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                          setDateRange({
                            start: lastMonth.toISOString().split('T')[0],
                            end: today.toISOString().split('T')[0]
                          });
                        }}
                        className="text-xs bg-pink-100 text-pink-700 px-3 py-1 rounded hover:bg-pink-200 transition-colors"
                      >
                        Last 30 Days
                      </button>
                      <button
                        onClick={() => {
                          const today = new Date();
                          const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                          setDateRange({
                            start: thisMonth.toISOString().split('T')[0],
                            end: today.toISOString().split('T')[0]
                          });
                        }}
                        className="text-xs bg-pink-100 text-pink-700 px-3 py-1 rounded hover:bg-pink-200 transition-colors"
                      >
                        This Month
                      </button>
                    </div>
                  </div>
                )}

                {/* Expense List */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredExpenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(expense.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${expense.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {expense.category}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {expense.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {getProjectName(expense.project)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(expense.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(expense.submittedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredExpenses.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No expenses found matching your criteria.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Receipts Tab */}
            {activeTab === 'receipts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Receipt Management</h2>
                  <button 
                    onClick={() => setShowReceiptModal(true)}
                    className="bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-flex items-center"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Receipts
                  </button>
                </div>

                {/* Receipt Upload Area */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Upload Receipts
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Drag and drop receipt files here, or click to browse
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleReceiptUpload}
                      className="hidden"
                      id="bulk-receipt-upload"
                    />
                    <label
                      htmlFor="bulk-receipt-upload"
                      className="cursor-pointer bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-flex items-center"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Choose Files
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Supports PNG, JPG, PDF up to 10MB each
                    </p>
                  </div>
                </div>

                {/* Receipt Library */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt Library</h3>
                  
                  {/* Receipt Filters */}
                  <div className="flex space-x-4 mb-4">
                    <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                      <option>All Receipts</option>
                      <option>Matched to Expenses</option>
                      <option>Unmatched</option>
                    </select>
                    <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                      <option>All Types</option>
                      <option>Images</option>
                      <option>PDFs</option>
                    </select>
                  </div>

                  {/* Receipt Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Sample Receipts */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="bg-gray-100 rounded-lg h-32 flex items-center justify-center mb-3">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">receipt_metro_hospital.pdf</p>
                        <p className="text-gray-500">Uploaded 2 days ago</p>
                        <p className="text-green-600 text-xs font-medium">✓ Matched to Expense</p>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="bg-gray-100 rounded-lg h-32 flex items-center justify-center mb-3">
                        <FileImage className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">gas_station_receipt.jpg</p>
                        <p className="text-gray-500">Uploaded 1 day ago</p>
                        <p className="text-yellow-600 text-xs font-medium">⚠ Needs Matching</p>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="bg-gray-100 rounded-lg h-32 flex items-center justify-center mb-3">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">office_supplies.pdf</p>
                        <p className="text-gray-500">Uploaded 3 days ago</p>
                        <p className="text-green-600 text-xs font-medium">✓ Matched to Expense</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center mt-6">
                    <p className="text-sm text-gray-500">
                      {expenses.filter(e => e.receipt).length} receipts uploaded • 
                      {expenses.filter(e => e.receipt && e.status === 'approved').length} approved
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Add Expense</h3>
              
              <div className="space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        category: e.target.value,
                        subcategory: '' // Reset subcategory when category changes
                      }));
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.name} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                </div>

                {/* Subcategory */}
                {formData.category && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategory
                    </label>
                    <select
                      value={formData.subcategory}
                      onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="">Select a subcategory</option>
                      {getSubcategories(formData.category).map(subcategory => (
                        <option key={subcategory} value={subcategory}>{subcategory}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Project */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project (Optional)
                  </label>
                  <select
                    value={formData.project}
                    onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="">No Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Describe the expense..."
                  />
                </div>

                {/* Advanced Fields Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Vendor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor
                    </label>
                    <input
                      type="text"
                      value={formData.vendor}
                      onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="e.g., Office Depot"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="e.g., Ada, OK"
                    />
                  </div>
                </div>

                {/* Mileage Field */}
                {formData.category === 'Gas & Mileage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mileage
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.mileage}
                      onChange={(e) => setFormData(prev => ({ ...prev, mileage: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="0.0"
                    />
                  </div>
                )}

                {/* Billable Toggle */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="billable"
                    checked={formData.isBillable}
                    onChange={(e) => setFormData(prev => ({ ...prev, isBillable: e.target.checked }))}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <label htmlFor="billable" className="ml-2 block text-sm text-gray-900">
                    This expense is billable to the client
                  </label>
                </div>

                {/* Tax Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.taxAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxAmount: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="receipt-upload"
                    />
                    <label
                      htmlFor="receipt-upload"
                      className="cursor-pointer text-pink-600 hover:text-pink-700 font-medium"
                    >
                      Click to upload receipt
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, PDF up to 10MB
                    </p>
                  </div>
                  {formData.receipt && (
                    <div className="mt-2 text-sm text-gray-600">
                      Selected: {formData.receipt.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveExpense}
                  disabled={!formData.date || !formData.amount || !formData.category || !formData.description}
                  className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-gray-400 transition-colors"
                >
                  Save Expense
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </ProtectedRoute>
  );
}

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Project, ExpenseCategory, ExpenseEntryForm } from '@/types'
import { toast } from 'sonner'
import { DollarSign, Receipt, FileText, Plus, Loader2, Upload, X } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useNotificationIntegration } from '@/hooks/useNotificationIntegration'

const expenseEntrySchema = z.object({
  project_id: z.string().optional(),
  category_id: z.string().min(1, 'Category is required'),
  date: z.string().min(1, 'Date is required'),
  amount: z.number().min(0.01, 'Amount must be at least $0.01').max(999999.99, 'Amount cannot exceed $999,999.99'),
  description: z.string().min(1, 'Description is required').max(500, 'Description cannot exceed 500 characters'),
  is_billable: z.boolean(),
})

type ExpenseEntryFormData = z.infer<typeof expenseEntrySchema>

export function QuickExpenseEntry() {
  const { appUser } = useAuth()
  const { notifyExpenseSubmitted } = useNotificationIntegration()
  const [projects, setProjects] = useState<Array<{
    id: string
    name: string
    description: string
  }>>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseEntryFormData>({
    resolver: zodResolver(expenseEntrySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      is_billable: true,
    },
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setReceiptFile(acceptedFiles[0])
      }
    },
  })

  useEffect(() => {
    fetchProjects()
    fetchCategories()
  }, [])

  const fetchProjects = async () => {
    if (!appUser) return

    try {
      const { data, error } = await supabase
        .from('project_assignments')
        .select(`
          project_id,
          projects (
            id,
            name,
            description
          )
        `)
        .eq('user_id', appUser.id)
        .eq('is_active', true)

      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projectData = data?.flatMap((item: any) => item.projects).filter(Boolean) as Array<{
        id: string
        name: string
        description: string
      }>
      setProjects(projectData)
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Failed to load expense categories')
    }
  }

  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${appUser?.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Error uploading receipt:', error)
      throw error
    }
  }

  const onSubmit = async (data: ExpenseEntryFormData) => {
    if (!appUser) return

    setIsLoading(true)
    setUploadProgress(0)
    
    try {
      let receiptUrl: string | null = null

      // Upload receipt if provided
      if (receiptFile) {
        setUploadProgress(50)
        receiptUrl = await uploadReceipt(receiptFile)
        setUploadProgress(100)
      }

      const { error } = await supabase
        .from('expense_items')
        .insert([{
          user_id: appUser.id,
          project_id: data.project_id || null,
          category_id: data.category_id,
          date: data.date,
          amount: data.amount,
          description: data.description,
          receipt_url: receiptUrl,
          is_billable: data.is_billable,
          is_submitted: false,
          is_approved: false,
        }])

      if (error) throw error

      // Notify manager about expense submission
      if (appUser.manager_id) {
        notifyExpenseSubmitted(
          appUser.manager_id,
          `${appUser.first_name} ${appUser.last_name}` || 'Employee',
          data.amount,
          data.description || 'Expense'
        )
      }

      toast.success('Expense added successfully')
      reset()
      setReceiptFile(null)
      setUploadProgress(0)
    } catch (error) {
      console.error('Error adding expense:', error)
      toast.error('Failed to add expense')
    } finally {
      setIsLoading(false)
    }
  }

  const removeReceipt = () => {
    setReceiptFile(null)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project (Optional)
          </label>
          <select
            {...register('project_id')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          >
            <option value="">No project (personal expense)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            {...register('category_id')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date *
          </label>
          <input
            {...register('date')}
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0.01"
              max="999999.99"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="0.00"
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            {...register('description')}
            type="text"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="What was this expense for?"
          />
        </div>
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Receipt Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Receipt (Optional)
        </label>
        {!receiptFile ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-primary hover:bg-primary/5'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600">
              {isDragActive
                ? 'Drop the receipt here...'
                : 'Drag & drop a receipt, or click to select'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Supports: JPG, PNG, GIF, PDF (max 10MB)
            </p>
          </div>
        ) : (
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Receipt className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">{receiptFile.name}</span>
                <span className="text-xs text-gray-500">
                  ({(receiptFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <button
                type="button"
                onClick={removeReceipt}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Billable Toggle */}
      <div className="flex items-center space-x-3">
        <input
          {...register('is_billable')}
          type="checkbox"
          id="is_billable"
          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
        />
        <label htmlFor="is_billable" className="text-sm font-medium text-gray-700">
          This expense is billable to the client
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add Expense
        </button>
      </div>
    </form>
  )
}





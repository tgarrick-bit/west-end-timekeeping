'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import * as XLSX from 'xlsx'
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  Download,
} from 'lucide-react'

interface ParsedRow {
  rowIndex: number
  employeeEmail: string
  weekEnding: string
  projectCode: string
  mon: number
  tue: number
  wed: number
  thu: number
  fri: number
  sat: number
  sun: number
  totalHours: number
  // Resolved
  employeeId?: string
  employeeName?: string
  projectId?: string
  projectName?: string
  // Validation
  errors: string[]
  status: 'valid' | 'error' | 'imported'
}

export default function TimesheetImportPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ imported: number; errors: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)

  const parseFile = useCallback(async (selectedFile: File) => {
    setParsing(true)
    setImportResults(null)
    setFile(selectedFile)

    try {
      const data = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet)

      if (jsonData.length === 0) {
        toast('error', 'The file appears to be empty.')
        setParsing(false)
        return
      }

      // Normalize column headers (case-insensitive, trim whitespace)
      const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '')
      const columnMap: Record<string, string> = {}
      const firstRow = jsonData[0]
      Object.keys(firstRow).forEach(key => {
        const n = normalize(key)
        if (n.includes('email') || n === 'employeeemail') columnMap[key] = 'employeeEmail'
        else if (n.includes('employeeid') || n === 'id') columnMap[key] = 'employeeEmail' // fallback
        else if (n.includes('weekending') || n === 'weekending') columnMap[key] = 'weekEnding'
        else if (n.includes('projectcode') || n.includes('project')) columnMap[key] = 'projectCode'
        else if (n === 'mon' || n === 'monday') columnMap[key] = 'mon'
        else if (n === 'tue' || n === 'tuesday') columnMap[key] = 'tue'
        else if (n === 'wed' || n === 'wednesday') columnMap[key] = 'wed'
        else if (n === 'thu' || n === 'thursday') columnMap[key] = 'thu'
        else if (n === 'fri' || n === 'friday') columnMap[key] = 'fri'
        else if (n === 'sat' || n === 'saturday') columnMap[key] = 'sat'
        else if (n === 'sun' || n === 'sunday') columnMap[key] = 'sun'
      })

      // Fetch employees and projects for validation
      const { data: employees } = await supabase
        .from('employees')
        .select('id, email, first_name, last_name, employee_id')

      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, code')

      const employeeByEmail = new Map<string, any>()
      const employeeById = new Map<string, any>()
      ;(employees || []).forEach(emp => {
        if (emp.email) employeeByEmail.set(emp.email.toLowerCase(), emp)
        if (emp.employee_id) employeeById.set(emp.employee_id.toLowerCase(), emp)
      })

      const projectByCode = new Map<string, any>()
      ;(projects || []).forEach(proj => {
        if (proj.code) projectByCode.set(proj.code.toLowerCase(), proj)
        // Also allow matching by name
        if (proj.name) projectByCode.set(proj.name.toLowerCase(), proj)
      })

      const rows: ParsedRow[] = jsonData.map((raw, index) => {
        const mapped: Record<string, any> = {}
        Object.entries(raw).forEach(([key, value]) => {
          const target = columnMap[key]
          if (target) mapped[target] = value
        })

        const errors: string[] = []
        const emailOrId = String(mapped.employeeEmail || '').trim()
        const weekEnding = String(mapped.weekEnding || '').trim()
        const projectCode = String(mapped.projectCode || '').trim()

        const parseHours = (val: any): number => {
          const n = parseFloat(val)
          return isNaN(n) ? 0 : Math.max(0, n)
        }

        const mon = parseHours(mapped.mon)
        const tue = parseHours(mapped.tue)
        const wed = parseHours(mapped.wed)
        const thu = parseHours(mapped.thu)
        const fri = parseHours(mapped.fri)
        const sat = parseHours(mapped.sat)
        const sun = parseHours(mapped.sun)
        const totalHours = mon + tue + wed + thu + fri + sat + sun

        // Validate employee
        let employee = employeeByEmail.get(emailOrId.toLowerCase()) ||
                       employeeById.get(emailOrId.toLowerCase())
        if (!employee && emailOrId) {
          // Try partial match
          employee = (employees || []).find(e =>
            e.email?.toLowerCase() === emailOrId.toLowerCase() ||
            e.employee_id?.toLowerCase() === emailOrId.toLowerCase()
          )
        }
        if (!emailOrId) {
          errors.push('Missing employee email/ID')
        } else if (!employee) {
          errors.push(`Unknown employee: ${emailOrId}`)
        }

        // Validate week ending date
        let parsedWeekEnding = ''
        if (!weekEnding) {
          errors.push('Missing week ending date')
        } else {
          // Try to parse the date
          const d = new Date(weekEnding)
          if (isNaN(d.getTime())) {
            errors.push(`Invalid date: ${weekEnding}`)
          } else {
            parsedWeekEnding = d.toISOString().split('T')[0]
          }
        }

        // Validate project
        let project = projectByCode.get(projectCode.toLowerCase())
        if (!projectCode) {
          errors.push('Missing project code')
        } else if (!project) {
          errors.push(`Unknown project: ${projectCode}`)
        }

        // Validate hours
        if (totalHours <= 0) {
          errors.push('No hours entered')
        }
        if (totalHours > 168) {
          errors.push('Hours exceed 168 (24x7)')
        }

        return {
          rowIndex: index + 2, // 1-indexed + header row
          employeeEmail: emailOrId,
          weekEnding: parsedWeekEnding || weekEnding,
          projectCode,
          mon, tue, wed, thu, fri, sat, sun,
          totalHours,
          employeeId: employee?.id,
          employeeName: employee ? `${employee.first_name} ${employee.last_name}` : undefined,
          projectId: project?.id,
          projectName: project?.name,
          errors,
          status: errors.length > 0 ? 'error' : 'valid',
        }
      })

      setParsedRows(rows)
    } catch (error: any) {
      console.error('Parse error:', error)
      toast('error', 'Failed to parse file. Please check the format.')
    } finally {
      setParsing(false)
    }
  }, [supabase, toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) parseFile(droppedFile)
  }, [parseFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) parseFile(selected)
  }

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.status === 'valid')
    if (validRows.length === 0) {
      toast('error', 'No valid rows to import.')
      return
    }

    setImporting(true)
    let imported = 0
    let errors = 0

    // Group rows by employee + week to create/find timesheets
    const timesheetKey = (r: ParsedRow) => `${r.employeeId}_${r.weekEnding}`
    const grouped = new Map<string, ParsedRow[]>()
    validRows.forEach(row => {
      const key = timesheetKey(row)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(row)
    })

    for (const [, rows] of grouped) {
      const firstRow = rows[0]
      try {
        // Find or create timesheet
        let { data: existingTs } = await supabase
          .from('timesheets')
          .select('id')
          .eq('employee_id', firstRow.employeeId!)
          .eq('week_ending', firstRow.weekEnding)
          .single()

        let timesheetId: string

        if (existingTs) {
          timesheetId = existingTs.id
        } else {
          // Calculate total hours across all rows for this employee+week
          const totalHours = rows.reduce((sum, r) => sum + r.totalHours, 0)
          const overtimeHours = Math.max(0, totalHours - 40)

          const { data: newTs, error: tsError } = await supabase
            .from('timesheets')
            .insert({
              employee_id: firstRow.employeeId!,
              week_ending: firstRow.weekEnding,
              total_hours: totalHours,
              overtime_hours: overtimeHours,
              status: 'draft',
            })
            .select('id')
            .single()

          if (tsError || !newTs) {
            console.error('Error creating timesheet:', tsError)
            rows.forEach(r => { r.status = 'error'; r.errors.push('Failed to create timesheet') })
            errors += rows.length
            continue
          }
          timesheetId = newTs.id
        }

        // Create entries for each row (each row is one project for the week)
        for (const row of rows) {
          // Calculate the dates for each day of the week
          const weekEnd = new Date(row.weekEnding + 'T00:00:00')
          const dayHours = [
            { offset: -6, hours: row.mon },
            { offset: -5, hours: row.tue },
            { offset: -4, hours: row.wed },
            { offset: -3, hours: row.thu },
            { offset: -2, hours: row.fri },
            { offset: -1, hours: row.sat },
            { offset: 0, hours: row.sun },
          ]

          for (const day of dayHours) {
            if (day.hours <= 0) continue

            const date = new Date(weekEnd)
            date.setDate(weekEnd.getDate() + day.offset)
            const dateStr = date.toISOString().split('T')[0]

            const { error: entryError } = await supabase
              .from('timesheet_entries')
              .insert({
                timesheet_id: timesheetId,
                project_id: row.projectId!,
                date: dateStr,
                hours: day.hours,
                description: `Imported from CSV`,
              })

            if (entryError) {
              console.error('Error creating entry:', entryError)
              row.status = 'error'
              row.errors.push(`Failed to create entry for ${dateStr}`)
              errors++
              continue
            }
          }

          if (row.status !== 'error') {
            row.status = 'imported'
            imported++
          }
        }

        // Update timesheet total hours if we used an existing one
        if (existingTs) {
          const totalHours = rows.reduce((sum, r) => sum + r.totalHours, 0)
          // Fetch current total and add
          const { data: currentTs } = await supabase
            .from('timesheets')
            .select('total_hours')
            .eq('id', timesheetId)
            .single()

          const newTotal = (currentTs?.total_hours || 0) + totalHours
          await supabase
            .from('timesheets')
            .update({
              total_hours: newTotal,
              overtime_hours: Math.max(0, newTotal - 40),
            })
            .eq('id', timesheetId)
        }
      } catch (err: any) {
        console.error('Import error:', err)
        rows.forEach(r => {
          if (r.status !== 'imported') {
            r.status = 'error'
            r.errors.push(err?.message || 'Unknown error')
            errors++
          }
        })
      }
    }

    setParsedRows([...parsedRows])
    setImportResults({ imported, errors })
    setImporting(false)
    toast(errors === 0 ? 'success' : 'error', `Imported ${imported} row(s), ${errors} error(s).`)
  }

  const downloadTemplate = () => {
    const headers = ['Employee Email', 'Week Ending', 'Project Code', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const sampleRow = ['john@westendworkforce.com', '2026-04-05', 'PROJ-001', '8', '8', '8', '8', '8', '0', '0']
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'timesheet_import_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const validCount = parsedRows.filter(r => r.status === 'valid').length
  const errorCount = parsedRows.filter(r => r.status === 'error').length
  const importedCount = parsedRows.filter(r => r.status === 'imported').length

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => router.push('/admin/timesheets')}
          className="transition-colors duration-150"
          style={{ padding: 8, color: '#999', border: '0.5px solid #e0dcd7', borderRadius: 7, background: '#fff' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.color = '#555' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; e.currentTarget.style.color = '#999' }}
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>Import Timesheets</h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#999' }}>Upload a CSV or Excel file to bulk-import timesheet data</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="anim-slide-up stagger-1" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '28px 24px', marginBottom: 24 }}>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          style={{
            border: `2px dashed ${dragOver ? '#d3ad6b' : '#e8e4df'}`,
            borderRadius: 10,
            padding: '40px 24px',
            textAlign: 'center',
            transition: 'border-color 0.15s ease, background 0.15s ease',
            background: dragOver ? 'rgba(211,173,107,0.04)' : 'transparent',
            cursor: 'pointer',
          }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload style={{ width: 32, height: 32, color: '#c0bab2', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>
            {file ? file.name : 'Drop CSV or Excel file here, or click to browse'}
          </p>
          <p style={{ fontSize: 11, color: '#c0bab2' }}>
            Expected columns: Employee Email, Week Ending, Project Code, Mon, Tue, Wed, Thu, Fri, Sat, Sun
          </p>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 transition-colors"
            style={{ padding: '8px 16px', fontSize: 12, fontWeight: 500, color: '#777', background: '#fff', border: '0.5px solid #e0dcd7', borderRadius: 7 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d3ad6b' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7' }}
          >
            <Download className="h-4 w-4" />
            Download Template
          </button>

          {parsing && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#e31c79]" />
              <span style={{ fontSize: 12, color: '#999' }}>Parsing file...</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview / Results */}
      {parsedRows.length > 0 && (
        <>
          {/* Summary Bar */}
          <div className="anim-slide-up stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '16px 22px', marginBottom: 16 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <span style={{ fontSize: 12, color: '#1a1a1a', fontWeight: 600 }}>
                  {parsedRows.length} row{parsedRows.length !== 1 ? 's' : ''} parsed
                </span>
                {validCount > 0 && (
                  <span className="flex items-center gap-1" style={{ fontSize: 12, color: '#2d9b6e' }}>
                    <CheckCircle className="h-3.5 w-3.5" /> {validCount} ready
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="flex items-center gap-1" style={{ fontSize: 12, color: '#b91c1c' }}>
                    <AlertCircle className="h-3.5 w-3.5" /> {errorCount} error{errorCount !== 1 ? 's' : ''}
                  </span>
                )}
                {importedCount > 0 && (
                  <span className="flex items-center gap-1" style={{ fontSize: 12, color: '#2d9b6e', fontWeight: 600 }}>
                    <CheckCircle className="h-3.5 w-3.5" /> {importedCount} imported
                  </span>
                )}
              </div>

              {!importResults && validCount > 0 && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ padding: '8px 20px', background: '#e31c79', color: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
                  onMouseEnter={(e) => { if (!importing) { e.currentTarget.style.background = '#cc1069'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      Import {validCount} Row{validCount !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Import Results */}
          {importResults && (
            <div className="anim-slide-up" style={{
              background: importResults.errors === 0 ? 'rgba(45,155,110,0.06)' : 'rgba(185,28,28,0.06)',
              border: `0.5px solid ${importResults.errors === 0 ? 'rgba(45,155,110,0.2)' : 'rgba(185,28,28,0.2)'}`,
              borderRadius: 10,
              padding: '16px 22px',
              marginBottom: 16,
            }}>
              <div className="flex items-center gap-3">
                {importResults.errors === 0 ? (
                  <CheckCircle className="h-5 w-5" style={{ color: '#2d9b6e' }} />
                ) : (
                  <AlertCircle className="h-5 w-5" style={{ color: '#b91c1c' }} />
                )}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                    Import Complete
                  </p>
                  <p style={{ fontSize: 12, color: '#555' }}>
                    {importResults.imported} row{importResults.imported !== 1 ? 's' : ''} imported successfully
                    {importResults.errors > 0 && `, ${importResults.errors} error${importResults.errors !== 1 ? 's' : ''}`}.
                    All imported timesheets are saved as drafts for review.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="anim-slide-up stagger-3" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Row', 'Employee', 'Week Ending', 'Project', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total', 'Status'].map(h => (
                      <th
                        key={h}
                        className="text-left whitespace-nowrap"
                        style={{
                          padding: '11px 14px',
                          fontSize: 9,
                          fontWeight: 500,
                          letterSpacing: 1.2,
                          color: '#c0bab2',
                          textTransform: 'uppercase',
                          borderBottom: '0.5px solid #f0ece7',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => {
                    const rowBg = row.status === 'error'
                      ? 'rgba(185,28,28,0.03)'
                      : row.status === 'imported'
                        ? 'rgba(45,155,110,0.03)'
                        : 'transparent'

                    return (
                      <tr
                        key={row.rowIndex}
                        style={{ background: rowBg, borderBottom: '0.5px solid #f5f2ee' }}
                      >
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#999' }}>{row.rowIndex}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                            {row.employeeName || row.employeeEmail}
                          </div>
                          {row.employeeName && (
                            <div style={{ fontSize: 10.5, color: '#c0bab2' }}>{row.employeeEmail}</div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12.5, color: '#555' }}>{row.weekEnding}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontSize: 12.5, color: '#555' }}>
                            {row.projectName || row.projectCode}
                          </div>
                          {row.projectName && (
                            <div style={{ fontSize: 10.5, color: '#c0bab2' }}>{row.projectCode}</div>
                          )}
                        </td>
                        {[row.mon, row.tue, row.wed, row.thu, row.fri, row.sat, row.sun].map((h, i) => (
                          <td key={i} style={{ padding: '10px 14px', fontSize: 12, color: h > 0 ? '#555' : '#ddd', textAlign: 'center' }}>
                            {h > 0 ? h : '-'}
                          </td>
                        ))}
                        <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, color: '#1a1a1a', textAlign: 'center' }}>
                          {row.totalHours}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {row.status === 'error' ? (
                            <div>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 9, fontWeight: 500, borderRadius: 3, padding: '2px 8px',
                                background: 'rgba(185,28,28,0.08)', color: '#b91c1c',
                              }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#b91c1c' }} />
                                Error
                              </span>
                              <div style={{ fontSize: 10, color: '#b91c1c', marginTop: 4 }}>
                                {row.errors.join('; ')}
                              </div>
                            </div>
                          ) : row.status === 'imported' ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 9, fontWeight: 500, borderRadius: 3, padding: '2px 8px',
                              background: 'rgba(45,155,110,0.08)', color: '#2d9b6e',
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2d9b6e' }} />
                              Imported
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 9, fontWeight: 500, borderRadius: 3, padding: '2px 8px',
                              background: 'rgba(45,155,110,0.08)', color: '#2d9b6e',
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2d9b6e' }} />
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

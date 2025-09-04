'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Download, FileText, Users, AlertCircle, CheckCircle, X } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import * as XLSX from 'xlsx';

interface EmployeeData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  rowNumber: number;
}

interface ProcessedEmployee {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  hourlyRate: number;
  startDate: string;
  status: string;
  timeApprover: string;
  address: string;
  workLocation: string;
  state: string;
  city: string;
  zipCode: string;
  initials: string;
  originalRow: EmployeeData;
}

interface PreviewData {
  headers: string[];
  employees: EmployeeData[];
  totalRows: number;
}

interface ImportResults {
  successful: ProcessedEmployee[];
  failed: { employee: EmployeeData; error: string }[];
  skipped: { employee: EmployeeData; reason: string }[];
}

export default function EmployeeImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
      setErrors(['Please select an Excel (.xlsx, .xls) or CSV file']);
      return;
    }

    setFile(selectedFile);
    setErrors([]);

    // Preview the data
    try {
      const preview = await parseExcelFile(selectedFile, true); // Preview mode
      
      // For West End Workers report, preview from row 7 onwards
      const employeePreview = preview.employees.slice(0, 5); // Show first 5 employee records
      setPreviewData({
        ...preview,
        employees: employeePreview,
        totalRows: preview.totalRows
      });
    } catch (error) {
      setErrors(['Error reading file: ' + (error as Error).message]);
    }
  };

  const parseExcelFile = async (file: File, previewOnly = false): Promise<PreviewData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          if (!e.target?.result) {
            reject(new Error('Failed to read file content'));
            return;
          }
          
          const data = new Uint8Array(e.target.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
          
          if (jsonData.length < 8) {
            reject(new Error('File must contain at least 8 rows (including header at row 7)'));
            return;
          }

          // West End Workers format: headers are at row 7 (index 6)
          const rawHeaders = jsonData[6];
          // Clean up header names by removing newlines and extra spaces
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const headers = rawHeaders.map((header: any) => 
            header ? header.toString().replace(/\n\s*/g, ' ').trim() : ''
          );
          
          const rows = previewOnly ? jsonData.slice(7, 12) : jsonData.slice(7); // Data starts at row 8
          
          const employees = rows.map((row, index) => {
            const employee: EmployeeData = {
              rowNumber: index + 8 // Excel row number (starting from row 8)
            };
            headers.forEach((header, colIndex) => {
              if (header) {
                employee[header] = row[colIndex] || '';
              }
            });
            return employee;
          });

          resolve({
            headers,
            employees,
            totalRows: jsonData.length - 7
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setErrors([]);

    try {
      const data = await parseExcelFile(file, false);
      const results = await processEmployeeData(data.employees);
      setImportResults(results);
    } catch (error) {
      setErrors(['Import failed: ' + (error as Error).message]);
    } finally {
      setImporting(false);
    }
  };

  const processEmployeeData = async (employees: EmployeeData[]): Promise<ImportResults> => {
    const results: ImportResults = {
      successful: [],
      failed: [],
      skipped: []
    };

    for (const employee of employees) {
      try {
        const processedEmployee = mapEmployeeData(employee);
        
        // Validate required fields
        const validation = validateEmployee(processedEmployee);
        if (!validation.valid) {
          results.failed.push({
            employee,
            error: validation.errors.join(', ')
          });
          continue;
        }

        // Check if employee already exists
        if (await employeeExists(processedEmployee.email)) {
          results.skipped.push({
            employee,
            reason: 'Employee with this email already exists'
          });
          continue;
        }

        // Save employee (in real implementation, this would call your API)
        await saveEmployee(processedEmployee);
        results.successful.push(processedEmployee);

      } catch (error) {
        results.failed.push({
          employee,
          error: (error as Error).message
        });
      }
    }

    return results;
  };

  const mapEmployeeData = (rowData: EmployeeData): ProcessedEmployee => {
    // Debug logging to see what columns are available
    
    // Map West End Workers Excel columns to employee fields
    const firstName = rowData['First Name'] || '';
    const lastName = rowData['Last Name'] || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Extract department from Customer Full Path (cleaned header name)
    const customerPath = rowData['Default Customer Full Path'] || '';
    const department = extractDepartment(customerPath);
    
    
    return {
      id: rowData['Employee Id'] || generateEmployeeId(),
      name: fullName,
      firstName: firstName,
      lastName: lastName,
      email: rowData['Primary Email'] || '',
      phone: rowData['Home Phone'] || '',
      department: department,
      jobTitle: mapJobTitle(department), // Auto-assign job title based on department
      hourlyRate: 75, // Default rate - can be customized later
      startDate: formatDate(rowData['Date Started']),
      status: mapEmployeeStatus(rowData['Employee Status']),
      timeApprover: mapTimeApprover(department),
      address: formatAddress(rowData),
      workLocation: rowData['Work Location'] || '',
      state: rowData['Home State'] || '',
      city: rowData['City'] || '',
      zipCode: rowData['Postal/Zip Code'] || '',
      initials: generateInitials(fullName),
      originalRow: rowData
    };
  };

  const extractDepartment = (customerPath: string): string => {
    if (customerPath.includes('Department of Health')) return 'Health Services';
    if (customerPath.includes('Department of Commerce')) return 'Commerce';
    if (customerPath.includes('Chickasaw Nation')) return 'Chickasaw Nation';
    return 'General';
  };

  const mapJobTitle = (department: string): string => {
    const jobTitles: { [key: string]: string } = {
      'Health Services': 'Health Services Specialist',
      'Commerce': 'Commerce Specialist', 
      'Chickasaw Nation': 'Tribal Services Coordinator',
      'General': 'Administrative Specialist'
    };
    return jobTitles[department] || 'General Employee';
  };

  const mapEmployeeStatus = (status: string): string => {
    return status === 'Employee' ? 'active' : 'inactive';
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return new Date().toISOString().split('T')[0];
    
    try {
      const date = new Date(dateValue);
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const formatAddress = (rowData: EmployeeData): string => {
    const address1 = rowData['Address 1'] || '';
    const address2 = rowData['Address 2'] || '';
    const city = rowData['City'] || '';
    const state = rowData['Home State'] || '';
    const zip = rowData['Postal/Zip Code'] || '';
    
    const parts = [address1, address2, city, state, zip].filter(part => part && part.trim());
    return parts.join(', ');
  };

  const mapTimeApprover = (department: string): string => {
    // Map departments to time approvers
    const approverMap: { [key: string]: string } = {
      'Health Services': 'manager-demo',      // Jane Doe
      'Commerce': 'manager2-demo',            // Tom Wilson  
      'Chickasaw Nation': 'manager3-demo',    // Lisa Chen
      'General': 'manager-demo'               // Default to Jane Doe
    };
    
    return approverMap[department] || 'manager-demo'; // Default to Jane Doe
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateEmployee = (employee: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!employee.name || employee.name.trim().length < 2) {
      errors.push('Name is required');
    }
    
    if (!employee.email || !employee.email.includes('@')) {
      errors.push('Valid email is required');
    }
    
    if (!employee.department) {
      errors.push('Department is required');
    }
    
    if (!employee.jobTitle) {
      errors.push('Job title is required');
    }
    
    if (!employee.hourlyRate || employee.hourlyRate <= 0) {
      errors.push('Valid hourly rate is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  const generateEmployeeId = (): string => {
    return 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const generateInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substr(0, 2);
  };

  const employeeExists = async (email: string): Promise<boolean> => {
    // In real implementation, check against database
    // For now, return false
    return false;
  };

  const saveEmployee = async (employee: ProcessedEmployee): Promise<void> => {
    // In real implementation, save to database via API
    // await fetch('/api/employees', { method: 'POST', body: JSON.stringify(employee) });
  };

  const downloadTemplate = () => {
    const template = [
      ['Employee Id', 'Primary Email', 'First Name', 'Last Name', 'Employee Status', 'Date Started', 'Default Customer Full Path', 'Default Member Full Path', 'Home Phone', 'Work Location', 'Address 1', 'City', 'Home State', 'Postal/Zip Code'],
      ['WK24030000001', 'john.smith@company.com', 'John', 'Smith', 'Employee', '2024-01-15', 'Chickasaw Nation, Department of Health', 'West End Solutions Group Inc.', '(555) 123-4567', '1921 Stonecipher Blvd, Ada, Oklahoma', '123 Main St', 'Ada', 'OK', '74820'],
      ['WK24030000002', 'jane.wilson@company.com', 'Jane', 'Wilson', 'Employee', '2024-02-01', 'Chickasaw Nation, Department of Commerce', 'West End Solutions Group Inc.', '(555) 234-5678', '1009 N. Country Club Rd., Ada, Oklahoma', '456 Oak Ave', 'Oklahoma City', 'OK', '73131']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Template');
    XLSX.writeFile(workbook, 'employee_import_template.xlsx');
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/admin/employees')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <X className="w-5 h-5 mr-1" />
                Back to Employees
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Import Employees</h1>
                <p className="text-gray-600">Bulk import employee data from Excel or CSV files</p>
              </div>
            </div>
            <button 
              onClick={downloadTemplate}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Template</span>
            </button>
          </div>
        </div>

        <div className="px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Upload Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Employee Data</h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-pink-400 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="mb-4">
                  <label className="cursor-pointer">
                    <span className="text-lg font-medium text-gray-900">Choose file to upload</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="text-gray-500 mt-1">Supports Excel (.xlsx, .xls) and CSV files</p>
                </div>
                
                {file && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-sm mx-auto">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-blue-800">{file.name}</span>
                    </div>
                  </div>
                )}
              </div>

              {errors.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800">Errors:</span>
                  </div>
                  <ul className="list-disc list-inside text-red-700 text-sm">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Preview Section */}
            {previewData && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Preview</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {previewData.headers.map((header, index) => (
                          <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.employees.map((employee, index) => (
                        <tr key={index}>
                          {previewData.headers.map((header, colIndex) => (
                            <td key={colIndex} className="px-4 py-2 text-sm text-gray-900">
                              {employee[header]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Showing first 5 rows of {previewData.totalRows} total rows
                </p>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className={`px-6 py-2 rounded-lg font-medium ${
                      importing
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-pink-600 text-white hover:bg-pink-700'
                    }`}
                  >
                    {importing ? 'Importing...' : `Import ${previewData.totalRows} Employees`}
                  </button>
                </div>
              </div>
            )}

            {/* Results Section */}
            {importResults && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Import Results</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">Successful</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900 mt-2">
                      {importResults.successful.length}
                    </p>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-red-800">Failed</span>
                    </div>
                    <p className="text-2xl font-bold text-red-900 mt-2">
                      {importResults.failed.length}
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Skipped</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-900 mt-2">
                      {importResults.skipped.length}
                    </p>
                  </div>
                </div>

                {/* Error Details */}
                {importResults.failed.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-red-800 mb-2">Failed Imports:</h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                      {importResults.failed.map((item, index) => (
                        <div key={index} className="text-sm text-red-700 mb-2">
                          <strong>Row {item.employee.rowNumber}:</strong> {item.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => router.push('/admin/employees')}
                    className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                  >
                    View Imported Employees
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
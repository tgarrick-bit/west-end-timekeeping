'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle, XCircle, Database, RefreshCw } from 'lucide-react'

export default function DatabaseTest() {
  const [testResults, setTestResults] = useState<{
    connection: boolean
    tables: boolean
    insert: boolean
    select: boolean
    update: boolean
    delete: boolean
    errors: string[]
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const runDatabaseTests = async () => {
    setLoading(true)
    setTestResults(null)
    
    const results = {
      connection: false,
      tables: false,
      insert: false,
      select: false,
      update: false,
      delete: false,
      errors: [] as string[]
    }

    try {
      // Test 1: Basic connection
      const { data: connectionData, error: connectionError } = await supabase
        .from('clients')
        .select('count')
        .limit(1)
      
      if (connectionError) {
        results.errors.push(`Connection failed: ${connectionError.message}`)
        console.error('❌ Connection test failed:', connectionError)
      } else {
        results.connection = true
      }

      // Test 2: Check if tables exist
      const { data: tableData, error: tableError } = await supabase
        .from('clients')
        .select('*')
        .limit(1)
      
      if (tableError) {
        results.errors.push(`Table access failed: ${tableError.message}`)
        console.error('❌ Table test failed:', tableError)
      } else {
        results.tables = true
      }

      // Test 3: Test insert operation
      const testClient = {
        name: `Test Client ${Date.now()}`,
        contact_person: 'Test Person',
        contact_email: `test${Date.now()}@example.com`,
        contact_phone: '+1-555-0000',
        time_tracking_method: 'simple' as const,
        is_active: true
      }

      const { data: insertData, error: insertError } = await supabase
        .from('clients')
        .insert([testClient])
        .select()

      if (insertError) {
        results.errors.push(`Insert failed: ${insertError.message}`)
        console.error('❌ Insert test failed:', insertError)
      } else {
        results.insert = true
        
        // Test 4: Test select operation
        const { data: selectData, error: selectError } = await supabase
          .from('clients')
          .select('*')
          .eq('name', testClient.name)
          .single()

        if (selectError) {
          results.errors.push(`Select failed: ${selectError.message}`)
          console.error('❌ Select test failed:', selectError)
        } else {
          results.select = true
        }

        // Test 5: Test update operation
        const { error: updateError } = await supabase
          .from('clients')
          .update({ contact_person: 'Updated Test Person' })
          .eq('name', testClient.name)

        if (updateError) {
          results.errors.push(`Update failed: ${updateError.message}`)
          console.error('❌ Update test failed:', updateError)
        } else {
          results.update = true
        }

        // Test 6: Test delete operation
        const { error: deleteError } = await supabase
          .from('clients')
          .delete()
          .eq('name', testClient.name)

        if (deleteError) {
          results.errors.push(`Delete failed: ${deleteError.message}`)
          console.error('❌ Delete test failed:', deleteError)
        } else {
          results.delete = true
        }
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      results.errors.push(`Unexpected error: ${errorMessage}`)
      console.error('❌ Unexpected error during tests:', error)
    }

    setTestResults(results)
    setLoading(false)
  }

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    )
  }

  const getStatusText = (status: boolean) => {
    return status ? 'Passed' : 'Failed'
  }

  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Database className="h-6 w-6 text-[#e31c79]" />
          <h3 className="text-lg font-semibold text-[#232020]">Database Connection Test</h3>
        </div>
        <button
          onClick={runDatabaseTests}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-[#e31c79] text-white rounded-lg hover:bg-[#d4156a] transition-colors disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Running Tests...' : 'Run Tests'}
        </button>
      </div>

      {testResults && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(testResults.connection)}
              <span className={`font-medium ${getStatusColor(testResults.connection)}`}>
                Connection: {getStatusText(testResults.connection)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(testResults.tables)}
              <span className={`font-medium ${getStatusColor(testResults.tables)}`}>
                Tables: {getStatusText(testResults.tables)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(testResults.insert)}
              <span className={`font-medium ${getStatusColor(testResults.insert)}`}>
                Insert: {getStatusText(testResults.insert)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(testResults.select)}
              <span className={`font-medium ${getStatusColor(testResults.select)}`}>
                Select: {getStatusText(testResults.select)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(testResults.update)}
              <span className={`font-medium ${getStatusColor(testResults.update)}`}>
                Update: {getStatusText(testResults.update)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(testResults.delete)}
              <span className={`font-medium ${getStatusColor(testResults.delete)}`}>
                Delete: {getStatusText(testResults.delete)}
              </span>
            </div>
          </div>

          {testResults.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Errors Found:</h4>
              <ul className="space-y-1">
                {testResults.errors.map((error: string, index: number) => (
                  <li key={index} className="text-sm text-red-700">• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p><strong>Environment Variables:</strong></p>
            <p>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
          </div>
        </div>
      )}

      {!testResults && !loading && (
        <div className="text-center text-gray-500 py-8">
          <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Click &quot;Run Tests&quot; to check your database connection</p>
        </div>
      )}
    </div>
  )
}

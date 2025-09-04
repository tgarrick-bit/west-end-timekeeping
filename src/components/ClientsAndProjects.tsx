'use client'

import { useState } from 'react'
import { Building2, FolderOpen, Users, Plus } from 'lucide-react'
import ClientManagement from './ClientManagement'
import ProjectManagement from './ProjectManagement'
import ProjectAssignments from './ProjectAssignments'

export default function ClientsAndProjects() {
  const [activeTab, setActiveTab] = useState<'clients' | 'projects' | 'assignments'>('clients')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#232020]">Clients & Projects</h2>
          <p className="text-[#465079]">Manage your client relationships and project portfolio</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'clients'
                ? 'bg-[#e31c79] text-white'
                : 'bg-gray-100 text-[#465079] hover:bg-gray-200'
            }`}
          >
            <Building2 className="h-4 w-4 mr-2 inline" />
            Clients
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'projects'
                ? 'bg-[#e31c79] text-white'
                : 'bg-gray-100 text-[#465079] hover:bg-gray-200'
            }`}
          >
            <FolderOpen className="h-4 w-4 mr-2 inline" />
            Projects
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'assignments'
                ? 'bg-[#e31c79] text-white'
                : 'bg-gray-100 text-[#465079] hover:bg-gray-200'
            }`}
          >
            <Users className="h-4 w-4 mr-2 inline" />
            Assignments
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activeTab === 'clients' && (
          <div className="p-6">
            <ClientManagement />
          </div>
        )}
        {activeTab === 'projects' && (
          <div className="p-6">
            <ProjectManagement />
          </div>
        )}
        {activeTab === 'assignments' && (
          <div className="p-6">
            <ProjectAssignments />
          </div>
        )}
      </div>
    </div>
  )
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, Clock, DollarSign, ArrowLeft, Calendar, Users, TrendingUp, CheckCircle } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface Project {
  id: string;
  name: string;
  client: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold';
  startDate: string;
  endDate?: string;
  totalHours: number;
  totalExpenses: number;
  progress: number;
  teamMembers: string[];
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: 'Metro Hospital',
      client: 'Metro Health Systems',
      description: 'Complete IT infrastructure overhaul including network upgrades, server migration, and security enhancements.',
      status: 'active',
      startDate: '2024-01-15',
      totalHours: 320,
      totalExpenses: 2800,
      progress: 75,
      teamMembers: ['Mike Chen', 'Sarah Johnson', 'David Thompson']
    },
    {
      id: '2',
      name: 'Downtown Office',
      client: 'Downtown Development Corp',
      description: 'Office renovation and technology upgrade project for the new downtown headquarters.',
      status: 'active',
      startDate: '2024-02-01',
      totalHours: 280,
      totalExpenses: 2100,
      progress: 60,
      teamMembers: ['Sarah Johnson', 'Lisa Rodriguez']
    },
    {
      id: '3',
      name: 'City Schools',
      client: 'Calgary School District',
      description: 'Educational technology implementation across 15 school locations.',
      status: 'active',
      startDate: '2024-01-20',
      totalHours: 240,
      totalExpenses: 1800,
      progress: 45,
      teamMembers: ['Mike Chen', 'David Thompson']
    },
    {
      id: '4',
      name: 'Riverside Manufacturing',
      client: 'Riverside Industries',
      description: 'Manufacturing automation and process improvement project.',
      status: 'on-hold',
      startDate: '2024-03-01',
      totalHours: 120,
      totalExpenses: 900,
      progress: 30,
      teamMembers: ['Lisa Rodriguez', 'Mike Chen']
    }
  ]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      'on-hold': { color: 'bg-yellow-100 text-yellow-800', icon: Clock }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-600';
    if (progress >= 60) return 'bg-blue-600';
    if (progress >= 40) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const activeProjects = projects.filter(p => p.status === 'active');
  const totalHours = projects.reduce((sum, p) => sum + p.totalHours, 0);
  const totalExpenses = projects.reduce((sum, p) => sum + p.totalExpenses, 0);

  return (
    <ProtectedRoute allowedRoles={['employee']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back to Dashboard
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
                <p className="text-gray-600">View your assigned projects and track progress</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Active Projects</p>
                <p className="text-lg font-bold text-blue-600">{activeProjects.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Hours</p>
                <p className="text-lg font-bold text-green-600">{totalHours}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Projects</p>
                    <p className="text-2xl font-bold text-gray-900">{activeProjects.length}</p>
                    <p className="text-xs text-gray-500">Currently working on</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Hours</p>
                    <p className="text-2xl font-bold text-gray-900">{totalHours}</p>
                    <p className="text-xs text-gray-500">This year</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">${totalExpenses.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">This year</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Project Header */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                        <p className="text-sm text-gray-600">{project.client}</p>
                      </div>
                      {getStatusBadge(project.status)}
                    </div>
                  </div>
                  
                  {/* Project Content */}
                  <div className="p-6">
                    <p className="text-gray-700 mb-4">{project.description}</p>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-600">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getProgressColor(project.progress)}`}
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Project Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Started: {project.startDate}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{project.totalHours} hours</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">${project.totalExpenses.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{project.teamMembers.length} members</span>
                      </div>
                    </div>
                    
                    {/* Team Members */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Team Members</h4>
                      <div className="flex flex-wrap gap-2">
                        {project.teamMembers.map((member) => (
                          <span 
                            key={member}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {member}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Project Actions */}
                    <div className="flex space-x-3">
                      <button className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        View Details
                      </button>
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                        Timesheet
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Project Analytics */}
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Project Analytics</h2>
                <p className="text-sm text-gray-600">Overview of your project performance</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Hours by Project */}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-blue-600" />
                      Hours by Project
                    </h3>
                    <div className="space-y-3">
                      {projects.slice(0, 4).map((project) => (
                        <div key={project.id} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 truncate max-w-24">{project.name}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${(project.totalHours / 400) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-12 text-right">
                              {project.totalHours}h
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Progress Overview */}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                      Progress Overview
                    </h3>
                    <div className="space-y-3">
                      {projects.slice(0, 4).map((project) => (
                        <div key={project.id} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 truncate max-w-24">{project.name}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${getProgressColor(project.progress)}`}
                                style={{ width: `${project.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-12 text-right">
                              {project.progress}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Status Distribution */}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                      <Building className="h-4 w-4 mr-2 text-purple-600" />
                      Status Distribution
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Active</span>
                        <span className="text-sm font-medium text-gray-900">
                          {projects.filter(p => p.status === 'active').length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">On Hold</span>
                        <span className="text-sm font-medium text-gray-900">
                          {projects.filter(p => p.status === 'on-hold').length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Completed</span>
                        <span className="text-sm font-medium text-gray-900">
                          {projects.filter(p => p.status === 'completed').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}









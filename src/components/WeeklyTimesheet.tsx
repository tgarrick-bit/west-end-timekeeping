'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';

interface TimeEntry {
  id: string;
  day: string;
  project: string;
  hours: number;
  description: string;
}

interface Project {
  id: string;
  name: string;
}

export default function WeeklyTimesheet() {
  const { notifyTimesheetSubmitted } = useNotifications();
  const { appUser } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    day: '',
    project: '',
    hours: '',
    description: ''
  });

  // Simple project data
  const projects: Project[] = [
    { id: 'metro', name: 'Metro Hospital' },
    { id: 'downtown', name: 'Downtown Office' },
    { id: 'cityschools', name: 'City Schools' },
    { id: 'riverside', name: 'Riverside Manufacturing' }
  ];

  // Get week dates with offset
  const getWeekDates = (weekOffset: number = 0) => {
    const today = new Date();
    const monday = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    monday.setDate(diff + (weekOffset * 7));
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const weekDates = getWeekDates(currentWeekOffset);

  const handleAddTimeEntry = (day?: string) => {
    setFormData({
      day: day || weekDates[0].toISOString().split('T')[0],
      project: '',
      hours: '',
      description: ''
    });
    setShowModal(true);
  };

  const handleSaveEntry = () => {
    if (!formData.day || !formData.project || !formData.hours) {
      alert('Please fill in all required fields');
      return;
    }

    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      day: formData.day,
      project: formData.project,
      hours: parseFloat(formData.hours),
      description: formData.description
    };

    setTimeEntries(prev => [...prev, newEntry]);
    setShowModal(false);
    setFormData({ day: '', project: '', hours: '', description: '' });
  };

  const handleCancel = () => {
    setShowModal(false);
    setFormData({ day: '', project: '', hours: '', description: '' });
  };

  const handlePreviousWeek = () => {
    setCurrentWeekOffset(prev => prev - 1);
  };

  const handleNextWeek = () => {
    setCurrentWeekOffset(prev => prev + 1);
  };

  const handleGoToToday = () => {
    setCurrentWeekOffset(0);
  };

  const handleSubmitTimesheet = async () => {
    if (timeEntries.length === 0) {
      alert('Please add at least one time entry before submitting');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Notify manager about timesheet submission
    if (appUser?.manager_id) {
      const weekStart = weekDates[0].toISOString().split('T')[0];
      const weekEnd = weekDates[6].toISOString().split('T')[0];
      const totalHours = getWeekTotal();
      notifyTimesheetSubmitted(
        appUser.manager_id,
        `${appUser.first_name} ${appUser.last_name}` || 'Employee',
        `${weekStart} - ${weekEnd}`
      );
    }
    
    setIsSubmitted(true);
    setIsSubmitting(false);
    
    // Reset after 3 seconds
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  const getEntriesForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return timeEntries.filter(entry => entry.day === dateStr);
  };

  const getDayTotal = (date: Date) => {
    const entries = getEntriesForDay(date);
    return entries.reduce((sum, entry) => sum + entry.hours, 0);
  };

  const getWeekTotal = () => {
    return timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : projectId;
  };

  const isCurrentWeek = currentWeekOffset === 0;
  const weekStartDate = weekDates[0];
  const weekEndDate = weekDates[6];

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header with Week Navigation */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Weekly Timesheet</h1>
        
        {/* Week Navigation */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <button
            onClick={handlePreviousWeek}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-pink-600" />
            <span className="text-lg font-semibold text-gray-900">
              {weekStartDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric' 
              })} - {weekEndDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>
          </div>
          
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Next Week"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        
        {/* Go to Today Button */}
        {!isCurrentWeek && (
          <button
            onClick={handleGoToToday}
            className="inline-flex items-center px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-md hover:bg-pink-700 transition-colors"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Go to Today
          </button>
        )}
      </div>

      {/* Add Time Entry Button */}
      <div className="text-center mb-8">
        <button
          onClick={() => handleAddTimeEntry()}
          className="bg-pink-600 hover:bg-pink-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          + Add Time Entry
        </button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-4 mb-8">
        {weekDates.map((date, index) => {
          const dayEntries = getEntriesForDay(date);
          const dayTotal = getDayTotal(date);
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <div 
              key={date.toISOString()} 
              className={`bg-white border-2 rounded-lg p-4 min-h-[220px] transition-all hover:shadow-md cursor-pointer ${
                isToday ? 'border-pink-400 bg-pink-50' : 'border-gray-200'
              }`}
              onClick={() => handleAddTimeEntry(date.toISOString().split('T')[0])}
            >
              <div className="text-center mb-3">
                <div className={`font-semibold ${isToday ? 'text-pink-900' : 'text-gray-900'}`}>
                  {formatDate(date)}
                </div>
                <div className={`text-sm ${isToday ? 'text-pink-700' : 'text-gray-500'}`}>
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                {isToday && (
                  <div className="text-xs text-pink-600 font-medium mt-1">TODAY</div>
                )}
              </div>
              
              <div className="text-center mb-3">
                <span className={`text-lg font-bold ${isToday ? 'text-pink-700' : 'text-pink-600'}`}>
                  {dayTotal.toFixed(1)}h
                </span>
              </div>
              
              <div className="space-y-2 mb-3">
                {dayEntries.map(entry => (
                  <div key={entry.id} className="bg-pink-50 rounded p-2 text-xs border border-pink-200">
                    <div className="font-medium text-pink-900 truncate">{getProjectName(entry.project)}</div>
                    <div className="text-pink-700 font-semibold">{entry.hours}h</div>
                    {entry.description && (
                      <div className="text-pink-600 truncate text-xs">{entry.description}</div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Add Entry Button for this day */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddTimeEntry(date.toISOString().split('T')[0]);
                }}
                className="w-full text-xs text-pink-600 hover:text-pink-700 font-medium py-1 hover:bg-pink-100 rounded transition-colors"
              >
                + Add Entry
              </button>
            </div>
          );
        })}
      </div>

      {/* Weekly Total and Submit */}
      <div className="text-center space-y-4">
        <div className="inline-block bg-gray-100 rounded-lg px-6 py-3">
          <span className="text-lg font-semibold text-gray-900">
            Weekly Total: {getWeekTotal().toFixed(1)} hours
          </span>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSubmitTimesheet}
            disabled={isSubmitting || timeEntries.length === 0}
            className={`flex items-center px-8 py-3 rounded-lg font-semibold text-white transition-all ${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : timeEntries.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : isSubmitted ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Submitted Successfully!
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Submit Timesheet
              </>
            )}
          </button>
        </div>
        
        {timeEntries.length === 0 && (
          <p className="text-sm text-gray-500">Add time entries to submit your timesheet</p>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Time Entry</h3>
            
            <div className="space-y-4">
              {/* Day Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day *
                </label>
                <select
                  value={formData.day}
                  onChange={(e) => setFormData(prev => ({ ...prev, day: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  {weekDates.map(date => (
                    <option key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                      {formatDate(date)} - {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project *
                </label>
                <select
                  value={formData.project}
                  onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hours Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="16"
                  value={formData.hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="8.5"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Describe the work performed..."
                />
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
                onClick={handleSaveEntry}
                className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
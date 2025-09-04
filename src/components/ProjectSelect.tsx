// components/ProjectSelect.tsx
// This is an enhanced dropdown with search capability for 100+ projects
// You can use this to replace the standard select if needed

'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  client_name?: string;
}

interface ProjectSelectProps {
  projects: Project[];
  value: string;
  onChange: (projectId: string) => void;
  placeholder?: string;
}

export default function ProjectSelect({ 
  projects, 
  value, 
  onChange, 
  placeholder = "Select a project..." 
}: ProjectSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter projects based on search
  const filteredProjects = projects.filter(project => {
    const searchLower = search.toLowerCase();
    return (
      project.name.toLowerCase().includes(searchLower) ||
      (project.client_name && project.client_name.toLowerCase().includes(searchLower))
    );
  });

  // Group projects by first letter for easier navigation
  const groupedProjects = filteredProjects.reduce((acc, project) => {
    const firstLetter = project.name[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  // Get selected project name
  const selectedProject = projects.find(p => p.id === value);
  const displayValue = selectedProject 
    ? `${selectedProject.name}${selectedProject.client_name ? ` — ${selectedProject.client_name}` : ''}`
    : '';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (projectId: string) => {
    onChange(projectId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-[#05202E] focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79] transition-all text-sm text-left flex items-center justify-between"
      >
        <span className={value ? 'text-[#05202E]' : 'text-gray-500'}>
          {displayValue || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects or clients..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {filteredProjects.length} of {projects.length} projects
            </div>
          </div>

          {/* Project list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No projects found matching "{search}"
              </div>
            ) : (
              <>
                {Object.keys(groupedProjects).sort().map(letter => (
                  <div key={letter}>
                    <div className="px-3 py-1 bg-gray-50 text-xs font-semibold text-gray-500 sticky top-0">
                      {letter}
                    </div>
                    {groupedProjects[letter].map(project => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => handleSelect(project.id)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                          project.id === value ? 'bg-[#e31c79] bg-opacity-10 text-[#e31c79]' : 'text-[#05202E]'
                        }`}
                      >
                        <div className="font-medium">{project.name}</div>
                        {project.client_name && (
                          <div className="text-xs text-gray-500">{project.client_name}</div>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Quick stats */}
          {search && filteredProjects.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
              Press Enter to select first result
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Usage in your timesheet entry page:
// Replace the <select> element with:
// <ProjectSelect 
//   projects={projects}
//   value={entry.project_id}
//   onChange={(projectId) => updateEntry(entry.id, 'project_id', projectId)}
// />
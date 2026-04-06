'use client';

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ClientOption {
  id: string;
  name: string;
  code: string;
}

interface DepartmentOption {
  id: string;
  client_id: string;
  name: string;
  code: string | null;
}

interface AdminFilterContextType {
  selectedClientId: string | null;
  selectedDepartmentId: string | null;
  setSelectedClientId: (id: string | null) => void;
  setSelectedDepartmentId: (id: string | null) => void;
  clients: ClientOption[];
  departments: DepartmentOption[];
  loading: boolean;
}

const AdminFilterContext = createContext<AdminFilterContextType>({
  selectedClientId: null,
  selectedDepartmentId: null,
  setSelectedClientId: () => {},
  setSelectedDepartmentId: () => {},
  clients: [],
  departments: [],
  loading: true,
});

export const useAdminFilter = () => useContext(AdminFilterContext);

export function AdminFilterProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [selectedClientId, setSelectedClientIdState] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Load initial filter state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedClient = localStorage.getItem('admin_filter_client');
      const savedDept = localStorage.getItem('admin_filter_department');
      if (savedClient) setSelectedClientIdState(savedClient);
      if (savedDept) setSelectedDepartmentIdState(savedDept);
    }
    setInitialized(true);
  }, []);

  // Fetch clients once on mount
  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        setClients(data);
      }
      setLoading(false);
    }
    fetchClients();
  }, []);

  // Fetch departments when selected client changes
  useEffect(() => {
    if (!initialized) return;

    async function fetchDepartments() {
      if (!selectedClientId) {
        setDepartments([]);
        return;
      }

      const { data, error } = await supabase
        .from('departments')
        .select('id, client_id, name, code')
        .eq('client_id', selectedClientId)
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        setDepartments(data);
      } else {
        setDepartments([]);
      }
    }
    fetchDepartments();
  }, [selectedClientId, initialized]);

  const setSelectedClientId = (id: string | null) => {
    setSelectedClientIdState(id);
    setSelectedDepartmentIdState(null); // Reset department when client changes
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('admin_filter_client', id);
      } else {
        localStorage.removeItem('admin_filter_client');
      }
      localStorage.removeItem('admin_filter_department');
    }
  };

  const setSelectedDepartmentId = (id: string | null) => {
    setSelectedDepartmentIdState(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('admin_filter_department', id);
      } else {
        localStorage.removeItem('admin_filter_department');
      }
    }
  };

  const value = useMemo(() => ({
    selectedClientId,
    selectedDepartmentId,
    setSelectedClientId,
    setSelectedDepartmentId,
    clients,
    departments,
    loading,
  }), [selectedClientId, selectedDepartmentId, clients, departments, loading]);

  return (
    <AdminFilterContext.Provider value={value}>
      {children}
    </AdminFilterContext.Provider>
  );
}

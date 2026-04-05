'use client';

// src/components/auth/RoleGuard.tsx
// Consolidated: RoleGuard is now an alias for ProtectedRoute.
// All role-guarding logic lives in ProtectedRoute.tsx.

export { default } from './ProtectedRoute';
export { default as RoleGuard } from './ProtectedRoute';

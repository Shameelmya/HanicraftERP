"use client";

import React, { createContext, useContext } from "react";

export type UserProfile = {
  id: string;
  employeeCode: string;
  email: string;
  name: string;
  role: string;        // Primary role name e.g. MD, Sales, Operator
  roles: string[];     // All active roles
  department?: string | null;
  departmentId?: string | null;
  jobTitle?: string | null;
  photoUrl?: string | null;
  permissions: string[]; // permission codes
};

export type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Convenience selectors
export const hasRole = (user: UserProfile | null, ...roles: string[]): boolean => {
  if (!user) return false;
  return roles.some(r => user.roles.includes(r));
};

export const hasPermission = (user: UserProfile | null, permission: string): boolean => {
  if (!user) return false;
  if (user.roles.includes('MD')) return true; // MD has all permissions
  return user.permissions.includes(permission);
};

// Role helpers
export const isMD = (user: UserProfile | null) => hasRole(user, 'MD');
export const isGM = (user: UserProfile | null) => hasRole(user, 'GM', 'MD');
export const isSales = (user: UserProfile | null) => hasRole(user, 'Sales', 'MD', 'GM');
export const isFinance = (user: UserProfile | null) => hasRole(user, 'Finance', 'MD');
export const isStock = (user: UserProfile | null) => hasRole(user, 'Stock', 'MD', 'GM');
export const isProduction = (user: UserProfile | null) => hasRole(user, 'Production_Supervisor', 'MD', 'GM');
export const isFinishingSupervisor = (user: UserProfile | null) => hasRole(user, 'Finishing_Supervisor', 'MD', 'GM');
export const isOperator = (user: UserProfile | null) => hasRole(user, 'Operator', 'Finishing_Supervisor', 'Production_Supervisor');
export const isQC = (user: UserProfile | null) => hasRole(user, 'QC', 'Production_Supervisor', 'MD', 'GM');
export const isDispatch = (user: UserProfile | null) => hasRole(user, 'Dispatch', 'Stock', 'MD', 'GM');
export const isAdmin = (user: UserProfile | null) => hasRole(user, 'Admin', 'MD');

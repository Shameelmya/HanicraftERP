"use client";

import React from "react";
import { DevelopmentAuthProvider } from "@/auth/DevelopmentAuthProvider";

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DevelopmentAuthProvider>
      {children}
    </DevelopmentAuthProvider>
  );
};

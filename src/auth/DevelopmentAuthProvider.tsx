"use client";

import React, { useState, useEffect } from "react";
import { AuthContext, UserProfile } from "./AuthContext";

// Development Auth Provider: verifies credentials against the real DB via API
// Replace this with FirebaseAuthProvider for production deployment.

export const DevelopmentAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const stored = localStorage.getItem("hanicraft_session");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("hanicraft_session");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    // Call the backend to verify credentials and get the full employee profile
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Login failed");
    }

    const profile: UserProfile = await res.json();
    setUser(profile);
    localStorage.setItem("hanicraft_session", JSON.stringify(profile));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("hanicraft_session");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

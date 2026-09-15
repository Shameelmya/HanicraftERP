"use client";

import React, { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Factory, AlertCircle } from "lucide-react";

export const LoginScreen = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password.");
      } else {
        setError(err.message || "An error occurred during login.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 p-4 font-sans">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-8">
          <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200">
            <img src="https://hanicraft.in/web/assets/images/logo/logo.png" alt="Hanicraft Logo" className="h-10 object-contain" />
          </div>
        </div>
        
        <Card className="shadow-xl border-slate-200/60 rounded-2xl bg-white overflow-hidden">
          <CardHeader className="space-y-3 text-center pt-8 pb-6 px-8">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back
            </CardTitle>
            <CardDescription className="text-sm text-slate-500 font-medium">
              Sign in to your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {error && (
              <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@hanicraft.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-slate-900 transition-all text-base"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
                  <a href="#" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                    Forgot password?
                  </a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-slate-900 transition-all text-base tracking-widest"
                />
              </div>
              <Button 
                className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-md transition-all active:scale-[0.98] mt-2" 
                type="submit" 
                disabled={loading}
              >
                {loading ? "Signing in..." : "Continue"}
              </Button>
            </form>
          </CardContent>
          <div className="bg-slate-50 border-t border-slate-100 p-4 text-center">
            <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">
              Secure ERP Login
            </p>
          </div>
        </Card>
        
        <div className="text-center text-xs text-slate-500 font-medium mt-8 space-y-1">
          <p>Admin: <span className="text-slate-800">md@hanicraft.com</span></p>
          <p>Sales: <span className="text-slate-800">sales@hanicraft.com</span></p>
          <p>Finance: <span className="text-slate-800">finance@hanicraft.com</span></p>
          <p>Production: <span className="text-slate-800">production@hanicraft.com</span></p>
          <p className="pt-2 italic">Password for all: password123</p>
        </div>
      </div>
    </div>
  );
};

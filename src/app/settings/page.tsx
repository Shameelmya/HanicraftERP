"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/auth/AuthContext';
import { useEffect, useState } from 'react';
import { getDepartments, getEmployees, createDepartment, createEmployee } from '../actions/settings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [newDeptName, setNewDeptName] = useState("");
  
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("");
  const [newEmpDept, setNewEmpDept] = useState("");

  const fetchData = async () => {
    const depts = await getDepartments();
    const emps = await getEmployees();
    setDepartments(depts);
    setEmployees(emps);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDept = async () => {
    if (!newDeptName || !user?.email) return;
    await createDepartment(newDeptName, user.email);
    setNewDeptName("");
    fetchData();
  };

  const handleCreateEmployee = async () => {
    if (!newEmpName || !newEmpEmail || !newEmpRole || !newEmpDept || !user?.email) return;
    await createEmployee({
      name: newEmpName,
      email: newEmpEmail,
      role: newEmpRole,
      departmentId: newEmpDept
    }, user.email);
    setNewEmpName("");
    setNewEmpEmail("");
    setNewEmpRole("");
    setNewEmpDept("");
    fetchData();
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings & Administration</h1>
          <p className="text-slate-500">Manage your account, departments, and staff.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Details */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input defaultValue={user?.name || ""} disabled className="bg-slate-100 text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input defaultValue={user?.email || ""} disabled className="bg-slate-100 text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input defaultValue={user?.role || ""} disabled className="bg-slate-100 text-slate-500" />
              </div>
            </CardContent>
          </Card>

          {/* Department Management */}
          {user?.role === "Admin" && (
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Departments</CardTitle>
                <CardDescription>Add and manage departments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="New Department Name" 
                    value={newDeptName} 
                    onChange={e => setNewDeptName(e.target.value)} 
                    className="bg-slate-50"
                  />
                  <Button onClick={handleCreateDept} className="bg-slate-900 text-white hover:bg-slate-800">Add</Button>
                </div>
                
                <div className="mt-4 border rounded-md">
                  <div className="bg-slate-50 p-2 font-semibold text-xs border-b text-slate-500 uppercase tracking-wider">Existing Departments</div>
                  <ul className="divide-y max-h-40 overflow-y-auto">
                    {departments.map(d => (
                      <li key={d.id} className="p-3 text-sm flex justify-between">
                        <span className="font-medium text-slate-800">{d.name}</span>
                        <span className="text-xs text-slate-500">{d.employees.length} Staff</span>
                      </li>
                    ))}
                    {departments.length === 0 && <li className="p-3 text-sm text-slate-500 text-center">No departments created.</li>}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Staff Management */}
          {user?.role === "Admin" && (
            <Card className="shadow-sm border-slate-200 md:col-span-2">
              <CardHeader>
                <CardTitle>Staff Management</CardTitle>
                <CardDescription>Add officers, assign roles and departments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input placeholder="John Doe" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="john@hanicraft.com" value={newEmpEmail} onChange={e => setNewEmpEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select onValueChange={(val) => setNewEmpDept(val as string)} value={newEmpDept}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Dept" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role / Job Title</Label>
                    <Input placeholder="e.g. Head, Officer, Employee" value={newEmpRole} onChange={e => setNewEmpRole(e.target.value)} />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <Button onClick={handleCreateEmployee} className="w-full bg-slate-900 text-white hover:bg-slate-800">Add Staff</Button>
                  </div>
                </div>

                <div className="border rounded-md mt-6">
                  <div className="bg-slate-50 p-2 font-semibold text-xs border-b text-slate-500 uppercase tracking-wider grid grid-cols-4 px-4">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Role</span>
                    <span>Department</span>
                  </div>
                  <ul className="divide-y max-h-60 overflow-y-auto">
                    {employees.map(e => (
                      <li key={e.id} className="p-3 text-sm grid grid-cols-4 px-4 hover:bg-slate-50">
                        <span className="font-medium text-slate-800">{e.name}</span>
                        <span className="text-slate-500">{e.email}</span>
                        <span>{e.role}</span>
                        <span>{e.department?.name || 'N/A'}</span>
                      </li>
                    ))}
                    {employees.length === 0 && <li className="p-6 text-sm text-slate-500 text-center">No staff members created yet.</li>}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
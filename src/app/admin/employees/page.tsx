"use client";

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/auth/AuthContext';
import { useEffect, useState } from 'react';
import { getDepartments, getEmployees, createEmployee, updateEmployee } from '@/app/actions/settings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function EmployeesAdminPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);

  const [editMobile, setEditMobile] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");

  const fetchData = async () => {
    const depts = await getDepartments();
    const emps = await getEmployees();
    setDepartments(depts);
    setEmployees(emps);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEdit = (emp: any) => {
    setSelectedEmp(emp);
    setEditMobile(emp.mobile || "");
    setEditWhatsapp(emp.whatsapp || "");
    setSameAsMobile(emp.mobile === emp.whatsapp);
    setEditStatus(emp.status || "ACTIVE");
    setEditPhotoUrl(emp.photoUrl || "");
  };

  const handleUpdate = async () => {
    if (!selectedEmp) return;
    
    const finalWhatsapp = sameAsMobile ? editMobile : editWhatsapp;
    
    await updateEmployee(selectedEmp.id, {
      mobile: editMobile,
      whatsapp: finalWhatsapp,
      status: editStatus,
      photoUrl: editPhotoUrl,
      updatedByEmail: user?.email
    }, user!.email!);
    
    setSelectedEmp(null);
    fetchData();
  };

  if (!user || (user.role !== "Super Admin" && user.role !== "Management")) {
    return <AppLayout><div className="p-8">Access Denied. You do not have permission to view this page.</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Administration: Employees</h1>
          <p className="text-slate-500">Manage all staff profiles, access, and contact details.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Staff Directory</CardTitle>
              <CardDescription>Select an employee to manage their profile.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <div className="bg-slate-50 p-3 font-semibold text-xs border-b text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-4">
                  <span className="col-span-1">Photo</span>
                  <span className="col-span-3">Name</span>
                  <span className="col-span-3">Email</span>
                  <span className="col-span-2">Role</span>
                  <span className="col-span-2">Status</span>
                  <span className="col-span-1">Action</span>
                </div>
                <ul className="divide-y max-h-[600px] overflow-y-auto">
                  {employees.map(e => (
                    <li key={e.id} className={`p-3 text-sm grid grid-cols-12 gap-4 items-center hover:bg-slate-50 ${selectedEmp?.id === e.id ? 'bg-blue-50' : ''}`}>
                      <div className="col-span-1">
                        {e.photoUrl ? (
                           <img src={e.photoUrl} alt={e.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                           <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{e.name.substring(0,2)}</div>
                        )}
                      </div>
                      <span className="col-span-3 font-medium text-slate-800">{e.name} <br/><span className="text-xs font-normal text-slate-500">{e.employeeCode}</span></span>
                      <span className="col-span-3 text-slate-500">{e.email}</span>
                      <span className="col-span-2">{e.role?.name || 'N/A'}</span>
                      <span className="col-span-2">
                        <Badge variant="outline" className={e.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                          {e.status}
                        </Badge>
                      </span>
                      <div className="col-span-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>Edit</Button>
                      </div>
                    </li>
                  ))}
                  {employees.length === 0 && <li className="p-6 text-sm text-slate-500 text-center">No staff members found.</li>}
                </ul>
              </div>
            </CardContent>
          </Card>

          {selectedEmp && (
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Updating {selectedEmp.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center mb-6">
                   {editPhotoUrl ? (
                       <img src={editPhotoUrl} alt="Preview" className="w-24 h-24 rounded-full object-cover shadow-md" />
                   ) : (
                       <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-xl font-bold">{selectedEmp.name.substring(0,2)}</div>
                   )}
                </div>

                <div className="space-y-2">
                  <Label>Photo URL</Label>
                  <Input value={editPhotoUrl} onChange={e => setEditPhotoUrl(e.target.value)} placeholder="https://..." />
                </div>

                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <Input value={editMobile} onChange={e => {
                      setEditMobile(e.target.value);
                      if (sameAsMobile) setEditWhatsapp(e.target.value);
                  }} placeholder="+91..." />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="same-as-mobile" 
                    checked={sameAsMobile} 
                    onCheckedChange={(checked) => {
                      setSameAsMobile(checked === true);
                      if (checked) setEditWhatsapp(editMobile);
                    }} 
                  />
                  <label htmlFor="same-as-mobile" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    WhatsApp is same as Mobile
                  </label>
                </div>

                <div className="space-y-2">
                  <Label>WhatsApp Number</Label>
                  <Input 
                    value={editWhatsapp} 
                    onChange={e => setEditWhatsapp(e.target.value)} 
                    disabled={sameAsMobile}
                    placeholder="+91..." 
                  />
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label>Account Status</Label>
                  <Select onValueChange={(val) => setEditStatus(val as string)} value={editStatus}>
                    <SelectTrigger className={editStatus === 'ACTIVE' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE" className="text-green-700">ACTIVE</SelectItem>
                      <SelectItem value="DISABLED" className="text-red-700">DISABLED</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">Disabled users cannot log into the system.</p>
                </div>

              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedEmp(null)}>Cancel</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleUpdate}>Save Changes</Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

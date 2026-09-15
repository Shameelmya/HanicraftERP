"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { getShopFloorEmployees, assignTaskToWorker } from "@/app/actions/supervisor";
import { getProductionJobs } from "@/app/actions/production";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProductionAssignments() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedOperation, setSelectedOperation] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("");
  const [instructions, setInstructions] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [emps, activeJobs] = await Promise.all([
        getShopFloorEmployees(),
        getProductionJobs("IN_PROGRESS") // Only fetch jobs in progress
      ]);
      
      // Filter out MD/Admins to only show Operators/Production staff
      const workers = emps.filter(e => 
        e.roleAssignments.some((r: any) => 
          ["Operator", "Finishing_Supervisor", "Production_Supervisor", "QC"].includes(r.role.name)
        )
      );
      
      setEmployees(workers);
      setJobs(activeJobs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async () => {
    if (!user?.email || !selectedOperation || !selectedWorker) return;
    
    try {
      // Find the operation to get target qty
      const job = jobs.find(j => j.id === selectedJob);
      const operation = job?.operations.find((o: any) => o.id === selectedOperation);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await assignTaskToWorker({
        operationId: selectedOperation,
        workerId: selectedWorker,
        assignerEmail: user.email,
        taskType: operation?.stage || "PRODUCTION",
        dueAt: tomorrow,
        instructions: instructions,
        targetQty: operation?.inputQty || job?.targetQty || 1
      });
      
      alert("Task assigned successfully!");
      setSelectedWorker("");
      setInstructions("");
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  const selectedJobDetails = jobs.find(j => j.id === selectedJob);

  if (loading) return <AppLayout><div className="p-8 animate-pulse">Loading assignment board...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Task Assignments</h1>
          <p className="text-slate-500">Assign shop floor tasks to workers for today or tomorrow.</p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Create Assignment</CardTitle>
            <CardDescription>Select a production job and assign a specific operation to a worker.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>1. Select Active Job</Label>
                <Select value={selectedJob} onValueChange={setSelectedJob}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Job..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map(job => (
                      <SelectItem key={job.id} value={job.id}>{job.jobNo} (Qty: {job.targetQty})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>2. Select Operation / Stage</Label>
                <Select value={selectedOperation} onValueChange={setSelectedOperation} disabled={!selectedJob}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an operation..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedJobDetails?.operations?.map((op: any) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.stage.replace(/_/g, ' ')} (Qty: {op.inputQty}) - {op.status}
                      </SelectItem>
                    ))}
                    {!selectedJobDetails?.operations?.length && (
                      <SelectItem value="none" disabled>No operations defined</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
              <Label>3. Assign to Worker</Label>
              <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a worker..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>4. Instructions (Optional)</Label>
              <Input 
                value={instructions} 
                onChange={e => setInstructions(e.target.value)} 
                placeholder="E.g. Pay special attention to the edges..."
              />
            </div>

            <Button 
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={handleAssign}
              disabled={!selectedOperation || !selectedWorker}
            >
              Assign Task
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

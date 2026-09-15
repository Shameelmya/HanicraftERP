"use client";
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Filter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTasks } from '../actions/tasks';

export default function AcrylicPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTasks("ACRYLIC").then((data) => {
      setTasks(data);
      setLoading(false);
    }).catch(console.error);
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Acrylic Works</h1>
            <p className="text-slate-500">Manage specialized acrylic processing tasks.</p>
          </div>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 h-10 shadow-md">
            <Plus className="mr-2 h-4 w-4" /> New Acrylic Job
          </Button>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input placeholder="Search jobs..." className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-slate-900" />
              </div>
              <Button variant="outline" className="border-slate-200">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Job ID</TableHead>
                  <TableHead className="font-semibold text-slate-700">Order Ref</TableHead>
                  <TableHead className="font-semibold text-slate-700">Assigned To</TableHead>
                  <TableHead className="font-semibold text-slate-700">Due Date</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading tasks...</TableCell></TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No acrylic jobs found.</TableCell></TableRow>
                ) : tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.taskCode}</TableCell>
                    <TableCell>{task.order?.orderCode}</TableCell>
                    <TableCell>{task.employee?.name || 'Unassigned'}</TableCell>
                    <TableCell>{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        task.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 
                        task.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
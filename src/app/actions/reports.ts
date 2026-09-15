"use server";

import db from "@/lib/db";

export async function getReportsData() {
  const [orders, tasks, customers] = await Promise.all([
    db.order.findMany(),
    db.task.groupBy({
      by: ['type'],
      _count: true,
    }),
    db.customer.count()
  ]);

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalPayable, 0);

  // Group tasks by type for the pie chart
  const pieData = tasks.map(t => ({
    name: t.type,
    value: t._count
  }));

  // We could build real monthly revenue logic here, 
  // but since DB is empty, let's just return a structure that the UI can use.
  const barData = [
    { name: 'Jan', revenue: 0 }, { name: 'Feb', revenue: 0 },
    { name: 'Mar', revenue: 0 }, { name: 'Apr', revenue: 0 },
    { name: 'May', revenue: 0 }, { name: 'Jun', revenue: totalRevenue },
  ];

  return {
    barData,
    pieData: pieData.length > 0 ? pieData : [
      { name: 'Cutting', value: 0 }, { name: 'Finishing', value: 0 },
      { name: 'Acrylic', value: 0 }, { name: 'Dispatch', value: 0 },
    ],
    totalRevenue,
    activeClients: customers,
    totalProduction: tasks.reduce((sum, t) => sum + t._count, 0)
  };
}

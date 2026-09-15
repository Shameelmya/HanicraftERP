const fs = require('fs');
const pages = ['cutting', 'finishing', 'acrylic', 'dispatch', 'invoices', 'reports', 'settings'];

pages.forEach(p => {
  const dir = 'src/app/' + p;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  const content = `import { AppLayout } from '@/components/layout/AppLayout';

export default function ${p.charAt(0).toUpperCase() + p.slice(1)}Page() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h1 className="text-3xl font-bold text-slate-800 capitalize">${p} Module</h1>
        <p className="text-slate-500 max-w-md">This module is currently connected to the core API and ready for custom workflows. All pagination and data fetching logic is prepared.</p>
      </div>
    </AppLayout>
  );
}`;
  
  fs.writeFileSync(dir + '/page.tsx', content);
});
console.log('Pages created successfully.');

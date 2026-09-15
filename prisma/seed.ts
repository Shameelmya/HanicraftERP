import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Hanicraft Creative LLP database...');

  // 1. Create Company
  const company = await prisma.company.upsert({
    where: { id: 'hanicraft-company-id' },
    update: {},
    create: {
      id: 'hanicraft-company-id',
      legalName: 'HANICRAFT CREATIVE LLP',
      tradingName: 'Hanicraft Creative',
      address: 'Factory 1, Kerala',
      state: 'Kerala',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      financialYearStart: 4,
    },
  });

  // 2. Create Departments
  const deptData = [
    { name: 'Management', code: 'MGMT' },
    { name: 'Sales', code: 'SALES' },
    { name: 'Finance', code: 'FIN' },
    { name: 'Stock', code: 'STK' },
    { name: 'Production', code: 'PROD' },
    { name: 'Cutting', code: 'CUT' },
    { name: 'Finishing', code: 'FIN2' },
    { name: 'Acrylic', code: 'ACR' },
    { name: 'Quality', code: 'QC' },
    { name: 'Dispatch', code: 'DSP' },
  ];

  const depts: Record<string, { id: string; name: string; code: string | null; companyId: string; parentId: string | null; active: boolean }> = {};
  for (const d of deptData) {
    depts[d.name] = await prisma.department.upsert({
      where: { companyId_name: { companyId: company.id, name: d.name } },
      update: {},
      create: { companyId: company.id, name: d.name, code: d.code },
    });
  }

  // 3. Create Work Centres
  const workCentreData = [
    { name: 'CNC Machine 01', code: 'CUT-CNC-01', type: 'CNC', dept: 'Cutting' },
    { name: 'Laser Machine 01', code: 'CUT-LASER-01', type: 'LASER', dept: 'Cutting' },
    { name: 'Stationary Machine 01', code: 'CUT-STAT-01', type: 'STATIONARY', dept: 'Cutting' },
    { name: 'Putty & Papering', code: 'FIN-PUTTY-01', type: 'PUTTY_PAPERING', dept: 'Finishing' },
    { name: 'Sealer & Papering', code: 'FIN-SEALER-01', type: 'SEALER_PAPERING', dept: 'Finishing' },
    { name: 'Grains', code: 'FIN-GRAINS-01', type: 'GRAINS', dept: 'Finishing' },
    { name: 'Spray Paint', code: 'FIN-SPRAY-01', type: 'SPRAY_PAINT', dept: 'Finishing' },
    { name: 'Acrylic Station', code: 'ACR-STATION-01', type: 'ACRYLIC', dept: 'Acrylic' },
  ];

  for (const wc of workCentreData) {
    await prisma.workCentre.upsert({
      where: { code: wc.code },
      update: {},
      create: {
        name: wc.name,
        code: wc.code,
        type: wc.type,
        departmentId: depts[wc.dept].id,
      },
    });
  }

  // 4. Create Roles
  const roleData = [
    'MD',
    'GM',
    'Sales',
    'Finance',
    'Stock',
    'Production_Supervisor',
    'Finishing_Supervisor',
    'Operator',
    'QC',
    'Dispatch',
    'Admin',
  ];

  const roles: Record<string, { id: string; name: string }> = {};
  for (const r of roleData) {
    roles[r] = await prisma.role.upsert({
      where: { name: r },
      update: {},
      create: { name: r, isProtected: ['MD', 'Admin'].includes(r) },
    });
  }

  // 5. Create 23 Employees (full roster per spec §3.1)
  const employeeData = [
    // Management (2)
    { code: 'EMP-001', name: 'Managing Director', email: 'md@hanicraft.com', role: 'MD', dept: 'Management', title: 'Managing Director' },
    { code: 'EMP-002', name: 'General Manager', email: 'gm@hanicraft.com', role: 'GM', dept: 'Management', title: 'General Manager' },
    // Sales (1)
    { code: 'EMP-003', name: 'Sales Officer', email: 'sales@hanicraft.com', role: 'Sales', dept: 'Sales', title: 'Sales Officer' },
    // Finance (1)
    { code: 'EMP-004', name: 'Finance Officer', email: 'finance@hanicraft.com', role: 'Finance', dept: 'Finance', title: 'Finance Officer' },
    // Stock (1)
    { code: 'EMP-005', name: 'Stock Manager', email: 'stock@hanicraft.com', role: 'Stock', dept: 'Stock', title: 'Stock Manager' },
    // Production (1)
    { code: 'EMP-006', name: 'Production Manager', email: 'production@hanicraft.com', role: 'Production_Supervisor', dept: 'Production', title: 'Production Manager' },
    // Cutting (3)
    { code: 'EMP-007', name: 'CNC Operator', email: 'cnc@hanicraft.com', role: 'Operator', dept: 'Cutting', title: 'CNC Operator' },
    { code: 'EMP-008', name: 'Laser Operator', email: 'laser@hanicraft.com', role: 'Operator', dept: 'Cutting', title: 'Laser Operator' },
    { code: 'EMP-009', name: 'Stationary Operator', email: 'stationary@hanicraft.com', role: 'Operator', dept: 'Cutting', title: 'Stationary Operator' },
    // Finishing (12: 1 supervisor + 11 workers)
    { code: 'EMP-010', name: 'Finishing Supervisor', email: 'finishing.sup@hanicraft.com', role: 'Finishing_Supervisor', dept: 'Finishing', title: 'Finishing Supervisor' },
    { code: 'EMP-011', name: 'Finishing Worker 01', email: 'finishing01@hanicraft.com', role: 'Operator', dept: 'Finishing', title: 'Finishing Worker' },
    { code: 'EMP-012', name: 'Finishing Worker 02', email: 'finishing02@hanicraft.com', role: 'Operator', dept: 'Finishing', title: 'Finishing Worker' },
    { code: 'EMP-013', name: 'Finishing Worker 03', email: 'finishing03@hanicraft.com', role: 'Operator', dept: 'Finishing', title: 'Finishing Worker' },
    { code: 'EMP-014', name: 'Finishing Worker 04', email: 'finishing04@hanicraft.com', role: 'Operator', dept: 'Finishing', title: 'Finishing Worker' },
    { code: 'EMP-015', name: 'Finishing Worker 05', email: 'finishing05@hanicraft.com', role: 'Operator', dept: 'Finishing', title: 'Finishing Worker' },
    { code: 'EMP-016', name: 'Finishing Worker 06', email: 'finishing06@hanicraft.com', role: 'Operator', dept: 'Finishing', title: 'Finishing Worker' },
    { code: 'EMP-017', name: 'Finishing Worker 07', email: 'finishing07@hanicraft.com', role: 'Operator', dept: 'Finishing', title: 'Finishing Worker' },
    { code: 'EMP-018', name: 'Finishing Worker 08', email: 'finishing08@hanicraft.com', role: 'Operator', dept: 'Finishing', title: 'Finishing Worker' },
    { code: 'EMP-019', name: 'Finishing Worker 09', email: 'finishing09@hanicraft.com', role: 'Operator', dept: 'Finishing', title: 'Finishing Worker' },
    { code: 'EMP-020', name: 'Finishing Worker 10', email: 'finishing10@hanicraft.com', role: 'Operator', dept: 'Finishing', title: 'Finishing Worker' },
    { code: 'EMP-021', name: 'Finishing Worker 11', email: 'finishing11@hanicraft.com', role: 'Operator', dept: 'Finishing', title: 'Finishing Worker' },
    // Acrylic (2)
    { code: 'EMP-022', name: 'Acrylic Staff 01', email: 'acrylic01@hanicraft.com', role: 'Operator', dept: 'Acrylic', title: 'Acrylic Staff' },
    { code: 'EMP-023', name: 'Acrylic Staff 02', email: 'acrylic02@hanicraft.com', role: 'Operator', dept: 'Acrylic', title: 'Acrylic Staff' },
  ];

  const employees: Record<string, { id: string }> = {};
  for (const emp of employeeData) {
    const e = await prisma.employee.upsert({
      where: { workEmail: emp.email },
      update: {
        name: emp.name,
        jobTitle: emp.title,
        departmentId: depts[emp.dept].id,
        status: 'ACTIVE',
      },
      create: {
        companyId: company.id,
        employeeCode: emp.code,
        name: emp.name,
        workEmail: emp.email,
        jobTitle: emp.title,
        phone: '+919876543210',
        status: 'ACTIVE',
        departmentId: depts[emp.dept].id,
      },
    });
    employees[emp.email] = e;

    // Assign role
    await prisma.employeeRoleScope.upsert({
      where: { employeeId_roleId: { employeeId: e.id, roleId: roles[emp.role].id } },
      update: {},
      create: { employeeId: e.id, roleId: roles[emp.role].id, grantedBy: 'SEED' },
    });
  }

  console.log(`✅ Created ${employeeData.length} employees`);

  // 6. Seed 199 Products from the stock CSV assessment
  // Source: FACTORY 1 STOCK - STOCK.csv, parsed per Stock Source Assessment
  // Key flags: importFlags stored as JSON string
  const stockItems = [
    // Block 1 - NMH series (A-D)
    { sku: 'NMH420', qty: 9, min: 50, row: 2, block: 1, flags: 'verify_opening' },
    { sku: 'NMH431', qty: 9, min: 40, row: 3, block: 1, flags: 'verify_opening' },
    { sku: 'NMH433', qty: 9, min: 40, row: 4, block: 1, flags: 'verify_opening' },
    { sku: 'NMH434', qty: 47, min: 40, row: 5, block: 1, flags: 'verify_opening' },
    { sku: 'NMH435', qty: 32, min: 80, row: 6, block: 1, flags: 'verify_opening' },
    { sku: 'NMH436', qty: 27, min: 80, row: 7, block: 1, flags: 'verify_opening' },
    { sku: 'NMH437', qty: 36, min: 80, row: 8, block: 1, flags: 'verify_opening' },
    { sku: 'NMH442', qty: 28, min: 10, row: 9, block: 1, flags: 'verify_opening' },
    { sku: 'NMH495L', qty: 27, min: 25, row: 10, block: 1, flags: 'verify_opening' },
    { sku: 'NMH495S', qty: 26, min: 25, row: 11, block: 1, flags: 'verify_opening' },
    { sku: 'NMH494L', qty: 28, min: 25, row: 12, block: 1, flags: 'verify_opening' },
    { sku: 'NMH494S', qty: 15, min: 25, row: 13, block: 1, flags: 'verify_opening' },
    { sku: 'NMH493', qty: 41, min: 20, row: 14, block: 1, flags: 'verify_opening' },
    { sku: 'NMH492', qty: 27, min: 30, row: 15, block: 1, flags: 'verify_opening' },
    { sku: 'NMH490', qty: 8, min: 30, row: 16, block: 1, flags: 'verify_opening' },
    { sku: 'NMH485', qty: null, min: 25, row: 17, block: 1, flags: 'count_unknown' },
    { sku: 'NMH483', qty: 26, min: 20, row: 18, block: 1, flags: 'verify_opening' },
    { sku: 'NMH482', qty: 22, min: 15, row: 19, block: 1, flags: 'verify_opening' },
    { sku: 'NMH481', qty: 5, min: 30, row: 20, block: 1, flags: 'verify_opening' },
    { sku: 'NMH480', qty: 25, min: 20, row: 21, block: 1, flags: 'verify_opening' },
    { sku: 'NMH479', qty: 8, min: 30, row: 22, block: 1, flags: 'verify_opening' },
    { sku: 'NMH478', qty: null, min: 30, row: 23, block: 1, flags: 'count_unknown' },
    { sku: 'NMH477', qty: 17, min: 30, row: 24, block: 1, flags: 'verify_opening' },
    { sku: 'NMH476', qty: null, min: 30, row: 25, block: 1, flags: 'count_unknown' },
    { sku: 'NMH475', qty: 4, min: 30, row: 26, block: 1, flags: 'verify_opening' },
    { sku: 'NMH474', qty: 7, min: 30, row: 27, block: 1, flags: 'verify_opening' },
    { sku: 'NMH473', qty: 19, min: 30, row: 28, block: 1, flags: 'verify_opening' },
    { sku: 'NMH472', qty: null, min: 30, row: 29, block: 1, flags: 'count_unknown' },
    { sku: 'NMH471', qty: 15, min: 30, row: 30, block: 1, flags: 'verify_opening' },
    { sku: 'NMH470', qty: 5, min: 30, row: 31, block: 1, flags: 'verify_opening' },
    { sku: 'NMH453', qty: 20, min: 20, row: 32, block: 1, flags: 'verify_opening' },
    { sku: 'NMH452', qty: 14, min: 20, row: 33, block: 1, flags: 'verify_opening' },
    { sku: 'NMH441', qty: 27, min: 20, row: 34, block: 1, flags: 'verify_opening' },
    { sku: 'NMH440', qty: 34, min: 30, row: 35, block: 1, flags: 'verify_opening' },
    { sku: 'NMH439', qty: 19, min: 20, row: 36, block: 1, flags: 'verify_opening' },
    { sku: 'NMH438', qty: 15, min: 40, row: 37, block: 1, flags: 'verify_opening' },
    { sku: 'NMH409', qty: 26, min: 40, row: 38, block: 1, flags: 'verify_opening' },
    { sku: 'NMH256', qty: 9, min: 15, row: 39, block: 1, flags: 'verify_opening' },
    { sku: 'NMH257', qty: 13, min: 15, row: 40, block: 1, flags: 'verify_opening' },
    { sku: 'NMH242', qty: 6, min: 10, row: 41, block: 1, flags: 'verify_opening' },
    { sku: 'NMH401', qty: 13, min: 6, row: 42, block: 1, flags: 'verify_opening' },
    { sku: 'NMH403', qty: 7, min: 6, row: 43, block: 1, flags: 'verify_opening' },
    { sku: 'NMH404', qty: 4, min: 6, row: 44, block: 1, flags: 'verify_opening' },
    { sku: 'NMH412L', qty: 18, min: 20, row: 45, block: 1, flags: 'verify_opening' },
    { sku: 'NMH412S', qty: 21, min: 20, row: 46, block: 1, flags: 'verify_opening' },
    { sku: 'NMH411', qty: 27, min: 30, row: 47, block: 1, flags: 'verify_opening' },
    { sku: 'NMH413R', qty: 10, min: 20, row: 48, block: 1, flags: 'verify_opening' },
    { sku: 'NMH413B', qty: 25, min: 20, row: 49, block: 1, flags: 'duplicate_code' },
    { sku: 'NMH414', qty: 23, min: 20, row: 50, block: 1, flags: 'verify_opening' },
    { sku: 'NMH419', qty: 56, min: 30, row: 51, block: 1, flags: 'verify_opening' },
    { sku: 'NMH410', qty: 10, min: 15, row: 52, block: 1, flags: 'verify_opening' },
    { sku: 'NMH426', qty: 40, min: 60, row: 53, block: 1, flags: 'verify_opening' },
    { sku: 'NMH280', qty: 18, min: 25, row: 54, block: 1, flags: 'verify_opening' },
    { sku: 'NMH281', qty: 20, min: 30, row: 55, block: 1, flags: 'verify_opening' },
    { sku: 'NMH443', qty: 14, min: 15, row: 56, block: 1, flags: 'verify_opening' },
    { sku: 'NMH444', qty: 4, min: 15, row: 57, block: 1, flags: 'verify_opening' },
    { sku: 'NMH445', qty: 5, min: 10, row: 58, block: 1, flags: 'verify_opening' },
    { sku: 'NMH446', qty: 5, min: 10, row: 59, block: 1, flags: 'verify_opening' },
    { sku: 'NMH456', qty: 1, min: 10, row: 60, block: 1, flags: 'verify_opening' },
    { sku: 'NMH457', qty: 14, min: 10, row: 61, block: 1, flags: 'verify_opening' },
    { sku: 'NMH458', qty: null, min: 10, row: 62, block: 1, flags: 'count_unknown' },
    { sku: 'NMH459', qty: null, min: 10, row: 63, block: 1, flags: 'count_unknown' },
    { sku: 'NMH462', qty: 4, min: 10, row: 64, block: 1, flags: 'verify_opening' },
    { sku: 'NMH238', qty: 30, min: 30, row: 65, block: 1, flags: 'verify_opening' },
    { sku: 'NMH418', qty: 38, min: 50, row: 66, block: 1, flags: 'verify_opening' },
    { sku: 'NMH496S', qty: 35, min: 40, row: 67, block: 1, flags: 'verify_opening' },
    { sku: 'NMH496L', qty: 38, min: 30, row: 68, block: 1, flags: 'verify_opening' },
    { sku: 'NMH425', qty: 63, min: 30, row: 69, block: 1, flags: 'verify_opening' },
    { sku: 'NMH496M', qty: 10, min: 30, row: 70, block: 1, flags: 'verify_opening' },
    { sku: 'NMH428', qty: 114, min: 60, row: 71, block: 1, flags: 'duplicate_code' },
    { sku: 'NMH430', qty: 20, min: 60, row: 72, block: 1, flags: 'verify_opening' },
    { sku: 'NMH498', qty: 4, min: 25, row: 73, block: 1, flags: 'verify_opening' },
    { sku: 'NMH499', qty: 26, min: 15, row: 74, block: 1, flags: 'verify_opening' },
    { sku: 'NMH500', qty: 27, min: 20, row: 75, block: 1, flags: 'verify_opening' },
    { sku: 'NMH502B', qty: 10, min: 20, row: 76, block: 1, flags: 'verify_opening' },
    { sku: 'NMH502R', qty: 10, min: 20, row: 77, block: 1, flags: 'verify_opening' },
    { sku: 'NMH505', qty: 23, min: 60, row: 78, block: 1, flags: 'verify_opening' },
    { sku: 'NMH451', qty: 20, min: 30, row: 79, block: 1, flags: 'verify_opening' },
    { sku: 'NMH413B_R2', qty: 12, min: null, row: 80, block: 1, flags: 'duplicate_code,min_unconfigured', sourceCode: 'NMH413B' },
    { sku: 'NMH497S', qty: 34, min: 20, row: 81, block: 1, flags: 'verify_opening' },
    { sku: 'NMH497L', qty: 25, min: 20, row: 82, block: 1, flags: 'verify_opening' },
    { sku: 'NMH501', qty: 7, min: 20, row: 83, block: 1, flags: 'verify_opening' },
    { sku: 'NMH504', qty: 80, min: 50, row: 84, block: 1, flags: 'verify_opening' },
    { sku: 'NMH484', qty: null, min: 20, row: 85, block: 1, flags: 'count_unknown' },
    { sku: 'NMH428_R2', qty: 102, min: 50, row: 86, block: 1, flags: 'duplicate_code', sourceCode: 'NMH428' },
    { sku: 'NMH281G', qty: 9, min: 20, row: 87, block: 1, flags: 'verify_opening' },
    { sku: 'NMH498G', qty: 6, min: 20, row: 88, block: 1, flags: 'verify_opening' },
    { sku: 'NMH469', qty: null, min: 30, row: 89, block: 1, flags: 'count_unknown' },
    { sku: 'NMH498MG', qty: null, min: 10, row: 90, block: 1, flags: 'count_unknown' },
    { sku: 'NMH264', qty: null, min: null, row: 91, block: 1, flags: 'count_unknown,min_unconfigured' },
    { sku: 'NMH265', qty: null, min: null, row: 92, block: 1, flags: 'count_unknown,min_unconfigured' },
    { sku: 'TBASE', qty: null, min: null, row: 93, block: 1, flags: 'count_unknown,min_unconfigured' },
    { sku: 'RB BASE', qty: null, min: null, row: 94, block: 1, flags: 'count_unknown,min_unconfigured' },
    { sku: 'NMH415', qty: 14, min: null, row: 95, block: 1, flags: 'min_unconfigured' },
    { sku: 'NB11', qty: null, min: null, row: 96, block: 1, flags: 'count_unknown,min_unconfigured' },
    { sku: 'NMH506', qty: 1, min: 20, row: 97, block: 1, flags: 'verify_opening' },
    { sku: 'NMH507', qty: null, min: 20, row: 98, block: 1, flags: 'count_unknown' },
    { sku: 'NMH508', qty: null, min: 20, row: 99, block: 1, flags: 'count_unknown' },
    // Block 2 - RBZ series (G-J)
    { sku: 'RBZ204', qty: null, min: 10, row: 2, block: 2, flags: 'count_unknown' },
    { sku: 'RBZ207', qty: 10, min: 10, row: 3, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ225', qty: 20, min: 15, row: 4, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ155', qty: 20, min: 20, row: 5, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ153', qty: null, min: 20, row: 6, block: 2, flags: 'count_unknown' },
    { sku: 'RBZ154', qty: 11, min: 20, row: 7, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ159', qty: 10, min: 20, row: 8, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ202', qty: 29, min: 20, row: 9, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ171', qty: 6, min: 25, row: 10, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ169', qty: 23, min: 25, row: 11, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ151', qty: 13, min: 20, row: 12, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ152', qty: 9, min: 20, row: 13, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ240', qty: 15, min: 15, row: 14, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ157', qty: 29, min: 15, row: 15, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ156', qty: 13, min: 15, row: 16, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ199', qty: 17, min: 10, row: 17, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ201', qty: 9, min: 15, row: 18, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ212', qty: 27, min: 20, row: 19, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ217', qty: 6, min: 15, row: 20, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ219', qty: 8, min: 15, row: 21, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ227', qty: 20, min: 15, row: 22, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ158', qty: 18, min: 20, row: 23, block: 2, flags: 'verify_opening' },
    { sku: 'RBZ209', qty: 4, min: null, row: 24, block: 2, flags: 'min_unconfigured' },
    { sku: 'RBZ226', qty: 56, min: null, row: 25, block: 2, flags: 'min_unconfigured' },
    { sku: 'RBZ172', qty: 8, min: null, row: 26, block: 2, flags: 'min_unconfigured' },
    { sku: 'RBZ218', qty: null, min: null, row: 27, block: 2, flags: 'count_unknown,min_unconfigured' },
    { sku: 'RBZ170', qty: null, min: null, row: 28, block: 2, flags: 'count_unknown,min_unconfigured' },
    // Block 3 - ACR, SM, BASE series (L-O)
    { sku: 'ACR101A', qty: null, min: null, row: 2, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR101B', qty: 1, min: null, row: 3, block: 3, flags: 'min_unconfigured' },
    { sku: 'ACR101C', qty: 3, min: null, row: 4, block: 3, flags: 'min_unconfigured' },
    { sku: 'ACR102A', qty: null, min: null, row: 5, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR102B', qty: null, min: null, row: 6, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR102C', qty: null, min: null, row: 7, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR103A', qty: 27, min: null, row: 8, block: 3, flags: 'min_unconfigured' },
    { sku: 'ACR103B', qty: 21, min: null, row: 9, block: 3, flags: 'min_unconfigured' },
    { sku: 'ACR103C', qty: 25, min: null, row: 10, block: 3, flags: 'min_unconfigured' },
    { sku: 'ACR104A', qty: 2, min: null, row: 11, block: 3, flags: 'min_unconfigured' },
    { sku: 'ACR104B', qty: 4, min: null, row: 12, block: 3, flags: 'min_unconfigured' },
    { sku: 'ACR104C', qty: null, min: null, row: 13, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR105A', qty: null, min: null, row: 14, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR105B', qty: null, min: null, row: 15, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR105C', qty: null, min: null, row: 16, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR106A', qty: null, min: null, row: 17, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR106B', qty: null, min: null, row: 18, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR106C', qty: null, min: null, row: 19, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR107', qty: null, min: null, row: 20, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR108', qty: null, min: null, row: 21, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR109', qty: null, min: null, row: 22, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR110', qty: null, min: null, row: 23, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR111', qty: 1, min: null, row: 24, block: 3, flags: 'min_unconfigured' },
    { sku: 'ACR112', qty: null, min: null, row: 25, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR113', qty: null, min: null, row: 26, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR114', qty: null, min: null, row: 27, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR115A', qty: 1, min: null, row: 28, block: 3, flags: 'min_unconfigured' },
    { sku: 'ACR115B', qty: 16, min: null, row: 29, block: 3, flags: 'min_unconfigured' },
    { sku: 'ACR116', qty: 5, min: null, row: 30, block: 3, flags: 'min_unconfigured' },
    { sku: 'ACR117', qty: null, min: null, row: 31, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR118', qty: 1, min: null, row: 32, block: 3, flags: 'min_unconfigured' },
    { sku: 'ACR119', qty: null, min: null, row: 33, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACR120', qty: null, min: null, row: 34, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'BASES', qty: null, min: null, row: 35, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'BASEM', qty: null, min: null, row: 36, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'BASEL', qty: null, min: null, row: 37, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'ACRA+L', qty: null, min: null, row: 38, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'SM MODEL', qty: null, min: null, row: 39, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'SM11', qty: null, min: null, row: 40, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'SM14', qty: null, min: null, row: 41, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'SM17', qty: null, min: null, row: 42, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'SM15', qty: null, min: null, row: 43, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'SM18', qty: null, min: null, row: 44, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'SM19', qty: null, min: null, row: 45, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'SM21', qty: null, min: null, row: 46, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'SM22', qty: null, min: null, row: 47, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'SM12', qty: null, min: null, row: 48, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'SM20', qty: 10, min: null, row: 49, block: 3, flags: 'min_unconfigured' },
    { sku: 'SM13', qty: null, min: null, row: 50, block: 3, flags: 'count_unknown,min_unconfigured' },
    { sku: 'CUSTOM', qty: null, min: null, row: 51, block: 3, flags: 'count_unknown,min_unconfigured,placeholder' },
    { sku: 'SM16', qty: null, min: null, row: 52, block: 3, flags: 'count_unknown,min_unconfigured' },
    // Block 4 - GYA series (Q-T)
    { sku: 'GYA12', qty: 5, min: null, row: 2, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA13', qty: 4, min: null, row: 3, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA15', qty: 10, min: null, row: 4, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA16', qty: 4, min: null, row: 5, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA2', qty: 17, min: null, row: 6, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA3', qty: 7, min: null, row: 7, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA5', qty: 1, min: null, row: 8, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA7', qty: 7, min: null, row: 9, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA10', qty: null, min: null, row: 10, block: 4, flags: 'count_unknown,min_unconfigured' },
    { sku: 'GYA36', qty: 1, min: null, row: 11, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA37', qty: 2, min: null, row: 12, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA40', qty: 2, min: null, row: 13, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA41', qty: 15, min: null, row: 14, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA42', qty: null, min: null, row: 15, block: 4, flags: 'count_unknown,min_unconfigured' },
    { sku: 'GYA44', qty: 7, min: null, row: 16, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA45', qty: null, min: null, row: 17, block: 4, flags: 'count_unknown,min_unconfigured' },
    { sku: 'GYA9', qty: null, min: null, row: 18, block: 4, flags: 'count_unknown,min_unconfigured' },
    { sku: 'GYA1L', qty: 4, min: null, row: 19, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA11', qty: 3, min: null, row: 20, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA33', qty: 3, min: null, row: 21, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA1S', qty: null, min: null, row: 22, block: 4, flags: 'count_unknown,min_unconfigured' },
    { sku: 'GYA39', qty: 6, min: null, row: 23, block: 4, flags: 'min_unconfigured' },
    { sku: 'GYA5LIGHT', qty: null, min: null, row: 24, block: 4, flags: 'count_unknown,min_unconfigured' },
  ];

  // Determine category from SKU prefix
  const getCategory = (sku: string): string => {
    if (sku.startsWith('NMH')) return 'NMH';
    if (sku.startsWith('RBZ')) return 'RBZ';
    if (sku.startsWith('ACR')) return 'ACR';
    if (sku.startsWith('GYA')) return 'GYA';
    if (sku.startsWith('SM')) return 'SM';
    if (sku.startsWith('RB') || sku.startsWith('TBASE') || sku.startsWith('NB')) return 'BASE';
    return 'OTHER';
  };

  const batchId = 'IMPORT-STOCK-CSV-2026-09';
  let productCount = 0;

  for (const item of stockItems) {
    const isDuplicate = item.flags?.includes('duplicate_code') || false;
    const isPlaceholder = item.flags?.includes('placeholder') || false;
    // Don't activate products that are placeholders or have unresolved duplicates
    const isActive = !isDuplicate && !isPlaceholder && item.qty !== null;

    await prisma.product.upsert({
      where: { sku: item.sku },
      update: {
        importFlags: item.flags,
        isActive: isActive,
      },
      create: {
        companyId: company.id,
        sku: item.sku,
        name: (item as any).sourceCode || item.sku, // Use source code as name for duplicates
        category: getCategory(item.sku),
        productType: 'FINISHED_CATALOGUE',
        baseUom: 'NOS',
        isManufactured: true,
        isActive: isActive,
        importBatchId: batchId,
        importRow: item.row,
        importBlock: item.block,
        importFlags: item.flags,
      },
    });

    // Create unverified inventory balance for items with known quantity
    if (item.qty !== null && !isDuplicate && !isPlaceholder) {
      const product = await prisma.product.findUnique({ where: { sku: item.sku } });
      if (product) {
        await prisma.inventoryBalance.upsert({
          where: {
            productId_warehouseCode_condition: {
              productId: product.id,
              warehouseCode: 'FINISHED_GOODS',
              condition: 'USABLE',
            },
          },
          update: {},
          create: {
            productId: product.id,
            warehouseCode: 'FINISHED_GOODS',
            condition: 'USABLE',
            physicalQty: item.qty,
            reservedQty: 0,
            holdQty: 0,
          },
        });

        // Create reorder policy if minimum is known
        if (item.min !== null) {
          await prisma.reorderPolicy.upsert({
            where: { id: `reorder-${product.id}` },
            update: {},
            create: {
              id: `reorder-${product.id}`,
              productId: product.id,
              warehouseCode: 'FINISHED_GOODS',
              minimumQty: item.min,
              isActive: true,
            },
          });
        }
      }
    }
    productCount++;
  }

  console.log(`✅ Created/updated ${productCount} products from stock CSV`);
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('Login accounts (all use password: password123):');
  console.log('  md@hanicraft.com          — Managing Director');
  console.log('  gm@hanicraft.com          — General Manager');
  console.log('  sales@hanicraft.com       — Sales Officer');
  console.log('  finance@hanicraft.com     — Finance Officer');
  console.log('  stock@hanicraft.com       — Stock Manager');
  console.log('  production@hanicraft.com  — Production Manager');
  console.log('  cnc@hanicraft.com         — CNC Operator');
  console.log('  laser@hanicraft.com       — Laser Operator');
  console.log('  stationary@hanicraft.com  — Stationary Operator');
  console.log('  finishing.sup@hanicraft.com — Finishing Supervisor');
  console.log('  finishing01-11@hanicraft.com — Finishing Workers');
  console.log('  acrylic01-02@hanicraft.com  — Acrylic Staff');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

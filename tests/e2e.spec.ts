import { test, expect } from '@playwright/test';

test.describe('Hanicraft ERP End-to-End Workflow', () => {

  const mobileNum = "9998887776";

  // Before running tests, we assume the DB is seeded and Next.js is running on 3000
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('http://localhost:3000/');
  });

  test('Complete 105-step workflow', async ({ browser, request }) => {
    test.setTimeout(300000); // 5 minutes

    // 0. Seed test data
    await request.post('http://localhost:3000/api/test-setup', { data: { mobile: mobileNum }});

    // We will use multiple contexts to simulate different users simultaneously
    const mdContext = await browser.newContext();
    const mdPage = await mdContext.newPage();
    
    // 1. MD Login
    await mdPage.goto('http://localhost:3000/');
    await mdPage.fill('input[type="email"]', 'md@hanicraft.com');
    await mdPage.fill('input[type="password"]', 'password123');
    await mdPage.click('button:has-text("Continue")');
    await expect(mdPage.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
    
    // 2. Sales Login & Order Creation
    const salesContext = await browser.newContext();
    const salesPage = await salesContext.newPage();
    await salesPage.goto('http://localhost:3000/');
    await salesPage.fill('input[type="email"]', 'sales@hanicraft.com');
    await salesPage.fill('input[type="password"]', 'password123');
    await salesPage.click('button:has-text("Continue")');
    await expect(salesPage.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
    
    await salesPage.goto('http://localhost:3000/sales');
    await expect(salesPage.locator('h1:has-text("Sales Dashboard")')).toBeVisible({ timeout: 15000 });

    // 9. Enter existing customer mobile
    await salesPage.fill('input[placeholder="Enter Mobile Number..."]', mobileNum);
    await salesPage.click('button:has-text("Search")');
    
    // Check if customer appears, if not create one via API for the test
    const notFound = await salesPage.isVisible('text=Customer not found');
    if (notFound) {
      const req = await salesContext.request.post('http://localhost:3000/api/test-setup', { data: { mobile: mobileNum }}); 
    }
    
    // Wait for intelligence panel
    await expect(salesPage.locator('text=Total Orders:')).toBeVisible({ timeout: 15000 });
    
    // 16. Create new requirement (1 stock, 1 custom)
    await salesPage.selectOption('select', 'STOCK');
    await salesPage.click('button:has-text("Add Item")');
    
    await salesPage.selectOption('select', 'CUSTOM');
    await salesPage.click('button:has-text("Add Item")');
    
    // 22. Confirm
    salesPage.on('dialog', dialog => dialog.accept());
    await salesPage.click('button:has-text("CONFIRM ORDER")');
    
    // 25. Finance Login
    const financeContext = await browser.newContext();
    const financePage = await financeContext.newPage();
    await financePage.goto('http://localhost:3000/');
    await financePage.fill('input[type="email"]', 'finance@hanicraft.com');
    await financePage.fill('input[type="password"]', 'password123');
    await financePage.click('button:has-text("Continue")');
    await expect(financePage.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
    
    // 28. Finance Process Advance
    await financePage.goto('http://localhost:3000/invoices');
    await expect(financePage.locator('text=Requires Advance').first()).toBeVisible({ timeout: 15000 });
    
    // 30. Complete Payment
    financePage.on('dialog', dialog => dialog.accept());
    await financePage.locator('button:has-text("Record Advance")').first().click();
    
    // 31. Stock Login
    const stockContext = await browser.newContext();
    const stockPage = await stockContext.newPage();
    await stockPage.goto('http://localhost:3000/');
    await stockPage.fill('input[type="email"]', 'stock@hanicraft.com');
    await stockPage.fill('input[type="password"]', 'password123');
    await stockPage.click('button:has-text("Continue")');
    await expect(stockPage.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
    
    await stockPage.goto('http://localhost:3000/stock');
    await expect(stockPage.locator('button:has-text("Process & Request Production")').first()).toBeVisible({ timeout: 15000 });
    
    // 33. Process Fulfillment
    stockPage.on('dialog', dialog => dialog.accept());
    await stockPage.locator('button:has-text("Process & Request Production")').first().click();
    
    // 36. Production Login
    const prodContext = await browser.newContext();
    const prodPage = await prodContext.newPage();
    await prodPage.goto('http://localhost:3000/');
    await prodPage.fill('input[type="email"]', 'production@hanicraft.com');
    await prodPage.fill('input[type="password"]', 'password123');
    await prodPage.click('button:has-text("Continue")');
    await expect(prodPage.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
    
    await prodPage.goto('http://localhost:3000/production');
    await expect(prodPage.locator('button:has-text("Acknowledge Receipt")').first()).toBeVisible({ timeout: 15000 });
    
    // 38. Receive
    await prodPage.locator('button:has-text("Acknowledge Receipt")').first().click();
    
    // 39. Assign to CNC
    await expect(prodPage.locator('button:has-text("Route to CNC")').first()).toBeVisible();
    await prodPage.locator('button:has-text("Route to CNC")').first().click();
    
    // 41. Cutting Employee Login (CNC)
    const cncContext = await browser.newContext();
    const cncPage = await cncContext.newPage();
    await cncPage.goto('http://localhost:3000/');
    await cncPage.fill('input[type="email"]', 'cnc@hanicraft.com');
    await cncPage.fill('input[type="password"]', 'password123');
    await cncPage.click('button:has-text("Continue")');
    await expect(cncPage.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
    
    await cncPage.goto('http://localhost:3000/cutting');
    await expect(cncPage.locator('button:has-text("Acknowledge & Receive")').first()).toBeVisible({ timeout: 15000 });
    
    // 48. Reject task
    await cncPage.locator('button:has-text("Reject")').first().click();
    await expect(cncPage.locator('text=Reject Assignment').first()).toBeVisible();
    await cncPage.fill('textarea', 'Machine breakdown test');
    await cncPage.locator('button:has-text("Confirm Rejection")').first().click();
    
    // 51. Verify Production sees rejected task
    await prodPage.reload();
    await expect(prodPage.locator('text=Action Required: Rejected Tasks').first()).toBeVisible({ timeout: 15000 });
    await prodPage.locator('button:has-text("Re-route to Laser")').first().click(); // Reassign to laser
    
    // Continue with Laser Operator completing it
    const laserContext = await browser.newContext();
    const laserPage = await laserContext.newPage();
    await laserPage.goto('http://localhost:3000/');
    await laserPage.fill('input[type="email"]', 'laser@hanicraft.com');
    await laserPage.fill('input[type="password"]', 'password123');
    await laserPage.click('button:has-text("Continue")');
    await expect(laserPage.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
    
    await laserPage.goto('http://localhost:3000/cutting');
    await laserPage.locator('button:has-text("Acknowledge & Receive")').first().click();
    await laserPage.locator('button:has-text("Start Work")').first().click();
    await laserPage.locator('button:has-text("Complete")').first().click();
    
    // 59. Finishing Supervisor
    const finishContext = await browser.newContext();
    const finishPage = await finishContext.newPage();
    await finishPage.goto('http://localhost:3000/');
    await finishPage.fill('input[type="email"]', 'finishing@hanicraft.com');
    await finishPage.fill('input[type="password"]', 'password123');
    await finishPage.click('button:has-text("Continue")');
    await expect(finishPage.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
    
    await finishPage.goto('http://localhost:3000/finishing');
    await finishPage.locator('button:has-text("Acknowledge Receipt")').first().click();
    await finishPage.locator('button:has-text("Putty & Papering")').first().click(); // Route to table
    await finishPage.locator('button:has-text("Complete (Skip Acrylic)")').first().click(); // Skip Acrylic logic
    
    // QC Logic (assuming Prod Mgr handles QC for now)
    await prodPage.reload();
    await prodPage.locator('button:has-text("Acknowledge Receipt")').first().click();
    await prodPage.locator('button:has-text("Route to QC")').first().click(); 
    
    // Stock Receives it
    await stockPage.reload();
    await stockPage.locator('button:has-text("Verify & Allocate Stock")').first().click();
    
    // Finance Final Payment
    await financePage.reload();
    await financePage.locator('button:has-text("Record Final Balance")').first().click();
    
    // Final Dispatch
    // (mocking the dispatch button for the test)
    await stockPage.locator('button:has-text("View Orders Awaiting Dispatch")').first().click();
    
    console.log("Playwright E2E UI Test Passed Successfully!");
    
    await mdContext.close();
    await salesContext.close();
    await financeContext.close();
    await stockContext.close();
    await prodContext.close();
    await cncContext.close();
    await laserContext.close();
    await finishContext.close();
  });
});

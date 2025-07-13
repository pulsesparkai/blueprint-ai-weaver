import { test, expect } from '@playwright/test';

test.describe('Pipeline Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should create a new pipeline from dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.click('text=Dashboard');
    await expect(page).toHaveURL('/dashboard');

    // Create new pipeline
    await page.click('text=Create Pipeline');
    await expect(page).toHaveURL(/\/editor/);

    // Add input node
    await page.click('[data-testid="add-input-node"]');
    
    // Verify node was added
    await expect(page.locator('[data-testid="input-node"]')).toBeVisible();

    // Add LLM node
    await page.click('[data-testid="add-llm-node"]');
    await expect(page.locator('[data-testid="llm-node"]')).toBeVisible();

    // Connect nodes
    await page.dragAndDrop(
      '[data-testid="input-node"] [data-testid="output-handle"]',
      '[data-testid="llm-node"] [data-testid="input-handle"]'
    );

    // Save pipeline
    await page.keyboard.press('Control+s');
    
    // Verify save success
    await expect(page.locator('text=Pipeline saved')).toBeVisible();
  });

  test('should run pipeline simulation', async ({ page }) => {
    // Navigate to editor
    await page.goto('/editor');

    // Set up basic pipeline (input -> LLM)
    await page.click('[data-testid="add-input-node"]');
    await page.click('[data-testid="add-llm-node"]');
    
    // Configure input
    await page.click('[data-testid="input-node"]');
    await page.fill('[data-testid="input-query"]', 'Test query');

    // Run simulation
    await page.click('[data-testid="run-simulation"]');

    // Verify simulation starts
    await expect(page.locator('[data-testid="simulation-status"]')).toContainText('Running');

    // Wait for completion (with timeout)
    await page.waitForSelector('[data-testid="simulation-results"]', { timeout: 30000 });
    
    // Verify results are displayed
    await expect(page.locator('[data-testid="simulation-results"]')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Navigate to editor
    await page.goto('/editor');

    // Add LLM node without configuration
    await page.click('[data-testid="add-llm-node"]');

    // Try to run simulation without setup
    await page.click('[data-testid="run-simulation"]');

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Configuration required')).toBeVisible();
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    await page.goto('/editor');

    // Test undo/redo shortcuts
    await page.click('[data-testid="add-input-node"]');
    await expect(page.locator('[data-testid="input-node"]')).toBeVisible();

    // Undo
    await page.keyboard.press('Control+z');
    await expect(page.locator('[data-testid="input-node"]')).not.toBeVisible();

    // Redo
    await page.keyboard.press('Control+Shift+z');
    await expect(page.locator('[data-testid="input-node"]')).toBeVisible();

    // Test save shortcut
    await page.keyboard.press('Control+s');
    await expect(page.locator('text=Autosaved')).toBeVisible();
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Verify mobile responsive design
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Navigate using mobile menu
    await page.click('[data-testid="mobile-menu"]');
    await page.click('text=Editor');
    
    await expect(page).toHaveURL(/\/editor/);
  });

  test('should handle network failures', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/**', route => route.abort());

    await page.goto('/editor');
    await page.click('[data-testid="add-llm-node"]');
    await page.click('[data-testid="run-simulation"]');

    // Verify error handling
    await expect(page.locator('text=Network error')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });
});

test.describe('Template Usage', () => {
  test('should load and use template', async ({ page }) => {
    await page.goto('/templates');

    // Select a template
    await page.click('[data-testid="template-card"]:first-child');
    await page.click('text=Use Template');

    // Verify redirect to editor with template loaded
    await expect(page).toHaveURL(/\/editor/);
    await expect(page.locator('[data-testid="template-nodes"]')).toBeVisible();
  });
});

test.describe('Integration Management', () => {
  test('should manage API integrations', async ({ page }) => {
    await page.goto('/integrations');

    // Add new integration
    await page.click('text=Add Integration');
    await page.selectOption('[data-testid="integration-type"]', 'openai');
    
    // Fill configuration
    await page.fill('[data-testid="api-key"]', 'test-api-key');
    await page.click('text=Save');

    // Verify integration is added
    await expect(page.locator('[data-testid="integration-list"]')).toContainText('OpenAI');
  });
});
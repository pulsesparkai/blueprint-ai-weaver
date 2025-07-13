import { test, expect } from '@playwright/test';

// Load testing configuration
const CONCURRENT_USERS = 10;
const TEST_DURATION = 60000; // 1 minute
const THINK_TIME = 1000; // 1 second between actions

test.describe('Load Testing - Pipeline Execution', () => {
  test.describe.configure({ mode: 'parallel' });

  Array.from({ length: CONCURRENT_USERS }, (_, i) => {
    test(`User ${i + 1} - Concurrent pipeline execution`, async ({ page }) => {
      const startTime = Date.now();
      const metrics = {
        pageLoads: 0,
        simulations: 0,
        errors: 0,
        totalResponseTime: 0
      };

      while (Date.now() - startTime < TEST_DURATION) {
        try {
          // Navigate to editor
          const navStart = Date.now();
          await page.goto('/editor');
          metrics.pageLoads++;
          metrics.totalResponseTime += Date.now() - navStart;

          await page.waitForTimeout(THINK_TIME);

          // Create simple pipeline
          await page.click('[data-testid="add-input-node"]');
          await page.click('[data-testid="add-llm-node"]');

          await page.waitForTimeout(THINK_TIME);

          // Run simulation
          const simStart = Date.now();
          await page.click('[data-testid="run-simulation"]');
          
          // Wait for completion or timeout
          try {
            await page.waitForSelector('[data-testid="simulation-results"]', { timeout: 15000 });
            metrics.simulations++;
            metrics.totalResponseTime += Date.now() - simStart;
          } catch (error) {
            metrics.errors++;
            console.error(`User ${i + 1} simulation timeout:`, error);
          }

          await page.waitForTimeout(THINK_TIME);

        } catch (error) {
          metrics.errors++;
          console.error(`User ${i + 1} error:`, error);
        }
      }

      // Log performance metrics
      console.log(`User ${i + 1} Metrics:`, {
        ...metrics,
        avgResponseTime: metrics.totalResponseTime / (metrics.pageLoads + metrics.simulations),
        errorRate: (metrics.errors / (metrics.pageLoads + metrics.simulations)) * 100
      });

      // Basic performance assertions
      expect(metrics.errors).toBeLessThan(metrics.pageLoads * 0.1); // Less than 10% error rate
      expect(metrics.avgResponseTime).toBeLessThan(5000); // Average response under 5 seconds
    });
  });

  test('Edge function stress test', async ({ page }) => {
    const promises = [];
    const CONCURRENT_REQUESTS = 20;

    // Create multiple concurrent requests to edge functions
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      const promise = page.request.post('/api/pipeline-simulator', {
        data: {
          pipeline: {
            nodes: [
              { id: 'input-1', type: 'input', data: { query: `Test query ${i}` } },
              { id: 'llm-1', type: 'llm', data: { provider: 'openai', model: 'gpt-3.5-turbo' } }
            ],
            edges: [{ source: 'input-1', target: 'llm-1' }]
          }
        }
      });
      promises.push(promise);
    }

    // Wait for all requests to complete
    const responses = await Promise.allSettled(promises);
    
    // Analyze results
    const successful = responses.filter(r => r.status === 'fulfilled').length;
    const failed = responses.filter(r => r.status === 'rejected').length;

    console.log(`Stress test results: ${successful} successful, ${failed} failed`);

    // Assert acceptable failure rate
    expect(failed / CONCURRENT_REQUESTS).toBeLessThan(0.1); // Less than 10% failure rate
  });

  test('Database connection pool test', async ({ page }) => {
    const promises = [];
    const CONCURRENT_DB_OPERATIONS = 50;

    // Create multiple concurrent database operations
    for (let i = 0; i < CONCURRENT_DB_OPERATIONS; i++) {
      const promise = page.request.post('/api/blueprints', {
        data: {
          title: `Load Test Blueprint ${i}`,
          description: 'Generated for load testing',
          nodes: [],
          edges: []
        }
      });
      promises.push(promise);
    }

    const start = Date.now();
    const responses = await Promise.allSettled(promises);
    const duration = Date.now() - start;

    const successful = responses.filter(r => r.status === 'fulfilled').length;
    const avgResponseTime = duration / CONCURRENT_DB_OPERATIONS;

    console.log(`DB load test: ${successful}/${CONCURRENT_DB_OPERATIONS} successful, avg ${avgResponseTime}ms`);

    // Performance assertions
    expect(successful / CONCURRENT_DB_OPERATIONS).toBeGreaterThan(0.9); // 90% success rate
    expect(avgResponseTime).toBeLessThan(2000); // Average under 2 seconds
  });

  test('Memory usage monitoring', async ({ page }) => {
    // Monitor memory usage during intensive operations
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Perform memory-intensive operations
    for (let i = 0; i < 100; i++) {
      await page.goto('/editor');
      
      // Add many nodes
      for (let j = 0; j < 10; j++) {
        await page.click('[data-testid="add-input-node"]');
      }
      
      // Clear and repeat
      await page.reload();
    }

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    const memoryIncrease = finalMemory - initialMemory;
    console.log(`Memory usage: ${initialMemory} -> ${finalMemory} (${memoryIncrease} increase)`);

    // Assert no significant memory leaks (less than 50MB increase)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});

test.describe('Performance Benchmarks', () => {
  test('Page load performance', async ({ page }) => {
    const metrics = [];

    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - start;
      
      metrics.push(loadTime);
    }

    const avgLoadTime = metrics.reduce((a, b) => a + b, 0) / metrics.length;
    const maxLoadTime = Math.max(...metrics);

    console.log(`Page load metrics: avg ${avgLoadTime}ms, max ${maxLoadTime}ms`);

    // Performance assertions
    expect(avgLoadTime).toBeLessThan(3000); // Average under 3 seconds
    expect(maxLoadTime).toBeLessThan(5000); // Max under 5 seconds
  });

  test('Bundle size analysis', async ({ page }) => {
    // Check network requests to estimate bundle sizes
    const responses: any[] = [];
    
    page.on('response', response => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        responses.push({
          url: response.url(),
          size: response.headers()['content-length'] || 0
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const totalSize = responses.reduce((sum, r) => sum + parseInt(r.size || '0'), 0);
    const jsSize = responses
      .filter(r => r.url.includes('.js'))
      .reduce((sum, r) => sum + parseInt(r.size || '0'), 0);

    console.log(`Bundle analysis: Total ${totalSize} bytes, JS ${jsSize} bytes`);

    // Bundle size assertions (adjust based on your requirements)
    expect(jsSize).toBeLessThan(2 * 1024 * 1024); // JS under 2MB
    expect(totalSize).toBeLessThan(5 * 1024 * 1024); // Total under 5MB
  });
});
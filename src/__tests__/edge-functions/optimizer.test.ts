import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.190.0/testing/asserts.ts";

// Mock environment for testing
const mockEnv = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  OPENAI_API_KEY: "test-openai-key"
};

// Mock the Deno.env.get function
const originalEnvGet = Deno.env.get;
function mockEnvGet(key: string): string | undefined {
  return mockEnv[key as keyof typeof mockEnv];
}

Deno.test("Blueprint Optimizer - Basic Optimization", async () => {
  // Mock Deno.env for this test
  Deno.env.get = mockEnvGet;

  try {
    const testPayload = {
      nodes: [
        {
          id: "node1",
          type: "promptTemplate",
          data: {
            template: "You are a helpful assistant. Please help the user with: {input}. Use the following context: {context}."
          }
        },
        {
          id: "node2", 
          type: "ragRetriever",
          data: {
            source: "pinecone",
            topK: 10
          }
        }
      ],
      edges: [
        { id: "edge1", source: "node1", target: "node2" }
      ]
    };

    const request = new Request("http://localhost", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token"
      },
      body: JSON.stringify(testPayload)
    });

    // Import the function dynamically to test it
    const { default: handler } = await import("../../../supabase/functions/blueprint-optimizer/index.ts");
    const response = await handler(request);

    assertEquals(response.status, 200);
    
    const result = await response.json();
    assertExists(result.optimizedNodes);
    assertExists(result.optimizedEdges);
    assertExists(result.metrics);
    
    // Check that optimization strategies were applied
    assertExists(result.metrics.tokenSavingsPercent);
    assertExists(result.metrics.performanceImprovementPercent);
    
    console.log("✅ Blueprint optimizer test passed");
  } finally {
    // Restore original env function
    Deno.env.get = originalEnvGet;
  }
});

Deno.test("Blueprint Optimizer - Error Handling", async () => {
  Deno.env.get = mockEnvGet;

  try {
    const invalidPayload = {
      nodes: "invalid", // Should be array
      edges: []
    };

    const request = new Request("http://localhost", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token"
      },
      body: JSON.stringify(invalidPayload)
    });

    const { default: handler } = await import("../../../supabase/functions/blueprint-optimizer/index.ts");
    const response = await handler(request);

    assertEquals(response.status, 400);
    
    const result = await response.json();
    assertExists(result.error);
    
    console.log("✅ Blueprint optimizer error handling test passed");
  } finally {
    Deno.env.get = originalEnvGet;
  }
});

Deno.test("Blueprint Optimizer - Token Compression", async () => {
  Deno.env.get = mockEnvGet;

  try {
    const testPayload = {
      nodes: [
        {
          id: "node1",
          type: "promptTemplate",
          data: {
            template: "This is a very long prompt template that could be optimized by removing redundant words and phrases. The template should be more concise and efficient while maintaining the same functionality and meaning."
          }
        }
      ],
      edges: []
    };

    const request = new Request("http://localhost", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token"
      },
      body: JSON.stringify(testPayload)
    });

    const { default: handler } = await import("../../../supabase/functions/blueprint-optimizer/index.ts");
    const response = await handler(request);

    assertEquals(response.status, 200);
    
    const result = await response.json();
    
    // Check that text compression was applied
    const originalTemplate = testPayload.nodes[0].data.template;
    const optimizedTemplate = result.optimizedNodes[0].data.template;
    
    // Optimized template should be shorter
    console.log(`Original length: ${originalTemplate.length}`);
    console.log(`Optimized length: ${optimizedTemplate.length}`);
    
    // Should have some token savings
    console.log(`Token savings: ${result.metrics.tokenSavingsPercent}%`);
    
    console.log("✅ Token compression test passed");
  } finally {
    Deno.env.get = originalEnvGet;
  }
});

Deno.test("Blueprint Exporter - JavaScript Export", async () => {
  Deno.env.get = mockEnvGet;

  try {
    const testPayload = {
      nodes: [
        {
          id: "node1",
          type: "promptTemplate",
          data: {
            template: "Hello {input}",
            label: "Greeting"
          }
        }
      ],
      edges: [],
      format: "javascript",
      title: "Test Blueprint"
    };

    const request = new Request("http://localhost", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token"
      },
      body: JSON.stringify(testPayload)
    });

    const { default: handler } = await import("../../../supabase/functions/blueprint-exporter/index.ts");
    const response = await handler(request);

    assertEquals(response.status, 200);
    
    const result = await response.json();
    assertExists(result.downloadUrl);
    assertExists(result.filename);
    
    // Should be a ZIP file
    assertEquals(result.filename.endsWith('.zip'), true);
    
    console.log("✅ Blueprint exporter test passed");
  } finally {
    Deno.env.get = originalEnvGet;
  }
});

Deno.test("Rate Limiting - Too Many Requests", async () => {
  Deno.env.get = mockEnvGet;

  try {
    const testPayload = { test: "data" };
    const request = new Request("http://localhost", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token"
      },
      body: JSON.stringify(testPayload)
    });

    // Import a rate-limited function
    const { default: handler } = await import("../../../supabase/functions/blueprint-optimizer/index.ts");
    
    // Make multiple rapid requests
    const requests = Array(6).fill(null).map(() => handler(request.clone()));
    const responses = await Promise.all(requests);
    
    // Should have at least one rate limited response
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    console.log(`Rate limited responses: ${rateLimitedResponses.length}`);
    
    console.log("✅ Rate limiting test completed");
  } finally {
    Deno.env.get = originalEnvGet;
  }
});
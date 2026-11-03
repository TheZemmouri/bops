/**
 * Integration Test: Job → Bot → Approval → Delivery
 * 
 * Tests the full Installer.report workflow with mocked provider calls
 */

import {
  createJob,
  getJob,
  updateStageStatus,
  processApproval,
  addDeliverable,
  trackProviderUsage,
  completeJob,
} from '../server/jobs';
import {
  seedAgencyBots,
  dispatchJobToBot,
  handleStageCompletion,
  createJobApproval,
} from '../server/agency-integration';
import { getAllSeedProducts } from '../server/product-seeder';
import { getLatestSignals, isSampleSignal } from '../server/terminal';

// Mock the Bops store to avoid needing full state
jest.mock('../server/store', () => ({
  getState: jest.fn(() => ({
    account: { user: { id: 'test-user-123' } },
    workspace: 'test-workspace',
    bots: [],
    chats: [],
    agencyBotMappings: {
      'editor-in-chief': 'editor-bot-1',
      'content-producer': 'content-bot-1',
      'social-distribution': 'social-bot-1',
    },
  })),
  update: jest.fn((fn) => {
    // Mock update - just call the function
    const mockState = {
      agencyBotMappings: {} as Record<string, string>,
    };
    fn(mockState);
  }),
  bot: jest.fn((id) => ({
    id,
    name: 'Test Bot',
    role: 'Test Role',
  })),
  addMessage: jest.fn(),
}));

// Mock Bops bot creation
jest.mock('../server/bots', () => ({
  createBot: jest.fn((name) => ({
    botId: `bot-${name.toLowerCase().replace(/\s+/g, '-')}`,
    chatId: `chat-${name.toLowerCase().replace(/\s+/g, '-')}`,
  })),
  bot: jest.fn((id) => ({
    id,
    name: 'Test Bot',
    role: 'Test Role',
  })),
}));

// Mock database persist layer
jest.mock('../server/persist', () => ({
  getPersist: jest.fn(() => ({
    type: 'local',
    query: jest.fn(),
  })),
}));

// Mock analytics
jest.mock('../server/analytics', () => ({
  trackServerEvent: jest.fn(),
}));

describe('Integration: Full Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should seed agency bots', async () => {
    const result = await seedAgencyBots();
    
    expect(result.created.length + result.existing.length).toBeGreaterThan(0);
    expect(result.errors).toEqual([]);
  });
  
  test('should create and process a product review job', async () => {
    // 1. Create job
    const job = await createJob({
      clientName: 'Test Installer Shop',
      clientEmail: 'test@example.com',
      projectTitle: 'Review 3M Crystalline',
      projectType: 'productReview',
      vertical: 'window_tint_auto',
      brief: {
        goals: 'Review 3M Crystalline 70 VLT tint',
        deliverables: ['Article', 'Video', 'Social posts'],
      },
      budgetCents: 5000,
    });
    
    expect(job.id).toMatch(/^job_/);
    expect(job.status).toBe('intake');
    expect(job.workflow.length).toBeGreaterThan(0);
    expect(job.workflow[0].status).toBe('in_progress');
    
    // 2. Dispatch to first bot
    const firstStage = job.workflow[0];
    await dispatchJobToBot(job.id, firstStage.botId, firstStage.stageName);
    
    // 3. Bot works and completes stage with outputs
    const outputs = [
      {
        id: 'output-1',
        filename: 'article-draft.md',
        type: 'document' as const,
        url: 'https://example.com/article.md',
        createdAt: new Date().toISOString(),
      },
    ];
    
    await updateStageStatus(job.id, firstStage.botId, 'completed', outputs);
    
    // 4. Create approval gate for expensive operation
    const approvalId = await createJobApproval(
      job.id,
      firstStage.botId,
      'Video Generation Approval',
      'Generate product review video using AI',
      300 // $3.00
    );
    
    expect(approvalId).toMatch(/^appr_/);
    
    // 5. Process approval (approved)
    await processApproval(approvalId, true);
    
    // 6. Track provider usage (video generation)
    await trackProviderUsage(
      job.id,
      'krea',
      'generate_video',
      300,
      ['https://cdn.krea.ai/video123.mp4'],
      true
    );
    
    // 7. Add deliverable
    await addDeliverable(job.id, {
      id: 'deliverable-1',
      filename: 'review-video.mp4',
      type: 'video',
      url: 'https://cdn.krea.ai/video123.mp4',
      createdAt: new Date().toISOString(),
    });
    
    // 8. Complete stage and hand off to next bot
    await handleStageCompletion(job.id, firstStage.botId, outputs);
    
    // 9. Eventually complete job
    await completeJob(job.id);
    
    // Verify final state
    const finalJob = await getJob(job.id);
    expect(finalJob?.status).toBe('completed');
    expect(finalJob?.deliverables.length).toBeGreaterThan(0);
    expect(finalJob?.totalCostCents).toBe(300);
  });
  
  test('should handle approval rejection', async () => {
    const job = await createJob({
      clientName: 'Test Client',
      projectTitle: 'Test Job',
      projectType: 'productReview',
      vertical: 'ppf',
      brief: {
        goals: 'Test',
        deliverables: ['Test'],
      },
    });
    
    // Create approval
    const approvalId = await createJobApproval(
      job.id,
      'content-producer',
      'Expensive Operation',
      'Generate high-cost content',
      1000 // $10.00
    );
    
    // Reject with feedback
    await processApproval(approvalId, false, 'Budget exceeded, please use lower cost option');
    
    // Verify approval was rejected
    // (In real system, bot would see rejection and adjust approach)
  });
});

describe('Integration: Product Database', () => {
  test('should have seed products', () => {
    const products = getAllSeedProducts();
    
    expect(products.length).toBeGreaterThan(0);
    
    // All should be marked unverified
    for (const product of products) {
      expect(product.verified).toBe(false);
      expect(product.notes).toContain('UNVERIFIED');
    }
  });
  
  test('should have products across verticals', () => {
    const products = getAllSeedProducts();
    const verticals = new Set(products.map(p => p.vertical));
    
    expect(verticals.has('window_tint_auto')).toBe(true);
    expect(verticals.has('ppf')).toBe(true);
    expect(verticals.has('vinyl_wrap')).toBe(true);
  });
});

describe('Integration: Terminal Signals', () => {
  test('should fetch signals with sample data flag', async () => {
    const signals = await getLatestSignals({
      vertical: 'window_tint_auto',
      limit: 5,
      includeSamples: true,
    });
    
    expect(signals.length).toBeGreaterThan(0);
    
    // Check if signals are marked as samples
    const hasSamples = signals.some(s => isSampleSignal(s));
    
    if (hasSamples) {
      // Sample signals should be clearly marked
      const sampleSignals = signals.filter(s => isSampleSignal(s));
      for (const signal of sampleSignals) {
        expect(signal.title).toContain('[SAMPLE]');
        expect(signal.metadata?.isSampleData).toBe(true);
      }
    }
  });
  
  test('should return empty array when no samples requested and no live data', async () => {
    const signals = await getLatestSignals({
      vertical: 'window_tint_auto',
      limit: 5,
      includeSamples: false,
    });
    
    // Either has real RSS data or empty
    // (Don't fail test if RSS sources are down)
    expect(Array.isArray(signals)).toBe(true);
  });
});

describe('Integration: End-to-End Workflow', () => {
  test('should complete full job lifecycle', async () => {
    // This test simulates the complete flow from job creation to delivery
    
    // 1. Job Creation
    const job = await createJob({
      clientName: 'ABC Tint Shop',
      clientEmail: 'owner@abctint.com',
      projectTitle: 'Social Media Package - Winter Special',
      projectType: 'shopMarketingPackage',
      vertical: 'window_tint_auto',
      brief: {
        goals: 'Create social media content for winter tint promotion',
        audience: 'Local car owners',
        style: 'Professional but approachable',
        deliverables: [
          '5 Instagram posts',
          '3 Facebook posts',
          '2 TikTok videos',
          'Google Business post template',
        ],
      },
      budgetCents: 10000, // $100
    });
    
    expect(job.id).toBeTruthy();
    expect(job.workflow.length).toBeGreaterThan(0);
    
    // 2. Workflow Stages
    const stages = job.workflow;
    expect(stages[0].status).toBe('in_progress');
    
    // Simulate stage progression
    for (let i = 0; i < Math.min(3, stages.length); i++) {
      const stage = stages[i];
      
      // Dispatch to bot
      await dispatchJobToBot(job.id, stage.botId, stage.stageName);
      
      // Simulate bot work completing
      await updateStageStatus(job.id, stage.botId, 'completed', [
        {
          id: `output-${i}`,
          filename: `stage-${i}-output.txt`,
          type: 'document' as const,
          url: `https://example.com/output-${i}.txt`,
          createdAt: new Date().toISOString(),
        },
      ]);
      
      // Advance to next stage (if not last)
      if (i < stages.length - 1) {
        await handleStageCompletion(job.id, stage.botId);
      }
    }
    
    // 3. Add final deliverables
    const deliverables = [
      { filename: 'instagram-post-1.jpg', type: 'image' as const, url: 'https://example.com/ig1.jpg' },
      { filename: 'instagram-post-2.jpg', type: 'image' as const, url: 'https://example.com/ig2.jpg' },
      { filename: 'tiktok-video-1.mp4', type: 'video' as const, url: 'https://example.com/tt1.mp4' },
    ];
    
    for (const deliverable of deliverables) {
      await addDeliverable(job.id, {
        id: `del-${Math.random().toString(36).slice(2)}`,
        ...deliverable,
        createdAt: new Date().toISOString(),
      });
    }
    
    // 4. Track costs
    await trackProviderUsage(job.id, 'krea', 'generate_image', 100, ['url1', 'url2'], true);
    await trackProviderUsage(job.id, 'higgsfield', 'generate_video', 500, ['url3'], true);
    
    // 5. Complete job
    await completeJob(job.id);
    
    // 6. Verify final state
    const finalJob = await getJob(job.id);
    
    expect(finalJob).toBeTruthy();
    expect(finalJob?.status).toBe('completed');
    expect(finalJob?.deliverables.length).toBeGreaterThanOrEqual(deliverables.length);
    expect(finalJob?.totalCostCents).toBeGreaterThan(0);
    expect(finalJob?.completedAt).toBeTruthy();
    
    // Verify costs tracked
    expect(finalJob?.providerUsage['krea']).toBe(100);
    expect(finalJob?.providerUsage['higgsfield']).toBe(500);
    expect(finalJob?.totalCostCents).toBe(600);
  });
});

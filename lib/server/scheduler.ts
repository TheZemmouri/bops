import "server-only";

/**
 * Installer.report Automated Task Scheduler
 * 
 * Runs periodic tasks:
 * - News desk: Aggregate industry news every hour
 * - Scoring refresh: Update product scores daily
 * - Social drafting: Generate social content drafts
 */

let schedulerRunning = false;
let intervals: NodeJS.Timeout[] = [];

/**
 * News desk task: Aggregate latest industry signals
 */
async function runNewsDesk() {
  try {
    console.log('[scheduler] Running news desk task...');
    
    const { getLatestSignals } = await import('./terminal');
    const { createJob } = await import('./jobs');
    const { getState } = await import('./store');
    
    // Fetch latest signals
    const signals = await getLatestSignals({ limit: 10 });
    
    if (signals.length === 0) {
      console.log('[scheduler] No new signals found');
      return;
    }
    
    // Find high-priority signals
    const criticalSignals = signals.filter(s => s.severity === 'critical' || s.severity === 'warning');
    
    if (criticalSignals.length > 0) {
      console.log(`[scheduler] Found ${criticalSignals.length} critical signals`);
      
      // Create news job for Editor-in-Chief bot
      const state = getState();
      if (state.account?.user?.id) {
        try {
          await createJob({
            clientName: 'Installer.report',
            projectTitle: `Industry News Update - ${new Date().toISOString().split('T')[0]}`,
            projectType: 'industryNews',
            vertical: 'window_tint_auto',
          brief: {
            goals: `Publish latest industry news: ${criticalSignals.map(s => s.title).join(', ')}`,
            deliverables: ['News article', 'Social posts'],
          } as any,
          });
          
          console.log('[scheduler] Created news job for critical signals');
        } catch (error) {
          console.error('[scheduler] Failed to create news job:', error);
        }
      }
    }
    
    console.log('[scheduler] News desk task completed');
  } catch (error) {
    console.error('[scheduler] News desk error:', error);
  }
}

/**
 * Scoring refresh task: Update product scores
 */
async function runScoringRefresh() {
  try {
    console.log('[scheduler] Running scoring refresh task...');
    
    // TODO: Query products that need score updates
    // For now, just log
    console.log('[scheduler] Scoring refresh completed (no products to update)');
  } catch (error) {
    console.error('[scheduler] Scoring refresh error:', error);
  }
}

/**
 * Social drafting task: Generate social content
 */
async function runSocialDrafting() {
  try {
    console.log('[scheduler] Running social drafting task...');
    
    // TODO: Generate social content drafts from recent news/products
    // For now, just log
    console.log('[scheduler] Social drafting completed');
  } catch (error) {
    console.error('[scheduler] Social drafting error:', error);
  }
}

/**
 * Start the scheduler
 */
export function startScheduler() {
  if (schedulerRunning) {
    console.log('[scheduler] Already running');
    return;
  }
  
  console.log('[scheduler] Starting automated tasks...');
  
  // News desk: Every hour
  const newsInterval = setInterval(() => {
    void runNewsDesk();
  }, 60 * 60 * 1000); // 1 hour
  
  // Scoring refresh: Every 6 hours
  const scoringInterval = setInterval(() => {
    void runScoringRefresh();
  }, 6 * 60 * 60 * 1000); // 6 hours
  
  // Social drafting: Every 4 hours
  const socialInterval = setInterval(() => {
    void runSocialDrafting();
  }, 4 * 60 * 60 * 1000); // 4 hours
  
  intervals = [newsInterval, scoringInterval, socialInterval];
  schedulerRunning = true;
  
  // Run once immediately
  void runNewsDesk();
  
  console.log('[scheduler] Tasks scheduled:');
  console.log('  - News desk: every 1 hour');
  console.log('  - Scoring refresh: every 6 hours');
  console.log('  - Social drafting: every 4 hours');
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (!schedulerRunning) {
    return;
  }
  
  console.log('[scheduler] Stopping automated tasks...');
  
  for (const interval of intervals) {
    clearInterval(interval);
  }
  
  intervals = [];
  schedulerRunning = false;
  
  console.log('[scheduler] Stopped');
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    running: schedulerRunning,
    tasks: [
      { name: 'news_desk', interval: '1 hour', active: schedulerRunning },
      { name: 'scoring_refresh', interval: '6 hours', active: schedulerRunning },
      { name: 'social_drafting', interval: '4 hours', active: schedulerRunning },
    ],
  };
}

/**
 * Run a task manually
 */
export async function runTask(taskName: string) {
  switch (taskName) {
    case 'news_desk':
      await runNewsDesk();
      break;
    case 'scoring_refresh':
      await runScoringRefresh();
      break;
    case 'social_drafting':
      await runSocialDrafting();
      break;
    default:
      throw new Error(`Unknown task: ${taskName}`);
  }
}

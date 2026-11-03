import "server-only";

/**
 * Installer.report Terminal Signals System
 * 
 * Monitors and aggregates live market intelligence for the auto restyling industry.
 * Sources: RSS feeds, news APIs, manufacturer announcements, regulatory updates.
 */

export type SignalType =
  | "pricing"
  | "availability"
  | "product_launch"
  | "regulatory"
  | "supplier_issue"
  | "market_trend"
  | "industry_event";

export interface Signal {
  id: string;
  type: SignalType;
  vertical?: string;
  title: string;
  description: string;
  source: string;
  sourceUrl?: string;
  timestamp: string;
  severity?: "info" | "warning" | "critical";
  metadata?: Record<string, unknown>;
}

/**
 * RSS/News sources for auto restyling industry
 */
const NEWS_SOURCES = [
  {
    name: "Window Film Magazine",
    rss: "https://windowfilmmag.com/feed/",
    verticals: ["window_tint_auto", "window_tint_residential", "window_tint_commercial"],
  },
  {
    name: "SEMA News",
    rss: "https://www.sema.org/rss",
    verticals: ["window_tint_auto", "ppf", "vinyl_wrap"],
  },
  // Add more real RSS feeds as discovered
];

/**
 * Major auto restyling brands to monitor
 */
const MONITORED_BRANDS = {
  windowTint: ["3M", "Llumar", "SunTek", "XPEL", "Johnson Window Films", "Madico", "Hanita"],
  ppf: ["XPEL", "3M", "SunTek", "Llumar", "Avery Dennison"],
  vinylWrap: ["3M", "Avery Dennison", "Orafol", "Hexis", "Arlon"],
  ceramicCoating: ["Gtechniq", "Ceramic Pro", "IGL Coatings", "System X", "CarPro"],
};

/**
 * Fetch and parse RSS feed
 */
async function fetchRSSFeed(url: string): Promise<Signal[]> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Installer.report/1.0",
      },
    });
    
    if (!response.ok) {
      console.warn(`[terminal] RSS fetch failed: ${url} - ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    
    // Simple XML parsing (in production, use a proper XML parser)
    const signals: Signal[] = [];
    const itemRegex = /<item>(.*?)<\/item>/gs;
    const titleRegex = /<title>(.*?)<\/title>/s;
    const linkRegex = /<link>(.*?)<\/link>/s;
    const descRegex = /<description>(.*?)<\/description>/s;
    const dateRegex = /<pubDate>(.*?)<\/pubDate>/s;
    
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const item = match[1];
      
      const titleMatch = titleRegex.exec(item);
      const linkMatch = linkRegex.exec(item);
      const descMatch = descRegex.exec(item);
      const dateMatch = dateRegex.exec(item);
      
      if (titleMatch) {
        signals.push({
          id: `signal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: "market_trend",
          title: titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/s, "$1").trim(),
          description: descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/s, "$1").replace(/<[^>]*>/g, "").trim() : "",
          source: new URL(url).hostname,
          sourceUrl: linkMatch ? linkMatch[1].trim() : undefined,
          timestamp: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
          severity: "info",
        });
      }
    }
    
    return signals;
  } catch (error) {
    console.error(`[terminal] Error fetching RSS feed ${url}:`, error);
    return [];
  }
}

/**
 * Aggregate signals from all sources
 */
export async function aggregateSignals(params?: {
  type?: SignalType;
  vertical?: string;
  since?: string; // ISO date
  limit?: number;
}): Promise<Signal[]> {
  const allSignals: Signal[] = [];
  
  // Fetch from RSS sources
  for (const source of NEWS_SOURCES) {
    const signals = await fetchRSSFeed(source.rss);
    
    // Tag with verticals
    for (const signal of signals) {
      signal.vertical = source.verticals.join(",");
      allSignals.push(signal);
    }
  }
  
  // Filter by parameters
  let filtered = allSignals;
  
  if (params?.type) {
    filtered = filtered.filter(s => s.type === params.type);
  }
  
  if (params?.vertical) {
    filtered = filtered.filter(s => s.vertical?.includes(params.vertical!));
  }
  
  if (params?.since) {
    const sinceDate = new Date(params.since);
    filtered = filtered.filter(s => new Date(s.timestamp) >= sinceDate);
  }
  
  // Sort by timestamp desc
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // Limit results
  if (params?.limit) {
    filtered = filtered.slice(0, params.limit);
  }
  
  return filtered;
}

/**
 * Monitor pricing changes (stub - would connect to pricing APIs)
 */
export async function monitorPricing(vertical: string): Promise<Signal[]> {
  // TODO: Connect to distributor APIs, scrape manufacturer sites
  // For now, return empty array
  return [];
}

/**
 * Monitor product availability (stub - would connect to inventory APIs)
 */
export async function monitorAvailability(vertical: string): Promise<Signal[]> {
  // TODO: Connect to distributor inventory APIs
  // For now, return empty array
  return [];
}

/**
 * Check for regulatory updates (stub - would monitor law databases)
 */
export async function checkRegulatoryUpdates(): Promise<Signal[]> {
  // TODO: Monitor state tint law databases, EPA VOC regulations
  // For now, return empty array
  return [];
}

/**
 * Generate a sample signal for testing
 */
export function generateSampleSignal(type: SignalType, vertical: string): Signal {
  const samples = {
    pricing: {
      title: "3M Crystalline Series Price Increase",
      description: "3M announces 5% price increase on Crystalline window films effective next month.",
    },
    availability: {
      title: "XPEL Ultimate Plus Backorder",
      description: "XPEL Ultimate Plus PPF on backorder nationwide, 3-4 week lead times reported.",
    },
    product_launch: {
      title: "Llumar Launches CTX Nano Ceramic Series",
      description: "Llumar introduces new CTX Nano Ceramic tint with 97% IR rejection.",
    },
    regulatory: {
      title: "California Tint Law Update",
      description: "California updates VLT requirements for front side windows to 70%.",
    },
    supplier_issue: {
      title: "SunTek Distribution Delays",
      description: "SunTek experiencing shipping delays from primary distribution center.",
    },
    market_trend: {
      title: "PPF Demand Up 23% YoY",
      description: "Paint protection film installation demand increases 23% year-over-year.",
    },
    industry_event: {
      title: "SEMA Show 2026 Registration Open",
      description: "SEMA Show 2026 in Las Vegas registration now open for industry professionals.",
    },
  };
  
  const sample = samples[type];
  
  return {
    id: `signal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    vertical,
    title: sample.title,
    description: sample.description,
    source: "installer.report",
    timestamp: new Date().toISOString(),
    severity: type === "regulatory" || type === "supplier_issue" ? "warning" : "info",
  };
}

/**
 * Get latest signals (combines all sources)
 */
export async function getLatestSignals(params?: {
  vertical?: string;
  limit?: number;
  includeSamples?: boolean; // For testing/demo
}): Promise<Signal[]> {
  const signals = await aggregateSignals({
    vertical: params?.vertical,
    limit: params?.limit || 20,
  });
  
  // If no signals from RSS and samples requested, add sample signals
  // Clearly marked as samples in metadata
  if (signals.length === 0 && params?.includeSamples !== false) {
    console.warn('[terminal] No live signals available, using sample data');
    
    const samples = [
      generateSampleSignal("product_launch", params?.vertical || "window_tint_auto"),
      generateSampleSignal("market_trend", params?.vertical || "ppf"),
      generateSampleSignal("availability", params?.vertical || "vinyl_wrap"),
    ];
    
    // Mark as sample data
    for (const sample of samples) {
      sample.metadata = { ...sample.metadata, isSampleData: true };
      sample.title = `[SAMPLE] ${sample.title}`;
    }
    
    return samples;
  }
  
  return signals;
}

/**
 * Check if signal is sample data
 */
export function isSampleSignal(signal: Signal): boolean {
  return signal.metadata?.isSampleData === true || signal.title.startsWith('[SAMPLE]');
}

# Installer.report Architecture

**The Intelligence Layer for the Auto Restyling Industry**

Installer.report provides business intelligence, media, and marketing services for the automotive aftermarket: window tint, paint protection film (PPF), vinyl wrap, ceramic coating, and detailing professionals.

## Overview

### Target Audiences

1. **Installers/Shops** - Window tint, PPF, wrap, ceramic coating, and detailing businesses
2. **Suppliers** - Manufacturers and distributors selling to installers

### Core Services

- **Industry News & Editorial** - Auto-sourced news in data-driven analyst voice
- **Product Scoring & Reviews** - Objective IR product scores with category-specific formulas
- **Terminal with Live Signals** - Real-time market intelligence and industry data
- **Education Library** - Free books and guides on auto restyling
- **Marketing Services for Installers** - Content packages for shops to grow their business
- **Supplier Partnerships** - Advertising, product reviews, lead generation
- **Multilingual** - Currently English + French (/fr/)

## Architecture

### Technology Stack

**Based on Bops:**
- Next.js 16 (App Router)
- TypeScript
- PostgreSQL (via Bops database layer)
- Orgo cloud computers for bot agents
- OpenAI for chat and agent execution

**Installer.report Extensions:**
- Job pipeline for content/marketing workflows
- Product scoring engine
- Provider adapters for AI generation (Higgsfield, Krea, etc.)
- Client portal for installers and suppliers
- Multilingual content system

### Directory Structure

```
lib/
├── agency-config.ts           # 8-bot team configuration
├── job-types.ts               # Job pipeline type definitions
├── provider-adapters.ts       # AI generation provider interfaces
├── vertical-templates.json    # Scoring formulas and vertical configs
└── server/
    ├── jobs.ts                # Job management (to be created)
    ├── scoring.ts             # Product scoring engine (to be created)
    └── terminal.ts            # Market signals (to be created)

db/migrations/
└── 0019_agency_jobs.sql       # Job pipeline schema

app/
├── portal/                    # Client portal (to be created)
│   ├── [token]/              # Client-specific job views
│   └── page.tsx              # Portal landing
└── api/
    ├── jobs/                 # Job CRUD APIs (to be created)
    ├── scoring/              # Product scoring APIs (to be created)
    └── terminal/             # Signals APIs (to be created)
```

## The Agency Team

Installer.report deploys 8 specialized bots defined in `lib/agency-config.ts`:

### 1. Editor-in-Chief
**Role:** Industry news and editorial content  
**Voice:** Data-driven, trade-terminal analyst  
**Sources:** Industry pubs, manufacturer announcements, regulatory changes, installer feedback  
**Outputs:** News articles, editorial analysis  
**Hands off to:** Content Producer (for video versions), Social Manager

### 2. Product Scoring Analyst
**Role:** Implement scoring formulas, rate products objectively  
**Inputs:** Product specs, installer field feedback, pricing data  
**Scoring formula example (Window Tint):**
- Quality 40%: IR rejection 28%, TSER 22%, UV 15%, clarity 12%, install handling 13%, color stability 10%
- Sentiment 35%: Installer reviews and field feedback
- Value 25%: MSRP vs. performance ratio

**Outputs:** IR product scores (0-100, shown as 5-star ratings), category rankings, VLT shade tables  
**Hands off to:** Editor-in-Chief (for editorial coverage), Content Producer (for video reviews)

### 3. Signals/Terminal Agent
**Role:** Monitor and report live market intelligence  
**Signals tracked:**
- Product availability and stock status
- Pricing trends
- New product launches
- Regulatory updates (state tint laws, EPA/VOC regs)
- Installer demand patterns
- Supplier backorders

**Voice:** Quantitative analyst, Bloomberg-terminal style  
**Outputs:** Real-time terminal updates, market reports  
**Hands off to:** Editor-in-Chief (for news stories), Product Analyst (for scoring impacts)

### 4. Content & Video Producer
**Role:** Create visual content using AI generation tools  
**Content types:**
- Product review videos
- Install showcase videos
- Before/after transformations
- Educational tutorials
- Social media cutdowns (Reels, TikTok, Shorts)

**Tools:** Higgsfield, Krea (via provider adapters)  
**Approval required:** Yes, before expensive generation  
**Hands off to:** Social Manager (for distribution)

### 5. Social/Distribution Manager
**Role:** Manage social media and content distribution  
**Platforms:**
- YouTube (long-form reviews, tutorials)
- Instagram (showcases, before/afters)
- TikTok (quick tips, comparisons)
- LinkedIn (industry news, B2B)
- Facebook Groups (installer community)

**Receives from:** Content Producer, Editor-in-Chief  
**Approval required:** Yes, before publication

### 6. Supplier Partnerships / Ads Sales
**Role:** B2B sales and supplier relationships  
**Targets:** Tint manufacturers (3M, Llumar, SunTek, Johnson, XPEL), PPF makers, wrap suppliers, coating brands  
**Revenue opportunities:**
- Featured supplier profiles
- Sponsored product reviews
- Terminal/signals data access
- Installer lead generation
- Display ads
- Newsletter sponsorships

**Approach:** Consultative B2B sales, data-driven packages

### 7. Installer Marketing Services
**Role:** Help installation shops grow their businesses  
**Services offered:**
- Social media content packages
- Before/after video showcases
- Shop website content
- Google Business optimization
- Seasonal campaigns (summer tint specials, winter PPF)
- Email templates

**Target:** Individual installer shops seeking marketing help

### 8. Localization Agent
**Role:** Translate and adapt content for regional markets  
**Current:** English + French (/fr/)  
**Future:** Spanish, German  
**Content localized:**
- News and articles
- Product scores and reviews
- Educational library
- Terminal signals
- Marketing templates

**Technical considerations:**
- Regional terminology
- Provincial/state regulations
- Supplier availability by region

## Job Pipeline

### Database Schema

See `db/migrations/0019_agency_jobs.sql` for complete schema.

**Tables:**
- `agency_jobs` - Main job records
- `agency_job_stages` - Workflow stage tracking
- `agency_approvals` - Client approval gates
- `agency_provider_usage` - AI generation cost tracking
- `agency_client_access` - Client portal access tokens

### Job Types and Workflows

Defined in `lib/agency-config.ts`:

1. **Industry News** - Editor → Localization → Content → Social
2. **Product Review** - Scoring Analyst → Content → Editor → Localization → Social
3. **Supplier Onboarding** - Partnerships → Scoring → Content → Editor
4. **Shop Marketing Package** - Installer Marketing → Content → Localization → Social
5. **Market Intelligence** - Signals Terminal → Scoring Analyst → Editor
6. **Install Showcase** - Content → Social → Installer Marketing

### Job Status Flow

```
intake → strategy → production → review → delivery → completed
                                             ↓
                                         cancelled
```

### Approval Gates

Approval types (defined in `lib/job-types.ts`):
- `strategy` - Creative strategy approval
- `creative` - Creative concept approval
- `deliverable` - Final deliverable approval
- `spend` - Budget/cost approval (for AI generation)
- `publication` - Publish/distribution approval

## Product Scoring System

### Scoring Formula Structure

Each vertical has a category-specific formula defined in `lib/vertical-templates.json`.

**General formula:**
```
IR Score = (Quality × quality_weight) + (Sentiment × sentiment_weight) + (Value × value_weight)
```

**Example: Automotive Window Tint**
- Quality 40%
  - IR rejection: 28%
  - TSER: 22%
  - UV protection: 15%
  - Optical clarity: 12%
  - Install handling: 13%
  - Color stability: 10%
- Sentiment 35% (installer field feedback)
- Value 25% (performance / price ratio)

### VLT Shade-Level Scoring

Tint products are scored per VLT shade (5%, 15%, 20%, 35%, 50%, 70%, etc.) because performance varies by darkness level.

**Output format:**
```
| VLT | IR Score | Stars | Quality | Sentiment | Value | MSRP   |
|-----|----------|-------|---------|-----------|-------|--------|
| 5%  | 87       | ★★★★★ | 92      | 85        | 82    | $8.50  |
| 15% | 85       | ★★★★★ | 90      | 84        | 81    | $8.50  |
| 35% | 78       | ★★★★  | 82      | 79        | 73    | $8.50  |
```

### Sentiment Collection

Field sentiment aggregated from:
- Installer reviews and ratings
- Warranty claim rates
- Social media mentions
- Direct installer feedback
- Industry forum discussions

### Value Calculation

```
Value Score = (Performance Score / Normalized Price) × 100
```

Where performance is the quality-weighted average of technical metrics.

## Provider Adapters

### Interface

All providers implement `ProviderAdapter` interface from `lib/provider-adapters.ts`:

```typescript
interface ProviderAdapter {
  readonly name: string;
  readonly capabilities: {
    videoGeneration: boolean;
    imageGeneration: boolean;
    audioGeneration: boolean;
    styleTransfer: boolean;
    upscaling: boolean;
  };
  
  isConfigured(): boolean;
  generate(request: GenerationRequest): Promise<GenerationResult>;
  estimateCost(request: GenerationRequest): Promise<number>;
  checkStatus?(jobId: string): Promise<StatusResult>;
}
```

### Supported Providers

**Currently implemented (stub):**
1. Higgsfield - Video/image/audio generation, style transfer
2. Krea - Video/image generation, style transfer
3. Runway - Video/image generation and editing
4. Luma - Video generation, 3D
5. Kling - Video generation, style transfer
6. ElevenLabs - Audio/voice generation

### Adding a New Provider

1. Create adapter class extending `BaseProviderAdapter` in `lib/provider-adapters.ts`
2. Implement `generate()` and `estimateCost()` methods
3. Add to `PROVIDERS` registry
4. Add environment variable: `{PROVIDER}_API_KEY`
5. Update `.env.example`

**Example:**

```typescript
export class NewProviderAdapter extends BaseProviderAdapter {
  readonly name = 'newprovider';
  readonly capabilities = {
    videoGeneration: true,
    imageGeneration: false,
    audioGeneration: false,
    styleTransfer: false,
    upscaling: false,
  };
  
  protected getApiKey() {
    return process.env.NEWPROVIDER_API_KEY;
  }
  
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    // Implement API call
    const response = await fetch('https://api.newprovider.com/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        // ... other params
      }),
    });
    
    const data = await response.json();
    
    return {
      success: true,
      outputUrls: [data.url],
      costCents: data.cost * 100,
      metadata: data,
    };
  }
  
  async estimateCost(request: GenerationRequest): Promise<number> {
    // Return estimated cost in cents
    return 500; // $5.00
  }
}

// Register
PROVIDERS.newprovider = new NewProviderAdapter();
```

## Client Portal

### Access Model

Clients (installers or suppliers) access jobs via share tokens:

```
https://installer.report/portal/{share_token}
```

Token generated when job created, shared via email or direct link.

### Portal Features

**For Installers (Marketing Service Clients):**
- View job status and progress
- See deliverables (download assets)
- Approve/reject deliverables
- Provide feedback
- See usage/cost breakdown

**For Suppliers (Partnership Clients):**
- View product review status
- See product scores and rankings
- Approve publication
- Track ad campaign performance
- Access lead generation data

### Implementation (Placeholder)

Portal UI to be built at `app/portal/[token]/page.tsx`

## Environment Variables

### Required

```bash
# Core (from Bops)
OPENAI_API_KEY=sk-...
OPENAI_EXECUTOR_API_KEY=sk-...
ORGO_API_KEY=...
BOPS_SELF_HOSTED=1

# Database (for job pipeline)
BOPS_DATABASE_URL=postgresql://...
```

### Recommended Media Providers

```bash
# At least one recommended for Content Producer bot
HIGGSFIELD_API_KEY=...
KREA_API_KEY=...
RUNWAY_API_KEY=...
LUMA_API_KEY=...
KLING_API_KEY=...
ELEVENLABS_API_KEY=...
```

### Optional Services

```bash
# From Bops - all optional
TYPESAFE_API_KEY=...
HONCHO_API_KEY=...
COMPOSIO_API_KEY=...
TREG_TOKEN=...
AGENTMAIL_API_KEY=...
TAILSCALE_AUTH_KEY=...
```

## Deployment

### Development

```bash
npm run setup         # Install dependencies
npm run dev           # Next.js dev server
npm run app           # Electron app (Mac only)
```

### Production

```bash
npm run build         # Build Next.js
npm run start         # Start production server

# Or build Mac app:
npm run app:build     # Electron build
```

### Database Setup

```bash
# Run migrations (requires BOPS_DATABASE_URL)
psql "$BOPS_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0019_agency_jobs.sql
```

### Deploying to Orgo Cloud Computers

Bot agents run on Orgo cloud computers. See main Bops documentation for Orgo setup.

## Verticals Configuration

All verticals configured in `lib/vertical-templates.json`:

- Window Tint (Auto/Residential/Commercial)
- Paint Protection Film (PPF)
- Windshield Protection Film
- Vinyl Wrap
- Ceramic Coating
- Detailing Products

Each vertical defines:
- Scoring formula weights
- Quality metric definitions
- Product attributes
- Sentiment sources
- Value calculation method

## Multilingual System

### Current Support

- English (/) - Primary
- French (/fr/) - Canada and France markets

### Content to Localize

- Industry news articles
- Product scoring data
- Educational library content
- Terminal signals
- Marketing templates

### Regional Considerations

**Regulations:**
- US: State-level tint laws (VLT %, reflectivity, colors)
- Canada: Provincial regulations
- EU: Country-specific rules

**Terminology:**
- Window tint → Film teinté (FR)
- PPF → Film de protection de peinture (FR)
- Installer → Installateur (FR)

**Measurements:**
- VLT%, TSER% - Universal
- Thickness: mils (US) vs. microns (metric)
- Temperature: °F (US) vs. °C (Canada/EU)

## API Routes (To Be Implemented)

### Jobs API

```
POST   /api/jobs              # Create job
GET    /api/jobs              # List jobs
GET    /api/jobs/:id          # Get job details
PATCH  /api/jobs/:id          # Update job
DELETE /api/jobs/:id          # Cancel job

GET    /api/jobs/:id/stages   # Get workflow stages
POST   /api/jobs/:id/approve  # Approve at gate
POST   /api/jobs/:id/feedback # Submit feedback
```

### Scoring API

```
GET    /api/scoring/products              # List scored products
GET    /api/scoring/products/:id          # Get product score
POST   /api/scoring/calculate             # Calculate score
GET    /api/scoring/verticals/:vertical   # Get vertical config
```

### Terminal API

```
GET    /api/terminal/signals         # Get live signals
GET    /api/terminal/pricing         # Pricing data
GET    /api/terminal/availability    # Stock status
GET    /api/terminal/trends          # Market trends
```

### Portal API

```
GET    /api/portal/:token            # Get job via token
POST   /api/portal/:token/approve    # Client approval
POST   /api/portal/:token/feedback   # Client feedback
```

## Implementation Status

### ✅ Completed

- [x] Agency bot team configuration (8 bots with prompts)
- [x] Job pipeline database schema
- [x] Job and approval type definitions
- [x] Provider adapter interfaces
- [x] Vertical templates (scoring formulas)
- [x] Workflow definitions
- [x] Documentation

### 🚧 Stub/Placeholder

- [ ] Provider adapter implementations (interfaces only)
- [ ] Job management APIs
- [ ] Product scoring engine
- [ ] Terminal/signals system
- [ ] Client portal UI
- [ ] Multilingual routing

### 📋 To Be Built

- [ ] News sourcing automation
- [ ] Installer sentiment collection
- [ ] Marketing content templates
- [ ] Lead generation system
- [ ] Supplier ad management
- [ ] Analytics and reporting

## License & Attribution

Built on Bops, licensed FSL-1.1-ALv2.

- ✅ Use for auto restyling intelligence vertical
- ❌ Do not reuse as general bot platform (violates FSL)
- ✅ Keep LICENSE, NOTICE, attribution intact

"Bops" is a trademark of Organic Intelligence, Inc. "Installer.report" branding is separate and independent.

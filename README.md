<p align="center">
  <a href="https://installer.report"><img src="desktop/icon.png" width="112" height="112" alt="Installer.report"></a>
</p>

<h1 align="center">Installer.report</h1>

<p align="center">
  <b>Fully Autonomous AI Agency Platform</b><br>
  Configurable agency services with specialized bot teams. Built on Bops.
</p>

<p align="center">
  <a href="https://installer.report"><b>Visit Website</b></a>
  &nbsp;·&nbsp;
  <a href="#services">Services</a>
  &nbsp;·&nbsp;
  <a href="#pricing">Pricing</a>
  &nbsp;·&nbsp;
  <a href="#how-it-works">How It Works</a>
  &nbsp;·&nbsp;
  <a href="#setup">Setup</a>
</p>

<p align="center">
  <a href="https://installer.report"><img src="https://img.shields.io/badge/macOS-Apple%20silicon-E9FF3B?labelColor=0A0A0A" alt="macOS, Apple silicon"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-FSL--1.1--ALv2-E9FF3B?labelColor=0A0A0A" alt="License: FSL-1.1-ALv2"></a>
</p>

<p align="center">
  <b>Built on Bops.</b> Installer.report is a vertical media agency application built on the Bops framework.<br>
  Licensed FSL-1.1-ALv2: use freely, no competing bot-platform products/services. See <a href="#license">License</a> for details.
</p>

---

## About Installer.report

Installer.report is a fully autonomous AI agency platform built on Bops. It provides:

- **Configurable Agency Teams** - Preset bot teams with specialized roles and workflows
- **Job Pipeline** - Client intake, production workflow, approval gates, and delivery
- **Provider Integrations** - Pluggable adapters for AI generation services
- **Client Portal** - Status tracking, approvals, and deliverable access
- **Vertical Templates** - Industry-specific workflows and configurations

### Default Agency Team (Configurable)

The platform includes a preset 8-bot agency team structure:

1. **Sales/Client Success** - Intake, requirements, approvals, relationship management
2. **Creative Director** - Strategy, direction, quality oversight
3. **Producer/Project Manager** - Coordination, timeline, resource management
4. **Content Specialist** - Content creation and production
5. **Technical Specialist** - Technical execution and generation
6. **Quality Manager** - Review, polish, final assembly
7. **Distribution Manager** - Delivery, optimization, platform coordination
8. **Analyst** - Performance tracking and reporting

**Note:** Team roles, names, prompts, and workflows are fully configurable via `lib/agency-config.ts` and vertical templates. The current configuration is placeholder - actual business-specific roles will be loaded from vertical configuration.

## How It Works

1. **Job Intake** - Client submits project via portal or chat
2. **Workflow Planning** - System assigns job to appropriate workflow template
3. **Production Pipeline** - Bot team executes workflow stages in sequence
4. **Approval Gates** - Client approves at configured checkpoints
5. **Asset Delivery** - Final deliverables provided via portal
6. **Analytics** - Performance tracking and reporting

All bots work on real cloud computers. Approval gates enforced before spending or publication.

## Architecture

### Core Components

- **Job Pipeline** (`lib/job-types.ts`, `db/migrations/0019_agency_jobs.sql`) - Job tracking, workflow stages, approvals, deliverables
- **Agency Config** (`lib/agency-config.ts`) - Bot team definitions, prompts, handoff rules
- **Provider Adapters** (`lib/provider-adapters.ts`) - Pluggable interfaces for AI services
- **Vertical Templates** (`lib/vertical-templates.json`) - Industry-specific configurations
- **Client Portal** (`app/portal/*` - upcoming) - Client-facing job dashboard

### Job Workflow

1. Job created with vertical + project type
2. Vertical template determines workflow sequence
3. Each stage assigned to appropriate bot
4. Approval gates enforce client checkpoints
5. Provider usage tracked per job
6. Deliverables collected and portal-accessible

### Vertical Configuration

Verticals are data-driven JSON configurations including:
- Team role definitions and prompts
- Workflow templates per project type
- Approval gate requirements
- Provider preferences
- Pricing/cost models

This allows swapping entire business configurations without code changes.

## Provider Integrations

Installer.report connects to leading AI generation providers:

- **Higgsfield** - Video generation, motion, effects
- **Krea** - Image generation, visual assets
- **Runway** - Video editing, effects, generation
- **Luma** - 3D, spatial video, cinematic effects
- **Kling** - Video generation, style transfer
- **ElevenLabs** - Voice, audio, music

All providers require API keys set in environment variables (see [Setup](#setup)).

## Setup

### Requirements

- macOS with Apple silicon
- Node.js 22 or newer
- API keys for:
  - **Required**: OpenAI (chat & task execution), Orgo (cloud computers)
  - **Recommended**: At least one media provider (Higgsfield, Krea, Runway, Luma, Kling, ElevenLabs)
  - **Optional**: TypeSafe, Honcho, Composio, treg, AgentMail, Tailscale

### Installation

```bash
npm run setup                # Install dependencies, create .env.local from .env.example
npm run app                  # Launch the application (starts server on port 3210)
```

Configure your environment in `.env.local`:

```bash
# Core (Required)
OPENAI_API_KEY=sk-...
OPENAI_EXECUTOR_API_KEY=sk-...
ORGO_API_KEY=...

# Media Providers (at least one recommended)
HIGGSFIELD_API_KEY=...
KREA_API_KEY=...
RUNWAY_API_KEY=...
LUMA_API_KEY=...
KLING_API_KEY=...
ELEVENLABS_API_KEY=...

# Optional services
TYPESAFE_API_KEY=...
HONCHO_API_KEY=...
COMPOSIO_API_KEY=...
TREG_TOKEN=...
```

See [docs/installer-report.md](docs/installer-report.md) for complete setup instructions, architecture details, and how to add new providers.

## Development

```bash
npm run dev                  # Development server with hot reload
npm run build                # Production build
npm run lint                 # Run linter
npx tsc --noEmit            # Type check
```

## Documentation

- [docs/installer-report.md](docs/installer-report.md) - Complete architecture, setup, and provider guide
- [docs/verticals/](docs/verticals/) - Templates and guides for each vertical market
- [LICENSE](LICENSE) - FSL-1.1-ALv2 license details
- [TRADEMARK.md](TRADEMARK.md) - Trademark usage (Bops marks, not Installer.report)

## License

Based on Bops, licensed under the [Functional Source License, Version 1.1, ALv2 Future License](LICENSE) (FSL-1.1-ALv2).

**Key Terms:**
- ✅ Use for any purpose except competing with it
- ✅ Run it yourself, modify it, build vertical applications on it
- ❌ Do not offer it as a competing bot-platform product or hosted service
- ✅ After 2 years, each version becomes Apache 2.0

This is a **vertical media agency application**, not a horizontal bot platform. You may use and modify it for media production and related services. You may not reuse it as a general-purpose bot platform competing with Bops.

See [LICENSE](LICENSE) for complete terms.

**Attribution Required:** Keep LICENSE, NOTICE, and copyright notices intact per FSL-1.1-ALv2 terms.

**Trademarks:** "Bops" and Bops logos are trademarks of Organic Intelligence, Inc. (see [TRADEMARK.md](TRADEMARK.md)). "Installer.report" and associated branding are separate and independent.

---

## Credits

Built on [Bops](https://bops.bot) by [Nick Vasilescu](https://github.com/nickvasilescu).

Powered by:
- [Orgo](https://orgo.ai) - Cloud computers for the agency team
- [OpenAI](https://openai.com) - Chat, tasks, and voice
- [Honcho](https://honcho.dev) - Long-term memory
- [Composio](https://composio.dev) - Connected apps

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for all open source components.

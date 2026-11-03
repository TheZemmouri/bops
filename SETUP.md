# Bops Setup Guide

Complete guide to getting Bops running for the first time, whether self-hosted or using Bops Cloud.

## 🎯 Demo Mode (No API Keys Required)

Bops includes a **Demo Mode** that lets you explore the full application without configuring any API keys or external services. Perfect for:
- Evaluating Bops before committing  
- Testing the UI and workflows
- Understanding how bots, routines, and dashboards work

### Running in Demo Mode

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/TheZemmouri/bops.git
   cd bops
   npm install
   ```

2. **Start without any `.env.local` file:**
   ```bash
   npm run dev
   ```

3. **Open** http://localhost:3000

That's it! The app will:
- Automatically detect no API keys are present
- Bypass authentication
- Load with realistic demo bots, messages, and routines
- Show all features in an exploratory state

Demo mode includes:
- **3 pre-configured bots**: Boppy (main), Sales Manager, Inventory Tracker  
- **Sample conversations** and active sessions
- **4 scheduled routines** ready to test
- **Activity Dashboard** with 7-day performance stats
- **Usage Dashboard** with cost tracking and alerts
- **12 industry templates** available in onboarding

### Transitioning from Demo to Production

When you're ready to use Bops with real services:
1. Copy `.env.example` to `.env.local`
2. Add your API keys (see "Required API Keys" below)
3. Restart the dev server
4. Complete onboarding to configure your team

The app automatically detects API keys and switches from demo mode to full operation.

---

## Quick Start

```bash
# 1. Install dependencies and create .env.local
npm run setup

# 2. Fill in required API keys (see below)
nano .env.local  # or your preferred editor

# 3. Run the app
npm run app
```

## Required API Keys

### Core Requirements (Minimum to Run)

1. **OpenAI** (Required)
   - Get your API key: https://platform.openai.com/api-keys
   - Add to `.env.local`:
     ```
     OPENAI_API_KEY=sk-...
     OPENAI_EXECUTOR_API_KEY=sk-...  # Can be same project, needs spend limit
     ```
   - The executor key is used for bot tasks - give it a spend limit for safety

2. **Orgo** (Required for bot computers)
   - Sign up: https://www.orgo.ai
   - Get API key from dashboard
   - Add to `.env.local`:
     ```
     ORGO_API_KEY=...
     ```
   - Alternatively, sign in through the app (set `BOPS_SELF_HOSTED=0`)

### Recommended Services

3. **TypeSafe** (Bot decision-making)
   - Sign up: https://typesafe.ai
   - Add to `.env.local`:
     ```
     TYPESAFE_API_KEY=...
     ```

4. **Honcho** (Long-term memory)
   - Sign up: https://honcho.dev
   - Add to `.env.local`:
     ```
     HONCHO_API_KEY=...
     HONCHO_WORKSPACE_ID=bops
     HONCHO_USER_PEER=user
     ```

5. **Composio** (Connected apps - ~1,000 integrations)
   - Sign up: https://composio.dev
   - Add to `.env.local`:
     ```
     COMPOSIO_API_KEY=...
     ```

6. **treg** (Business data lookup)
   - Sign up: https://treg.to
   - Create org token: `treg org agent-new bops`
   - Add to `.env.local`:
     ```
     TREG_TOKEN=...
     ```

### Optional Services

7. **AgentMail** (Bot email addresses)
   - Sign up: https://agentmail.to
   - Verify domain or use bops.bot
   - Add to `.env.local`:
     ```
     AGENTMAIL_API_KEY=...
     BOPS_MAIL_DOMAIN=bops.bot
     ```

8. **AgentPhone** (Bot phone numbers)
   - Sign up: https://agentphone.ai
   - Add to `.env.local`:
     ```
     AGENTPHONE_API_KEY=...
     AGENTPHONE_SUB_ACCOUNT=...
     AGENTPHONE_WEBHOOK_SECRET=...
     BOPS_AGENTPHONE_HOOK_URL=https://your-domain.com/hooks/agentphone
     ```

9. **Tailscale** (Private screen access)
   - Sign up: https://tailscale.com
   - Create auth key with `--ephemeral` flag
   - Add to `.env.local`:
     ```
     TAILSCALE_AUTH_KEY=...
     ```

10. **Twilio Verify** (Verify user phone/email)
    - Sign up: https://www.twilio.com/verify
    - Create Verify service
    - Add to `.env.local`:
      ```
      TWILIO_VERIFY_SERVICE_SID=VA...
      TWILIO_API_KEY_SID=...
      TWILIO_API_KEY_SECRET=...
      ```

## Environment Variables Reference

See [.env.example](./.env.example) for the complete list with detailed descriptions.

### Key Settings

| Variable | Purpose | Default |
|----------|---------|---------|
| `BOPS_SELF_HOSTED=1` | Use your own API keys | `1` |
| `BOPS_SELF_HOSTED=0` | Use Bops Cloud (no keys needed) | - |
| `BOPS_PUBLIC_URL` | Public URL for webhooks | `api.bops.bot` |
| `BOPS_ORGO_TEMPLATE` | Custom Orgo template | `system/bops-base@0.1.8` |
| `BOPS_DISK_GB` | Disk per bot computer (GB) | `120` |

## Setup Checklist

### First-Time Setup

- [ ] Run `npm run setup`
- [ ] Add OpenAI API keys to `.env.local`
- [ ] Add Orgo API key (or set `BOPS_SELF_HOSTED=0` to use cloud)
- [ ] Run `npm run app` to start Bops
- [ ] Complete onboarding in the app
- [ ] Add your name and info in Settings → You

### Recommended Setup

- [ ] Add TypeSafe API key (better bot decisions)
- [ ] Add Honcho API key (persistent memory)
- [ ] Add Composio API key (app integrations)
- [ ] Connect Gmail in the app
- [ ] Connect Google Calendar
- [ ] Set up your first bot's routine

### Production Setup (Self-Hosting)

- [ ] Deploy webhook relay (`edge/`) to Fly.io or similar
- [ ] Set `BOPS_PUBLIC_URL` to your relay URL
- [ ] Add AgentMail for bot emails
- [ ] Add AgentPhone for bot phone numbers
- [ ] Set up Tailscale for private screen access
- [ ] Configure Twilio Verify for user verification
- [ ] Set up your own Slack app (optional, see `slack/setup.mjs`)

## Troubleshooting

### "No such bot" or bots not appearing
- Check that you completed onboarding
- Verify `ORGO_API_KEY` is set correctly
- Look for errors in the terminal/console

### Tasks failing with "Out of credit"
- Check OpenAI account has credits
- Verify `OPENAI_EXECUTOR_API_KEY` is set and funded
- Check spend limit on executor key isn't too low

### Bots' computers not starting
- Verify Orgo API key has access
- Check Orgo plan has available compute
- Look for computer status in bot settings

### Webhooks not working (email, phone, Slack)
- Verify `BOPS_PUBLIC_URL` is set to your relay
- Check relay is deployed and accessible
- Verify webhook secrets match (AgentPhone, Slack)
- Test webhook endpoint directly

### Memory not persisting
- Check Honcho API key is valid
- Verify workspace ID and peer are set
- Look for memory errors in terminal

### Apps not connecting
- Check Composio API key is valid
- Try reconnecting the app in Vault
- Check app permissions in Composio dashboard

## First Business Setup (Onboarding)

When you first run Bops, you'll be guided through onboarding:

1. **Business Info**: Enter your business name, website, and description
2. **Choose Template**: Pick an industry template (Auto Dealer, Roofing, Retail, etc.)
3. **Review**: Confirm your bot team
4. **Complete**: Your specialized bots are created and ready

Each template comes with:
- Pre-configured bots with specialized roles
- Detailed instructions for each bot
- Suggested routines and schedules
- Recommended app connections

You can skip onboarding and set up manually if preferred.

## Post-Setup

After setup is complete:

1. **Review Auto-Created Routines**: Onboarding created suggested routines (disabled by default) - review and enable the ones you want
2. **Set Usage Limits**: Configure per-bot or workspace daily token/cost limits in Settings to control spending
3. **Configure Bots**: Review each bot's instructions and customize as needed
4. **Connect Apps**: Add Gmail, Calendar, Sheets, etc. in the Vault
5. **Test Tasks**: Give your bots simple tasks to verify everything works
6. **Monitor Activity & Costs**: Check the Activity Dashboard and Usage Dashboard to track what bots are doing and costs

## Getting Help

- **Documentation**: See [README.md](./README.md) for architecture and details
- **Issues**: Report bugs at https://github.com/OrgoAI/bops/issues
- **Logs**: Check `~/Library/Logs/Bops/server.log` on Mac
- **Self-hosted logs**: Check terminal where you ran `npm run app`

## Security Notes

- Never commit `.env.local` - it contains secrets
- Use restricted OpenAI key with spend limit for executor
- Credentials are stored in Mac Keychain, not files
- Self-hosted: Keep `BOPS_LISTEN_ALL=0` unless you need remote access
- Webhook endpoints are signature-verified

## Next Steps

Once Bops is running:
- Read the [README](./README.md) for architecture details
- Check [CONTRIBUTING.md](./CONTRIBUTING.md) for development
- See [LICENSE](./LICENSE) for usage terms
- Join discussions in GitHub issues

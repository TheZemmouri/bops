/**
 * Environment variable validation and helpful error messages for missing configuration.
 */

type EnvCheck = {
  key: string;
  required: boolean;
  service: string;
  description: string;
  signupUrl?: string;
};

const ENV_CHECKS: EnvCheck[] = [
  {
    key: "OPENAI_API_KEY",
    required: true,
    service: "OpenAI",
    description: "Chat, calls, and bot tasks",
    signupUrl: "https://platform.openai.com/api-keys",
  },
  {
    key: "OPENAI_EXECUTOR_API_KEY",
    required: true,
    service: "OpenAI (Executor)",
    description: "Bot task execution (can be same project, needs spend limit)",
    signupUrl: "https://platform.openai.com/api-keys",
  },
  {
    key: "ORGO_API_KEY",
    required: false,
    service: "Orgo",
    description: "Bot cloud computers (required for self-hosted, or sign in through app)",
    signupUrl: "https://www.orgo.ai",
  },
  {
    key: "TYPESAFE_API_KEY",
    required: false,
    service: "TypeSafe",
    description: "Bot decision-making and risk assessment",
    signupUrl: "https://typesafe.ai",
  },
  {
    key: "HONCHO_API_KEY",
    required: false,
    service: "Honcho",
    description: "Long-term bot memory across sessions",
    signupUrl: "https://honcho.dev",
  },
  {
    key: "COMPOSIO_API_KEY",
    required: false,
    service: "Composio",
    description: "Connect ~1,000 apps and services",
    signupUrl: "https://composio.dev",
  },
  {
    key: "TREG_TOKEN",
    required: false,
    service: "treg",
    description: "Business data lookups (companies, people, etc.)",
    signupUrl: "https://treg.to",
  },
  {
    key: "AGENTMAIL_API_KEY",
    required: false,
    service: "AgentMail",
    description: "Email addresses for bots",
    signupUrl: "https://agentmail.to",
  },
  {
    key: "AGENTPHONE_API_KEY",
    required: false,
    service: "AgentPhone",
    description: "Phone numbers for bots (texts and calls)",
    signupUrl: "https://agentphone.ai",
  },
];

/**
 * Check environment variables and return helpful messages for missing ones
 */
export function checkEnvironment(): {
  ok: boolean;
  missing: string[];
  warnings: string[];
  messages: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];
  const messages: string[] = [];

  const isSelfHosted = process.env.BOPS_SELF_HOSTED === "1";

  for (const check of ENV_CHECKS) {
    const value = process.env[check.key];
    const isEmpty = !value || value.trim() === "";

    if (isEmpty) {
      if (check.required) {
        // Special case: ORGO_API_KEY only required if self-hosted
        if (check.key === "ORGO_API_KEY" && !isSelfHosted) {
          continue;
        }

        missing.push(check.key);
        messages.push(
          `❌ ${check.key} is missing\n` +
            `   Service: ${check.service}\n` +
            `   Purpose: ${check.description}\n` +
            (check.signupUrl ? `   Sign up: ${check.signupUrl}\n` : "")
        );
      } else {
        warnings.push(check.key);
        messages.push(
          `⚠️  ${check.key} not set (optional)\n` +
            `   Service: ${check.service}\n` +
            `   Purpose: ${check.description}\n` +
            (check.signupUrl ? `   Sign up: ${check.signupUrl}\n` : "")
        );
      }
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
    messages,
  };
}

/**
 * Get a helpful error message when a service fails due to missing config
 */
export function missingServiceMessage(service: string): string {
  const check = ENV_CHECKS.find((c) => c.service === service || c.key.includes(service.toUpperCase().replace(/\s/g, "_")));

  if (!check) {
    return `${service} is not configured. Check .env.local for required settings.`;
  }

  return (
    `${service} is not configured.\n\n` +
    `Missing: ${check.key}\n` +
    `Purpose: ${check.description}\n` +
    (check.signupUrl ? `Sign up: ${check.signupUrl}\n\n` : "") +
    `Add it to .env.local to enable ${service}.`
  );
}

/**
 * Print environment check results to console (called at startup)
 */
export function printEnvironmentCheck() {
  const result = checkEnvironment();

  if (result.ok && result.warnings.length === 0) {
    console.log("✅ All required environment variables are set");
    return;
  }

  if (!result.ok) {
    console.error("\n🚨 MISSING REQUIRED CONFIGURATION:\n");
    console.error("Bops cannot start without these API keys:\n");
    result.messages.filter((m) => m.startsWith("❌")).forEach((m) => console.error(m));
    console.error("\nSee SETUP.md for detailed setup instructions.");
    console.error("\n");
  }

  if (result.warnings.length > 0) {
    console.warn("\n⚠️  OPTIONAL SERVICES NOT CONFIGURED:\n");
    console.warn("These services are optional but recommended:\n");
    result.messages.filter((m) => m.startsWith("⚠️")).forEach((m) => console.warn(m));
    console.warn("\nBops will work without these, but some features will be limited.");
    console.warn("See SETUP.md for more information.\n");
  }
}

/**
 * Throw if required environment variables are missing
 */
export function requireEnvironment() {
  const result = checkEnvironment();
  if (!result.ok) {
    printEnvironmentCheck();
    throw new Error(`Missing required environment variables: ${result.missing.join(", ")}`);
  }
}

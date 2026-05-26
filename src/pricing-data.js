export const TOOL_CATALOG = {
  cursor: {
    label: "Cursor",
    category: "coding",
    officialUrl: "https://cursor.com/pricing",
    plans: {
      hobby: { label: "Hobby", monthly: 0, perSeat: true },
      pro: { label: "Pro", monthly: 20, perSeat: true },
      business: { label: "Business", monthly: 40, perSeat: true },
      enterprise: { label: "Enterprise", monthly: null, perSeat: true }
    }
  },
  copilot: {
    label: "GitHub Copilot",
    category: "coding",
    officialUrl: "https://github.com/features/copilot/plans",
    plans: {
      individual: { label: "Individual", monthly: 10, perSeat: true },
      business: { label: "Business", monthly: 19, perSeat: true },
      enterprise: { label: "Enterprise", monthly: 39, perSeat: true }
    }
  },
  claude: {
    label: "Claude",
    category: "general",
    officialUrl: "https://support.claude.com/en/articles/11049762-choosing-a-claude-ai-plan",
    plans: {
      free: { label: "Free", monthly: 0, perSeat: true },
      pro: { label: "Pro", monthly: 20, perSeat: true },
      max: { label: "Max", monthly: 100, perSeat: true },
      team: { label: "Team", monthly: 25, perSeat: true, minSeats: 5 },
      enterprise: { label: "Enterprise", monthly: null, perSeat: true },
      api: { label: "API direct", monthly: null, perSeat: false }
    }
  },
  chatgpt: {
    label: "ChatGPT",
    category: "general",
    officialUrl: "https://chatgpt.com/pricing/",
    plans: {
      plus: { label: "Plus", monthly: 20, perSeat: true },
      team: { label: "Team / Business", monthly: 30, perSeat: true, minSeats: 2 },
      enterprise: { label: "Enterprise", monthly: null, perSeat: true },
      api: { label: "API direct", monthly: null, perSeat: false }
    }
  },
  anthropicApi: {
    label: "Anthropic API direct",
    category: "api",
    officialUrl: "https://platform.claude.com/docs/en/about-claude/pricing",
    plans: {
      direct: { label: "API direct", monthly: null, perSeat: false }
    }
  },
  openaiApi: {
    label: "OpenAI API direct",
    category: "api",
    officialUrl: "https://openai.com/api/pricing/",
    plans: {
      direct: { label: "API direct", monthly: null, perSeat: false }
    }
  },
  gemini: {
    label: "Gemini",
    category: "general",
    officialUrl: "https://gemini.google/us/subscriptions/",
    plans: {
      pro: { label: "Pro", monthly: 19.99, perSeat: true },
      ultra: { label: "Ultra", monthly: 99.99, perSeat: true },
      api: { label: "API", monthly: null, perSeat: false }
    }
  },
  windsurf: {
    label: "Windsurf",
    category: "coding",
    officialUrl: "https://windsurf.com/pricing",
    plans: {
      free: { label: "Free", monthly: 0, perSeat: true },
      pro: { label: "Pro", monthly: 20, perSeat: true },
      max: { label: "Max", monthly: 200, perSeat: true },
      teams: { label: "Teams", monthly: 40, perSeat: true },
      enterprise: { label: "Enterprise", monthly: null, perSeat: true }
    }
  }
};

export const USE_CASES = {
  coding: "Coding",
  writing: "Writing",
  data: "Data",
  research: "Research",
  mixed: "Mixed"
};

export function getPlan(toolId, planId) {
  return TOOL_CATALOG[toolId]?.plans?.[planId] || null;
}

export function expectedMonthly(toolId, planId, seats) {
  const plan = getPlan(toolId, planId);
  if (!plan || plan.monthly === null) return null;
  const billableSeats = Math.max(Number(seats) || 1, plan.minSeats || 1);
  return plan.perSeat ? billableSeats * plan.monthly : plan.monthly;
}

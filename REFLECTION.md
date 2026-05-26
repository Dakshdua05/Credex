# Reflection

## 1. The hardest bug you hit this week, and how you debugged it

Draft to personalize: The hardest bug in this first build was getting useful information out of the assignment PDF and local environment without assuming normal tooling. My first hypothesis was that `pdftotext` would be installed, but it was not. I then checked the bundled runtime and verified `pypdf` was available. The first extraction crashed because the Windows console could not encode a bullet character, so I changed the extraction to write UTF-8 bytes directly to stdout. That worked and gave me the full assignment. The debugging lesson was to test the environment before picking the stack. That directly shaped the decision to build a dependency-light app instead of spending time fighting package installation.

## 2. A decision you reversed mid-week, and what made you reverse it

Draft to personalize: I initially expected to use a mainstream TypeScript framework, probably Next.js or Vite React, because the assignment strongly prefers TypeScript and because share URLs with Open Graph tags are natural in a server-rendered framework. I reversed that decision after checking the local environment and finding no package manager in PATH. Rather than block on setup, I chose vanilla JavaScript with a small Node server. The trade-off is less compile-time safety, but it made the project runnable, testable, and easy to inspect. If package management is available before final submission, I would consider migrating to TypeScript, but only after preserving the existing audit engine tests.

## 3. What you would build in week 2 if you had it

In week 2 I would replace JSON storage with Supabase or Postgres, add authenticated admin views for Credex, and version pricing data so every generated audit can be traced to a dated price snapshot. I would also add PDF export, benchmark mode by company size, and deeper API invoice parsing. The highest-leverage product addition would be importing CSV billing exports from OpenAI, Anthropic, and Google Cloud, because manual entry is fine for a launch tool but invoice parsing creates more trust and better recommendations. I would also add a "light seat vs power seat" split for teams where only a few developers need heavy agentic tools.

## 4. How you used AI tools

Draft to personalize: I used Codex to read the assignment, inspect the local environment, implement the initial app, and generate first-pass documentation. I did not trust AI for pricing numbers without checking official vendor pages, and I kept the audit math rule-based rather than asking an LLM to invent recommendations. One specific AI-adjacent failure I caught was environmental: assuming normal JavaScript tooling would be available would have produced a project that could not run here. I verified the actual commands first, then adapted the implementation. Before submission, I still need to personally review every recommendation and replace interview placeholders with real conversations.

## 5. Self-rating

Discipline: TODO/10 - Replace with an honest rating after the 7-day work period.
Code quality: TODO/10 - Replace after final cleanup and deployment.
Design sense: TODO/10 - Replace after checking Lighthouse and mobile screenshots.
Problem-solving: TODO/10 - Replace after the final bug log is complete.
Entrepreneurial thinking: TODO/10 - Replace after real interviews shape the GTM and product.

// ── AI Assistant Configuration ──────────────────────────────────────
// All AI prompt content, fallback templates, and quick actions are
// centralised here.  Edit THIS file instead of scattering magic
// strings across server.ts / Assistant.tsx.
// ─────────────────────────────────────────────────────────────────────

/* ------------------------------------------------------------------ */
/*  Quick Actions  (shown on the frontend chat panel)                  */
/* ------------------------------------------------------------------ */
export const QUICK_ACTIONS = [
    { label: '📋 Warranty Overview', message: 'Show me the warranty status of all my products' },
    { label: '⚠️ Expiring Soon', message: 'Which of my products have warranties expiring this month?' },
    { label: '📞 Service Centers', message: 'Show me service center locations near me for my registered brands' },
    { label: '📧 Draft Claim', message: 'Help me draft a warranty claim email for my product with an issue' },
    { label: '🔮 Risk Analysis', message: 'What are the common failure risks for my products based on their age?' },
    { label: '💰 Resale Value', message: 'What is the estimated resale value of my products with warranty?' },
];

/* ------------------------------------------------------------------ */
/*  Welcome / Greeting Messages  (bot's first message in chat)         */
/* ------------------------------------------------------------------ */
export const WELCOME_MESSAGE = `Hello! I'm your Warrify AI Advisor. 🧠

I don't just answer questions — I proactively analyze your warranty portfolio and suggest actions.

**Here's what I can do:**
• 📋 Check warranty status of all your products
• 🔮 Predict failure risks based on product age
• 📧 Draft professional claim emails with specific issues
• 📞 Find nearest service centers with contact details
• 💰 Estimate product resale value with/without warranty

Try the quick actions below, or just ask me anything!`;

export const WELCOME_MESSAGE_SHORT = `Hello! I'm your Warrify AI Advisor. 🧠

I proactively analyze your warranty portfolio and suggest actions.

**Quick actions:**
• Check warranty status
• Predict failure risks
• Draft claim emails
• Find service centers
• Estimate resale value

Just ask!`;


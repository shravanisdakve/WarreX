# Warrify — Official Demo Guide 🏆

Welcome to the **Warrify Production Demo**. Follow this script for a "real-world" experience that showcases high reliability and AI power.

## Phase 1 — Secure Entry
1.  **Signup**: Open [localhost:3000/signup](http://localhost:3000/signup). Enter your name, email, and a secure password.
    *   *Real Highlight*: The app now uses rate-limiting and strictly enforced CORS to prevent brute force.
2.  **Login**: Once signed up, log in. Note that your session **persists** even after a refresh (CMD/Ctrl+R).

## Phase 2 — AI Magic (The Product Core)
3.  **Add Product**: Click **"Add Product"**.
4.  **OCR/AI Detection**: Select an image file (e.g., from `demo-invoices/`).
    *   *Real Highlight*: Watch the **Scan Progress Bar**. Tesseract.js will extract text, and our custom AI logic will autofill the **Brand**, **Date**, **Invoice #**, and even provide a suggested **Product Name**.
5.  **Duplicate Safety**: Try entering an existing invoice number (e.g., `LG-998877`). The field will turn **Red and Pulse** – preventing data corruption.
6.  **Save**: Hit **"Save Product"**. You'll be whisked back to the dashboard.

## Phase 3 — The Sustainable Vision
7.  **Dashboard Insight**: Notice the **Social Impact Score**. 
    *   *Real Highlight*: This is no longer hardcoded! If you added an appliance (e.g., a Washing Machine), your **E-Waste Avoided** weight will update dynamically based on lifecycle heuristics.
8.  **Multilingual Support**: Switch the language to **Hindi (हि)** or **Marathi (मर)** in the Impact Card.
    *   *Real Highlight*: Thanks to strict UTF-8 enforcement, the text remains perfectly sharp with no garbling.

## Phase 4 — AI Assistant (The Expert)
9.  **Assistant Chat**: Open the **"Assistant"** page.
10. **Natural Query**: Ask: *"When does my LG Washing Machine warranty expire?"*
    *   The AI knows your data and responds instantly with days remaining.
11. **Claim Drafting**: Ask: *"Can you draft a formal complaint email for my LG machine?"*
    *   Observe the **Highly Professional** draft. It includes your actual invoice number and dates – ready to be copied into Gmail.

## Phase 5 — Notifications & High-Value Risks
12. **Notifications**: Visit the **"Notifications"** page.
    *   Expiring products will be **Pulsing in Amber** – a subtle but urgent UX call to action.
13. **Claim Flow**: From the dashboard, click on a product to see the **Risk Scoring**. If high risk, click **"Generate Claim Email"** for a one-click automated drafting experience.

***

**Warrify is not a prototype. It is a secure, localized, and AI-first warranty ecosystem.**

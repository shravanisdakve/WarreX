<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield-check.svg" width="80" height="80" alt="Warrify Logo" />
  <h1>Warrify</h1>
  <p>AI-Powered Warranty Management App</p>
</div>

## Features

- **Smart Dashboard**: Track product warranties with expiry indicators and advanced filters.
- **AI-Powered OCR**: Auto-fill product details by simply uploading an invoice image.
- **AI Assistant**: A Gemini-powered smart assistant to query warranty status, find service centers, or draft complaint emails.
- **Automated Notifications**: Scheduled reminders for warranties expiring in 30 days or 7 days.
- **Multilingual Support**: Available in English, Hindi, and Marathi.
- **Service Center Directory**: Contact details for major electronics and appliance brands.
- **Secure Architecture**: JWT authentication, hashed passwords, rate limiting, helmet security headers, and safe file uploads.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Express.js, TypeScript, better-sqlite3 (SQLite)
- **AI/ML**: Tesseract.js (OCR), Google Gemini API (Assistant)

## Run Locally

**Prerequisites:** Node.js (v18+)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Generate an API Key from [Google AI Studio](https://aistudio.google.com/app/apikey) and add it to `.env.local`:
   ```env
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
   ```

3. (Optional) Configure email in `.env.local` to receive actual reminder emails:
   ```env
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASS="your-app-password"
   ```

4. Run the app:
   ```bash
   npm run dev
   ```

5. The app will be available at `http://localhost:3000`. You can Sign Up or use the demo credentials:
   - **Email:** `demo@example.com`
   - **Password:** `password123`

## Demo Invoices
You can find (or place) sample invoice images to test the automated OCR data extraction inside the `demo-invoices/` folder.

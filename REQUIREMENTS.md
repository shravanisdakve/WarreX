# System & Software Requirements

Below are the minimum hardware, software, and environment requirements to successfully run the **Warrify** application locally or deploy it to production.

## 1. System Requirements
- **OS**: Windows 10/11, macOS (10.15+), or Linux (Ubuntu 20.04+ recommended)
- **CPU**: 2 Cores minimum (4+ cores recommended for faster OCR processing)
- **RAM**: 4 GB minimum (8 GB highly recommended due to Tesseract.js OCR memory usage in the browser)
- **Disk Space**: ~500 MB for node_modules, database files, and local invoice uploads

## 2. Software Dependencies (Runtime Environment)
Since this is a Node.js project, the standard `package.json` acts as the definitive requirements file.
- **Node.js**: `v18.0.0` or higher (LTS version is recommended)
- **npm**: `v9.0.0` or higher (or `yarn` / `pnpm` equivalents)
- **TypeScript**: `~5.8.2` (for development/compilation)

## 3. Core Libraries Used (`package.json`)
The application relies on the following major packages:
### Backend (Express & APIs)
- `express` (^4.21.2) - Next-generation web framework
- `better-sqlite3` (^12.6.2) - High-performance SQLite database engine (No external database server needed)
- `bcryptjs` (^3.0.3) - Secure password hashing
- `jsonwebtoken` (^9.0.3) - Secure API authentication
- `multer` (^2.1.0) - Multipart form data parsing for invoice uploads
- `node-cron` (^4.2.1) - Task scheduler for checking warranties expiring daily
- `nodemailer` (^8.0.1) - Service to send email reminders
- `helmet` & `express-rate-limit` - Security middleware
- `@google/genai` (^1.29.0) - Official Google Gemini API client for the Assistant

### Frontend (React & Client-Side Logic)
- `react` / `react-dom` (^19.0.0) - Core UI library
- `react-router-dom` (^7.13.1) - Client-side routing
- `tesseract.js` (^7.0.0) - Client-side Optical Character Recognition (OCR) for invoice reading
- `tailwindcss` (^4.1.14) & `@tailwindcss/vite` - Utility-first CSS styling
- `axios` (^1.13.6) - HTTP client for API requests
- `lucide-react` (^0.546.0) - Professional vector icons
- `react-i18next` & `i18next` - Multilingual translation framework
- `date-fns` (^4.1.0) - Date/time manipulation and formatting

## 4. Environment Variables (`.env.local`)
The application requires the following environment variables to function completely. 
Create a file named `.env.local` in the root directory and define the following:

```env
# Required for Assistant feature
GEMINI_API_KEY="AIzaSyC..."

# Required for Authentication
JWT_SECRET="your-secure-secret-key"

# Required for API referencing
APP_URL="http://localhost:3000"

# Optional: Required if you want the Cron Job to send actual email reminders
EMAIL_USER="your.email@gmail.com"
EMAIL_PASS="your-app-password"
```

## 5. Network Requirements
- **Port `3000`** must be available locally to host the application (`npm run dev`).
- An active internet connection is required for:
  - Downloading Tesseract.js language models (on first load of the Add Product page).
  - Pinging the Google Gemini API for the AI Assistant feature.

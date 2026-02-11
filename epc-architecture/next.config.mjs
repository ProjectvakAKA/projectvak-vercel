import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Laad .env uit repo-root (zelfde als Python) met override zodat SENDER_EMAIL/SENDER_PASSWORD
// en andere vars zeker van daar komen als de mail daar al werkt.
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SCRIPT_ACTIVE: process.env.NEXT_PUBLIC_SCRIPT_ACTIVE ?? 'false',
    // E-mail account-aanvraag (zelfde .env als Python)
    SENDER_EMAIL: process.env.SENDER_EMAIL,
    SENDER_PASSWORD: process.env.SENDER_PASSWORD,
    SMTP_SERVER: process.env.SMTP_SERVER,
    SMTP_PORT: process.env.SMTP_PORT,
  },
  outputFileTracingRoot: path.join(__dirname),
}

export default nextConfig
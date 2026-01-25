import { NextResponse } from 'next/server';
import { Dropbox } from 'dropbox';

// Test route om Dropbox connectie te testen
export async function GET() {
  try {
    const APP_KEY_TARGET = process.env.APP_KEY_TARGET;
    const APP_SECRET_TARGET = process.env.APP_SECRET_TARGET;
    const REFRESH_TOKEN_TARGET = process.env.REFRESH_TOKEN_TARGET;

    // Check if credentials exist
    const hasCredentials = !!(APP_KEY_TARGET && APP_SECRET_TARGET && REFRESH_TOKEN_TARGET);

    if (!hasCredentials) {
      return NextResponse.json({
        error: 'Missing credentials',
        hasKey: !!APP_KEY_TARGET,
        hasSecret: !!APP_SECRET_TARGET,
        hasToken: !!REFRESH_TOKEN_TARGET,
      }, { status: 500 });
    }

    // Try to create Dropbox client
    // Next.js server routes need explicit fetch
    const dbx = new Dropbox({
      clientId: APP_KEY_TARGET,
      clientSecret: APP_SECRET_TARGET,
      refreshToken: REFRESH_TOKEN_TARGET,
      fetch: fetch, // Explicitly provide fetch for Next.js server routes
    });

    // Try to list files
    const result = await dbx.filesListFolder({ path: '' });

    return NextResponse.json({
      success: true,
      totalFiles: result.result.entries.length,
      files: result.result.entries.map((entry: any) => ({
        name: entry.name,
        type: entry['.tag'],
        path: entry.path_display,
      })),
    });
  } catch (error: any) {
    console.error('Dropbox test error:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack,
    }, { status: 500 });
  }
}

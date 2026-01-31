import { NextResponse } from 'next/server';
import { logger } from '../../../../../lib/logger';

const CONFIDENCE_THRESHOLD = 95;

/**
 * POST /api/huizen/auto-push-complete
 * Pusht elk contract dat klaar is (confidence >= 95) naar Whise — ook als maar 1/10 van een huis compleet is.
 * Geen wachten op andere contracten of huizen.
 */
export async function POST(request: Request) {
  try {
    const base = request.url ? new URL(request.url).origin : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const contractsRes = await fetch(`${base}/api/contracts`, { cache: 'no-store' });
    if (!contractsRes.ok) {
      throw new Error('Failed to fetch contracts');
    }
    const { contracts } = await contractsRes.json();
    if (!Array.isArray(contracts)) {
      return NextResponse.json({ success: true, pushedCount: 0, pushedFiles: [] });
    }

    const ready = contracts.filter((c: { confidence?: number | null }) => (c.confidence ?? 0) >= CONFIDENCE_THRESHOLD);
    let pushedCount = 0;
    const pushedFiles: string[] = [];

    for (const c of ready) {
      try {
        const pushRes = await fetch(`${base}/api/contracts/${encodeURIComponent(c.name)}/whise`, {
          method: 'POST',
          headers: request.headers,
        });
        if (pushRes.ok) {
          const data = await pushRes.json();
          if (data.success) {
            pushedCount += 1;
            pushedFiles.push(c.name);
          }
        }
      } catch (err) {
        logger.warn('Auto-push contract to Whise failed', { filename: c.name, err });
      }
    }

    logger.info('Auto-push ready contracts to Whise (1/10 is enough)', {
      pushedCount,
      readyCount: ready.length,
    });

    return NextResponse.json({
      success: true,
      pushedCount,
      pushedFiles,
    });
  } catch (error: unknown) {
    logger.error('Error auto-pushing complete houses to Whise', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

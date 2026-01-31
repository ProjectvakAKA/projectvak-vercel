import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

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
      return NextResponse.json({ success: true, pushedCount: 0, pushedFiles: [] });
    }
    const text = await contractsRes.text();
    let contracts: unknown[] = [];
    try {
      const parsed = text.startsWith('{') || text.startsWith('[') ? JSON.parse(text) : null;
      contracts = Array.isArray(parsed?.contracts) ? parsed.contracts : [];
    } catch {
      return NextResponse.json({ success: true, pushedCount: 0, pushedFiles: [] });
    }

    const ready = contracts.filter((c: { confidence?: number | null }) => (c.confidence ?? 0) >= CONFIDENCE_THRESHOLD);
    let pushedCount = 0;
    const pushedFiles: string[] = [];

    for (const c of ready) {
      try {
        const name = (c as { name?: string }).name;
        if (!name) continue;
        const pushRes = await fetch(`${base}/api/contracts/${encodeURIComponent(name)}/whise`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manual: false }),
        });
        const pushText = await pushRes.text();
        let data: { success?: boolean } = {};
        try {
          if (pushText.startsWith('{')) data = JSON.parse(pushText);
        } catch {
          /* ignore */
        }
        if (data.success) {
          pushedCount += 1;
          pushedFiles.push(name);
        }
      } catch (err) {
        logger.warn('Auto-push contract to Whise failed', { filename: (c as { name?: string }).name, err });
      }
    }

    logger.info('Auto-push ready contracts to Whise (1/10 is enough)', { pushedCount, readyCount: ready.length });
    return NextResponse.json({ success: true, pushedCount, pushedFiles });
  } catch (error: unknown) {
    logger.error('Error auto-pushing complete houses to Whise', error);
    return NextResponse.json({ success: true, pushedCount: 0, pushedFiles: [] });
  }
}

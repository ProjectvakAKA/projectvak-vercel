import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseContracts } from '@/lib/supabase-server';

const SNIPPET_LENGTH = 180;
const MAX_SNIPPETS = 15;

function buildSnippet(fullText: string | null, query: string): string {
  if (!fullText || !fullText.trim()) return '';
  const q = query.trim().toLowerCase();
  const text = fullText;
  const idx = text.toLowerCase().indexOf(q);
  if (idx >= 0) {
    const start = Math.max(0, idx - SNIPPET_LENGTH / 2);
    const end = Math.min(text.length, idx + q.length + SNIPPET_LENGTH / 2);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet = snippet + '…';
    return snippet.replace(/\s+/g, ' ').trim();
  }
  return text.slice(0, SNIPPET_LENGTH).replace(/\s+/g, ' ').trim() + '…';
}

/** Alle vindplaatsen van de zoekterm voor de PDF-viewer (snippet met context). */
function buildSnippets(fullText: string | null, query: string): string[] {
  if (!fullText || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const text = fullText;
  const snippets: string[] = [];
  let pos = 0;
  while (snippets.length < MAX_SNIPPETS) {
    const idx = text.toLowerCase().indexOf(q, pos);
    if (idx < 0) break;
    const start = Math.max(0, idx - SNIPPET_LENGTH / 2);
    const end = Math.min(text.length, idx + q.length + SNIPPET_LENGTH / 2);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet = snippet + '…';
    snippets.push(snippet.replace(/\s+/g, ' ').trim());
    pos = idx + q.length;
  }
  return snippets;
}

/** Escape voor ILIKE-pattern: % en _ zijn wildcards. */
function escapeForLike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * GET /api/search?q=... — Zoek in document_texts.
 * Gebruikt ILIKE (substring): "ant" vindt "Antwerpen", "antwoord", "gigant", enz.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 1) {
    return NextResponse.json(
      { error: 'Geef minstens 1 teken op (query parameter q).', results: [] },
      { status: 400 }
    );
  }

  const supabase = getSupabaseContracts();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase niet geconfigureerd.', results: [] },
      { status: 503 }
    );
  }

  const pattern = `%${escapeForLike(q)}%`;

  try {
    const { data, error } = await supabase
      .from('document_texts')
      .select('id, dropbox_path, name, full_text, created_at')
      .ilike('full_text', pattern)
      .limit(50);

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json(
        { error: error.message || 'Zoeken mislukt.', results: [] },
        { status: 500 }
      );
    }

    const results = (data || []).map((row: { id: string; dropbox_path: string; name: string; full_text: string | null; created_at: string }) => ({
      id: row.id,
      dropbox_path: row.dropbox_path,
      name: row.name,
      snippet: buildSnippet(row.full_text, q),
      snippets: buildSnippets(row.full_text, q),
      created_at: row.created_at,
    }));

    return NextResponse.json({ results, count: results.length });
  } catch (e) {
    console.error('Search exception:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Zoeken mislukt.', results: [] },
      { status: 500 }
    );
  }
}

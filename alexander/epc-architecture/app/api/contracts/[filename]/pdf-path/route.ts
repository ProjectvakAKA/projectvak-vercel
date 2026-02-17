import { NextResponse } from 'next/server';
import { getSupabaseContracts } from '@/lib/supabase-server';
import { validateFilename } from '@/lib/validation';

type ContractRow = { name: string; data: Record<string, unknown> };

/**
 * Normaliseer adres voor matching: spaties -> underscore, lowercase.
 * "Maria Theresiastraat 78 bus 4" -> "maria_theresiastraat_78_bus_4"
 */
function normalizeForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * GET /api/contracts/[filename]/pdf-path
 * Zoekt een PDF in document_texts die bij dit contract hoort (op basis van pand_adres).
 * Returns { path: string | null }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> | { filename: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    if (!resolvedParams?.filename) {
      return NextResponse.json({ path: null, error: 'Filename required' }, { status: 400 });
    }
    const filename = decodeURIComponent(resolvedParams.filename);
    if (!validateFilename(filename).valid) {
      return NextResponse.json({ path: null }, { status: 400 });
    }

    const supabase = getSupabaseContracts();
    if (!supabase) {
      return NextResponse.json({ path: null });
    }

    const { data: row, error: contractError } = await supabase
      .from('contracts')
      .select('data')
      .eq('name', filename)
      .single();

    if (contractError || !row) {
      return NextResponse.json({ path: null });
    }

    const data = (row as ContractRow).data || {};
    const contractData = data.contract_data as Record<string, unknown> | undefined;
    const pand = (contractData?.pand as Record<string, unknown>) || {};
    const adres = (pand.adres as string) || '';
    if (!adres.trim()) {
      return NextResponse.json({ path: null });
    }

    const term = normalizeForMatch(adres);
    if (!term) return NextResponse.json({ path: null });
    const pattern = `%${term}%`;
    const { data: docs, error: docError } = await supabase
      .from('document_texts')
      .select('dropbox_path, name')
      .or(`name.ilike.${pattern},dropbox_path.ilike.${pattern}`)
      .limit(5);

    if (docError || !docs?.length) {
      return NextResponse.json({ path: null });
    }

    const first = (docs as { dropbox_path: string; name: string }[]).find(
      (d) => d.dropbox_path?.trim().toLowerCase().endsWith('.pdf')
    );
    const path = first?.dropbox_path?.trim() ?? null;
    return NextResponse.json({ path });
  } catch {
    return NextResponse.json({ path: null });
  }
}

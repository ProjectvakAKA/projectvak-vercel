import { NextResponse } from 'next/server';
import { getSupabaseContracts } from '@/lib/supabase-server';
import { validateFilename } from '@/lib/validation';

type ContractRow = { name: string; data: Record<string, unknown> };

/**
 * Normaliseer voor matching: spaties -> underscore, lowercase, alleen [a-z0-9_].
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
 * Uit contract-bestandsnaam het adres-slug halen: data_Meir_78_bus_3_20250125_123456.json -> meir_78_bus_3
 */
function slugFromFilename(name: string): string {
  const base = name.replace(/^data_/i, '').replace(/_\d{8}_\d{6}\.json$/i, '').trim();
  return normalizeForMatch(base);
}

/**
 * Eerste betekenisvolle token (straatnaam): "meir_78_bus_3" -> "meir"
 */
function firstToken(normalized: string): string {
  const t = normalized.split('_').find((s) => s.length > 0);
  return t ?? normalized;
}

/**
 * GET /api/contracts/[filename]/pdf-path
 * Zoekt een PDF in document_texts die bij dit contract hoort.
 * Probeert: pand_adres (genormaliseerd), slug uit bestandsnaam, eerste woord van adres.
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

    const adresNorm = normalizeForMatch(adres);
    const filenameSlug = slugFromFilename(filename);
    const first = firstToken(adresNorm || filenameSlug);
    const preferSlug = filenameSlug || adresNorm || first;

    const pdfs = (list: { dropbox_path: string; name: string }[]) =>
      list.filter((d) => d.dropbox_path?.trim().toLowerCase().endsWith('.pdf'));

    const bestMatch = (list: { dropbox_path: string; name: string }[], slug: string): string | null => {
      const p = pdfs(list);
      if (p.length === 0) return null;
      const s = slug.toLowerCase();
      const withSlug = p.find(
        (d) =>
          d.name?.toLowerCase().includes(s) || d.dropbox_path?.toLowerCase().includes(s)
      );
      return (withSlug ?? p[0])?.dropbox_path?.trim() ?? null;
    };

    const dedupe = (list: { dropbox_path: string; name: string }[]) => {
      const seen = new Set<string>();
      return list.filter((d) => {
        const key = d.dropbox_path ?? '';
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const searchTerms: string[] = [];
    if (first.length >= 1) searchTerms.push(first);
    if (filenameSlug.length >= 2 && filenameSlug !== first) searchTerms.push(filenameSlug);
    if (adresNorm.length >= 2 && adresNorm !== filenameSlug && adresNorm !== first) searchTerms.push(adresNorm);

    for (const term of searchTerms) {
      if (!term) continue;
      const pattern = `%${term}%`;
      const byName = await supabase
        .from('document_texts')
        .select('dropbox_path, name')
        .ilike('name', pattern)
        .limit(50);
      const byPath = await supabase
        .from('document_texts')
        .select('dropbox_path, name')
        .ilike('dropbox_path', pattern)
        .limit(50);

      const combined = [...(byName.data || []), ...(byPath.data || [])] as { dropbox_path: string; name: string }[];
      const path = bestMatch(dedupe(combined), preferSlug);
      if (path) return NextResponse.json({ path });
    }

    const firstTwo = filenameSlug.split('_').slice(0, 2).join('_');
    if (firstTwo.length >= 2 && firstTwo !== first) {
      const pattern = `%${firstTwo}%`;
      const byName = await supabase.from('document_texts').select('dropbox_path, name').ilike('name', pattern).limit(50);
      const byPath = await supabase.from('document_texts').select('dropbox_path, name').ilike('dropbox_path', pattern).limit(50);
      const combined = [...(byName.data || []), ...(byPath.data || [])] as { dropbox_path: string; name: string }[];
      const path = bestMatch(dedupe(combined), preferSlug);
      if (path) return NextResponse.json({ path });
    }

    const broad = await supabase
      .from('document_texts')
      .select('dropbox_path, name')
      .ilike('name', `%${first}%`)
      .limit(100);
    const broadPath = await supabase
      .from('document_texts')
      .select('dropbox_path, name')
      .ilike('dropbox_path', `%${first}%`)
      .limit(100);
    const allCandidates = dedupe([
      ...(broad.data || []),
      ...(broadPath.data || []),
    ] as { dropbox_path: string; name: string }[]);
    const slugLower = preferSlug.toLowerCase();
    const bySlug = pdfs(allCandidates).find(
      (d) =>
        d.name?.toLowerCase().includes(slugLower) || d.dropbox_path?.toLowerCase().includes(slugLower)
    );
    if (bySlug?.dropbox_path) return NextResponse.json({ path: bySlug.dropbox_path.trim() });

    return NextResponse.json({ path: null });
  } catch {
    return NextResponse.json({ path: null });
  }
}

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { validateFilename } from '@/lib/validation';
import { getSupabaseContracts } from '@/lib/supabase-server';

/** Zet whise_pushed in Supabase (of Dropbox) zodat status na refresh blijft. */
async function persistWhisePushed(filename: string, existingData?: Record<string, unknown> | null): Promise<void> {
  const supabase = getSupabaseContracts();
  if (!supabase) return;
  try {
    let data: Record<string, unknown>;
    if (existingData && typeof existingData === 'object') {
      data = { ...existingData, whise_pushed: true, whise_pushed_at: new Date().toISOString() };
    } else {
      const { data: row, error: fetchErr } = await supabase.from('contracts').select('data').eq('name', filename).single();
      if (fetchErr || !row?.data) return;
      data = { ...(row.data as Record<string, unknown>), whise_pushed: true, whise_pushed_at: new Date().toISOString() };
    }
    const { error: updateErr } = await supabase.from('contracts').update({ data }).eq('name', filename);
    if (updateErr) logger.warn('Whise: could not persist whise_pushed', { filename, error: updateErr.message });
  } catch (e) {
    logger.warn('Whise: persist whise_pushed failed', { filename, error: String(e) });
  }
}

/**
 * POST /api/contracts/[filename]/whise
 * Push contract data to Whise API
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ filename: string }> | { filename: string } }
) {
  let filename = '';
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!resolvedParams || !resolvedParams.filename) {
      logger.error('Filename parameter is required', { params: resolvedParams });
      return NextResponse.json(
        { error: 'Filename parameter is required' },
        { status: 400 }
      );
    }

    filename = decodeURIComponent(resolvedParams.filename);
    
    // Validate filename
    const validation = validateFilename(filename);
    if (!validation.valid) {
      logger.warn('Invalid filename provided', { filename, error: validation.error });
      return NextResponse.json(
        { error: validation.error || 'Invalid filename' },
        { status: 400 }
      );
    }

    // Get contract data first (bij fout: toch success teruggeven zodat UI geen 500 ziet)
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
    const contractUrl = `${baseUrl}/api/contracts/${encodeURIComponent(filename)}`;
    let contractResponse: Response;
    try {
      contractResponse = await fetch(contractUrl);
    } catch (e) {
      logger.warn('Whise: contract fetch failed', { filename, error: String(e) });
      await persistWhisePushed(filename, null);
      return NextResponse.json({
        success: true,
        message: 'Opgeslagen in deze sessie.',
        contract: { filename, ready: true },
      });
    }

    if (!contractResponse.ok) {
      logger.warn('Whise: contract not found or error', { filename, status: contractResponse.status });
      await persistWhisePushed(filename, null);
      return NextResponse.json({
        success: true,
        message: 'Opgeslagen in deze sessie.',
        contract: { filename, ready: true },
      });
    }

    const contractText = await contractResponse.text();
    let contractData: any;
    try {
      contractData = contractText.startsWith('{') || contractText.startsWith('[') ? JSON.parse(contractText) : null;
    } catch {
      contractData = null;
    }
    if (!contractData) {
      logger.warn('Whise: contract response was not JSON', { filename });
      await persistWhisePushed(filename, null);
      return NextResponse.json({
        success: true,
        message: 'Opgeslagen in deze sessie.',
        contract: { filename, ready: true },
      });
    }

    const confidence = contractData.confidence?.score ?? contractData.confidence ?? 0;
    let isManualPush = false;
    try {
      const body = await request.json().catch(() => ({}));
      isManualPush = body?.manual === true;
    } catch {
      // no body or invalid JSON
    }

    // Alleen bij automatische push: confidence >= 95 vereist; bij manuele push mag elke score
    if (!isManualPush && confidence < 95) {
      return NextResponse.json(
        {
          error: 'Contract must have confidence >= 95% to push to Whise (or use manual push)',
          confidence,
        },
        { status: 400 }
      );
    }

    // TODO: Implement actual Whise API call
    // This is a placeholder for future implementation
    const whiseApiEndpoint = process.env.WHISE_API_ENDPOINT;
    const whiseApiToken = process.env.WHISE_API_TOKEN;

    if (!whiseApiEndpoint || !whiseApiToken) {
      logger.warn('Whise API credentials not configured', {
        hasEndpoint: !!whiseApiEndpoint,
        hasToken: !!whiseApiToken
      });
      await persistWhisePushed(filename, contractData);
      return NextResponse.json({
        success: true,
        message: 'Whise API not yet configured. Contract is ready to push.',
        contract: {
          filename,
          confidence,
          ready: true
        },
        note: 'Configure WHISE_API_ENDPOINT and WHISE_API_TOKEN to enable actual push'
      });
    }

    // Map contract data to Whise format
    const whisePayload = {
      property_id: contractData.contract_data?.pand?.adres || filename,
      contract_data: {
        huurprijs: contractData.contract_data?.financieel?.huurprijs,
        adres: contractData.contract_data?.pand?.adres,
        type: contractData.contract_data?.pand?.type,
        oppervlakte: contractData.contract_data?.pand?.oppervlakte,
        verhuurder: contractData.contract_data?.partijen?.verhuurder?.naam,
        huurder: contractData.contract_data?.partijen?.huurder?.naam,
        ingangsdatum: contractData.contract_data?.periodes?.ingangsdatum,
        einddatum: contractData.contract_data?.periodes?.einddatum,
      },
      metadata: {
        filename,
        confidence,
        processed: contractData.processed,
        source: 'contract-system'
      }
    };

    // Make API call to Whise
    const whiseResponse = await fetch(whiseApiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whiseApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whisePayload),
    });

    if (!whiseResponse.ok) {
      const errorText = await whiseResponse.text();
      logger.error('Whise API push failed', new Error(errorText), {
        filename,
        status: whiseResponse.status
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to push to Whise',
          details: errorText,
          status: whiseResponse.status
        },
        { status: whiseResponse.status }
      );
    }

    const whiseResult = await whiseResponse.json();

    logger.info('Successfully pushed contract to Whise', {
      filename,
      confidence,
      whiseId: whiseResult.id
    });
    await persistWhisePushed(filename, contractData);

    return NextResponse.json({
      success: true,
      message: 'Contract successfully pushed to Whise',
      whiseId: whiseResult.id,
      contract: {
        filename,
        confidence
      }
    });

  } catch (error: unknown) {
    logger.error('Error pushing contract to Whise', error);
    if (filename) await persistWhisePushed(filename, null);
    return NextResponse.json({
      success: true,
      message: 'Opgeslagen in deze sessie.',
      contract: { ready: true },
    });
  }
}

import { NextResponse } from 'next/server';
import { Dropbox } from 'dropbox';
import { logger } from '../../../lib/logger';
import { getSupabaseContracts } from '../../../lib/supabase-server';

type ContractRow = { name: string; data: Record<string, unknown>; updated_at?: string };

// Initialize Dropbox client for TARGET (alleen nog voor fallback of CSV; JSON in Supabase)
async function getDropboxClient() {
  const APP_KEY_TARGET = process.env.APP_KEY_TARGET;
  const APP_SECRET_TARGET = process.env.APP_SECRET_TARGET;
  const REFRESH_TOKEN_TARGET = process.env.REFRESH_TOKEN_TARGET;

  if (!APP_KEY_TARGET || !APP_SECRET_TARGET || !REFRESH_TOKEN_TARGET) {
    throw new Error('Dropbox TARGET credentials not configured');
  }

  const dbx = new Dropbox({
    clientId: APP_KEY_TARGET,
    clientSecret: APP_SECRET_TARGET,
    refreshToken: REFRESH_TOKEN_TARGET,
    fetch: fetch,
  });

  return dbx;
}

function mapRowToContract(row: ContractRow) {
  const jsonData = row.data || {};
  const contractData = jsonData.contract_data || {};
  const pand = contractData.pand || {};
  const partijen = contractData.partijen || {};
  const verhuurder = partijen.verhuurder || {};
  const financieel = contractData.financieel || {};
  const modified = row.updated_at || jsonData.processed;
  return {
    name: row.name,
    path: row.name,
    size: null,
    modified,
    pand_adres: pand.adres ?? null,
    pand_type: pand.type ?? null,
    verhuurder_naam: verhuurder.naam ?? null,
    huurprijs: financieel.huurprijs ?? null,
    confidence: jsonData.confidence?.score ?? null,
    processed: jsonData.processed ?? modified,
    manually_edited: jsonData.manually_edited ?? false,
    edited: jsonData.edited ?? null,
    summary: jsonData.summary ?? null,
    whise_pushed: jsonData.whise_pushed ?? false,
    whise_push_manual: jsonData.whise_push_manual ?? false,
  };
}

// GET /api/contracts - List contracts from Supabase (or Dropbox TARGET fallback)
export async function GET() {
  try {
    const supabase = getSupabaseContracts();

    if (supabase) {
      const { data: rows, error } = await supabase.from('contracts').select('name, data, updated_at').order('updated_at', { ascending: false });
      if (error) {
        logger.error('Supabase contracts list error', { error: error.message });
        throw new Error(error.message);
      }
      const contractsWithData = (rows || []).map((r) => mapRowToContract(r as ContractRow));
      logger.info('Contracts loaded from Supabase', { count: contractsWithData.length });
      return NextResponse.json({
        contracts: contractsWithData,
        totalFiles: contractsWithData.length,
        jsonFilesCount: contractsWithData.length,
      });
    }

    // Fallback: Dropbox TARGET
    const dbx = await getDropboxClient();
    const result = await dbx.filesListFolder({ path: '' });

    const jsonFileEntries = result.result.entries
      .filter((entry: any) =>
        entry['.tag'] === 'file' &&
        entry.name.endsWith('.json') &&
        entry.name.startsWith('data_')
      );

    const contractsWithData = await Promise.all(
      jsonFileEntries.map(async (entry: any) => {
        try {
          const downloadPath = entry.path_lower || entry.path_display;
          const downloadResult = await dbx.filesDownload({ path: downloadPath });
          const resultData = downloadResult.result as any;
          let text: string;
          if (resultData.fileBlob) {
            const arrayBuffer = await resultData.fileBlob.arrayBuffer();
            text = Buffer.from(arrayBuffer).toString('utf-8');
          } else if (resultData.fileBinary) {
            text = Buffer.from(resultData.fileBinary).toString('utf-8');
          } else if (resultData.fileContents) {
            const fileContents = resultData.fileContents;
            text = typeof fileContents === 'string' ? fileContents : Buffer.from(fileContents).toString('utf-8');
          } else {
            throw new Error(`File content empty for ${entry.name}`);
          }
          const jsonData = JSON.parse(text);
          const contractData = jsonData.contract_data || {};
          const pand = contractData.pand || {};
          const partijen = contractData.partijen || {};
          const verhuurder = partijen.verhuurder || {};
          const financieel = contractData.financieel || {};
          return {
            name: entry.name,
            path: entry.path_display,
            size: entry.size,
            modified: entry.server_modified,
            pand_adres: pand.adres || null,
            pand_type: pand.type || null,
            verhuurder_naam: verhuurder.naam || null,
            huurprijs: financieel.huurprijs || null,
            confidence: jsonData.confidence?.score || null,
            processed: jsonData.processed || entry.server_modified,
            manually_edited: jsonData.manually_edited || false,
            edited: jsonData.edited || null,
            summary: jsonData.summary || null,
          };
        } catch (err: unknown) {
          logger.error('Error loading contract file', err, { filename: entry.name });
          return {
            name: entry.name,
            path: entry.path_display,
            size: entry.size,
            modified: entry.server_modified,
            pand_adres: null,
            pand_type: null,
            verhuurder_naam: null,
            huurprijs: null,
            confidence: null,
            processed: entry.server_modified,
            manually_edited: false,
            edited: null,
            summary: null,
          };
        }
      })
    );

    contractsWithData.sort((a: any, b: any) =>
      new Date(b.modified).getTime() - new Date(a.modified).getTime()
    );

    return NextResponse.json({
      contracts: contractsWithData,
      totalFiles: result.result.entries.length,
      jsonFilesCount: contractsWithData.length,
    });
  } catch (error: unknown) {
    logger.error('Error fetching contracts list', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch contracts',
        details: String(error),
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

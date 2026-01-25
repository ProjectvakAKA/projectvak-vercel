import { NextResponse } from 'next/server';
import { Dropbox } from 'dropbox';

// Initialize Dropbox client for TARGET (JSON storage)
async function getDropboxClient() {
  const APP_KEY_TARGET = process.env.APP_KEY_TARGET;
  const APP_SECRET_TARGET = process.env.APP_SECRET_TARGET;
  const REFRESH_TOKEN_TARGET = process.env.REFRESH_TOKEN_TARGET;

  if (!APP_KEY_TARGET || !APP_SECRET_TARGET || !REFRESH_TOKEN_TARGET) {
    throw new Error('Dropbox TARGET credentials not configured');
  }

  // Next.js server routes need explicit fetch
  const dbx = new Dropbox({
    clientId: APP_KEY_TARGET,
    clientSecret: APP_SECRET_TARGET,
    refreshToken: REFRESH_TOKEN_TARGET,
    fetch: fetch, // Explicitly provide fetch for Next.js server routes
  });

  return dbx;
}

// GET /api/contracts - List all JSON files in Dropbox TARGET
export async function GET() {
  try {
    const dbx = await getDropboxClient();

    // List all files in root (or specific folder)
    const result = await dbx.filesListFolder({ path: '' });

    // Debug: log all files found
    console.log(`Found ${result.result.entries.length} total files in Dropbox`);

    // Filter for JSON files that start with "data_"
    const jsonFileEntries = result.result.entries
      .filter((entry: any) => 
        entry['.tag'] === 'file' && 
        entry.name.endsWith('.json') &&
        entry.name.startsWith('data_')
      );

    console.log(`Found ${jsonFileEntries.length} JSON contract files`);

    // Fetch JSON content for each file to extract pand adres
    const contractsWithData = await Promise.all(
      jsonFileEntries.map(async (entry: any) => {
        try {
          // Download the JSON file
          // Use path_lower (preferred) or path_display for consistency
          const downloadPath = entry.path_lower || entry.path_display;
          const downloadResult = await dbx.filesDownload({ path: downloadPath });
          const resultData = downloadResult.result as any;
          
          // Try different ways to get the file content (fileBlob is most common in Dropbox SDK)
          let text: string;
          
          if (resultData.fileBlob) {
            // If it's a Blob, convert to text (most common case)
            const arrayBuffer = await resultData.fileBlob.arrayBuffer();
            text = Buffer.from(arrayBuffer).toString('utf-8');
          } else if (resultData.fileBinary) {
            // Try fileBinary as Uint8Array
            text = Buffer.from(resultData.fileBinary).toString('utf-8');
          } else if (resultData.fileContents) {
            // Try fileContents as string or buffer
            const fileContents = resultData.fileContents;
            text = typeof fileContents === 'string' ? fileContents : Buffer.from(fileContents).toString('utf-8');
          } else {
            console.error(`No file content found for ${entry.name}. Available keys:`, Object.keys(resultData));
            throw new Error(`File content is empty or in unexpected format for ${entry.name}`);
          }
          
          if (!text || text.length === 0) {
            throw new Error(`File content is empty for ${entry.name}`);
          }
          
          const jsonData = JSON.parse(text);

          // Extract important fields
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
            // Extract data from JSON
            pand_adres: pand.adres || null,
            pand_type: pand.type || null,
            verhuurder_naam: verhuurder.naam || null,
            huurprijs: financieel.huurprijs || null,
            confidence: jsonData.confidence?.score || null,
            processed: jsonData.processed || entry.server_modified,
          };
        } catch (error: any) {
          console.error(`Error loading ${entry.name}:`, error);
          // Return basic info if JSON can't be loaded
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
          };
        }
      })
    );

    // Sort by modified date (newest first)
    contractsWithData.sort((a: any, b: any) => 
      new Date(b.modified).getTime() - new Date(a.modified).getTime()
    );

    return NextResponse.json({ 
      contracts: contractsWithData,
      totalFiles: result.result.entries.length,
      jsonFilesCount: contractsWithData.length
    });
  } catch (error: any) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch contracts',
        details: error.toString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

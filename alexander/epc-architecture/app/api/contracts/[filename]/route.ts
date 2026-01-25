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

// GET /api/contracts/[filename] - Get specific contract JSON
export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> | { filename: string } }
) {
  try {
    const dbx = await getDropboxClient();
    
    // Handle async params in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!resolvedParams || !resolvedParams.filename) {
      return NextResponse.json(
        { 
          error: 'Filename parameter is required',
          filename: null
        },
        { status: 400 }
      );
    }
    
    const filename = decodeURIComponent(resolvedParams.filename);
    
    // First, try to find the file by listing and matching the name
    // This ensures we use the correct path_display
    const listResult = await dbx.filesListFolder({ path: '' });
    const fileEntry = listResult.result.entries.find(
      (entry: any) => entry['.tag'] === 'file' && entry.name === filename
    );

    let filePath: string;
    
    if (!fileEntry) {
      // If not found in listing, try direct path
      filePath = `/${filename}`;
      console.log(`File not found in listing, trying direct path: ${filePath}`);
    } else {
      // Use path_lower (preferred) or path_display from the file entry
      // Dropbox API prefers path_lower for consistency
      filePath = (fileEntry as any).path_lower || (fileEntry as any).path_display || `/${filename}`;
      console.log(`Found file in listing. Using path: ${filePath}`);
      console.log(`File entry details:`, {
        name: (fileEntry as any).name,
        path_lower: (fileEntry as any).path_lower,
        path_display: (fileEntry as any).path_display
      });
    }

    console.log(`Downloading contract from path: ${filePath}`);

    // Download the file using the correct path
    // Try path_lower first (Dropbox API preference), then path_display, then direct path
    let result;
    try {
      result = await dbx.filesDownload({ path: filePath });
    } catch (pathError: any) {
      // If path_lower fails, try path_display if we have it
      if (fileEntry && (fileEntry as any).path_display && filePath !== (fileEntry as any).path_display) {
        console.log(`Retrying with path_display: ${(fileEntry as any).path_display}`);
        filePath = (fileEntry as any).path_display;
        result = await dbx.filesDownload({ path: filePath });
      } else {
        throw pathError;
      }
    }
    
    // Convert file content to JSON
    // Dropbox SDK can return fileBinary (Uint8Array) or fileContents (string)
    const resultData = result.result as any;
    console.log('Download result keys:', Object.keys(resultData));
    console.log('File size from entry:', fileEntry ? (fileEntry as any).size : 'unknown');
    
    let fileContent: Uint8Array | string | null = null;
    let text: string;
    
    // Try different ways to get the file content
    if (resultData.fileBinary) {
      fileContent = resultData.fileBinary;
      console.log('Using fileBinary, type:', typeof fileContent, 'length:', fileContent.length);
      text = Buffer.from(fileContent).toString('utf-8');
    } else if (resultData.fileContents) {
      fileContent = resultData.fileContents;
      console.log('Using fileContents, type:', typeof fileContent);
      text = typeof fileContent === 'string' ? fileContent : Buffer.from(fileContent).toString('utf-8');
    } else if (resultData.fileBlob) {
      // If it's a Blob, convert to text
      console.log('Using fileBlob');
      const arrayBuffer = await resultData.fileBlob.arrayBuffer();
      text = Buffer.from(arrayBuffer).toString('utf-8');
    } else {
      // Try to find any content property
      console.log('No standard content property found. Available keys:', Object.keys(resultData));
      throw new Error(`File content is empty or in unexpected format. Available keys: ${Object.keys(resultData).join(', ')}`);
    }
    
    if (!text || text.length === 0) {
      console.error('Text content is empty after conversion');
      throw new Error('File content is empty after conversion');
    }
    
    console.log(`File content length: ${text.length} characters`);
    console.log(`First 200 chars: ${text.substring(0, 200)}`);
    
    const jsonData = JSON.parse(text);

    console.log(`Successfully loaded contract: ${filename}`);
    return NextResponse.json(jsonData);
  } catch (error: any) {
    console.error('Error fetching contract:', error);
    
    // Handle async params for error logging
    const resolvedParams = params instanceof Promise ? await params : params;
    console.error('Filename:', resolvedParams?.filename);
    
    // Check if it's a Dropbox API error
    let errorMessage = error.message || 'Failed to fetch contract';
    let statusCode = 500;
    
    // Dropbox API errors can be in error.error or error.status
    const dropboxError = error.error || error;
    const errorStatus = dropboxError.status || error.status;
    const errorCode = dropboxError['.tag'] || dropboxError.error_summary;
    
    if (errorStatus === 409 || errorStatus === 404 || errorCode === 'path/not_found') {
      statusCode = 404;
      errorMessage = `Bestand niet gevonden: ${resolvedParams?.filename || 'unknown'}. Het bestand is mogelijk verplaatst of verwijderd.`;
    } else if (errorCode === 'path/conflict') {
      statusCode = 409;
      errorMessage = `Conflict bij ophalen bestand: ${resolvedParams?.filename || 'unknown'}. Probeer het opnieuw.`;
    }
    
    console.error('Error details:', {
      message: error.message,
      status: errorStatus,
      errorCode: errorCode,
      error: dropboxError,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        filename: resolvedParams?.filename || 'unknown',
        details: error.toString(),
        status: errorStatus || statusCode,
        errorCode: errorCode
      },
      { status: statusCode }
    );
  }
}

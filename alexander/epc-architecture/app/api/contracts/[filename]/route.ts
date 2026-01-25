import { NextResponse } from 'next/server';
import { Dropbox } from 'dropbox';
import { logger } from '@/lib/logger';
import { validateFilename } from '@/lib/validation';

// Initialize Dropbox client for TARGET (JSON storage)
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

// GET /api/contracts/[filename] - Get specific contract JSON
export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> | { filename: string } }
) {
  try {
    const dbx = await getDropboxClient();
    
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!resolvedParams || !resolvedParams.filename) {
      logger.error('Filename parameter is required', { params: resolvedParams });
      return NextResponse.json(
        { 
          error: 'Filename parameter is required',
          filename: null
        },
        { status: 400 }
      );
    }
    
    const filename = decodeURIComponent(resolvedParams.filename);
    
    // Validate filename
    const validation = validateFilename(filename);
    if (!validation.valid) {
      logger.warn('Invalid filename provided', { filename, error: validation.error });
      return NextResponse.json(
        { 
          error: validation.error || 'Invalid filename',
          filename: filename
        },
        { status: 400 }
      );
    }
    
    // First, try to find the file by listing and matching the name
    const listResult = await dbx.filesListFolder({ path: '' });
    const fileEntry = listResult.result.entries.find(
      (entry: any) => entry['.tag'] === 'file' && entry.name === filename
    );

    if (!fileEntry) {
      logger.warn('Contract file not found', { filename });
      return NextResponse.json(
        { 
          error: `Bestand niet gevonden: ${filename}. Het bestand is mogelijk verplaatst of verwijderd.`,
          filename: filename
        },
        { status: 404 }
      );
    }

    // Download using the correct path
    const downloadPath = fileEntry.path_lower || fileEntry.path_display;
    const downloadResult = await dbx.filesDownload({ path: downloadPath });
    const resultData = downloadResult.result as any;

    // Extract file content
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
      logger.error('No file content found', { filename, availableKeys: Object.keys(resultData) });
      throw new Error(`File content is empty or in unexpected format for ${filename}`);
    }
    
    if (!text || text.length === 0) {
      logger.error('Text content is empty after conversion', { filename });
      throw new Error('File content is empty after conversion');
    }
    
    logger.debug('File content loaded', { 
      filename, 
      length: text.length,
      preview: text.substring(0, 200)
    });
    
    const jsonData = JSON.parse(text);

    logger.info('Successfully loaded contract', { filename });
    return NextResponse.json(jsonData);
  } catch (error: unknown) {
    const resolvedParams = params instanceof Promise ? await params : params;
    
    logger.error('Error fetching contract', error, { 
      filename: resolvedParams?.filename 
    });
    
    let errorMessage = error instanceof Error ? error.message : 'Failed to fetch contract';
    let statusCode = 500;
    
    const dropboxError = (error as any)?.error || error;
    const errorStatus = dropboxError?.status || (error as any)?.status;
    const errorCode = dropboxError?.['.tag'] || dropboxError?.error_summary;
    
    if (errorStatus === 409 || errorStatus === 404 || errorCode === 'path/not_found') {
      statusCode = 404;
      errorMessage = `Bestand niet gevonden: ${resolvedParams?.filename || 'unknown'}. Het bestand is mogelijk verplaatst of verwijderd.`;
    } else if (errorCode === 'path/conflict') {
      statusCode = 409;
      errorMessage = `Conflict bij ophalen bestand: ${resolvedParams?.filename || 'unknown'}. Probeer het opnieuw.`;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        filename: resolvedParams?.filename || null
      },
      { status: statusCode }
    );
  }
}

// PATCH /api/contracts/[filename] - Update contract data
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ filename: string }> | { filename: string } }
) {
  try {
    const dbx = await getDropboxClient();
    
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!resolvedParams || !resolvedParams.filename) {
      logger.error('Filename parameter is required', { params: resolvedParams });
      return NextResponse.json(
        { error: 'Filename parameter is required' },
        { status: 400 }
      );
    }
    
    const filename = decodeURIComponent(resolvedParams.filename);
    
    // Validate filename
    const validation = validateFilename(filename);
    if (!validation.valid) {
      logger.warn('Invalid filename provided', { filename, error: validation.error });
      return NextResponse.json(
        { error: validation.error || 'Invalid filename' },
        { status: 400 }
      );
    }

    // Get updated data from request body
    const updatedData = await request.json();
    
    if (!updatedData || typeof updatedData !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON object.' },
        { status: 400 }
      );
    }

    // Find the file and get current data to preserve original values
    const listResult = await dbx.filesListFolder({ path: '' });
    const fileEntry = listResult.result.entries.find(
      (entry: any) => entry['.tag'] === 'file' && entry.name === filename
    );

    if (!fileEntry) {
      return NextResponse.json(
        { error: `File not found: ${filename}` },
        { status: 404 }
      );
    }

    // Get current file to preserve original data and edit history
    const downloadPath = fileEntry.path_lower || fileEntry.path_display;
    let originalData: any = {};
    let editHistory: any[] = [];
    
    try {
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
        throw new Error('Could not read current file');
      }
      
      originalData = JSON.parse(text);
      
      // Preserve edit history if it exists
      if (originalData.edit_history && Array.isArray(originalData.edit_history)) {
        editHistory = originalData.edit_history;
      }
    } catch (err) {
      logger.warn('Could not read original file, creating new edit history', { error: err });
    }

    // Create new edit entry
    const newEditEntry = {
      timestamp: new Date().toISOString(),
      edited_by: 'user', // In the future, get from auth
      changes: {} as Record<string, { from: any; to: any }>
    };

    // Track what changed (compare with original if available)
    if (originalData.contract_data) {
      const originalContractData = originalData.contract_data;
      const updatedContractData = updatedData.contract_data || {};
      
      // Compare sections
      Object.keys(updatedContractData).forEach((section) => {
        const originalSection = originalContractData[section] || {};
        const updatedSection = updatedContractData[section] || {};
        
        Object.keys(updatedSection).forEach((key) => {
          const originalValue = originalSection[key];
          const updatedValue = updatedSection[key];
          
          if (JSON.stringify(originalValue) !== JSON.stringify(updatedValue)) {
            newEditEntry.changes[`${section}.${key}`] = {
              from: originalValue,
              to: updatedValue
            };
          }
        });
      });
    }

    // Add to edit history
    editHistory.push(newEditEntry);

    // Merge updated data with original data, preserving important fields
    const finalData = {
      ...originalData, // Start with original to preserve everything
      ...updatedData,  // Overwrite with updates
      edited: {
        timestamp: new Date().toISOString(),
        edited_by: 'user',
        last_edit: newEditEntry.timestamp,
      },
      edit_history: editHistory, // Preserve full edit history
      manually_edited: true,
      // Preserve original processed date
      processed: originalData.processed || updatedData.processed || new Date().toISOString(),
      // Preserve original filename and document_type
      filename: originalData.filename || updatedData.filename,
      document_type: originalData.document_type || updatedData.document_type,
    };

    // Upload updated JSON to Dropbox
    const uploadPath = fileEntry.path_lower || fileEntry.path_display;
    const jsonString = JSON.stringify(finalData, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');

    await dbx.filesUpload({
      path: uploadPath,
      contents: buffer,
      mode: { '.tag': 'overwrite' },
    });

    logger.info('Successfully updated contract in Dropbox', { 
      filename,
      changesCount: Object.keys(newEditEntry.changes).length,
      editHistoryLength: editHistory.length
    });

    return NextResponse.json({
      success: true,
      message: 'Contract updated successfully',
      filename,
    });

  } catch (error: unknown) {
    logger.error('Error updating contract', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

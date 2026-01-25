/**
 * Whise API Client
 * Handles communication with Whise API for pushing contract data
 */

import { logger } from './logger';

export interface WhisePushOptions {
  contractData: any;
  filename: string;
  confidence: number;
}

export interface WhisePushResult {
  success: boolean;
  whiseId?: string;
  message: string;
  error?: string;
}

/**
 * Push contract data to Whise API
 * This is a placeholder for future Whise API integration
 */
export async function pushToWhise(options: WhisePushOptions): Promise<WhisePushResult> {
  const { contractData, filename, confidence } = options;

  try {
    // Check if Whise API is configured
    const whiseApiEndpoint = process.env.WHISE_API_ENDPOINT;
    const whiseApiToken = process.env.WHISE_API_TOKEN;

    if (!whiseApiEndpoint || !whiseApiToken) {
      logger.warn('Whise API not configured', {
        hasEndpoint: !!whiseApiEndpoint,
        hasToken: !!whiseApiToken
      });

      return {
        success: false,
        message: 'Whise API niet geconfigureerd. Configureer WHISE_API_ENDPOINT en WHISE_API_TOKEN in .env.local',
      };
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
        source: 'contract-system',
      },
    };

    // Make API call to Whise
    const response = await fetch(whiseApiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whiseApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whisePayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Whise API push failed', new Error(errorText), {
        filename,
        status: response.status,
      });

      return {
        success: false,
        message: 'Fout bij pushen naar Whise',
        error: errorText,
      };
    }

    const result = await response.json();

    logger.info('Successfully pushed contract to Whise', {
      filename,
      confidence,
      whiseId: result.id,
    });

    return {
      success: true,
      whiseId: result.id,
      message: 'Succesvol gepusht naar Whise',
    };

  } catch (error: unknown) {
    logger.error('Error pushing to Whise', error, { filename });

    return {
      success: false,
      message: 'Onbekende fout bij pushen naar Whise',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Type definitions for the contract system
 * Replaces 'any' types with proper interfaces
 */

export interface ContractFile {
  name: string;
  path: string;
  size?: number;
  modified: string;
  pand_adres?: string | null;
  pand_type?: string | null;
  verhuurder_naam?: string | null;
  huurprijs?: number | null;
  confidence?: number | null;
  processed?: string;
  manually_edited?: boolean;
  edited?: {
    timestamp?: string;
    edited_by?: string;
  } | null;
  summary?: string | null;
}

export interface ContractData {
  contract_data?: {
    partijen?: {
      verhuurder?: {
        naam?: string;
        [key: string]: unknown;
      };
      huurder?: {
        naam?: string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    pand?: {
      adres?: string;
      type?: string;
      [key: string]: unknown;
    };
    financieel?: {
      huurprijs?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  confidence?: {
    score?: number;
    needs_review?: boolean;
    [key: string]: unknown;
  };
  processed?: string;
  summary?: string;
  [key: string]: unknown;
}

export interface ContractsResponse {
  contracts: ContractFile[];
  totalFiles?: number;
  jsonFilesCount?: number;
  error?: string;
}

export interface ContractStatus {
  status: 'pushed' | 'parsed' | 'needs_review' | 'pending' | 'error';
  label: string;
  color: string;
}

export type SectionKey = 
  | 'partijen' 
  | 'pand' 
  | 'financieel' 
  | 'periodes' 
  | 'voorwaarden' 
  | 'juridisch' 
  | 'samenvatting';

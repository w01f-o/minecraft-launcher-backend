import { Metadata } from './Metadata.types';

export interface CheckUpdateResult {
  toDelete: string[];
  downloadLink: string | null;
  serverMetadata: Metadata | null;
}

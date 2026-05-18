import type { PlatformTableData } from './tables';

export type PlatformSearchField =
  | 'free'
  | Extract<keyof PlatformTableData, string>;

export type PlatformSearchState = {
  field: PlatformSearchField;
  text: string;
};
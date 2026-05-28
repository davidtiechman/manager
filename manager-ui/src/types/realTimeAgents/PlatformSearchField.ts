import type { PlatformTableData } from './tables';

export type PlatformSearchField =
  | 'other'
  | Extract<keyof PlatformTableData, string>;

export type PlatformSearchState = {
  field: PlatformSearchField;
  customField: string;
  text: string;
};

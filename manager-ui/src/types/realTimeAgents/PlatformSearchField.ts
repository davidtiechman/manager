export type PlatformSearchField =
  | 'other'
  | 'platformId'
  | 'platformName'
  | 'unit'
  | 'unit_code'
  | 'zayad_id'
  | 'call_sign';

export type PlatformSearchState = {
  field: PlatformSearchField;
  customField: string;
  text: string;
};

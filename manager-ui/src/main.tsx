import '@fontsource/inter';
import '@fontsource/heebo';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ModuleRegistry } from 'ag-grid-community';
import {
  InfiniteRowModelModule,
  ColumnApiModule,
  ColumnAutoSizeModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  RowSelectionModule,
  TooltipModule,
  ValidationModule,
  LocaleModule,
} from 'ag-grid-community';
import {
  LicenseManager,
  SetFilterModule,
  ColumnMenuModule,
  ContextMenuModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  CellSelectionModule,
  ClipboardModule,
} from 'ag-grid-enterprise';
import App from './App';
import { LanguageProvider } from './i18n/LanguageProvider';
import './index.css';


ModuleRegistry.registerModules([
  InfiniteRowModelModule,
  ColumnApiModule,
  ColumnAutoSizeModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  RowSelectionModule,
  TooltipModule,
  ValidationModule,
  LocaleModule,
  SetFilterModule,
  ColumnMenuModule,
  ContextMenuModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  CellSelectionModule,
  ClipboardModule,
]);

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE_KEY ?? "MyCompany_CustomProject_[v3]_[0102]_NDEwMjM1ODQwMDAwMA==e27a7d61eb899978c31121189d83f216");

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
);

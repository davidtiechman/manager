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
import './index.css';

// v33 modularization: register only the features the grid actually uses.
// FUTURE: the Find feature (FindModule) only supports the Client-Side Row
// Model. The sync grid uses the Infinite Row Model, so Find is not wired up
// here — it would require migrating the row model first.
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
    <App />
  </React.StrictMode>,
);

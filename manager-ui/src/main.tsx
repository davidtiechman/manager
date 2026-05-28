import React from 'react';
import ReactDOM from 'react-dom/client';
import { LicenseManager } from 'ag-grid-enterprise';
import App from './App';
import './index.css';

// Importing 'ag-grid-enterprise' (via LicenseManager) registers all
// Enterprise modules — including agSetColumnFilter used by the sync grid.
// Without a license key you'll see a watermark + console warning, but it works.
LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE_KEY ?? '');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

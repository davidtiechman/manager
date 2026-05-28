import React from 'react';
import ReactDOM from 'react-dom/client';
// Side-effect import: registers all Enterprise modules (incl. agSetColumnFilter).
// Must be a bare `import 'ag-grid-enterprise'` — a named import alone can be
// tree-shaken before the module's side effects run, leaving the grid unable to
// resolve `filter: 'agSetColumnFilter'`.
import 'ag-grid-enterprise';
import { LicenseManager } from 'ag-grid-enterprise';
import App from './App';
import './index.css';

// Without a license key you'll see a watermark + console warning, but it works.
LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE_KEY ?? '');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

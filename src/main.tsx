import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import createCache from '@emotion/cache';
import {CacheProvider} from '@emotion/react';
import App from './App.tsx';
import './index.css';
import { storageService } from './services/storage';

// Initialize data storage
storageService.init();

const cache = createCache({
  key: 'css',
  prepend: true,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CacheProvider value={cache}>
      <App />
    </CacheProvider>
  </StrictMode>,
);

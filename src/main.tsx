import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/instrument-serif/400.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './app/App';
import { StoreProvider } from './app/store';

// Visit counts on the hosted app: Vercel Web Analytics, no cookies, no personal data.
// Not in development or on localhost. Switch it on in Vercel: Project → Analytics.
if (import.meta.env.PROD && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.append(script);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);

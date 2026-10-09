import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/caveat/latin-700.css';
import { Landing } from './Landing';
import './site.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Landing />
    </StrictMode>,
);

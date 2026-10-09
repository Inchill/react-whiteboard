import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Whiteboard } from '../whiteboard';
import { REPO_URL } from '../site/links';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Whiteboard storageKey="react-whiteboard:board" githubUrl={REPO_URL} />
    </StrictMode>,
);

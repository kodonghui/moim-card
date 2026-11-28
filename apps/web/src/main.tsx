import React from 'react';
import tokens from '../../../design/base.tokens.json';
import { createRoot } from 'react-dom/client';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import './style.css';
import { matchRoute } from './routes';

function App() {
  const [path, setPath] = React.useState(location.pathname);
  React.useEffect(() => {
    const update = () => setPath(location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return <main><p role="status">{matchRoute(path) ? '확인하고 있어요' : '화면을 찾을 수 없어요'}</p></main>;
}

createRoot(document.getElementById('root')!).render(<TDSMobileAITProvider brandPrimaryColor={tokens.color.accent.default.$value.hex}><App /></TDSMobileAITProvider>);

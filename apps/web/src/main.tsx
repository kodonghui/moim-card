import React from 'react';
import { createRoot } from 'react-dom/client';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import tokens from '../../../design/base.tokens.json';
import { matchRoute } from './routes';
import { EntryScreen } from './EntryScreen';
import './style.css';


function App() {
  const [path, setPath] = React.useState(location.pathname);
  React.useEffect(() => { const update = () => setPath(location.pathname); window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update); }, []);
  if (path === '/') return <EntryScreen />;
  return <main><p role="status">{matchRoute(path) ? '확인하고 있어요' : '화면을 찾을 수 없어요'}</p></main>;
}
createRoot(document.getElementById('root')!).render(<TDSMobileAITProvider brandPrimaryColor={tokens.color.accent.default.$value.hex}><App /></TDSMobileAITProvider>);

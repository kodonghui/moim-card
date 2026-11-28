import React from 'react';
import { createRoot } from 'react-dom/client';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import tokens from '../../../design/base.tokens.json';
import { matchRoute } from './routes';
import { EntryScreen } from './EntryScreen';
import { Home } from './Home';
import { Themes, RoomDetails } from './CreateRoom';
import { RoomIntro, JoinRoom } from './Room';
import './style.css';


function App() {
  const [path, setPath] = React.useState(location.pathname);
  React.useEffect(() => { const update = () => setPath(location.pathname); window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update); }, []);
  if (path === '/') return <EntryScreen />;
  if (path === '/home') return <Home />;
  if (path === '/rooms/new') return <Themes />;
  if (path === '/rooms/new/details') return <RoomDetails />;
  if (path === '/room') return <RoomIntro />;
  if (path === '/room/join') return <JoinRoom />;
  return <main><p role="status">{matchRoute(path) ? '확인하고 있어요' : '화면을 찾을 수 없어요'}</p></main>;
}
createRoot(document.getElementById('root')!).render(<TDSMobileAITProvider brandPrimaryColor={tokens.color.accent.default.$value.hex}><App /></TDSMobileAITProvider>);

import React from 'react';
import tokens from '../../../design/base.tokens.json';
import { createRoot } from 'react-dom/client';
import { Button } from '@toss/tds-mobile';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import '../src/style.css';
createRoot(document.getElementById('root')!).render(<TDSMobileAITProvider brandPrimaryColor={tokens.color.accent.default.$value.hex}><main><p>본문</p><Button>확인</Button></main></TDSMobileAITProvider>);

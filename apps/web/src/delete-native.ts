import { closeView, graniteEvent } from '@apps-in-toss/web-framework';
export const closeMiniApp = closeView;
export function onNativeBack(close: () => void): () => void { return graniteEvent.addEventListener('backEvent', { onEvent: close }); }

import { closeMiniApp, onNativeBack } from './delete-native';
let active = false;
let unsubscribe: (() => void) | undefined;
function closeAfterDelete() {
  if (!active) return;
  deactivateDeleteBack();
  void closeMiniApp();
}
export function activateDeleteBack(): void {
  if (active) return;
  active = true; window.addEventListener('popstate', closeAfterDelete, true);
  try { unsubscribe = onNativeBack(closeAfterDelete); } catch { /* Browser preview has no native event bridge. */ }
}
export function deactivateDeleteBack(): void {
  active = false; window.removeEventListener('popstate', closeAfterDelete, true); unsubscribe?.(); unsubscribe = undefined;
}

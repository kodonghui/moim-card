import { readEntry } from './entry';
// Read and remove the invitation code before any request or screen render.
export const entryContext = readEntry(location.href, url => history.replaceState(history.state, '', url));

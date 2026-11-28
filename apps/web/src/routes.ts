export const routes = [
  '/', '/home', '/rooms/new', '/rooms/new/details', '/room', '/room/join',
  '/room/questions', '/room/result', '/room/card', '/room/final', '/past-cards',
  '/past-cards/:pastCardId', '/me/delete', '/legal/terms', '/legal/privacy',
] as const;

export function navigate(path: string, replace = false): void {
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function matchRoute(pathname: string): string | undefined {
  return routes.find(route => {
    const expected = route.split('/');
    const actual = pathname.split('/');
    return expected.length === actual.length && expected.every((part, i) => part.startsWith(':') ? Boolean(actual[i]) : part === actual[i]);
  });
}

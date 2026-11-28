// In-process fake: no network or real partner account is involved.
export default {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path.endsWith('/users/anon-key/exchange')) { const {code}=await request.json(); return Response.json({resultType:'SUCCESS',success:{anonKey:`contract-test-${code}`}}); }
    if (path.endsWith('/messenger/send-message')) return Response.json({resultType:'SUCCESS',success:{}});
    return new Response(null,{status:404});
  },
};

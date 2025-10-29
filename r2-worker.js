export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const objectName = url.pathname.slice(1);
    
    // Get the object from R2
    const object = await env.BUCKET.get(objectName);
    
    if (object === null) {
      return new Response('Object Not Found', { status: 404 });
    }

    // Return the object with appropriate headers
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(object.body, {
      headers,
    });
  },
};

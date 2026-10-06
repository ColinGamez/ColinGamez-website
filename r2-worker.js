export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/minipaso/vote' && request.method === 'POST') {
      return handleVote(request, env);
    }
    if (url.pathname === '/api/minipaso/ranking' && request.method === 'GET') {
      return rankingResponse(env);
    }
    if (url.pathname === '/api/minipaso/ranking' && request.method === 'OPTIONS') {
      return new Response(null, { headers: cors() });
    }

    // Shared Japanese Word of the Day list. Canonical home of the words:
    // the site widget and the Windows app both read from here, with bundled
    // fallbacks so they still work when the worker is unreachable.
    if (url.pathname === '/api/wotd/words' && request.method === 'GET') {
      return new Response(JSON.stringify(WOTD_WORDS), {
        headers: { ...cors(), 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    if (url.pathname === '/api/wotd/today' && request.method === 'GET') {
      const days = Math.floor(Date.now() / 86400000);
      const idx = days % WOTD_WORDS.length;
      return new Response(JSON.stringify({ date: new Date().toISOString().slice(0, 10), index: idx, total: WOTD_WORDS.length }), {
        headers: { ...cors(), 'Content-Type': 'application/json' },
      });
    }
    if (url.pathname === '/api/yt/latest' && request.method === 'GET') {
      return ytLatest();
    }
    
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

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

const YT_CHANNEL_ID = 'UC0lyhakGPk2spTIV4E7CGcw';
const YT_CHANNEL_URL = 'https://www.youtube.com/@コリンさんYT';

// Latest uploads via the public channel RSS feed (no API key).
// Cached at the edge for an hour; returns { videos: [{id,title,published,url,thumb}] }.
async function ytLatest() {
  try {
    const res = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + YT_CHANNEL_ID, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        Accept: 'application/atom+xml',
      },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) throw new Error('feed http ' + res.status);
    const xml = await res.text();
    const videos = [];
    const entries = xml.split('<entry>');
    for (let i = 1; i < entries.length && videos.length < 3; i++) {
      const e = entries[i];
      const id = pick(e, 'yt:videoId');
      const title = unesc(pick(e, 'title'));
      const published = pick(e, 'published');
      if (!id) continue;
      videos.push({
        id,
        title: title || 'Untitled upload',
        published: published ? published.slice(0, 10) : '',
        url: 'https://www.youtube.com/watch?v=' + id,
        thumb: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg',
      });
    }
    return new Response(JSON.stringify({ videos, channelUrl: YT_CHANNEL_URL }), {
      headers: { ...cors(), 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ videos: [], channelUrl: YT_CHANNEL_URL, error: String(err) }), {
      status: 502,
      headers: { ...cors(), 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

function pick(xml, name) {
  const m = xml.match(new RegExp('<' + name + '>([^<]*)</' + name + '>'));
  return m ? m[1].trim() : '';
}

function unesc(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// k = kana, r = romaji, m = meaning. Kept small on purpose: every client
// bundles a copy as an offline fallback, so additions mean updating the
// fallbacks in the site widget and the Windows app too.
const WOTD_WORDS = [
  { k: 'こんにちは', r: 'konnichiwa', m: 'hello' },
  { k: 'おはよう', r: 'ohayou', m: 'good morning' },
  { k: 'こんばんは', r: 'konbanwa', m: 'good evening' },
  { k: 'ありがとう', r: 'arigatou', m: 'thank you' },
  { k: 'さくら', r: 'sakura', m: 'cherry blossom' },
  { k: 'パソコン', r: 'pasokon', m: 'computer' },
  { k: 'ゲーム', r: 'geemu', m: 'game' },
  { k: 'すし', r: 'sushi', m: 'sushi' },
  { k: 'くるま', r: 'kuruma', m: 'car' },
  { k: 'でんしゃ', r: 'densha', m: 'train' },
  { k: 'がくせい', r: 'gakusei', m: 'student' },
  { k: 'せんせい', r: 'sensei', m: 'teacher' },
  { k: 'ともだち', r: 'tomodachi', m: 'friend' },
  { k: 'かぞく', r: 'kazoku', m: 'family' },
  { k: 'あした', r: 'ashita', m: 'tomorrow' },
  { k: 'そら', r: 'sora', m: 'sky' },
  { k: 'みず', r: 'mizu', m: 'water' },
  { k: 'ねこ', r: 'neko', m: 'cat' },
  { k: 'たのしい', r: 'tanoshii', m: 'fun' },
  { k: 'はじめる', r: 'hajimeru', m: 'to begin' },
];

function tag(xml, name) {
  const m = xml.match(new RegExp('<' + name + '>([^<]*)</' + name + '>'));
  return m ? m[1].trim().slice(0, 120) : '';
}

function num(xml, name) {
  const v = parseFloat(tag(xml, name));
  return isNaN(v) ? 0 : Math.min(9.9, Math.max(0, v));
}

// Minipaso leaderboard lives in R2 only (no KV/D1 on this worker yet):
// each vote is stored as minipaso/votes/<id>.xml and the top-100 index is
// rewritten on every vote. Read-modify-write can lose a vote under heavy
// concurrency; fine for a hobby leaderboard, revisit if it ever matters.
const INDEX_KEY = 'minipaso/leaderboard.json';

async function readBoard(env) {
  const obj = await env.BUCKET.get(INDEX_KEY);
  if (obj === null) return [];
  try {
    const board = await obj.json();
    return Array.isArray(board) ? board : [];
  } catch {
    return [];
  }
}

async function handleVote(request, env) {
  const xml = await request.text();
  if (!xml || xml.length > 20000 || xml.indexOf('MiniPasoVote') < 0) {
    return new Response('bad vote', { status: 400, headers: cors() });
  }
  const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const entry = {
    id,
    nick: tag(xml, 'Nickname') || 'Anonymous',
    model: tag(xml, 'Model') || 'Unknown PC',
    system: num(xml, 'SystemScore'),
    cpu: num(xml, 'CpuScore'),
    memory: num(xml, 'MemoryScore'),
    graphics: num(xml, 'GraphicsScore'),
    gaming: num(xml, 'GamingScore'),
    disk: num(xml, 'DiskScore'),
    at: new Date().toISOString(),
  };
  await env.BUCKET.put('minipaso/votes/' + id + '.xml', xml, {
    httpMetadata: { contentType: 'text/xml; charset=utf-8' },
  });
  const board = await readBoard(env);
  board.push(entry);
  board.sort((a, b) => b.system - a.system);
  await env.BUCKET.put(INDEX_KEY, JSON.stringify(board.slice(0, 100)), {
    httpMetadata: { contentType: 'application/json' },
  });
  return new Response(id, { headers: cors() });
}

async function rankingResponse(env) {
  const board = await readBoard(env);
  return new Response(JSON.stringify(board), {
    headers: { ...cors(), 'Content-Type': 'application/json' },
  });
}

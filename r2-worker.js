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
    if (url.pathname === '/api/og/minipaso' && request.method === 'GET') {
      return ogBoard(env);
    }
    if (url.pathname === '/api/og/wotd' && request.method === 'GET') {
      return ogWotd();
    }
    if (url.pathname === '/api/og/yt' && request.method === 'GET') {
      return ogYt();
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
    const videos = await ytFetch();
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

async function ytFetch() {
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
  return videos;
}

function pick(xml, name) {
  const m = xml.match(new RegExp('<' + name + '>([^<]*)</' + name + '>'));
  return m ? m[1].trim() : '';
}

function unesc(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// ---- little API: dynamic social cards (SVG, 1200x630) ----
// Live data baked into images: README embeds, link unfurls on some platforms,
// project pages. Text is XML-escaped; viewer-side fonts render the kana.

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function svgRes(svg) {
  return new Response(svg, {
    headers: {
      ...cors(),
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function svgHead(title) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">' +
    '<title>' + esc(title) + '</title>';
}

async function ogBoard(env) {
  const board = await readBoard(env);
  const top = board.slice(0, 5);
  let rows = '';
  if (top.length === 0) {
    rows = '<text x="80" y="330" font-family="Segoe UI,sans-serif" font-size="40" fill="#b3e5fc">No votes yet — be the first.</text>';
  } else {
    top.forEach((r, i) => {
      const y = 250 + i * 68;
      rows += '<text x="80" y="' + y + '" font-family="Segoe UI,sans-serif" font-size="36" font-weight="bold" fill="#ffffff">' + esc(i + 1) + '.</text>' +
        '<text x="150" y="' + y + '" font-family="Segoe UI,sans-serif" font-size="36" fill="#ffffff">' + esc(r.nick).slice(0, 24) + '</text>' +
        '<text x="150" y="' + (y + 28) + '" font-family="Segoe UI,sans-serif" font-size="22" fill="#b3e5fc">' + esc(r.model).slice(0, 40) + '</text>' +
        '<text x="1050" y="' + y + '" font-family="Segoe UI,sans-serif" font-size="40" font-weight="bold" fill="#7fd4ff" text-anchor="end">' + esc(r.system) + '</text>';
    });
  }
  return svgRes(svgHead('Minipaso leaderboard') +
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#0288D1"/><stop offset="1" stop-color="#01579B"/></linearGradient></defs>' +
    '<rect width="1200" height="630" fill="url(#bg)"/>' +
    '<text x="80" y="110" font-family="Segoe UI,sans-serif" font-size="30" font-weight="bold" letter-spacing="6" fill="#b3e5fc">MINIPASO RANKINGS</text>' +
    '<text x="80" y="165" font-family="Segoe UI,sans-serif" font-size="26" fill="#e1f5fe">Windows Experience Index · voted from the app</text>' +
    rows +
    '<text x="80" y="590" font-family="Segoe UI,sans-serif" font-size="22" fill="#b3e5fc">colingamez.github.io/minipaso</text></svg>');
}

function ogWotd() {
  const days = Math.floor(Date.now() / 86400000);
  const w = WOTD_WORDS[days % WOTD_WORDS.length];
  return svgRes(svgHead('Japanese Word of the Day') +
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#3c4650"/><stop offset="1" stop-color="#141a20"/></linearGradient></defs>' +
    '<rect width="1200" height="630" fill="url(#bg)"/>' +
    '<circle cx="230" cy="315" r="120" fill="#c62828"/>' +
    '<text x="230" y="360" font-family="Meiryo UI,MS Gothic,sans-serif" font-size="110" font-weight="bold" fill="#ffffff" text-anchor="middle">日本</text>' +
    '<text x="420" y="300" font-family="Meiryo UI,MS Gothic,sans-serif" font-size="120" font-weight="bold" fill="#ffffff">' + esc(w.k) + '</text>' +
    '<text x="424" y="380" font-family="Segoe UI,sans-serif" font-size="44" fill="#b3e5fc">' + esc(w.r) + ' — ' + esc(w.m) + '</text>' +
    '<text x="424" y="450" font-family="Segoe UI,sans-serif" font-size="28" fill="#7fa8c4">a new shared word every day · colingamez.github.io</text></svg>');
}

async function ogYt() {
  let videos = [];
  try {
    videos = await ytFetch();
  } catch (err) {
    videos = [];
  }
  let cards = '';
  if (videos.length === 0) {
    cards = '<text x="80" y="330" font-family="Segoe UI,sans-serif" font-size="40" fill="#b3e5fc">Feed is down — the channel is still up.</text>';
  } else {
    videos.forEach((v, i) => {
      const y = 210 + i * 130;
      cards += '<image href="' + esc(v.thumb) + '" x="80" y="' + y + '" width="180" height="101"/>' +
        '<text x="290" y="' + (y + 40) + '" font-family="Segoe UI,sans-serif" font-size="34" font-weight="bold" fill="#ffffff">' + esc(v.title).slice(0, 52) + '</text>' +
        '<text x="290" y="' + (y + 78) + '" font-family="Segoe UI,sans-serif" font-size="26" fill="#b3e5fc">' + esc(v.published) + '</text>';
    });
  }
  return svgRes(svgHead('Latest uploads') +
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#4FC3F7"/><stop offset="1" stop-color="#01579B"/></linearGradient></defs>' +
    '<rect width="1200" height="630" fill="url(#bg)"/>' +
    '<text x="80" y="110" font-family="Segoe UI,sans-serif" font-size="30" font-weight="bold" letter-spacing="6" fill="#ffffff">LATEST UPLOADS</text>' +
    '<text x="80" y="160" font-family="Segoe UI,sans-serif" font-size="26" fill="#e1f5fe">@コリンさんYT</text>' +
    cards + '</svg>');
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

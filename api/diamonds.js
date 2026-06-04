/**
 * Luvia Nova — Live Diamond Feed API
 * Vercel Serverless Function
 *
 * Provider priority:
 *   1. Nivoda  — NIVODA_CLIENT_ID + NIVODA_CLIENT_SECRET
 *   2. VDB     — VDB_API_KEY
 *   3. IDEX    — IDEX_USERNAME + IDEX_PASSWORD
 *   4. Seed    — curated fallback data (always works)
 *
 * To activate a live feed, add the relevant env vars in:
 *   Vercel Dashboard → Project → Settings → Environment Variables
 */

const SEED_DIAMONDS = [
  { id:"LD-90212", shape:"Round",    carat:1.52, color:"D", clarity:"IF",   cut:"Ideal",     cert:"GIA", certNum:"GIA-645831920",   price:3250,  origin:"Climate Neutral — United States", source:"seed" },
  { id:"LD-30129", shape:"Round",    carat:2.04, color:"E", clarity:"VVS1", cut:"Ideal",     cert:"IGI", certNum:"IGI-LG609312411", price:4900,  origin:"Asahi Green Certified — Japan",   source:"seed" },
  { id:"LD-10294", shape:"Round",    carat:1.02, color:"G", clarity:"VS2",  cut:"Ideal",     cert:"GIA", certNum:"GIA-192048123",   price:1350,  origin:"Climate Neutral — United States", source:"seed" },
  { id:"LD-48123", shape:"Oval",     carat:1.82, color:"D", clarity:"VVS2", cut:"Ideal",     cert:"IGI", certNum:"IGI-LG602119853", price:3650,  origin:"SCS-007 Sustainably Grown — India", source:"seed" },
  { id:"LD-58102", shape:"Oval",     carat:2.51, color:"F", clarity:"VS1",  cut:"Ideal",     cert:"GIA", certNum:"GIA-390481234",   price:5200,  origin:"Hydro-Powered — France",          source:"seed" },
  { id:"LD-10295", shape:"Oval",     carat:1.21, color:"F", clarity:"VS1",  cut:"Ideal",     cert:"IGI", certNum:"IGI-LG485123901", price:1980,  origin:"SCS-007 Sustainably Grown — India", source:"seed" },
  { id:"LD-11029", shape:"Emerald",  carat:2.10, color:"E", clarity:"VS1",  cut:"Excellent", cert:"GIA", certNum:"GIA-556102381",   price:4100,  origin:"Climate Neutral — United States", source:"seed" },
  { id:"LD-18023", shape:"Emerald",  carat:3.05, color:"D", clarity:"VVS1", cut:"Excellent", cert:"IGI", certNum:"IGI-LG609228311", price:8900,  origin:"Zero-Emission — Singapore",       source:"seed" },
  { id:"LD-88123", shape:"Cushion",  carat:2.01, color:"F", clarity:"VVS2", cut:"Ideal",     cert:"IGI", certNum:"IGI-LG559102456", price:3950,  origin:"Solar Powered — United States",   source:"seed" },
  { id:"LD-99238", shape:"Cushion",  carat:3.52, color:"E", clarity:"VS1",  cut:"Ideal",     cert:"GIA", certNum:"GIA-645831102",   price:7800,  origin:"SCS-007 Sustainably Grown — India", source:"seed" },
  { id:"LD-44122", shape:"Pear",     carat:1.60, color:"E", clarity:"VVS2", cut:"Ideal",     cert:"IGI", certNum:"IGI-LG607812933", price:3100,  origin:"Zero-Carbon — Switzerland",       source:"seed" },
  { id:"LD-66381", shape:"Pear",     carat:2.72, color:"D", clarity:"VS2",  cut:"Ideal",     cert:"GIA", certNum:"GIA-745239102",   price:6100,  origin:"Asahi Green Certified — Japan",   source:"seed" },
  { id:"LD-77123", shape:"Radiant",  carat:2.21, color:"F", clarity:"VVS1", cut:"Ideal",     cert:"IGI", certNum:"IGI-LG608123912", price:4800,  origin:"Solar Carbon Neutral — India",    source:"seed" },
  { id:"LD-88231", shape:"Radiant",  carat:4.02, color:"D", clarity:"VS1",  cut:"Ideal",     cert:"GIA", certNum:"GIA-894102941",   price:11200, origin:"Advanced Laser Synthesis — US",  source:"seed" },
  { id:"LD-99104", shape:"Marquise", carat:1.55, color:"D", clarity:"VVS2", cut:"Ideal",     cert:"IGI", certNum:"IGI-LG559381024", price:3400,  origin:"Zero-Emission — Singapore",       source:"seed" },
];

function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ── NIVODA ────────────────────────────────────────────────────────────────────
async function getNivodaToken(clientId, clientSecret) {
  const res = await fetch('https://api.nivoda.net/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation Auth($id:String!,$secret:String!){authenticate{GenerateToken(input:{client_id:$id client_secret:$secret}){token}}}`,
      variables: { id: clientId, secret: clientSecret },
    }),
  });
  const data = await res.json();
  return data?.data?.authenticate?.GenerateToken?.token ?? null;
}

async function fetchNivoda(token, { shape, minCarat, maxPrice } = {}) {
  const res = await fetch('https://api.nivoda.net/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      query: `query($filter:DiamondFilter,$first:Int){diamonds_by_query(filter:$filter first:$first has_v360:false){data{id shape carats color clarity cut cert certNumber price{total} labgrown_origin}}}`,
      variables: {
        first: 60,
        filter: {
          lab_grown: true,
          has_certificate: true,
          shapes: shape && shape !== 'All' ? [shape.toUpperCase()] : undefined,
          carats: { from: minCarat ?? 0.5, to: 10 },
          price:  { from: 500, to: maxPrice ?? 50000 },
          colors: ['D','E','F','G','H'],
          clarities: ['IF','VVS1','VVS2','VS1','VS2'],
        },
      },
    }),
  });
  const data = await res.json();
  return (data?.data?.diamonds_by_query?.data ?? []).map(s => ({
    id: s.id, shape: cap(s.shape), carat: parseFloat(s.carats),
    color: s.color, clarity: s.clarity, cut: s.cut || 'Ideal',
    cert: s.cert || 'GIA', certNum: s.certNumber || '',
    price: Math.round(s.price?.total ?? 0),
    origin: s.labgrown_origin || 'Certified Lab-Grown', source: 'live',
  }));
}

// ── VDB (Virtual Diamond Boutique) ────────────────────────────────────────────
// VDB REST API: https://vdb.net/api
async function fetchVDB(apiKey, { shape, minCarat, maxPrice } = {}) {
  const params = new URLSearchParams({
    lab_grown: 'true',
    has_certificate: 'true',
    min_carat: minCarat ?? 0.5,
    max_carat: 10,
    min_price: 500,
    max_price: maxPrice ?? 50000,
    colors: 'D,E,F,G,H',
    clarities: 'IF,VVS1,VVS2,VS1,VS2',
    limit: 60,
  });
  if (shape && shape !== 'All') params.set('shapes', shape.toUpperCase());

  const res = await fetch(`https://api.vdb.net/v2/diamonds?${params}`, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`VDB HTTP ${res.status}`);
  const data = await res.json();

  return (data.diamonds ?? data.items ?? []).map(s => ({
    id:      s.id || s.diamond_id,
    shape:   cap(s.shape),
    carat:   parseFloat(s.carat || s.carats || 0),
    color:   s.color,
    clarity: s.clarity,
    cut:     s.cut || 'Ideal',
    cert:    s.certificate || s.cert || 'GIA',
    certNum: s.certificate_number || s.certNumber || '',
    price:   Math.round(parseFloat(s.price || s.total_price || 0)),
    origin:  s.origin || 'Certified Lab-Grown',
    source:  'live',
  }));
}

// ── IDEX ──────────────────────────────────────────────────────────────────────
// IDEX REST API: https://www.idexonline.com/api
async function fetchIDEX(username, password, { shape, minCarat, maxPrice } = {}) {
  // IDEX uses HTTP Basic auth
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const params = new URLSearchParams({
    lab: 'true',
    certified: 'true',
    caratFrom: minCarat ?? 0.5,
    caratTo:   10,
    priceFrom: 500,
    priceTo:   maxPrice ?? 50000,
    color:     'D,E,F,G,H',
    clarity:   'IF,VVS1,VVS2,VS1,VS2',
    pageSize:  60,
  });
  if (shape && shape !== 'All') params.set('shape', shape.toUpperCase());

  const res = await fetch(`https://www.idexonline.com/api/v2/diamonds/search?${params}`, {
    headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`IDEX HTTP ${res.status}`);
  const data = await res.json();

  return (data.diamonds ?? data.results ?? []).map(s => ({
    id:      s.id || s.StockID,
    shape:   cap(s.Shape || s.shape),
    carat:   parseFloat(s.Carat || s.carat || 0),
    color:   s.Color || s.color,
    clarity: s.Clarity || s.clarity,
    cut:     s.Cut || s.cut || 'Ideal',
    cert:    s.Certificate || s.cert || 'GIA',
    certNum: s.ReportNo || s.certNumber || '',
    price:   Math.round(parseFloat(s.Price || s.price || 0)),
    origin:  'Certified Lab-Grown',
    source:  'live',
  }));
}

// ── Main handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { shape, minCarat, maxPrice } = req.query;
  const opts = {
    shape,
    minCarat: minCarat ? parseFloat(minCarat) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
  };

  // ── 1. Nivoda ────────────────────────────────────────────────────────────────
  const nivodaId     = process.env.NIVODA_CLIENT_ID;
  const nivodaSecret = process.env.NIVODA_CLIENT_SECRET;
  if (nivodaId && nivodaSecret) {
    try {
      const token  = await getNivodaToken(nivodaId, nivodaSecret);
      if (!token) throw new Error('Nivoda auth failed');
      const stones = await fetchNivoda(token, opts);
      return res.status(200).json({ source:'live', provider:'Nivoda', count:stones.length, fetchedAt:new Date().toISOString(), diamonds:stones });
    } catch (err) {
      console.error('Nivoda error:', err.message);
    }
  }

  // ── 2. VDB ───────────────────────────────────────────────────────────────────
  const vdbKey = process.env.VDB_API_KEY;
  if (vdbKey) {
    try {
      const stones = await fetchVDB(vdbKey, opts);
      return res.status(200).json({ source:'live', provider:'VDB', count:stones.length, fetchedAt:new Date().toISOString(), diamonds:stones });
    } catch (err) {
      console.error('VDB error:', err.message);
    }
  }

  // ── 3. IDEX ──────────────────────────────────────────────────────────────────
  const idexUser = process.env.IDEX_USERNAME;
  const idexPass = process.env.IDEX_PASSWORD;
  if (idexUser && idexPass) {
    try {
      const stones = await fetchIDEX(idexUser, idexPass, opts);
      return res.status(200).json({ source:'live', provider:'IDEX', count:stones.length, fetchedAt:new Date().toISOString(), diamonds:stones });
    } catch (err) {
      console.error('IDEX error:', err.message);
    }
  }

  // ── 4. Seed fallback ─────────────────────────────────────────────────────────
  let diamonds = [...SEED_DIAMONDS];
  if (shape && shape !== 'All') diamonds = diamonds.filter(d => d.shape === shape);
  if (opts.minCarat) diamonds = diamonds.filter(d => d.carat >= opts.minCarat);
  if (opts.maxPrice) diamonds = diamonds.filter(d => d.price <= opts.maxPrice);

  return res.status(200).json({
    source: 'demo',
    provider: 'Luvia Nova curated selection',
    count: diamonds.length,
    fetchedAt: new Date().toISOString(),
    diamonds,
  });
}

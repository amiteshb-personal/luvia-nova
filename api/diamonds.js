/**
 * Luvia Nova — Live Diamond Feed API
 * Vercel Serverless Function
 *
 * Connects to the Nivoda GraphQL API to pull real-time lab-grown diamond inventory.
 * Falls back to curated seed data if credentials are not yet configured.
 *
 * To activate live feed:
 *   1. Go to Vercel Dashboard → Project → Settings → Environment Variables
 *   2. Add:  NIVODA_CLIENT_ID     → your Nivoda client ID
 *            NIVODA_CLIENT_SECRET → your Nivoda client secret
 *
 * Nivoda API docs: https://api.nivoda.net/graphql
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

// ── Nivoda GraphQL query for lab-grown diamonds ────────────────────────────
const NIVODA_QUERY = `
  query LabGrownDiamonds($filter: DiamondFilter, $first: Int) {
    diamonds_by_query(
      filter: $filter
      first: $first
      has_v360: false
    ) {
      data {
        id
        shape
        carats
        color
        clarity
        cut
        cert
        certNumber
        price { total }
        labgrown_origin
      }
    }
  }
`;

// ── Normalise a Nivoda stone to our schema ─────────────────────────────────
function normaliseNivodaStone(s) {
  return {
    id:      s.id,
    shape:   capitalise(s.shape),
    carat:   parseFloat(s.carats),
    color:   s.color,
    clarity: s.clarity,
    cut:     s.cut || 'Ideal',
    cert:    s.cert || 'GIA',
    certNum: s.certNumber || '',
    price:   Math.round(s.price?.total ?? 0),
    origin:  s.labgrown_origin || 'Certified Lab-Grown',
    source:  'live',
  };
}

function capitalise(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ── Get Nivoda bearer token ────────────────────────────────────────────────
async function getNivodaToken(clientId, clientSecret) {
  const res = await fetch('https://api.nivoda.net/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation Authenticate($clientId: String!, $clientSecret: String!) {
          authenticate {
            GenerateToken(input: {
              client_id: $clientId
              client_secret: $clientSecret
            }) {
              token
              expiry
            }
          }
        }
      `,
      variables: { clientId, clientSecret },
    }),
  });
  const data = await res.json();
  return data?.data?.authenticate?.GenerateToken?.token ?? null;
}

// ── Fetch live stones from Nivoda ──────────────────────────────────────────
async function fetchNivodaStones(token, { shape, minCarat, maxPrice } = {}) {
  const filter = {
    lab_grown: true,
    has_certificate: true,
    shapes: shape && shape !== 'All' ? [shape.toUpperCase()] : undefined,
    carats: { from: minCarat ?? 0.5, to: 10 },
    price:  { from: 500, to: maxPrice ?? 50000 },
    colors: ['D','E','F','G','H'],
    clarities: ['IF','VVS1','VVS2','VS1','VS2'],
  };

  const res = await fetch('https://api.nivoda.net/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: NIVODA_QUERY,
      variables: { filter, first: 60 },
    }),
  });

  const data = await res.json();
  const stones = data?.data?.diamonds_by_query?.data ?? [];
  return stones.map(normaliseNivodaStone);
}

// ── Main handler ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { shape, minCarat, maxPrice } = req.query;

  const clientId     = process.env.NIVODA_CLIENT_ID;
  const clientSecret = process.env.NIVODA_CLIENT_SECRET;

  // ── Live path ─────────────────────────────────────────────────────────────
  if (clientId && clientSecret) {
    try {
      const token  = await getNivodaToken(clientId, clientSecret);
      if (!token) throw new Error('Auth failed');

      const stones = await fetchNivodaStones(token, {
        shape,
        minCarat: minCarat ? parseFloat(minCarat) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice)  : undefined,
      });

      return res.status(200).json({
        source: 'live',
        provider: 'Nivoda',
        count: stones.length,
        fetchedAt: new Date().toISOString(),
        diamonds: stones,
      });
    } catch (err) {
      console.error('Nivoda API error:', err.message);
      // fall through to seed
    }
  }

  // ── Seed / demo path ──────────────────────────────────────────────────────
  let diamonds = [...SEED_DIAMONDS];
  if (shape && shape !== 'All') diamonds = diamonds.filter(d => d.shape === shape);
  if (minCarat) diamonds = diamonds.filter(d => d.carat >= parseFloat(minCarat));
  if (maxPrice)  diamonds = diamonds.filter(d => d.price  <= parseFloat(maxPrice));

  return res.status(200).json({
    source: 'demo',
    provider: 'Luvia Nova curated selection',
    count: diamonds.length,
    fetchedAt: new Date().toISOString(),
    diamonds,
  });
}

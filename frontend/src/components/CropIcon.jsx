/**
 * CropIcon — global crop image component
 * Uses real crop photos from /public/crops/ everywhere in the app.
 * Falls back to a coloured initial-letter badge if no photo matches.
 *
 * Props:
 *   name         {string}  Crop name (any language/variant — mapped internally)
 *   size         {number}  Square size in px (default 32)
 *   className    {string}  Extra CSS classes on the wrapper span
 *   rounded      {bool}    true = rounded corners, false = square (default true)
 *   wrapperStyle {object}  Override wrapper inline styles (e.g. full-bleed banner)
 */

const CROP_PHOTOS = {
  // ── Rice & Paddy ──────────────────────────────────────────────────────────
  rice:       '/crops/rice.jpg',
  paddy:      '/crops/rice.jpg',
  dhan:       '/crops/rice.jpg',
  basmati:    '/crops/rice.jpg',
  sona:       '/crops/rice.jpg',
  samba:      '/crops/rice.jpg',
  ponni:      '/crops/rice.jpg',
  'ir-64':    '/crops/rice.jpg',

  // ── Wheat ─────────────────────────────────────────────────────────────────
  wheat:      '/crops/wheat.jpg',
  gehu:       '/crops/wheat.jpg',
  sharbati:   '/crops/wheat.jpg',
  lokwan:     '/crops/wheat.jpg',
  durum:      '/crops/wheat.jpg',

  // ── Maize / Corn ──────────────────────────────────────────────────────────
  maize:      '/crops/corn.jpg',
  corn:       '/crops/corn.jpg',
  makka:      '/crops/corn.jpg',
  bhutta:     '/crops/corn.jpg',
  maka:       '/crops/corn.jpg',
  sweetcorn:  '/crops/corn.jpg',

  // ── Cotton ────────────────────────────────────────────────────────────────
  cotton:     '/crops/cotton.jpg',
  kapas:      '/crops/cotton.jpg',
  kapok:      '/crops/cotton.jpg',
  rui:        '/crops/cotton.jpg',

  // ── Gram / Chickpea ───────────────────────────────────────────────────────
  gram:       '/crops/gram.jpg',
  chana:      '/crops/gram.jpg',
  chickpea:   '/crops/gram.jpg',
  chick:      '/crops/gram.jpg',
  kabuli:     '/crops/gram.jpg',
  desi:       '/crops/gram.jpg',
  bengal:     '/crops/gram.jpg',
  chanagram:  '/crops/gram.jpg',

  // ── Soybean ───────────────────────────────────────────────────────────────
  soybean:    '/crops/soybean.jpg',
  soya:       '/crops/soybean.jpg',
  soy:        '/crops/soybean.jpg',
  soyabean:   '/crops/soybean.jpg',

  // ── Sugarcane ─────────────────────────────────────────────────────────────
  sugarcane:  '/crops/sugarcane.jpg',
  ganna:      '/crops/sugarcane.jpg',
  sugar:      '/crops/sugarcane.jpg',
  iksha:      '/crops/sugarcane.jpg',

  // ── Potato ────────────────────────────────────────────────────────────────
  potato:     '/crops/potato.jpg',
  aloo:       '/crops/potato.jpg',
  alu:        '/crops/potato.jpg',

  // ── Onion ─────────────────────────────────────────────────────────────────
  onion:      '/crops/onion.jpg',
  pyaaz:      '/crops/onion.jpg',
  pyaz:       '/crops/onion.jpg',
  kanda:      '/crops/onion.jpg',
  shallot:    '/crops/onion.jpg',

  // ── Mustard / Rapeseed ────────────────────────────────────────────────────
  mustard:    '/crops/mustard.jpg',
  sarson:     '/crops/mustard.jpg',
  rapeseed:   '/crops/mustard.jpg',
  rapeseeds:  '/crops/mustard.jpg',
  canola:     '/crops/mustard.jpg',
  rai:        '/crops/mustard.jpg',

  // ── Groundnut / Peanut ────────────────────────────────────────────────────
  groundnut:  '/crops/groundnut.jpg',
  peanut:     '/crops/groundnut.jpg',
  moongphali: '/crops/groundnut.jpg',
  mungphali:  '/crops/groundnut.jpg',

  // ── Sunflower ─────────────────────────────────────────────────────────────
  sunflower:  '/crops/sunflower.jpg',
  surajmukhi: '/crops/sunflower.jpg',
  surya:      '/crops/sunflower.jpg',

  // ── Jowar / Sorghum ───────────────────────────────────────────────────────
  jowar:      '/crops/jowar.jpg',
  sorghum:    '/crops/jowar.jpg',
  jwar:       '/crops/jowar.jpg',
  jwari:      '/crops/jowar.jpg',

  // ── Bajra / Pearl Millet ──────────────────────────────────────────────────
  bajra:      '/crops/bajra.jpg',
  millet:     '/crops/bajra.jpg',
  pearl:      '/crops/bajra.jpg',
  bajri:      '/crops/bajra.jpg',
  sajja:      '/crops/bajra.jpg',

  // ── Turmeric ──────────────────────────────────────────────────────────────
  turmeric:   '/crops/turmeric.jpg',
  haldi:      '/crops/turmeric.jpg',
  haridra:    '/crops/turmeric.jpg',
}

// Pastel badge colours (fallback when no photo)
const BADGE_COLORS = [
  ['#d1fae5', '#065f46'], ['#dbeafe', '#1e40af'], ['#fef3c7', '#92400e'],
  ['#fce7f3', '#9d174d'], ['#ede9fe', '#5b21b6'], ['#ffedd5', '#9a3412'],
  ['#f0fdf4', '#166534'], ['#fef9c3', '#854d0e'], ['#ecfdf5', '#065f46'],
]

function getCropPhoto(name = '') {
  const lower = (name || '').toLowerCase().trim()
  // Exact match first
  if (CROP_PHOTOS[lower]) return CROP_PHOTOS[lower]
  // Partial / substring match
  for (const [key, url] of Object.entries(CROP_PHOTOS)) {
    if (lower.includes(key) || key.includes(lower)) return url
  }
  return null
}

function getBadgeColors(name = '') {
  const code = (name || 'A').charCodeAt(0)
  return BADGE_COLORS[code % BADGE_COLORS.length]
}

export default function CropIcon({ name = '', size = 32, className = '', rounded = true, wrapperStyle = {} }) {
  const photo = getCropPhoto(name)
  const initial = (name || '?')[0].toUpperCase()
  const [bg, fg] = getBadgeColors(name)

  const radius = rounded ? Math.round(size * 0.28) : Math.round(size * 0.18)
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    overflow: 'hidden',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: 'middle',
    ...wrapperStyle,
  }

  if (photo) {
    return (
      <span style={containerStyle} className={className}>
        <img
          src={photo}
          alt={name}
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => {
            e.currentTarget.style.display = 'none'
            const badge = e.currentTarget.nextSibling
            if (badge) badge.style.display = 'flex'
          }}
        />
        {/* Hidden fallback badge */}
        <span style={{
          display: 'none',
          width: '100%', height: '100%',
          background: bg, color: fg,
          fontSize: Math.round(size * 0.42),
          fontWeight: 800,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {initial}
        </span>
      </span>
    )
  }

  // No photo → coloured initial badge
  return (
    <span
      style={{ ...containerStyle, background: bg, color: fg, fontSize: Math.round(size * 0.42), fontWeight: 800 }}
      className={className}
      aria-label={name}
    >
      {initial}
    </span>
  )
}

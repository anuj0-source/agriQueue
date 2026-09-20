import React from 'react';

export default function CropIcon({ name = '', size = 24, className = '' }) {
  const crop = (name || '').toLowerCase();

  // ----- Realistic SVG Paths -----

  const WheatSVG = () => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <title>{name}</title>
      <defs>
        <linearGradient id="wheat-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
      </defs>
      {/* Stem */}
      <path d="M12,52 C25,40 38,28 50,15" fill="none" stroke="#CA8A04" strokeWidth="2.5" strokeLinecap="round" />
      {/* Kernels - Right Side */}
      <path d="M48,15 C52,18 53,24 49,27 C46,29 42,28 41,24 L48,15 Z" fill="url(#wheat-grad)" />
      <path d="M43,21 C47,24 48,30 44,33 C41,35 37,34 36,30 L43,21 Z" fill="url(#wheat-grad)" />
      <path d="M38,27 C42,30 43,36 39,39 C36,41 32,40 31,36 L38,27 Z" fill="url(#wheat-grad)" />
      <path d="M33,33 C37,36 38,42 34,45 C31,47 27,46 26,42 L33,33 Z" fill="url(#wheat-grad)" />
      <path d="M28,39 C32,42 33,48 29,51 C26,53 22,52 21,48 L28,39 Z" fill="url(#wheat-grad)" />
      {/* Kernels - Left Side */}
      <path d="M45,18 C47,14 43,10 39,11 C35,12 35,16 38,19 L45,18 Z" fill="url(#wheat-grad)" />
      <path d="M40,24 C42,20 38,16 34,17 C30,18 30,22 33,25 L40,24 Z" fill="url(#wheat-grad)" />
      <path d="M35,30 C37,26 33,22 29,23 C25,24 25,28 28,31 L35,30 Z" fill="url(#wheat-grad)" />
      <path d="M30,36 C32,32 28,28 24,29 C20,30 20,34 23,37 L30,36 Z" fill="url(#wheat-grad)" />
      <path d="M25,42 C27,38 23,34 19,35 C15,36 15,40 18,43 L25,42 Z" fill="url(#wheat-grad)" />
      {/* Awns (bristles) */}
      <path d="M48,15 L58,4 M43,21 L53,10 M38,27 L48,16" fill="none" stroke="#FDE047" strokeWidth="1" />
      <path d="M45,18 L34,7 M40,24 L29,13 M35,30 L24,19" fill="none" stroke="#FDE047" strokeWidth="1" />
    </svg>
  );

  const MaizeSVG = () => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <title>{name}</title>
      <defs>
        <radialGradient id="maize-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="60%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#A16207" />
        </radialGradient>
        <linearGradient id="husk-grad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#15803D" />
          <stop offset="100%" stopColor="#4ADE80" />
        </linearGradient>
      </defs>
      {/* Cob */}
      <path d="M32,8 C40,15 42,35 32,50 C22,35 24,15 32,8 Z" fill="url(#maize-grad)" />
      {/* Kernels details (crosshatch) */}
      <path d="M28,15 L36,15 M27,22 L37,22 M26,29 L38,29 M26,36 L38,36 M27,43 L37,43" stroke="#A16207" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M30,12 L30,46 M34,12 L34,46" stroke="#A16207" strokeWidth="1.5" />
      {/* Husks */}
      <path d="M32,54 C25,54 12,40 16,25 C18,35 25,48 32,52 Z" fill="url(#husk-grad)" />
      <path d="M32,54 C39,54 52,40 48,25 C46,35 39,48 32,52 Z" fill="url(#husk-grad)" />
      <path d="M32,50 L32,60" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" />
      {/* Silk */}
      <path d="M30,8 C28,4 32,2 34,5 C36,8 34,9 32,8 Z" fill="#D97706" />
    </svg>
  );

  const RiceSVG = () => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <title>{name}</title>
      <defs>
        <linearGradient id="rice-husk" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4D4D8" />
          <stop offset="50%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="rice-leaf" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#16A34A" />
          <stop offset="100%" stopColor="#86EFAC" />
        </linearGradient>
      </defs>
      {/* Stem */}
      <path d="M32,60 C32,40 38,20 50,15" fill="none" stroke="#65A30D" strokeWidth="2.5" />
      {/* Drooping Leaves */}
      <path d="M32,50 C20,40 10,45 8,60 C15,50 25,45 32,50 Z" fill="url(#rice-leaf)" />
      <path d="M34,40 C45,35 55,40 60,50 C55,40 45,35 34,40 Z" fill="url(#rice-leaf)" />
      {/* Rice Grains */}
      <ellipse cx="48" cy="18" rx="2" ry="5" transform="rotate(45 48 18)" fill="url(#rice-husk)" />
      <ellipse cx="44" cy="22" rx="2" ry="5" transform="rotate(45 44 22)" fill="url(#rice-husk)" />
      <ellipse cx="40" cy="26" rx="2" ry="5" transform="rotate(45 40 26)" fill="url(#rice-husk)" />
      <ellipse cx="36" cy="30" rx="2" ry="5" transform="rotate(45 36 30)" fill="url(#rice-husk)" />
      <ellipse cx="44" cy="14" rx="2" ry="5" transform="rotate(15 44 14)" fill="url(#rice-husk)" />
      <ellipse cx="39" cy="19" rx="2" ry="5" transform="rotate(25 39 19)" fill="url(#rice-husk)" />
    </svg>
  );

  const CottonSVG = () => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <title>{name}</title>
      <defs>
        <radialGradient id="cotton-grad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="80%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </radialGradient>
      </defs>
      {/* Stem & Calyx (base of flower) */}
      <path d="M32,45 L32,60 M32,45 C25,42 15,35 20,28 M32,45 C39,42 49,35 44,28" fill="none" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32,47 L25,35 L32,40 L39,35 Z" fill="#65A30D" />
      {/* Cotton Fluffs */}
      <circle cx="28" cy="28" r="10" fill="url(#cotton-grad)" />
      <circle cx="36" cy="28" r="10" fill="url(#cotton-grad)" />
      <circle cx="32" cy="18" r="11" fill="url(#cotton-grad)" />
      <circle cx="22" cy="20" r="8" fill="url(#cotton-grad)" />
      <circle cx="42" cy="20" r="8" fill="url(#cotton-grad)" />
    </svg>
  );

  const GenericSproutSVG = () => (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <title>{name}</title>
      <path d="M32,60 C32,40 32,30 32,25" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" />
      <path d="M32,28 C32,28 32,12 48,10 C48,10 53,24 32,28 Z" fill="#4ADE80" stroke="#16A34A" strokeWidth="2" strokeLinejoin="round" />
      <path d="M32,36 C32,36 32,20 16,18 C16,18 11,32 32,36 Z" fill="#86EFAC" stroke="#16A34A" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );

  // Return the best matching realistic SVG
  if (crop.includes('wheat') || crop.includes('gehu')) return <WheatSVG />;
  if (crop.includes('corn') || crop.includes('maize') || crop.includes('makka')) return <MaizeSVG />;
  if (crop.includes('rice') || crop.includes('paddy') || crop.includes('dhan')) return <RiceSVG />;
  if (crop.includes('cotton') || crop.includes('kapas')) return <CottonSVG />;
  
  return <GenericSproutSVG />;
}

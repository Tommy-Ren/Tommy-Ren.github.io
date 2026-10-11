export interface PathStep {
  id: string;
  eyebrow: string;
  title: string;
  place: string;
  period: string;
  description: string;
  lat: number;
  lng: number;
  /** Globe camera distance expressed as a multiple of the globe radius. */
  altitude: number;
}

export interface TravelPlace {
  id: string;
  name: string;
  /** Chinese place names preserve the user's own list. */
  localName: string;
  region: string;
  lat: number;
  lng: number;
  /** Region markers are representative points, not a precise visited location. */
  scope: 'city' | 'region';
}

export const pathSteps: PathStep[] = [
  {
    id: 'wuhan',
    eyebrow: '01 / The beginning',
    title: 'Wuhan Foreign Language School',
    place: 'Wuhan, China',
    period: 'Before Canada',
    description:
      'Before moving to Canada, I attended Wuhan Foreign Language School in Wuhan. This is where the story of my path from China to Metro Vancouver starts.',
    lat: 30.5838,
    lng: 114.2686,
    altitude: 1.85,
  },
  {
    id: 'bcit',
    eyebrow: '02 / A new chapter',
    title: 'BCIT · Computer Systems Technology',
    place: 'Burnaby, Metro Vancouver, Canada',
    period: 'Sep 2023 — May 2025',
    description:
      'I moved to Metro Vancouver and completed a Computer Systems Technology diploma at BCIT, with a concentration in Predictive Analytics. This chapter gave my interest in computing a practical foundation.',
    lat: 49.2482,
    lng: -123.0012,
    altitude: 1.7,
  },
  {
    id: 'sfu',
    eyebrow: '03 / Building on the foundation',
    title: 'SFU · Computing Science',
    place: 'Burnaby, Metro Vancouver, Canada',
    period: 'Sep 2025 — Present',
    description:
      'After BCIT, I transferred credits to Simon Fraser University to continue toward a BSc in Computing Science. My current studies focus on Artificial Intelligence, alongside a minor in Statistics.',
    lat: 49.2782,
    lng: -122.9194,
    altitude: 1.55,
  },
  {
    id: 'travel',
    eyebrow: '04 / Beyond the classroom',
    title: 'Places along the way',
    place: 'Across Asia & North America',
    period: 'Places I have visited',
    description:
      'Outside my studies, I have visited cities, mountains, and islands across Asia and North America. From Zhangjiajie and Bali to Vancouver and Washington, D.C., these places are another part of my story.',
    // Camera composition only; this is not another visited destination.
    lat: 22,
    lng: 110,
    altitude: 2.3,
  },
];

// Preserve the user's listed order; the array is not a chronological route.
// Coordinates are rounded geographic reference points, not GPS travel records.
export const travelPlaces: TravelPlace[] = [
  { id: 'zhangjiajie', name: 'Zhangjiajie', localName: '张家界', region: 'Hunan, China', lat: 29.1256, lng: 110.4844, scope: 'city' },
  // Wuyishan city in Fujian represents the surrounding Wuyi travel area.
  { id: 'wuyishan', name: 'Wuyishan', localName: '武夷山', region: 'Fujian, China', lat: 27.7561, lng: 118.0267, scope: 'city' },
  // Approximate province reference point, deliberately separate from Chengdu.
  { id: 'sichuan', name: 'Sichuan', localName: '四川', region: 'China · province (approx.)', lat: 30, lng: 103, scope: 'region' },
  { id: 'chengdu', name: 'Chengdu', localName: '成都', region: 'Sichuan, China', lat: 30.66, lng: 104.0633, scope: 'city' },
  { id: 'beijing', name: 'Beijing', localName: '北京', region: 'China', lat: 39.904, lng: 116.4075, scope: 'city' },
  { id: 'shanghai', name: 'Shanghai', localName: '上海', region: 'China', lat: 31.2325, lng: 121.4692, scope: 'city' },
  { id: 'guangzhou', name: 'Guangzhou', localName: '广州', region: 'Guangdong, China', lat: 23.13, lng: 113.26, scope: 'city' },
  { id: 'shenzhen', name: 'Shenzhen', localName: '深圳', region: 'Guangdong, China', lat: 22.5467, lng: 114.0544, scope: 'city' },
  { id: 'hong-kong', name: 'Hong Kong', localName: '香港', region: 'Hong Kong SAR, China', lat: 22.2833, lng: 114.1667, scope: 'city' },
  { id: 'seoul', name: 'Seoul', localName: '首尔', region: 'South Korea', lat: 37.56, lng: 126.99, scope: 'city' },
  { id: 'pattaya', name: 'Pattaya', localName: '芭堤雅', region: 'Chon Buri, Thailand', lat: 12.9494, lng: 100.8931, scope: 'city' },
  // Approximate island/province reference point; no specific town is assumed.
  { id: 'bali', name: 'Bali', localName: '巴厘岛', region: 'Indonesia · island (approx.)', lat: -8.364, lng: 115.104, scope: 'region' },
  { id: 'edmonton', name: 'Edmonton', localName: '埃德蒙顿', region: 'Alberta, Canada', lat: 53.5344, lng: -113.4903, scope: 'city' },
  { id: 'calgary', name: 'Calgary', localName: '卡尔加里', region: 'Alberta, Canada', lat: 51.0475, lng: -114.0625, scope: 'city' },
  { id: 'vancouver', name: 'Vancouver', localName: '温哥华', region: 'British Columbia, Canada', lat: 49.2608, lng: -123.1139, scope: 'city' },
  { id: 'los-angeles', name: 'Los Angeles', localName: '洛杉矶', region: 'California, United States', lat: 34.0522, lng: -118.2437, scope: 'city' },
  { id: 'seattle', name: 'Seattle', localName: '西雅图', region: 'Washington, United States', lat: 47.6062, lng: -122.3321, scope: 'city' },
  { id: 'washington-dc', name: 'Washington, D.C.', localName: '华盛顿特区', region: 'District of Columbia, United States', lat: 38.8951, lng: -77.0364, scope: 'city' },
];

/** Maintenance references, independent of the page's visual components. */
export const pathCoordinateSources: Record<string, string> = {
  wuhan: 'https://www.wikidata.org/wiki/Q8039080',
  bcit: 'https://ca.geoview.info/british_columbia_institute_of_technology,20041839828w',
  sfu: 'https://www.wikidata.org/wiki/Q201603',
  zhangjiajie: 'https://www.wikidata.org/wiki/Q197379',
  wuyishan: 'https://www.wikidata.org/wiki/Q94945',
  sichuan: 'https://www.wikidata.org/wiki/Q19770',
  chengdu: 'https://www.wikidata.org/wiki/Q30002',
  beijing: 'https://www.wikidata.org/wiki/Q956',
  shanghai: 'https://www.wikidata.org/wiki/Q8686',
  guangzhou: 'https://www.wikidata.org/wiki/Q16572',
  shenzhen: 'https://www.wikidata.org/wiki/Q15174',
  'hong-kong': 'https://www.wikidata.org/wiki/Q8646',
  seoul: 'https://www.wikidata.org/wiki/Q8684',
  pattaya: 'https://www.wikidata.org/wiki/Q170919',
  bali: 'https://wiki.openstreetmap.org/wiki/Bali',
  edmonton: 'https://geonames.nrcan.gc.ca/search-place-names/unique?id=IACMP&wbdisable=true',
  calgary: 'https://www.wikidata.org/wiki/Q36312',
  vancouver: 'https://www.wikidata.org/wiki/Q24639',
  'los-angeles': 'https://www.geonames.org/5368361/los-angeles.html',
  seattle: 'https://www.geonames.org/advanced-search.html?q=Seattle',
  'washington-dc': 'https://www.geonames.org/4140963/washington.html',
};

export const pathDataNotes = [
  'Education and visited places were supplied by Tommy; no travel dates or routes are inferred.',
  'The Wuhan school point represents the Wansongyuan Road institution; a specific school campus was not supplied.',
  'BCIT and SFU markers represent their Burnaby campuses, rather than downtown Vancouver locations.',
  'City markers are approximate reference locations. Wuyishan uses the Fujian city as the local reference.',
  'Sichuan and Bali are regional representative points, not exact visited locations.',
  'The travel chapter camera target is a composition setting, not a destination.',
];

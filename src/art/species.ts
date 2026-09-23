/**
 * Which drawing a species gets. Unlike the rest of src/art, this reads the
 * reference base (src/data/plants.ts) and its lookup, so it is for the app
 * and the tests, not for the preview script.
 */

import { REFERENCE_PLANTS } from '@/data/plants';
import { findReference, referenceKey } from '@/lib/plant-reference';

import type { ArtSpec } from './types';

/** Flower colors, close to the real ones. */
const BLOOM = {
  red: '#D9312B',
  scarlet: '#E8492E',
  coral: '#F2705A',
  orange: '#F08A24',
  gold: '#F2B233',
  yellow: '#F6CF3A',
  paleYellow: '#F7E48C',
  white: '#FBF8F0',
  blush: '#F6DDE6',
  pink: '#EE82AB',
  rose: '#E4577F',
  magenta: '#D33A8E',
  fuchsia: '#C2266E',
  lilac: '#CDA6DE',
  mauve: '#BA7CC0',
  purple: '#8C5CC7',
  violet: '#6D46B0',
  blue: '#7FA5E3',
  sky: '#A8C6EE',
} as const;

/** Fruit colors, for the trees and the vegetable garden. */
const FRUIT = {
  tomato: '#E5392A',
  strawberry: '#DC2F3A',
  pepper: '#D3261E',
  lemon: '#F5D535',
  orange: '#F3962B',
  olive: '#5B4B57',
} as const;

/** The drawing of every plant of the reference base, by id. */
export const REFERENCE_ART: Readonly<Record<string, ArtSpec>> = {
  // Houseplants
  'monstera-deliciosa': { kind: 'monstera' },
  'monstera-adansonii': { kind: 'monstera' },
  'rhaphidophora-tetrasperma': { kind: 'monstera' },
  'epipremnum-aureum': { kind: 'pothos' },
  'scindapsus-pictus': { kind: 'pothos' },
  'philodendron-hederaceum': { kind: 'pothos' },
  'philodendron-erubescens': { kind: 'elephant_ear' },
  'thaumatophyllum-bipinnatifidum': { kind: 'monstera' },
  'zamioculcas-zamiifolia': { kind: 'zz' },
  'spathiphyllum-wallisii': { kind: 'peace_lily', accent: BLOOM.white },
  'anthurium-andraeanum': { kind: 'peace_lily', accent: BLOOM.red },
  'aglaonema-commutatum': { kind: 'elephant_ear' },
  'dieffenbachia-seguine': { kind: 'elephant_ear' },
  'alocasia-amazonica': { kind: 'elephant_ear' },
  'alocasia-macrorrhizos': { kind: 'elephant_ear' },
  'syngonium-podophyllum': { kind: 'elephant_ear' },
  'zantedeschia-aethiopica': { kind: 'peace_lily', accent: BLOOM.white },
  'goeppertia-orbifolia': { kind: 'calathea' },
  'goeppertia-makoyana': { kind: 'calathea' },
  'goeppertia-insignis': { kind: 'calathea' },
  'goeppertia-roseopicta': { kind: 'calathea' },
  'maranta-leuconeura': { kind: 'calathea' },
  'stromanthe-thalia': { kind: 'calathea' },
  'ficus-elastica': { kind: 'ficus' },
  'ficus-lyrata': { kind: 'ficus' },
  'ficus-benjamina': { kind: 'ficus' },
  'ficus-microcarpa': { kind: 'ficus' },
  'ficus-pumila': { kind: 'pothos' },
  'schefflera-arboricola': { kind: 'ficus' },
  'pachira-aquatica': { kind: 'ficus' },
  // Tiers of needles: the fern's fronds are the closest.
  'araucaria-heterophylla': { kind: 'fern' },
  'sparrmannia-africana': { kind: 'ficus' },
  'coffea-arabica': { kind: 'ficus' },
  'dracaena-marginata': { kind: 'dracaena' },
  'dracaena-fragrans': { kind: 'dracaena' },
  'dracaena-trifasciata': { kind: 'snake' },
  'dracaena-angolensis': { kind: 'snake' },
  'dracaena-sanderiana': { kind: 'dracaena' },
  'yucca-gigantea': { kind: 'dracaena' },
  'beaucarnea-recurvata': { kind: 'dracaena' },
  'cordyline-fruticosa': { kind: 'dracaena' },
  'chlorophytum-comosum': { kind: 'spider' },
  'aspidistra-elatior': { kind: 'spider' },
  'peperomia-obtusifolia': { kind: 'pilea' },
  'peperomia-argyreia': { kind: 'pilea' },
  'peperomia-caperata': { kind: 'pilea' },
  'pilea-peperomioides': { kind: 'pilea' },
  'pilea-cadierei': { kind: 'pilea' },
  'tradescantia-zebrina': { kind: 'colorful' },
  'tradescantia-spathacea': { kind: 'colorful' },
  'hoya-carnosa': { kind: 'pothos' },
  'hoya-kerrii': { kind: 'pothos' },
  'ceropegia-woodii': { kind: 'string_of_pearls' },
  'fittonia-albivenis': { kind: 'colorful' },
  'hypoestes-phyllostachya': { kind: 'colorful' },
  'coleus-scutellarioides': { kind: 'colorful' },
  'codiaeum-variegatum': { kind: 'colorful' },
  'soleirolia-soleirolii': { kind: 'pilea' },
  'oxalis-triangularis': { kind: 'colorful' },
  'cissus-rhombifolia': { kind: 'pothos' },
  'hedera-helix': { kind: 'pothos' },
  'asparagus-setaceus': { kind: 'fern' },
  'asparagus-densiflorus': { kind: 'fern' },
  'fatsia-japonica': { kind: 'ficus' },
  'nephrolepis-exaltata': { kind: 'fern' },
  'asplenium-nidus': { kind: 'fern' },
  'adiantum-raddianum': { kind: 'fern' },
  'platycerium-bifurcatum': { kind: 'fern' },
  'chamaedorea-elegans': { kind: 'palm' },
  'dypsis-lutescens': { kind: 'palm' },
  'howea-forsteriana': { kind: 'palm' },
  'rhapis-excelsa': { kind: 'palm' },
  'phoenix-roebelenii': { kind: 'palm' },
  'cycas-revoluta': { kind: 'palm' },
  'strelitzia-reginae': { kind: 'elephant_ear' },
  'strelitzia-nicolai': { kind: 'elephant_ear' },
  'crassula-ovata': { kind: 'succulent' },
  'aloe-vera': { kind: 'aloe' },
  'haworthiopsis-attenuata': { kind: 'aloe' },
  'echeveria-elegans': { kind: 'succulent' },
  'sedum-morganianum': { kind: 'string_of_pearls' },
  'curio-rowleyanus': { kind: 'string_of_pearls' },
  'kalanchoe-blossfeldiana': { kind: 'flowers', accent: BLOOM.scarlet },
  'kalanchoe-tomentosa': { kind: 'succulent' },
  'opuntia-microdasys': { kind: 'cactus', accent: BLOOM.yellow },
  'schlumbergera-truncata': { kind: 'cactus', accent: BLOOM.magenta },
  'echinocactus-grusonii': { kind: 'cactus', accent: BLOOM.yellow },
  'rhipsalis-baccifera': { kind: 'string_of_pearls' },
  'euphorbia-milii': { kind: 'cactus', accent: BLOOM.red },
  'euphorbia-trigona': { kind: 'cactus' },
  'aeonium-arboreum': { kind: 'succulent' },
  'adenium-obesum': { kind: 'succulent' },
  'phalaenopsis-amabilis': { kind: 'orchid', accent: BLOOM.pink },
  'dendrobium-nobile': { kind: 'orchid', accent: BLOOM.mauve },
  'streptocarpus-ionanthus': { kind: 'flowers', accent: BLOOM.violet },
  'begonia-maculata': { kind: 'colorful' },
  'begonia-rex': { kind: 'colorful' },
  'cyclamen-persicum': { kind: 'flowers', accent: BLOOM.rose },
  'guzmania-lingulata': { kind: 'bromeliad', accent: BLOOM.red },
  'vriesea-splendens': { kind: 'bromeliad', accent: BLOOM.scarlet },
  'aechmea-fasciata': { kind: 'bromeliad', accent: BLOOM.pink },
  'tillandsia-ionantha': { kind: 'bromeliad', accent: BLOOM.violet },
  'clivia-miniata': { kind: 'flowers', accent: BLOOM.orange },
  'gardenia-jasminoides': { kind: 'flowers', accent: BLOOM.white },
  'jasminum-polyanthum': { kind: 'flowers', accent: BLOOM.blush },
  'hibiscus-rosa-sinensis': { kind: 'flowers', accent: BLOOM.red },
  'euphorbia-pulcherrima': { kind: 'flowers', accent: BLOOM.red },
  'rhododendron-simsii': { kind: 'flowers', accent: BLOOM.pink },
  'citrus-microcarpa': { kind: 'tree', accent: FRUIT.orange },

  // Balcony and terrace plants
  'chamaerops-humilis': { kind: 'palm' },
  'trachycarpus-fortunei': { kind: 'palm' },
  'sempervivum-tectorum': { kind: 'succulent' },
  'agave-americana': { kind: 'aloe' },
  'citrus-limon': { kind: 'tree', accent: FRUIT.lemon },
  'olea-europaea': { kind: 'tree', accent: FRUIT.olive },
  'bougainvillea-glabra': { kind: 'flowers', accent: BLOOM.magenta },
  'mandevilla-sanderi': { kind: 'flowers', accent: BLOOM.rose },
  'nerium-oleander': { kind: 'flowers', accent: BLOOM.pink },
  'plumbago-auriculata': { kind: 'flowers', accent: BLOOM.sky },
  'trachelospermum-jasminoides': { kind: 'flowers', accent: BLOOM.white },
  'hydrangea-macrophylla': { kind: 'flowers', accent: BLOOM.blue },
  'buxus-sempervirens': { kind: 'tree' },
  'camellia-japonica': { kind: 'flowers', accent: BLOOM.rose },
  'calluna-vulgaris': { kind: 'lavender', accent: BLOOM.mauve },
  'lavandula-angustifolia': { kind: 'lavender', accent: BLOOM.purple },
  'lavandula-stoechas': { kind: 'lavender', accent: BLOOM.violet },
  'festuca-glauca': { kind: 'spider' },
  'jacobaea-maritima': { kind: 'herbs' },
  'pelargonium-hortorum': { kind: 'flowers', accent: BLOOM.red },
  'pelargonium-peltatum': { kind: 'flowers', accent: BLOOM.pink },
  'petunia-atkinsiana': { kind: 'flowers', accent: BLOOM.purple },
  'impatiens-walleriana': { kind: 'flowers', accent: BLOOM.pink },
  'impatiens-hawkeri': { kind: 'flowers', accent: BLOOM.coral },
  'tagetes-patula': { kind: 'flowers', accent: BLOOM.orange },
  'lobularia-maritima': { kind: 'flowers', accent: BLOOM.white },
  'viola-wittrockiana': { kind: 'flowers', accent: BLOOM.violet },
  'primula-vulgaris': { kind: 'flowers', accent: BLOOM.paleYellow },
  'chrysanthemum-morifolium': { kind: 'flowers', accent: BLOOM.gold },
  'lantana-camara': { kind: 'flowers', accent: BLOOM.gold },
  'osteospermum-ecklonis': { kind: 'flowers', accent: BLOOM.mauve },
  'argyranthemum-frutescens': { kind: 'flowers', accent: BLOOM.white },
  'bidens-ferulifolia': { kind: 'flowers', accent: BLOOM.yellow },
  'portulaca-grandiflora': { kind: 'flowers', accent: BLOOM.magenta },
  'gazania-rigens': { kind: 'flowers', accent: BLOOM.orange },
  'begonia-cucullata': { kind: 'flowers', accent: BLOOM.rose },
  'verbena-hybrida': { kind: 'flowers', accent: BLOOM.purple },
  'tropaeolum-majus': { kind: 'flowers', accent: BLOOM.orange },
  'fuchsia-magellanica': { kind: 'flowers', accent: BLOOM.fuchsia },
  'fragaria-ananassa': { kind: 'veggie', accent: FRUIT.strawberry },
  'solanum-lycopersicum': { kind: 'veggie', accent: FRUIT.tomato },
  'capsicum-annuum': { kind: 'veggie', accent: FRUIT.pepper },
  'laurus-nobilis': { kind: 'tree' },

  // Herbs
  'ocimum-basilicum': { kind: 'herbs' },
  'petroselinum-crispum': { kind: 'herbs' },
  'mentha-spicata': { kind: 'herbs' },
  'mentha-piperita': { kind: 'herbs' },
  'thymus-vulgaris': { kind: 'lavender', accent: BLOOM.lilac },
  'salvia-rosmarinus': { kind: 'lavender', accent: BLOOM.sky },
  'salvia-officinalis': { kind: 'herbs' },
  'origanum-vulgare': { kind: 'herbs' },
  'origanum-majorana': { kind: 'herbs' },
  'allium-schoenoprasum': { kind: 'herbs' },
  'coriandrum-sativum': { kind: 'herbs' },
  'anethum-graveolens': { kind: 'herbs' },
  'aloysia-citrodora': { kind: 'herbs' },
  'melissa-officinalis': { kind: 'herbs' },
  'cymbopogon-citratus': { kind: 'spider' },
  'artemisia-dracunculus': { kind: 'herbs' },
  'satureja-montana': { kind: 'lavender', accent: BLOOM.white },
  'anthriscus-cerefolium': { kind: 'herbs' },
};

/**
 * Genera whose species in the base get different drawings, with the likeliest
 * one for a species outside it, then common genera the base does not have.
 * The other genera take the drawing of their first plant in the base.
 */
const GENERA: Readonly<Record<string, ArtSpec>> = {
  philodendron: { kind: 'elephant_ear' },
  euphorbia: { kind: 'cactus' },
  kalanchoe: { kind: 'succulent' },
  sedum: { kind: 'succulent' },
  haworthia: { kind: 'succulent' },
  salvia: { kind: 'lavender', accent: BLOOM.purple },

  astrophytum: { kind: 'cactus' },
  cereus: { kind: 'cactus' },
  echinopsis: { kind: 'cactus' },
  ferocactus: { kind: 'cactus' },
  gymnocalycium: { kind: 'cactus' },
  mammillaria: { kind: 'cactus', accent: BLOOM.magenta },
  parodia: { kind: 'cactus' },
  graptopetalum: { kind: 'succulent' },
  lithops: { kind: 'succulent' },
  pachyphytum: { kind: 'succulent' },
  portulacaria: { kind: 'succulent' },
  gasteria: { kind: 'aloe' },
  ananas: { kind: 'bromeliad', accent: BLOOM.red },
  billbergia: { kind: 'bromeliad', accent: BLOOM.pink },
  neoregelia: { kind: 'bromeliad', accent: BLOOM.magenta },
  cattleya: { kind: 'orchid', accent: BLOOM.mauve },
  cymbidium: { kind: 'orchid', accent: BLOOM.blush },
  oncidium: { kind: 'orchid', accent: BLOOM.yellow },
  paphiopedilum: { kind: 'orchid', accent: BLOOM.mauve },
  vanda: { kind: 'orchid', accent: BLOOM.violet },
  livistona: { kind: 'palm' },
  washingtonia: { kind: 'palm' },
  davallia: { kind: 'fern' },
  phlebodium: { kind: 'fern' },
  pteris: { kind: 'fern' },
  ctenanthe: { kind: 'calathea' },
  caladium: { kind: 'elephant_ear' },
  colocasia: { kind: 'elephant_ear' },
  hippeastrum: { kind: 'flowers', accent: BLOOM.red },
  hyacinthus: { kind: 'flowers', accent: BLOOM.purple },
  narcissus: { kind: 'flowers', accent: BLOOM.yellow },
  rosa: { kind: 'flowers', accent: BLOOM.pink },
  tulipa: { kind: 'flowers', accent: BLOOM.red },
};

/**
 * French and English words for a kind of plant, most precise first. Matched
 * as whole words, ignoring case, accents and plurals.
 */
const KEYWORDS: readonly (readonly [string, ArtSpec])[] = [
  ['plante grasse', { kind: 'succulent' }],
  ['succulente', { kind: 'succulent' }],
  ['succulent', { kind: 'succulent' }],
  ['cactus', { kind: 'cactus' }],
  ['cactee', { kind: 'cactus' }],
  ['palmier', { kind: 'palm' }],
  ['palm', { kind: 'palm' }],
  ['fougere', { kind: 'fern' }],
  ['fern', { kind: 'fern' }],
  ['orchidee', { kind: 'orchid' }],
  ['orchid', { kind: 'orchid' }],
  ['bromelia', { kind: 'bromeliad' }],
  ['bromeliacee', { kind: 'bromeliad' }],
  ['lavande', { kind: 'lavender', accent: BLOOM.purple }],
  ['lavender', { kind: 'lavender', accent: BLOOM.purple }],
  ['romarin', { kind: 'lavender', accent: BLOOM.sky }],
  ['rosemary', { kind: 'lavender', accent: BLOOM.sky }],
  ['thym', { kind: 'lavender', accent: BLOOM.lilac }],
  ['thyme', { kind: 'lavender', accent: BLOOM.lilac }],
  ['bruyere', { kind: 'lavender', accent: BLOOM.mauve }],
  ['heather', { kind: 'lavender', accent: BLOOM.mauve }],
  ['basilic', { kind: 'herbs' }],
  ['basil', { kind: 'herbs' }],
  ['menthe', { kind: 'herbs' }],
  ['mint', { kind: 'herbs' }],
  ['persil', { kind: 'herbs' }],
  ['parsley', { kind: 'herbs' }],
  ['coriandre', { kind: 'herbs' }],
  ['ciboulette', { kind: 'herbs' }],
  ['aromatique', { kind: 'herbs' }],
  ['herb', { kind: 'herbs' }],
  ['tomate', { kind: 'veggie', accent: FRUIT.tomato }],
  ['tomato', { kind: 'veggie', accent: FRUIT.tomato }],
  ['fraisier', { kind: 'veggie', accent: FRUIT.strawberry }],
  ['fraise', { kind: 'veggie', accent: FRUIT.strawberry }],
  ['strawberry', { kind: 'veggie', accent: FRUIT.strawberry }],
  ['piment', { kind: 'veggie', accent: FRUIT.pepper }],
  ['poivron', { kind: 'veggie', accent: FRUIT.pepper }],
  ['chili', { kind: 'veggie', accent: FRUIT.pepper }],
  ['potager', { kind: 'veggie', accent: FRUIT.tomato }],
  ['citronnier', { kind: 'tree', accent: FRUIT.lemon }],
  ['lemon', { kind: 'tree', accent: FRUIT.lemon }],
  ['oranger', { kind: 'tree', accent: FRUIT.orange }],
  ['mandarinier', { kind: 'tree', accent: FRUIT.orange }],
  ['kumquat', { kind: 'tree', accent: FRUIT.orange }],
  ['agrume', { kind: 'tree', accent: FRUIT.orange }],
  ['olivier', { kind: 'tree', accent: FRUIT.olive }],
  ['olive tree', { kind: 'tree', accent: FRUIT.olive }],
  ['laurier', { kind: 'tree' }],
  ['arbre', { kind: 'tree' }],
  ['figuier', { kind: 'ficus' }],
  ['rubber plant', { kind: 'ficus' }],
  ['money tree', { kind: 'ficus' }],
  ['bonsai', { kind: 'ficus' }],
  ['dragonnier', { kind: 'dracaena' }],
  ['bambou', { kind: 'dracaena' }],
  ['bamboo', { kind: 'dracaena' }],
  ['snake plant', { kind: 'snake' }],
  ['spider plant', { kind: 'spider' }],
  ['araignee', { kind: 'spider' }],
  ['graminee', { kind: 'spider' }],
  ['grass', { kind: 'spider' }],
  ['peace lily', { kind: 'peace_lily', accent: BLOOM.white }],
  ['prayer plant', { kind: 'calathea' }],
  ['string of pearls', { kind: 'string_of_pearls' }],
  ['string of hearts', { kind: 'string_of_pearls' }],
  ['lierre', { kind: 'pothos' }],
  ['ivy', { kind: 'pothos' }],
  ['liane', { kind: 'pothos' }],
  ['geranium', { kind: 'flowers', accent: BLOOM.red }],
  ['hortensia', { kind: 'flowers', accent: BLOOM.blue }],
  ['rosier', { kind: 'flowers', accent: BLOOM.pink }],
  ['pensee', { kind: 'flowers', accent: BLOOM.violet }],
  ['primevere', { kind: 'flowers', accent: BLOOM.paleYellow }],
  ['marguerite', { kind: 'flowers', accent: BLOOM.white }],
  ['muguet', { kind: 'flowers', accent: BLOOM.white }],
  ['lys', { kind: 'flowers', accent: BLOOM.white }],
  ['tulipe', { kind: 'flowers', accent: BLOOM.red }],
  ['jacinthe', { kind: 'flowers', accent: BLOOM.purple }],
  ['narcisse', { kind: 'flowers', accent: BLOOM.yellow }],
  ['jonquille', { kind: 'flowers', accent: BLOOM.yellow }],
  ['fleur', { kind: 'flowers' }],
  ['flower', { kind: 'flowers' }],
];

const SPROUT: ArtSpec = { kind: 'sprout' };

/** Words before a plant's name that say nothing of it: « mon cactus », « la tomate ». */
const DETERMINERS = new Set([
  ...['le', 'la', 'les', 'l', 'un', 'une', 'des', 'du'],
  ...['mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'notre', 'nos', 'my'],
]);

/** "fougères" and "fougère" alike. Applied to both sides, so "cactus" → "cactu" still matches. */
const singular = (word: string) => (word.length > 3 ? word.replace(/[sx]$/, '') : word);

const singularKey = (text: string) => referenceKey(text).split(' ').map(singular).join(' ');

let genera: Map<string, ArtSpec> | null = null;
let keywords: (readonly [string, ArtSpec])[] | null = null;

/** Every genus of the base (from scientific names and synonyms), then GENERA over them. */
function genusIndex(): Map<string, ArtSpec> {
  if (genera) return genera;
  genera = new Map();
  for (const plant of REFERENCE_PLANTS) {
    const spec = REFERENCE_ART[plant.id];
    if (!spec) continue;
    for (const name of [plant.scientific_name, ...plant.synonyms]) {
      const genus = referenceKey(name).split(' ')[0];
      if (genus && !genera.has(genus)) genera.set(genus, spec);
    }
  }
  for (const [genus, spec] of Object.entries(GENERA)) genera.set(genus, spec);
  return genera;
}

/** KEYWORDS in the form texts are compared in. */
function keywordList() {
  keywords ??= KEYWORDS.map(([words, spec]) => [singularKey(words), spec] as const);
  return keywords;
}

/**
 * The drawing for a plant's species (free text, French or scientific name):
 * the base's entry for it, else the drawing of its genus (« Philodendron
 * birkin »), else a word naming a kind of plant (« mon cactus », « basilic du
 * jardin »). The sprout when nothing matches.
 */
export function artSpecForSpecies(species: string | null | undefined): ArtSpec {
  const key = referenceKey(species ?? '');
  if (!key) return SPROUT;
  const words = key.split(' ');
  while (words.length > 1 && DETERMINERS.has(words[0])) words.shift();

  const name = words.join(' ');
  const reference = findReference(key) ?? (name !== key ? findReference(name) : null);
  const known = reference && REFERENCE_ART[reference.id];
  if (known) return known;

  const index = genusIndex();
  for (const word of words) {
    const spec = index.get(word) ?? index.get(singular(word));
    if (spec) return spec;
  }

  const text = ` ${singularKey(name)} `;
  return keywordList().find(([keyword]) => text.includes(` ${keyword} `))?.[1] ?? SPROUT;
}

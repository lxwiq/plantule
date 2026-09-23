import type { Foliage, PlantKind } from '../types';

import { sprout } from './sprout';
import { monstera } from './monstera';
import { pothos } from './pothos';
import { elephantEar } from './elephant-ear';
import { snake } from './snake';
import { zz } from './zz';
import { ficus } from './ficus';
import { palm } from './palm';
import { fern } from './fern';
import { calathea } from './calathea';
import { dracaena } from './dracaena';
import { spider } from './spider';
import { colorful } from './colorful';
import { pilea } from './pilea';
import { cactus } from './cactus';
import { succulent } from './succulent';
import { aloe } from './aloe';
import { stringOfPearls } from './string-of-pearls';
import { orchid } from './orchid';
import { peaceLily } from './peace-lily';
import { flowers } from './flowers';
import { bromeliad } from './bromeliad';
import { herbs } from './herbs';
import { lavender } from './lavender';
import { tree } from './tree';
import { veggie } from './veggie';

/** Every plant family, by kind. */
export const FOLIAGE: Record<PlantKind, Foliage> = {
  sprout,
  monstera,
  pothos,
  elephant_ear: elephantEar,
  snake,
  zz,
  ficus,
  palm,
  fern,
  calathea,
  dracaena,
  spider,
  colorful,
  pilea,
  cactus,
  succulent,
  aloe,
  string_of_pearls: stringOfPearls,
  orchid,
  peace_lily: peaceLily,
  flowers,
  bromeliad,
  herbs,
  lavender,
  tree,
  veggie,
};

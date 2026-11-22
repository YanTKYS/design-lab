// デザインシステムの登録。追加するときはモジュールを作成してここに並べる。

import dads from './dads.js';
import carbon from './carbon.js';
import fluent from './fluent.js';
import govuk from './govuk.js';
import uswds from './uswds.js';
import plain from './plain.js';
import material3 from './material3.js';
import astryx from './astryx.js';
import okinawaThread from './okinawa-thread.js';
import hPrime from './h-prime.js';
import jRisograph from './j-risograph.js';

export const DESIGNS = [dads, carbon, fluent, govuk, uswds, plain, material3, astryx, okinawaThread, hPrime, jRisograph];
export const DESIGN_IDS = DESIGNS.map((d) => d.id);
export const getDesign = (id) => DESIGNS.find((d) => d.id === id) ?? DESIGNS[0];

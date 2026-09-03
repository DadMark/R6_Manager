import type { Operator } from '@engine/types';
import { attackOperators } from './operators.attack';
import { defenseOperators } from './operators.defense';

/**
 * The default operator pack — Rainbow Six Siege operators, whose names, units
 * and gadget names are Ubisoft trademarks.
 *
 * This module and `operators.generic.ts` are interchangeable: the build picks
 * exactly ONE of them via the `@operators` alias (see `vite.config.ts`), so
 * whichever pack is not selected never enters the bundle. That is the whole
 * point — a runtime ternary would ship both name sets regardless.
 */
export const operators: Operator[] = [...attackOperators, ...defenseOperators];

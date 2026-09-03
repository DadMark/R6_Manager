import type { GameContent } from '@engine/types';
import { attackOperators } from './operators.attack';
import { defenseOperators } from './operators.defense';
// Under `VITE_CONTENT_PACK=generic` the build REDIRECTS this module to
// operators.generic.ts (see vite.config.ts), so the licensed names never enter
// the bundle. A runtime ternary would bundle both name sets and defeat the
// IP-free pack entirely. The import stays relative so Node, tsx and Vitest
// resolve it natively without needing the alias.
import { operators } from './operators.licensed';
import { counterRules } from './counterRules';
import { atkStrategies, defStrategies, maps } from './maps';
import { templateBank } from './narration/pt-BR';
import { tuning } from './tuning';

/**
 * The content bundle handed to the engine on every call.
 *
 * The engine imports NOTHING from this folder — it receives this object as a
 * parameter. That inversion is what makes the operator roster (and the
 * Ubisoft-derived names in it) swappable without touching simulation logic.
 */
export const defaultContent: GameContent = {
  operators,
  counterRules,
  maps,
  strategies: { atk: atkStrategies, def: defStrategies },
  tuning,
  templates: templateBank,
};

export { attackOperators, counterRules, defenseOperators, maps, operators, templateBank, tuning };

import type { GameContent } from '@engine/types';
import { attackOperators } from './operators.attack';
import { defenseOperators } from './operators.defense';
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
  operators: [...attackOperators, ...defenseOperators],
  // Counter rules arrive in slice S3, together with the BREACH phase.
  counterRules: [],
  maps,
  strategies: { atk: atkStrategies, def: defStrategies },
  tuning,
  templates: templateBank,
};

export { attackOperators, defenseOperators, maps, templateBank, tuning };

/**
 * Regenerate the IP-free operator pack from the licensed one.
 *
 *   npx tsx scripts/gen-generic-pack.ts > src/content/operators.generic.ts
 *
 * The output is standalone by design: if the pack imported the licensed
 * operators, their names would ship in every bundle regardless of which pack
 * is selected, which is exactly what the pack exists to avoid.
 */
import type { Operator } from '../src/engine/types';
import { attackOperators } from '../src/content/operators.attack';
import { defenseOperators } from '../src/content/operators.defense';

const ATK=[["Forja","Brigada Ígnea","Carga Térmica"],["Cinza","Divisão Aurora","Lança-Pinos"],["Surto","Guarda Real","Pulso Eletromagnético"],["Radar","Vanguarda Norte","Scanner de Campo"],["Estopim","Brigada Ígnea","Munição de Ruptura"],["Malho","Guarda Real","Marreta Pesada"],["Vespa","Companhia Cinza","Drone Elétrico"],["Sabujo","Patrulha Sul","Rastro Térmico"],["Clarão","Divisão Aurora","Fachos Cegantes"],["Muralha","Guarda Real","Escudo de Choque"],["Serra","Patrulha Sul","Chave Mestra"],["Estrondo","Companhia Cinza","Carga Fragmentada"]];
const DEF=[["Corrente","Divisão Aurora","Fiação Viva"],["Garra","Vanguarda Norte","Garra Elétrica"],["Silêncio","Guarda Real","Bloqueador de Sinal"],["Bruma","Patrulha Leste","Manto de Ruído"],["Presilha","Companhia Cinza","Laço de Entrada"],["Geada","Patrulha Sul","Cepo Congelante"],["Praga","Patrulha Leste","Espinhos Tóxicos"],["Vigília","Esquadrão Maré","Câmera Oculta"],["Torreão","Guarda Sul","Torre Blindada"],["Ferrolho","Divisão Aurora","Interceptador"],["Enfermeiro","Vanguarda Norte","Injetor de Campo"],["Bastião","Vanguarda Norte","Placas de Reforço"]];

const emit = (src: readonly Operator[], skins: string[][], side: string): string =>
  src.map((o, i) => {
  const [name,unit,gadget]=skins[i]!;
  return `  {
    id: '${side.toLowerCase()}_gen_${i}',
    name: '${name}',
    unit: '${unit}',
    side: '${side}',
    speed: ${o.speed},
    roles: [${o.roles.map((r:string)=>`'${r}'`).join(', ')}],
    stats: { aim: ${o.stats.aim}, utility: ${o.stats.utility}, entry: ${o.stats.entry}, clutch: ${o.stats.clutch} },
    gadget: {
      name: '${gadget}',
      tags: [${o.gadget.tags.map((t:string)=>`'${t}'`).join(', ')}],
      counters: [${o.gadget.counters.map((t:string)=>`'${t}'`).join(', ')}],
      power: ${o.gadget.power},
    },
    rarity: '${o.rarity}',
    draftWeight: ${o.draftWeight},
  },`;
}).join('\n');

console.log(`import type { Operator } from '@engine/types';

/**
 * IP-FREE OPERATOR PACK.
 *
 * Rainbow Six Siege operator names, units and gadget names are Ubisoft
 * trademarks. This pack carries identical stats, tags, gadget behaviour and
 * draft weights under original names, so balance work holds across both packs
 * and the game plays exactly the same.
 *
 * Selected with \`VITE_CONTENT_PACK=generic\`.
 *
 * This file is deliberately STANDALONE rather than deriving from
 * \`operators.attack.ts\`. Deriving would import the licensed names, which then
 * ship in the bundle even though nothing renders them — defeating the entire
 * purpose of having the pack.
 *
 * Regenerate with: npx tsx scripts/gen-generic-pack.ts
 */
export const genericAttackOperators: Operator[] = [
${emit(attackOperators,ATK,'ATK')}
];

export const genericDefenseOperators: Operator[] = [
${emit(defenseOperators,DEF,'DEF')}
];

export const genericOperators: Operator[] = [
  ...genericAttackOperators,
  ...genericDefenseOperators,
];
`);

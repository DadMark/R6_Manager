import type { GameMap, StrategyDef } from '@engine/types';

export const maps: GameMap[] = [
  {
    id: 'chale',
    name: 'Chalé',
    sites: [
      { id: 'porao', name: 'Porão', defaultPrior: 0.35 },
      { id: 'biblioteca', name: 'Biblioteca', defaultPrior: 0.35 },
      { id: 'escritorio', name: 'Escritório', defaultPrior: 0.3 },
    ],
  },
  {
    id: 'banco',
    name: 'Banco',
    sites: [
      { id: 'cofre', name: 'Cofre', defaultPrior: 0.4 },
      { id: 'arquivo', name: 'Arquivo', defaultPrior: 0.3 },
      { id: 'estacionamento', name: 'Estacionamento', defaultPrior: 0.3 },
    ],
  },
];

export const atkStrategies: StrategyDef[] = [
  {
    id: 'RUSH',
    name: 'Rush',
    blurb: 'Entrada rápida, sem drone. Ganha tempo e troca bem — mas cai nas armadilhas.',
  },
  {
    id: 'DEFAULT',
    name: 'Default lento',
    blurb: 'Drona tudo, limpa utility e entra com informação. Custa relógio.',
  },
  {
    id: 'SPLIT',
    name: 'Split',
    blurb: 'Divide o time em dois ângulos. Confunde a defesa, mas expõe quem entra sozinho.',
  },
];

export const defStrategies: StrategyDef[] = [
  {
    id: 'AGGRESSIVE_ROAM',
    name: 'Roam agressivo',
    blurb: 'Sai para pegar a entrada antes do site. Perigoso contra default lento.',
  },
  {
    id: 'ANCHOR_HOLD',
    name: 'Ancorar no site',
    blurb: 'Todo mundo no site, ângulos montados. Come rush no café da manhã.',
  },
  {
    id: 'SPREAD',
    name: 'Espalhar',
    blurb: 'Cobertura ampla dos acessos. Sólido no geral, sem vencer nada por muito.',
  },
];

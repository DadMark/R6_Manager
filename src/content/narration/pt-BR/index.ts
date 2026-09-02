import type { TemplateBank } from '@engine/types';

/**
 * pt-BR commentary bank.
 *
 * Slots: {op} {op2} {op3} {gadget} {unit} {site} {atkTeam} {defTeam} {winner} {t} {n}
 *
 * Rules of thumb for writing these:
 *  - Minimum 3 variants per key (6 after the S8 balance pass). Repetition is
 *    what makes narration stop feeling alive.
 *  - Upsets must SOUND like upsets. A low-probability roll narrated as routine
 *    is what reads as broken — more than the probability itself ever does.
 *  - Keep lines under 160 characters; the feed is read at speed.
 */
export const templateBank: TemplateBank = {
  // ── Round start ───────────────────────────────────────────────────────────
  'round_start.site_match': [
    '{defTeam} montou no {site} — e é exatamente lá que o ataque vai bater. Vai ser no muque.',
    'Leitura certa da defesa: {site} reforçado, {atkTeam} chegando de frente.',
    'Sem surpresa aqui. {site} é o alvo, e {defTeam} está esperando.',
  ],
  'round_start.site_mismatch': [
    '{defTeam} armou em outro canto e {atkTeam} bateu no {site}. Rotação obrigatória!',
    'Erro de leitura da defesa — o ataque achou o {site} desguarnecido.',
    '{atkTeam} pegou {defTeam} trocando de pé: o {site} está aberto.',
  ],

  // ── Prep ──────────────────────────────────────────────────────────────────
  'drone.clear': [
    '{op} manda o drone e mapeia o site inteiro. Informação limpa pro ataque.',
    'Drone de {op} passa despercebido — {atkTeam} sabe onde todo mundo está.',
    '{op} desenha a defesa com o drone antes de qualquer tiro.',
  ],
  'drone.denied': [
    'O drone de {op} morre no perturbador. {atkTeam} vai entrar no escuro.',
    'Sinal cortado — {op} não consegue informação nenhuma.',
    '{op} perde o drone antes de ver o site. Entrada às cegas.',
  ],
  'setup.note': ['{op} ajusta o {gadget} e fecha o ângulo.', '{op} monta o {gadget} no acesso principal.', '{op} reforça a posição com o {gadget}.'],

  // ── Approach ──────────────────────────────────────────────────────────────
  'trap.lethal': [
    '{op2} não viu o {gadget} do {op} e foi embora na hora. Um a menos.',
    'Armadilha do {op} pega {op2} em cheio — morte instantânea.',
    '{gadget} do {op} cobra o pedágio: {op2} nem chegou a atirar.',
  ],
  'trap.chip': [
    '{op2} pisa no {gadget} do {op}, mas sobrevive. Vida baixa.',
    'O {gadget} do {op} machuca {op2} sem matar — {op2} segue, mas pendurado.',
    '{op2} escapa da armadilha do {op} por pouco. Sangrando.',
  ],
  'roam.duel': ['{op} intercepta {op2} fora do site e ganha o duelo.', 'Roam de {op} funciona: {op2} cai antes de chegar perto.', '{op} pega {op2} de surpresa no corredor.'],

  // ── Breach — the signature beat ───────────────────────────────────────────
  'breach.hard_vs_anti.success': [
    '{op3} joga a EMP na parede — as baterias do {op2} fritam. A carga do {op} queima o reforço!',
    '{op3} limpa a negação do {op2} e o {op} abre o muro. Site escancarado.',
    'Combinação perfeita: {op3} anula o {op2}, {op} coloca a carga. Muro aberto!',
  ],
  'breach.hard_vs_anti.partial': [
    '{op} consegue abrir só um pedaço do muro. Ângulo estreito, mas é alguma coisa.',
    'A carga do {op} pega parcial — dá pra ver, mas não dá pra entrar.',
    'Meia abertura pro {op}. Custou tempo e não resolveu.',
  ],
  'breach.hard_vs_anti.fail': [
    '{op2} trickou a carga. {op} caiu na parede e o muro segue de pé.',
    'Negação do {op2} funciona: a carga do {op} nem chega a queimar.',
    'O muro aguenta. {op2} defendeu o reforço e o ataque perdeu o relógio.',
  ],
  'breach.no_hard_breach': [
    '{atkTeam} não trouxe abertura pesada — o muro reforçado vai segurar o round todo.',
    'Sem hard breach, o ataque vai ter que entrar pelos acessos óbvios.',
    'O reforço fica de pé: ninguém no ataque consegue abrir muro.',
  ],

  // ── Execute ───────────────────────────────────────────────────────────────
  'duel.atk': [
    '{op} abre o espaço e derruba {op2}.',
    '{op} ({unit}) ganha o duelo contra {op2}.',
    'Troca rápida: {op} leva a melhor sobre {op2}.',
    '{op} entra com tudo e {op2} não teve tempo de reagir.',
  ],
  'duel.def': [
    '{op} segura o ângulo e para {op2} na porta.',
    'Defesa firme: {op} elimina {op2} na entrada.',
    '{op} ({unit}) lê a entrada e apaga {op2}.',
    '{op2} tentou forçar e encontrou o {op} esperando.',
  ],
  // In a trade, {op} wins the duel over {op2} and is immediately traded by
  // {op3}. Keep that order — {op} and {op2} die, {op3} survives.
  'duel.traded': [
    '{op} derruba {op2}, mas {op3} troca na sequência. Fica um pra cada lado.',
    'Troca imediata! {op} apaga {op2} e {op3} responde na hora.',
    '{op} não aproveita a vantagem: leva {op2} junto e cai pro {op3}.',
    '{op} vence o duelo contra {op2} e é trocado na hora pelo {op3}.',
  ],

  // ── Plant / post-plant ────────────────────────────────────────────────────
  'plant.clean': ['{op} planta tranquilo no {site}.', 'Plant limpo de {op}. Agora é segurar.', '{op} coloca o defusor sem pressão nenhuma.'],
  'plant.contested': [
    '{op} planta sob pressão, com tiro passando de raspão!',
    'Plant contestado — {op} arrisca tudo e consegue.',
    '{op} coloca o defusor no sufoco.',
  ],
  'defuse.success': ['{op} desarma no último segundo!', '{op} chega no defusor e desarma. Round da defesa!', 'Retake perfeito: {op} desarma.'],
  'defuse.fail': ['{op} tenta desarmar e não dá tempo.', '{op} morre em cima do defusor.', 'O retake de {op} para a centímetros do defusor.'],
  revive: ['{op} levanta {op2} e recoloca a defesa de pé.', '{op} usa o {gadget} e traz {op2} de volta.', 'Reanimação de {op}: {op2} volta ao round.'],

  // ── Clutch ────────────────────────────────────────────────────────────────
  'clutch.start': [
    '{op} ficou sozinho contra {n}. Silêncio na arena.',
    'É {op} contra {n}. Tudo nas mãos dele agora.',
    'Sobrou {op}. {n} pela frente — e nada a perder.',
  ],
  'clutch.step_won': ['{op} derruba {op2}! Ainda está vivo!', 'Mais um! {op} apaga {op2} e continua.', '{op} não erra: {op2} se vai.'],
  'clutch.step_lost': ['{op2} finalmente para o {op}. Fim da linha.', '{op} cai tentando o impossível contra {op2}.', 'A conta chegou: {op2} elimina {op}.'],

  // ── Round end ─────────────────────────────────────────────────────────────
  'round_end.elimination': [
    'Round de {winner} — eliminação total. {op} foi o destaque.',
    '{winner} limpa o round. Melhor em quadra: {op}.',
    'Wipe completo. {winner} leva, com {op} brilhando.',
  ],
  'round_end.time': [
    'O tempo acabou sem plant. Round de {winner}.',
    'Relógio zerou — {winner} segura o round no tempo. Destaque pro {op}.',
    'Sem plant, sem round. {winner} vence no relógio.',
  ],
  'round_end.defused': ['Defusor desarmado! Round de {winner}, com {op} decisivo.', '{winner} desarma e leva o round. {op} foi gigante.', 'Retake completo: {winner} vence. Destaque: {op}.'],
  'round_end.detonation': ['A bomba explode. Round de {winner}, com {op} no comando.', '{winner} segura o post-plant até o fim. {op} decisivo.', 'Detonação confirmada — round de {winner}.'],
};

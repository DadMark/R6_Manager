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

  // ── Counter-play: PREP ────────────────────────────────────────────────────
  'prep.intel_vs_denial.success': [
    '{op} vence a guerra de informação — o site está desenhado pro ataque.',
    'A leitura de {op} passa por cima da negação. Informação limpa.',
    '{op} tira raio-x do site apesar do {op2}.',
  ],
  'prep.intel_vs_denial.partial': [
    '{op} arranca informação parcial. Dá pra trabalhar, não dá pra confiar.',
    'Meia leitura pro {op} — sabe onde tem gente, não sabe quem.',
    '{op} consegue pouco: o {op2} cortou metade do sinal.',
  ],
  'prep.intel_vs_denial.fail': [
    '{op2} apaga a informação do {op}. O ataque entra no escuro.',
    'Negação total: {op2} deixa o {op} sem nada.',
    'A informação morre no perturbador do {op2}.',
    '{op} não consegue leitura nenhuma. Entrada no escuro.',
    'A tentativa de {op} não rende informação útil.',
  ],
  'prep.no_intel': [
    '{atkTeam} não trouxe informação nenhuma. Vai ser no feeling.',
    'Nenhum drone útil no ataque — entrada às cegas.',
    'Sem intel na composição, {atkTeam} vai descobrir o site na porrada.',
  ],

  // ── Counter-play: APPROACH ────────────────────────────────────────────────
  'approach.anti_gadget_vs_trap.success': [
    '{op} limpa as armadilhas do caminho com o {gadget}. Estrada livre.',
    '{op} queima os gadgets do {op2} antes de qualquer passo.',
    'Varredura perfeita do {op} — nada de armadilha no acesso.',
  ],
  'approach.anti_gadget_vs_trap.partial': [
    '{op} tira parte das armadilhas. Ainda tem coisa viva no caminho.',
    'Limpeza incompleta do {op}.',
    '{op} acha uma, deixa outra passar.',
  ],
  'approach.anti_gadget_vs_trap.fail': [
    '{op} não acha nada. As armadilhas do {op2} seguem armadas.',
    '{op2} escondeu bem: o {op} passou reto.',
    'A varredura do {op} falha — vai entrar por cima dos gadgets.',
    '{op} não limpa nada no caminho.',
  ],
  'approach.no_anti_gadget': [
    'Sem anti-gadget, {atkTeam} vai ter que engolir as armadilhas.',
    '{atkTeam} não trouxe quem limpasse utility. Vai doer.',
    'Nenhuma resposta pros gadgets da defesa.',
  ],

  // ── Counter-play: EXECUTE ─────────────────────────────────────────────────
  'execute.flash_vs_anchor.success': [
    '{op} cega o site inteiro — {op2} não vê nada quando o ataque entra.',
    'Flash perfeita do {op}. A âncora {op2} fica sem ângulo.',
    '{op} joga a luz e o ataque entra por cima do {op2}.',
  ],
  'execute.flash_vs_anchor.partial': [
    'A flash do {op} pega de raspão. {op2} se vira.',
    '{op} cega metade do site.',
    'Luz mal jogada do {op} — ajudou pouco.',
  ],
  'execute.flash_vs_anchor.fail': [
    '{op2} lê a flash do {op} e vira de costas. Sem efeito.',
    'A luz do {op} morre sem pegar ninguém.',
    '{op} desperdiça a flash.',
    'A flash do {op} sai torta e não cega ninguém.',
  ],
  'execute.shield_entry.success': [
    '{op} entra de escudo e segura a linha. O site abre atrás dele.',
    'O escudo do {op} aguenta tudo — espaço conquistado.',
    '{op} caminha pro site atrás do escudo, sem pressa.',
  ],
  'execute.shield_entry.partial': [
    '{op} avança de escudo, mas trava no meio do caminho.',
    'O escudo do {op} segura só até a porta.',
    '{op} ganha pouco espaço.',
  ],
  'execute.shield_entry.fail': [
    '{op} fica preso atrás do escudo e não sai do lugar.',
    'A entrada de escudo do {op} morre no acesso.',
    '{op2} contorna o escudo do {op}.',
  ],

  // ── Counter-play: POST-PLANT ──────────────────────────────────────────────
  'postplant.heal_revive.success': [
    '{op} levanta o companheiro caído — a defesa volta pro retake com um a mais.',
    'Reanimação de {op}! A defesa ganha sobrevida.',
    '{op} usa o {gadget} e recoloca a defesa de pé.',
  ],
  'postplant.heal_revive.partial': [
    '{op} estabiliza o companheiro, mas custou tempo demais.',
    'Reanimação parcial de {op}.',
    '{op} salva alguém, tarde.',
  ],
  'postplant.heal_revive.fail': [
    '{op} tenta reanimar e é pego no meio do processo.',
    'A reanimação do {op} não sai.',
    '{op} perde tempo tentando levantar alguém.',
  ],

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
  // A contest can resolve with either side empty, so each outcome needs
  // variants that name only {op}. Otherwise an uncontested breach — the most
  // common case — would render nothing, and this is the signature beat.
  'breach.hard_vs_anti.success': [
    '{op3} joga a EMP na parede — as baterias do {op2} fritam. A carga do {op} queima o reforço!',
    '{op3} limpa a negação do {op2} e o {op} abre o muro. Site escancarado.',
    'Combinação perfeita: {op3} anula o {op2}, {op} coloca a carga. Muro aberto!',
    '{op} passa por cima da negação do {op2} e abre o muro.',
    '{op} coloca a carga e o reforço vai ao chão. Site aberto!',
    'Muro aberto por {op} — o ataque ganhou o ângulo que queria.',
    'A carga do {op} queima limpo. Sem oposição, sem drama.',
  ],
  'breach.hard_vs_anti.partial': [
    '{op} consegue abrir só um pedaço do muro. Ângulo estreito, mas é alguma coisa.',
    'A carga do {op} pega parcial — dá pra ver, mas não dá pra entrar.',
    'Meia abertura pro {op}. Custou tempo e não resolveu.',
    '{op} rasga metade do reforço. Serve de olho mágico, não de porta.',
  ],
  'breach.hard_vs_anti.fail': [
    '{op2} trickou a carga. {op} caiu na parede e o muro segue de pé.',
    'Negação do {op2} funciona: a carga do {op} nem chega a queimar.',
    'O muro aguenta. {op2} defendeu o reforço e o ataque perdeu o relógio.',
    'A carga do {op} falha. O muro continua inteiro e o relógio correndo.',
    '{op} perde a carga na parede sem abrir nada.',
    'Não abriu. {op} gastou tempo e utility pra nada.',
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

/*
 * Código de UI para o monstro no painel (media/main.js)
 * Objetivo: deixar o arquivo mais legível e resistente a erros.
 */
(function () {
  'use strict';

  // Query DOM elementos principais
  const monster = document.querySelector('#monster');
  const healthIndicator = document.querySelector('.health-indicator');
  const typedCountEl = document.getElementById('typed-count');
  const defeatedCountEl = document.getElementById('defeated-count');

  // XP elements will be created dynamically if missing
  let xpContainer = document.querySelector('.xp-container');
  let xpFill = null;
  let xpMeta = null;

  // Versão da API que permite persistir o estado do webview entre reloads da view
  const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;

  // Estado local (persistido via vscode.setState quando possível)
  const initialState = (vscode && vscode.getState && vscode.getState()) || { typedCount: 0, defeatedCount: 0, xp: 0, level: 1, username: '' };
  let state = {
    typedCount: Number(initialState.typedCount) || 0,
    defeatedCount: Number(initialState.defeatedCount) || 0,
    xp: Number(initialState.xp) || 0,
    level: Number(initialState.level) || 1,
    username: initialState.username || ''
  };

  function ensureXpElements() {
    if (xpContainer) {
      return;
    }
    xpContainer = document.createElement('div');
    xpContainer.className = 'xp-container';

    xpMeta = document.createElement('div');
    xpMeta.className = 'xp-meta';
    xpMeta.textContent = state.username ? `${state.username} — Lv ${state.level}` : `Lv ${state.level}`;

    const bar = document.createElement('div');
    bar.className = 'xp-bar';
    xpFill = document.createElement('div');
    xpFill.className = 'xp-fill';
    bar.appendChild(xpFill);

    xpContainer.appendChild(bar);
    xpContainer.appendChild(xpMeta);

    document.body.appendChild(xpContainer);
  }

  function renderScores() {
    if (typedCountEl) {
      typedCountEl.textContent = String(state.typedCount);
    }
    if (defeatedCountEl) {
      defeatedCountEl.textContent = String(state.defeatedCount);
    }
  }

  function renderXp() {
    ensureXpElements();
    const xpToLevel = Math.max(100 * state.level, 100);
    const percent = Math.max(0, Math.min(100, (state.xp / xpToLevel) * 100));
    if (xpFill) {
      xpFill.style.width = percent + '%';
    }
    if (xpMeta) {
      xpMeta.textContent = (state.username ? `${state.username} — ` : '') + `Lv ${state.level} (${state.xp}/${xpToLevel})`;
    }
  }

  function persistState() {
    if (!vscode || !vscode.setState) {
      return;
    }
    try {
      vscode.setState(state);
    } catch (e) {
      console.warn('Falha ao persistir estado do webview', e);
    }
  }

  // render inicial
  renderScores();
  renderXp();

  /**
   * Contrato mínimo:
   * - Esperamos mensagens via postMessage com formato { command: string, value?: any }
   * - Comandos suportados: updateMonsterStyle, changeMonster, updateMonsterLife, setUser, updateXp
   */
  window.addEventListener('message', (event) => {
    const message = event && event.data;
    if (!message || typeof message.command !== 'string') {
      return;
    }

    switch (message.command) {
      case 'updateMonsterStyle':
        handleUpdateMonsterStyle();
        // conta que houve uma digitação/ataque
        state.typedCount = (state.typedCount || 0) + 1;
        persistState();
        renderScores();
        // mostra um dano simples por padrão (ex: -1)
        showDamage(message.value);
        break;
      case 'changeMonster':
        // monster trocado -> consideramos um monstro derrotado
        state.defeatedCount = (state.defeatedCount || 0) + 1;
        persistState();
        renderScores();
        changeMonster(message.value);
        break;
      case 'updateMonsterLife':
        updateMonsterLife(message.value);
        break;
      case 'setUser':
        if (message.value && typeof message.value === 'string') {
          state.username = message.value;
          persistState();
          renderXp();
        }
        break;
      case 'updateXp':
        // value expected: { xp: number, level?: number }
        console.log("Update");
        console.log(message.value);

        if (message.value && typeof message.value === 'object') {
          state.xp = Number(message.value.xp) || state.xp;
          console.log(message.value);
          if (message.value.level) {
            state.level = Number(message.value.level) || state.level;
          }
          persistState();
          renderXp();
        }
        break;
      default:
        // comando desconhecido — silencioso
        break;
    }
  });

  /**
   * Aplica um efeito visual de 'dano' no monstro: tremor curto e alteração temporária de filtro.
   */
  function handleUpdateMonsterStyle() {
    if (!monster) {
      return;
    }

    // Efeito inicial de dano
    monster.style.animation = 'shake 0.3s ease-in-out';
    monster.style.filter = 'grayscale(100%) brightness(40%) sepia(100%) hue-rotate(-50deg) saturate(600%) contrast(0.8)';

    // Depois do efeito de 'impacto', restauramos o estado e colocamos animação de espera
    setTimeout(() => {
      monster.style.animation = 'pulse 2s infinite alternate';
      void monster.offsetWidth;
      monster.style.filter = 'none';
    }, 600);
  }

  /**
   * Troca a imagem do monstro. `src` deve ser uma string com uma URL válida.
   * @param {string} src
   */
  function changeMonster(src) {
    if (!monster) {
      console.error('changeMonster: elemento #monster não encontrado');
      return;
    }
    if (typeof src !== 'string' || src.trim() === '') {
      console.warn('changeMonster: src inválido', src);
      return;
    }

    monster.src = src;
  }

  /**
   * Atualiza a barra de vida do monstro.
   * `lifePoints` pode ser número ou string numérica. O valor é clamped entre 0 e maxLife.
   * Se o elemento `.health-indicator` não existir, a função sai silenciosamente.
   * @param {number|string} lifePoints
   */
  function updateMonsterLife(lifePoints) {
    if (!healthIndicator) {
      console.warn('updateMonsterLife: .health-indicator não encontrado');
      return;
    }

    const maxLife = parseInt(healthIndicator.dataset.maxLife, 10) || 30;
    const life = Number(lifePoints) || 0;

    const percent = clamp((life / maxLife) * 100, 0, 100);
    healthIndicator.style.width = percent + '%';
  }

  /**
   * Cria um elemento flutuante que mostra dano (texto) sobre/ao lado do monstro e anima-o.
   * A animação é controlada por estilos inline sem depender de classes externas.
   * @param {string} text
   */
  function showDamage(text) {
    if (!monster) {
      return;
    }

    const rect = monster.getBoundingClientRect();

    const damage = document.createElement('div');
    damage.className = text !== "-1" ? "critical-hit" : 'damage-float';
    damage.textContent = String(text);

    Object.assign(damage.style, {
      position: 'fixed',
      left: `${getRandomInt(1, 15) - getRandomInt(1, 15) + rect.left + rect.width / 2}px`,
      top: `${rect.top + rect.height * 0.1}px`,
      transform: 'translate(-50%, 0) translateY(0)',
      opacity: '1',
      transition: 'transform 900ms ease-out, opacity 900ms ease-out',
      pointerEvents: 'none',
      zIndex: 9999
    });

    document.body.appendChild(damage);

    void damage.offsetWidth;

    requestAnimationFrame(() => {
      damage.style.transform = 'translate(-50%, 0) translateY(-40px)';
      damage.style.opacity = '0';
    });

    setTimeout(() => damage.remove(), 1000);
  }

  /* ===== Helpers ===== */

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getRandomInt(min, max) {
    const a = Math.ceil(min);
    const b = Math.floor(max);
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

})();

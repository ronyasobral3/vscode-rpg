/*
 * Código de UI para o monstro no painel (media/main.js)
 * Objetivo: deixar o arquivo mais legível e resistente a erros.
 */
(function () {
  'use strict';

  // Nós lemos os elementos DOM uma vez e validamos a presença deles.
  const monster = document.querySelector('#monster');
  const healthIndicator = document.querySelector('.health-indicator');
  const typedCountEl = document.getElementById('typed-count');
  const defeatedCountEl = document.getElementById('defeated-count');

  // Versão da API que permite persistir o estado do webview entre reloads da view
  const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;

  // Estado local (persistido via vscode.setState quando possível)
  const initialState = (vscode && vscode.getState && vscode.getState()) || { typedCount: 0, defeatedCount: 0 };
  let state = {
    typedCount: Number(initialState.typedCount) || 0,
    defeatedCount: Number(initialState.defeatedCount) || 0
  };

  function renderScores() {
    if (typedCountEl) {
      typedCountEl.textContent = String(state.typedCount);
    }
    if (defeatedCountEl) {
      defeatedCountEl.textContent = String(state.defeatedCount);
    }
  }

  function persistState() {
    if (!vscode || !vscode.setState) {
      return;
    }
    try {
      vscode.setState(state);
    } catch (e) {
      // não crítico
      console.warn('Falha ao persistir estado do webview', e);
    }
  }

  // render inicial
  renderScores();

  /**
   * Contrato mínimo:
   * - Esperamos mensagens via postMessage com formato { command: string, value?: any }
   * - Comandos suportados: updateMonsterStyle, changeMonster, updateMonsterLife
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
      // troca para uma animação de 'idle' (ex: pulse)
      monster.style.animation = 'pulse 2s infinite alternate';
      // força reflow caso precisemos reiniciar a animação
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
      // Não obrigamos a presença do indicador de vida — apenas logamos em dev
      console.warn('updateMonsterLife: .health-indicator não encontrado');
      return;
    }

    const maxLife = parseInt(healthIndicator.dataset.maxLife, 10) || 30; // pode ser sobrescrito via data-max-life
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

    // estilo base para animação: fixo na tela, começando na posição do monstro
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

    // Força reflow antes de aplicar o estado final (para disparar a transição)
    void damage.offsetWidth;

    // Estado final: sobe e desaparece
    requestAnimationFrame(() => {
      damage.style.transform = 'translate(-50%, 0) translateY(-40px)';
      damage.style.opacity = '0';
    });

    // Remove do DOM após a animação
    setTimeout(() => damage.remove(), 1000);
  }

  /* ===== Helpers ===== */

  /** Clamp simples */
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Retorna inteiro aleatório entre min e max (inclusivo)
   * @param {number} min
   * @param {number} max
   */
  function getRandomInt(min, max) {
    const a = Math.ceil(min);
    const b = Math.floor(max);
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

})();

(function () {
  const monster = document.querySelector('#monster');
  const healthIndicator = document.querySelector('.health-indicator');

  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
      case 'updateMonsterStyle':
        updateMonster();
        showDamage("-1");
        break;
      case 'changeMonster':
        changeMoster(message.value);
        break;
      case 'updateMonsterLife':
        updateMonsterLife(message.value);
        break;
    }
  });

  function updateMonster() {
    if (monster) {
      // Ativa o efeito de balancear e mudar a cor
      monster.style.animation = 'shake 0.3s ease-in-out';
      monster.style.filter = 'grayscale(100%) brightness(40%) sepia(100%) hue-rotate(-50deg) saturate(600%) contrast(0.8)';

      setTimeout(() => {
        monster.style.animation = 'pulse 2s infinite alternate';
        monster.offsetWidth;
        monster.style.filter = 'none';
      }, 600); // remove o efeito de dano apos 600 milesegundos

    }
  }


  function changeMoster(src) {
    if (monster) {
      monster.src = src;
    } else {
      console.error('Elemento de imagem não encontrado');
    }
  }

  function updateMonsterLife(lifePoints) {
    let maxLife = 30;
    let percentLif = (lifePoints / maxLife) * 100;

    healthIndicator.style.width = percentLif + '%';
  }

  function showDamage(text) {
    if (!monster) { return; }

    const damage = document.createElement("div");
    damage.className = "damage-float";
    damage.textContent = text;

    // Posiciona próximo ao monstro
    const rect = monster.getBoundingClientRect();

    damage.style.left = `${getRandomInt(0, 110) + rect.width / 2}px`;
    damage.style.top = `${rect.top}px`;
    damage.style.position = "fixed";

    document.body.appendChild(damage);

    setTimeout(() => {
      damage.remove();
    }, 1000); // Remove o dano após a animação
  }

  function getRandomInt(min, max) {
    var min = Math.ceil(min);
    var max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

})();

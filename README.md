# Tetris 3D (Computação Gráfica)

Versão tridimensional do Tetris, feita em **Three.js**, com tabuleiro 3D, peças tetrominó clássicas e estética arcade.

O fluxo começa no ecrã inicial, passa pela **escolha de modo** (Normal ou Sprint contra-relógio) e entra no jogo com câmara orbitável, botões 3D, níveis, ghost piece, fila das **próximas 3 peças** e **rankings locais**.

## Como jogar

1. Abrir `index.html` (ou servir a pasta `Tetris3D_CG` com um servidor local).
2. Clicar em **Start** → escolher modo em `mode-select.html`.
3. No jogo: **Enter** / botão Start 3D para começar; **Esc** pausa; **R** reinicia.

## Funcionalidades

- Tabuleiro compacto **6×12×6** e 7 tetrominós (I, O, T, S, Z, J, L)
- Modo **Normal** e **Sprint** (1 / 2 / 5 min)
- Níveis (sobe a cada 10 linhas) com queda mais rápida
- Ghost piece, HUD de pontuação/nível/tempo e preview das próximas 3 peças
- Rankings por modo em `localStorage`, com destaque de novo recorde
- UI 3D (Start / Pausa / Restart), presets de câmara e áudio

## Stack

- Three.js (r128) + OrbitControls
- Módulos JS (`game.js`, `ui3d.js`, `rankings.js`, …) + `style.css`

# Tetris3D_CG

## Etapa 1 (Concluida)

- Setup base do motor Three.js com estrutura modular (`scene`, `camera`, `lights`, `board`, `textures`, `pieces`, `controls`, `main`).
- Geometria do tabuleiro 3D concluida com `BoxGeometry`/`EdgesGeometry` e volume de jogo 10x20x10.
- Sete pecas tetromino (I, O, T, S, Z, J, L) implementadas com composicao de cubos `BoxGeometry`.
- UV mapping funcional atraves de texturas procedurais (`CanvasTexture`) para pecas, piso e paredes do ambiente.
- Camara em perspetiva implementada com navegacao por `OrbitControls`.
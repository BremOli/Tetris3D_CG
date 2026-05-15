// Rankings locais (localStorage) — partilhado entre index.html e mode-select.html
(function () {
  const STORAGE_KEY = "tetris3d_rankings_v1";

  const BUCKETS = [
    { id: "normal", label: "Normal" },
    { id: "sprint_60", label: "Sprint 1 min" },
    { id: "sprint_120", label: "Sprint 2 min" },
    { id: "sprint_300", label: "Sprint 5 min" },
  ];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function save(rankings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rankings));
    } catch (e) {
      /* ignore */
    }
  }

  function formatWhen(ts) {
    const d = new Date(Number(ts) || Date.now());
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function rowsHtml(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return '<p class="game-modal__placeholder ranking-empty">Ainda não há pontuações neste modo.</p>';
    }
    return rows
      .map((row, idx) => {
        const pos = idx + 1;
        const score = Number(row.score) || 0;
        return `<div class="ranking-row"><span class="ranking-row__pos">#${pos}</span><span class="ranking-row__score">${score}</span><span class="ranking-row__date">${formatWhen(
          row.at
        )}</span></div>`;
      })
      .join("");
  }

  /** Preenche um elemento com todas as secções de ranking. */
  function renderFull(container) {
    if (!container) return;
    const rankings = load();
    container.innerHTML = BUCKETS.map(
      (b) => `
      <section class="ranking-section">
        <h3 class="game-modal__h3">${b.label}</h3>
        <div class="ranking-list">${rowsHtml(rankings[b.id])}</div>
      </section>
    `
    ).join("");
  }

  window.TetrisRankings = {
    STORAGE_KEY,
    BUCKETS,
    load,
    save,
    renderFull,
  };
})();

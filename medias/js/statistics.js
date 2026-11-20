/* =========================================================
   Vidéothèque médiatique — statistiques et graphiques
   ========================================================= */

const Stats = {
  _charts: {},

  /* Calcule tous les indicateurs à partir des vidéos normalisées */
  compute(videos) {
    const byTheme = {}, byType = {}, bySource = {}, byYear = {}, byMonth = {}, byLang = {};
    const sources = new Set();
    const tvSources = new Set();

    videos.forEach(v => {
      sources.add(v.source);
      if (v.type_chaine === 'TV_NATIONALE') tvSources.add(v.source);

      byTheme[v.theme] = (byTheme[v.theme] || 0) + 1;
      byType[v.type_chaine] = (byType[v.type_chaine] || 0) + 1;
      bySource[v.source] = (bySource[v.source] || 0) + 1;
      byLang[v.lang] = (byLang[v.lang] || 0) + 1;

      if (v.published_date) {
        const y = String(v.published_date.getFullYear());
        const m = String(v.published_date.getMonth() + 1).padStart(2, '0');
        byYear[y] = (byYear[y] || 0) + 1;
        byMonth[y + '-' + m] = (byMonth[y + '-' + m] || 0) + 1;
      } else {
        byYear['Inconnue'] = (byYear['Inconnue'] || 0) + 1;
      }
    });

    return {
      total: videos.length,
      mediaCount: sources.size,
      tvSourcesCount: tvSources.size,
      byTheme, byType, bySource, byYear, byMonth, byLang
    };
  },

  /* Construit / reconstruit tous les graphiques du tableau de bord */
  buildCharts(videos, st) {
    const boxes = document.querySelectorAll('.chart-box');
    if (typeof Chart === 'undefined') {
      boxes.forEach(b => { b.innerHTML = '<p class="chart-empty">Graphiques indisponibles (Chart.js non chargé).</p>'; });
      return;
    }

    // Détruit les instances précédentes
    Object.keys(this._charts).forEach(k => {
      try { this._charts[k].destroy(); } catch (e) { /* ignore */ }
    });
    this._charts = {};

    Chart.defaults.font.family = "'Segoe UI', 'Noto Naskh Arabic', system-ui, sans-serif";
    Chart.defaults.color = '#334155';
    Chart.defaults.font.size = 12;

    const PALETTE = ['#1e3a8a', '#2563eb', '#60a5fa', '#0f172a', '#64748b',
                     '#93c5fd', '#334155', '#94a3b8', '#1d4ed8', '#cbd5e1'];

    const make = (id, config) => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      this._charts[id] = new Chart(canvas, config);
    };

    /* --- Répartition par thématique --- */
    const themeKeys = Object.keys(st.byTheme).sort((a, b) => st.byTheme[b] - st.byTheme[a]);
    make('chartTheme', {
      type: 'doughnut',
      data: {
        labels: themeKeys.map(themeLabel),
        datasets: [{ data: themeKeys.map(k => st.byTheme[k]), backgroundColor: PALETTE, borderColor: '#fff', borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '55%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } } }
      }
    });

    /* --- Répartition par type de média --- */
    const typeKeys = Object.keys(st.byType).sort((a, b) => st.byType[b] - st.byType[a]);
    make('chartType', {
      type: 'doughnut',
      data: {
        labels: typeKeys.map(typeLabel),
        datasets: [{ data: typeKeys.map(k => st.byType[k]), backgroundColor: PALETTE.slice(2).concat(PALETTE), borderColor: '#fff', borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '55%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } } }
      }
    });

    /* --- Médias les plus actifs (top 10) --- */
    const mediaEntries = Object.entries(st.bySource).sort((a, b) => b[1] - a[1]).slice(0, 10);
    make('chartMedia', {
      type: 'bar',
      data: {
        labels: mediaEntries.map(e => e[0]),
        datasets: [{ label: 'Vidéos publiées', data: mediaEntries.map(e => e[1]), backgroundColor: '#2563eb', borderRadius: 6 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { ticks: { autoSkip: false } } }
      }
    });

    /* --- Évolution mensuelle --- */
    const monthKeys = Object.keys(st.byMonth).sort();
    make('chartMonth', {
      type: 'line',
      data: {
        labels: monthKeys.map(formatMonthLabel),
        datasets: [{
          label: 'Publications',
          data: monthKeys.map(k => st.byMonth[k]),
          borderColor: '#1e3a8a',
          backgroundColor: 'rgba(37,99,235,.15)',
          fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: '#1e3a8a'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });

    /* --- Répartition par langue --- */
    const langKeys = Object.keys(st.byLang);
    make('chartLang', {
      type: 'pie',
      data: {
        labels: langKeys.map(langLabel),
        datasets: [{ data: langKeys.map(k => st.byLang[k]), backgroundColor: ['#1e3a8a', '#60a5fa', '#cbd5e1'], borderColor: '#fff', borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } } }
      }
    });

    /* --- Répartition par année --- */
    const yearKeys = Object.keys(st.byYear).sort();
    make('chartYear', {
      type: 'bar',
      data: {
        labels: yearKeys,
        datasets: [{ label: 'Vidéos', data: yearKeys.map(k => st.byYear[k]), backgroundColor: '#12306e', borderRadius: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }
};
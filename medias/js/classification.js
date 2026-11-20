/* =========================================================
   Vidéothèque médiatique — gestion des classifications
   ========================================================= */

const Classification = {
  KEY: 'videotheque_classifications_v1',
  base: {},        // contenu initial de json/classifications.json
  overrides: {},   // corrections utilisateur (localStorage)

  init(baseFile) {
    this.base = (baseFile && typeof baseFile === 'object') ? baseFile : {};
    try {
      const raw = localStorage.getItem(this.KEY);
      this.overrides = raw ? JSON.parse(raw) : {};
    } catch (e) {
      this.overrides = {};
    }
  },

  /* Fusion : fichier de base puis surcharges */
  get(id) {
    return Object.assign({}, this.base[id] || {}, this.overrides[id] || {});
  },

  set(id, patch) {
    this.overrides[id] = Object.assign({}, this.overrides[id] || {}, patch);
    this.persist();
  },

  persist() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.overrides));
    } catch (e) {
      console.warn('Impossible d\'enregistrer les classifications.', e);
    }
  },

  reset() {
    this.overrides = {};
    try { localStorage.removeItem(this.KEY); } catch (e) { /* ignore */ }
  },

  /* Exporte un classifications.json complet (base + surcharges + état courant) */
  exportJSON() {
    const merged = {};

    for (const id in this.base) merged[id] = Object.assign({}, this.base[id]);
    for (const id in this.overrides) merged[id] = Object.assign({}, merged[id] || {}, this.overrides[id]);

    if (window.App && App.state && App.state.videos) {
      App.state.videos.forEach(v => {
        merged[v.video_id] = {
          type_chaine: v.type_chaine,
          theme: v.theme,
          sous_theme: v.sous_theme || ''
        };
      });
    }

    const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'classifications.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },

  /* Rendu du panneau d'administration */
  renderAdmin(container, videos) {
    const types = ['TV_NATIONALE', 'PRESSE_NUMERIQUE', 'PARTISANE_PODCAST', 'NON_CLASSE'];
    const themes = ['LOGEMENT_URBANISME', 'POUVOIR_ACHAT', 'ACTION_GOUVERNEMENTALE', 'AUTRES'];

    const rows = videos.map(v => {
      const subList = SOUS_THEMES[v.theme] || [];
      const subOptions = ['', ...subList].map(s =>
        `<option value="${escapeAttr(s)}"${s === v.sous_theme ? ' selected' : ''}>${s ? escapeHtml(s) : '— Non spécifié —'}</option>`
      ).join('');

      return `
        <tr>
          <td class="adm-title" dir="auto">
            ${escapeHtml(v.title)}
            <div class="muted small">${escapeHtml(v.source)} · ${escapeHtml(v.published_raw || '')}</div>
          </td>
          <td>
            <select data-id="${escapeAttr(v.video_id)}" data-field="type_chaine" onchange="App.onClassChange(this)">
              ${types.map(t => `<option value="${t}"${t === v.type_chaine ? ' selected' : ''}>${escapeHtml(typeLabel(t))}</option>`).join('')}
            </select>
          </td>
          <td>
            <select data-id="${escapeAttr(v.video_id)}" data-field="theme" onchange="App.onClassChange(this)">
              ${themes.map(t => `<option value="${t}"${t === v.theme ? ' selected' : ''}>${escapeHtml(themeLabel(t))}</option>`).join('')}
            </select>
          </td>
          <td>
            <select data-id="${escapeAttr(v.video_id)}" data-field="sous_theme" onchange="App.onClassChange(this)">
              ${subOptions}
            </select>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <section class="page">
        <div class="page-head">
          <h2>Classification des vidéos</h2>
          <p>Corrigez manuellement le type de source, la thématique et le sous-thème. Les modifications sont conservées localement puis exportables.</p>
        </div>

        <div class="admin-note">
          Les corrections sont enregistrées dans le navigateur (<code>localStorage</code>).
          Pour les rendre permanentes, cliquez sur <strong>« Exporter classifications.json »</strong>
          puis déposez le fichier dans <code>json/</code> sur votre serveur.
          Le fichier <code>videos.json</code> n'est jamais modifié.
        </div>

        <div class="admin-toolbar">
          <button class="btn" id="admExport">⬇ Exporter classifications.json</button>
          <button class="btn btn-ghost" id="admReset">↺ Réinitialiser</button>
          <span id="admStatus" class="muted small"></span>
        </div>

        <div class="table-wrap">
          <table class="data admin">
            <thead>
              <tr>
                <th>Vidéo</th>
                <th>Type de source</th>
                <th>Thématique</th>
                <th>Sous-thème</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="4" class="empty">Aucune vidéo.</td></tr>'}</tbody>
          </table>
        </div>
      </section>`;

    const status = container.querySelector('#admStatus');
    const setStatus = msg => { if (status) status.textContent = msg; };

    container.querySelector('#admExport').addEventListener('click', () => {
      this.exportJSON();
      setStatus('Fichier classifications.json exporté.');
    });

    container.querySelector('#admReset').addEventListener('click', () => {
      if (!confirm('Réinitialiser toutes les classifications aux valeurs d\'origine ?')) return;
      this.reset();
      App.refresh();
    });
  }
};
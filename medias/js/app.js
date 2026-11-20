/* =========================================================
   Vidéothèque médiatique — application principale
   ========================================================= */

/* ---------------------------------------------------------
   Constantes globales
   --------------------------------------------------------- */
const NOW = Date.now();

const TYPE_LABELS = {
  TV_NATIONALE: "Chaînes TV nationales et d'information",
  PRESSE_NUMERIQUE: "Presse numérique et portails d'information",
  PARTISANE_PODCAST: "Chaînes partisanes, podcasts et créateurs",
  NON_CLASSE: "Sources non classées"
};

const TYPE_SHORT = {
  TV_NATIONALE: "TV nationale",
  PRESSE_NUMERIQUE: "Presse numérique",
  PARTISANE_PODCAST: "Partisane / podcast",
  NON_CLASSE: "Non classé"
};

const THEME_LABELS = {
  LOGEMENT_URBANISME: "Logement, urbanisme et aménagement du territoire",
  POUVOIR_ACHAT: "Pouvoir d'achat, prix et carburants",
  ACTION_GOUVERNEMENTALE: "Action gouvernementale, Parlement et actualités",
  AUTRES: "Autres thématiques"
};

const THEME_SHORT = {
  LOGEMENT_URBANISME: "Logement & urbanisme",
  POUVOIR_ACHAT: "Pouvoir d'achat",
  ACTION_GOUVERNEMENTALE: "Action gouvernementale",
  AUTRES: "Autres"
};

const SOUS_THEMES = {
  LOGEMENT_URBANISME: [
    "Aide directe au logement",
    "Programme de soutien au logement",
    "Habitat menaçant ruine",
    "Lutte contre les bidonvilles",
    "Politique de la ville",
    "Urbanisme et réglementation",
    "Loi 12.90",
    "Agences urbaines",
    "Centres régionaux d'investissement",
    "Aménagement du territoire",
    "Développement du monde rural",
    "Centres ruraux émergents",
    "Promotion immobilière"
  ],
  POUVOIR_ACHAT: [
    "Pouvoir d'achat des citoyens",
    "Prix des hydrocarbures",
    "Prix des carburants",
    "Fiscalité des sociétés pétrolières",
    "Caisse de compensation",
    "Intermédiaires commerciaux",
    "Marges commerciales",
    "Sociétés régionales",
    "Soutien au transport",
    "Inflation et coût de la vie"
  ],
  ACTION_GOUVERNEMENTALE: [
    "Conférences de presse hebdomadaires",
    "Porte-parole du gouvernement",
    "Conseil de gouvernement",
    "Débats parlementaires",
    "Questions orales et écrites",
    "Travaux des commissions",
    "Enseignement et concours",
    "Actualités gouvernementales",
    "Dossier du Sahara",
    "Actualités régionales",
    "Incident électrique à Casablanca",
    "Activités ministérielles"
  ],
  AUTRES: []
};

function themeLabel(c) { return THEME_LABELS[c] || c || 'Non défini'; }
function typeLabel(c)  { return TYPE_LABELS[c]  || c || 'Non classé'; }
function themeShort(c) { return THEME_SHORT[c]  || c || '—'; }
function typeShort(c)  { return TYPE_SHORT[c]   || c || '—'; }

/* ---------------------------------------------------------
   Utilitaires
   --------------------------------------------------------- */
function normalizeText(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/\u0640/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectLang(text) {
  if (!text) return 'inconnu';
  return /[\u0600-\u06FF]/.test(text) ? 'ar' : 'fr';
}

function langLabel(code) {
  return { ar: 'Arabe', fr: 'Français', inconnu: 'Inconnu' }[code] || code;
}

function parseViews(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  let s = String(v).trim().toLowerCase().replace(/\s+/g, '');
  let mult = 1;
  if (s.endsWith('md'))       { mult = 1e9; s = s.slice(0, -2); }
  else if (s.endsWith('m'))   { mult = 1e6; s = s.slice(0, -1); }
  else if (s.endsWith('k'))   { mult = 1e3; s = s.slice(0, -1); }
  else if (s.endsWith('mille')) { mult = 1e3; s = s.slice(0, -5); }
  s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n * mult);
}

function formatViews(n) {
  if (!n || n < 0) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',') + ' Md';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' M';
  if (n >= 1e3) {
    const k = n / 1e3;
    return (k >= 10 ? Math.round(k) : k.toFixed(1).replace('.', ',')) + ' k';
  }
  return String(n);
}

function parsePublished(str) {
  if (!str) return null;
  const s = String(str).toLowerCase();
  const m = s.match(/(\d+)\s*(semaines|semaine|sem|mois|minutes|minute|min|heures|heure|ans|années|année|an|jours|jour|j|h)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const u = m[2];
  let ms = 0;
  if (/^(sem|semaine|semaines)$/.test(u))        ms = n * 7 * 86400000;
  else if (u === 'mois')                          ms = n * 30 * 86400000;
  else if (/^(min|minute|minutes)$/.test(u))      ms = n * 60000;
  else if (/^(h|heure|heures)$/.test(u))          ms = n * 3600000;
  else if (/^(an|ans|année|années)$/.test(u))     ms = n * 365 * 86400000;
  else                                            ms = n * 86400000;
  return new Date(NOW - ms);
}

function parseDuration(str) {
  if (!str) return { label: '', seconds: 0, isShort: false };
  const s = String(str).trim();
  if (/short/i.test(s)) return { label: 'Short', seconds: 0, isShort: true };
  const parts = s.split(':').map(x => parseInt(x, 10));
  let sec = 0;
  if (parts.length === 2)       sec = parts[0] * 60 + parts[1];
  else if (parts.length === 3)  sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (!isNaN(parts[0]))    sec = parts[0];
  return { label: s, seconds: sec || 0, isShort: false };
}

function extractVideoId(url) {
  if (!url) return '';
  const m = String(url).match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }

function formatMonthLabel(ym) {
  const [y, m] = ym.split('-');
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
                  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return months[parseInt(m, 10) - 1] + ' ' + y;
}

function sourceDescription(t) {
  switch (t) {
    case 'TV_NATIONALE':
      return "Couverture institutionnelle, directs, journaux télévisés, reportages et bulletins d'information.";
    case 'PRESSE_NUMERIQUE':
      return "Extraits ciblés, réactions à chaud, interviews, déclarations et suivis parlementaires.";
    case 'PARTISANE_PODCAST':
      return "Formats courts, vulgarisation, analyses politiques, commentaires d'opinion et débats.";
    default:
      return "Sources non classées — reclassement manuel disponible dans l'onglet Classification.";
  }
}

/* ---------------------------------------------------------
   Application
   --------------------------------------------------------- */
const App = (function () {

  const state = {
    raw: null,
    videos: [],
    view: 'dashboard',
    param: null,
    filters: {
      search: '', type: '', media: '', theme: '',
      sousTheme: '', year: '', period: '', sort: 'recent'
    },
    galleryPage: 1,
    perPage: 12,
    loadedAt: null
  };

  function buildVideos(raw) {
    const typeRef = (raw && raw.referentiel_types_chaines) || {};
    const themeRef = (raw && raw.referentiel_themes) || {};

    return ((raw && raw.videos) || [])
      .filter(v => v && v.title && String(v.title).trim() && v.source && String(v.source).trim())
      .map(v => {
        const id = v.video_id || extractVideoId(v.url);
        const ov = Classification.get(id) || {};

        const type = ov.type_chaine || v.type_chaine || 'NON_CLASSE';
        const theme = ov.theme || v.theme || 'AUTRES';
        const sous = ov.sous_theme || '';

        const tLab = (typeRef[type] && typeRef[type].label) || typeLabel(type);
        const thLab = (themeRef[theme] && themeRef[theme].label) || themeLabel(theme);

        return {
          video_id: id,
          url: v.url || (id ? 'https://www.youtube.com/watch?v=' + id : ''),
          thumbnail: v.thumbnail || (id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : ''),
          duration: parseDuration(v.duration),
          title: v.title,
          source: v.source,
          source_url: v.source_url || '',
          views: parseViews(v.views),
          views_raw: v.views,
          published_raw: v.published || '',
          published_date: parsePublished(v.published),
          channel_thumbnail: v.channel_thumbnail || '',
          description: v.description || '',
          type_chaine: type,
          type_label: tLab,
          theme: theme,
          theme_label: thLab,
          sous_theme: sous,
          lang: detectLang(v.title),
          search_index: normalizeText([
            v.title, v.description, v.source, thLab, tLab, sous
          ].join(' '))
        };
      });
  }

  function rebuild() {
    state.videos = buildVideos(state.raw);
  }

  function byId(id) {
    return state.videos.find(v => v.video_id === id);
  }

  function route() {
    const raw = location.hash.replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    state.view = parts[0] || 'dashboard';
    state.param = parts[1] ? decodeURIComponent(parts[1]) : null;
    render();
  }

  function setActiveNav() {
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('active', a.dataset.nav === state.view);
    });
  }

  function render() {
    const el = document.getElementById('view');
    if (!el) return;
    el.innerHTML = '';
    window.scrollTo({ top: 0, behavior: 'auto' });
    setActiveNav();

    switch (state.view) {
      case 'themes':
        state.param ? renderThemeDetail(el, state.param) : renderThemes(el);
        break;
      case 'sources':
        state.param ? renderSourceDetail(el, state.param) : renderSources(el);
        break;
      case 'gallery':
        renderGallery(el);
        break;
      case 'admin':
        Classification.renderAdmin(el, state.videos);
        break;
      case 'dashboard':
      default:
        renderDashboard(el);
        break;
    }
  }

  function renderDashboard(el) {
    const st = Stats.compute(state.videos);
    const themesActive = Object.keys(st.byTheme).filter(k => st.byTheme[k] > 0).length;

    el.innerHTML = `
      <section class="page">
        <div class="page-head">
          <h2>Tableau de bord</h2>
          <p>Vue d'ensemble de la veille médiatique — ${st.total} vidéo${st.total > 1 ? 's' : ''} référencée${st.total > 1 ? 's' : ''}.</p>
        </div>

        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-icon">🎬</div><div><div class="kpi-value">${st.total}</div><div class="kpi-label">Total vidéos</div></div></div>
          <div class="kpi"><div class="kpi-icon">📡</div><div><div class="kpi-value">${st.mediaCount}</div><div class="kpi-label">Médias référencés</div></div></div>
          <div class="kpi"><div class="kpi-icon">📺</div><div><div class="kpi-value">${st.tvSourcesCount}</div><div class="kpi-label">Chaînes TV</div></div></div>
          <div class="kpi"><div class="kpi-icon">🏷️</div><div><div class="kpi-value">${themesActive}</div><div class="kpi-label">Thématiques actives</div></div></div>
        </div>

        <div class="charts-grid">
          <div class="card chart-card">
            <h3>Répartition par thématique</h3>
            <div class="chart-box"><canvas id="chartTheme"></canvas></div>
          </div>
          <div class="card chart-card">
            <h3>Répartition par type de média</h3>
            <div class="chart-box"><canvas id="chartType"></canvas></div>
          </div>
          <div class="card chart-card wide">
            <h3>Médias les plus actifs (top 10)</h3>
            <div class="chart-box"><canvas id="chartMedia"></canvas></div>
          </div>
          <div class="card chart-card wide">
            <h3>Évolution mensuelle des publications</h3>
            <div class="chart-box"><canvas id="chartMonth"></canvas></div>
          </div>
          <div class="card chart-card">
            <h3>Répartition par langue</h3>
            <div class="chart-box"><canvas id="chartLang"></canvas></div>
          </div>
          <div class="card chart-card">
            <h3>Répartition par année</h3>
            <div class="chart-box"><canvas id="chartYear"></canvas></div>
          </div>
        </div>

        <p class="muted small" style="margin-top:1.2rem">
          Remarque : les dates de publication sont estimées à partir des libellés relatifs fournis par la source
          (« il y a 2 sem. », « il y a 7 j »…). Elles servent au tri et aux graphiques d'évolution.
        </p>

        <div class="page-head" style="margin-top:2rem">
          <h2 style="font-size:1.2rem">Vidéos les plus vues</h2>
        </div>
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>Vidéo</th><th>Média</th><th>Vues</th><th>Publication</th></tr></thead>
            <tbody>
              ${state.videos.slice().sort((a, b) => b.views - a.views).slice(0, 5).map(v => `
                <tr>
                  <td dir="auto">${escapeHtml(v.title)}</td>
                  <td>${escapeHtml(v.source)}</td>
                  <td>${formatViews(v.views)}</td>
                  <td>${escapeHtml(v.published_raw || '—')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>`;

    Stats.buildCharts(state.videos, st);
  }

  function renderThemes(el) {
    const codes = ['LOGEMENT_URBANISME', 'POUVOIR_ACHAT', 'ACTION_GOUVERNEMENTALE', 'AUTRES'];

    const cards = codes.map(code => {
      const vids = state.videos.filter(v => v.theme === code);
      const media = distinctMedia(vids);
      return `
        <div class="card theme-card">
          <div class="theme-head">
            <h3>${escapeHtml(themeLabel(code))}</h3>
            <span class="count-pill">${vids.length} vidéo${vids.length > 1 ? 's' : ''}</span>
          </div>
          <div class="media-chips">
            ${media.length
              ? media.map(m => `<button class="chip" data-media="${escapeAttr(m.source)}" data-theme="${code}">
                  ${m.logo ? `<img src="${escapeAttr(m.logo)}" alt="" loading="lazy">` : ''}
                  ${escapeHtml(m.source)} <span class="chip-count">${m.count}</span>
                </button>`).join('')
              : '<span class="muted">Aucun média pour cette thématique.</span>'}
          </div>
          <a class="btn-link" href="#/themes/${code}">Voir le détail →</a>
        </div>`;
    }).join('');

    el.innerHTML = `
      <section class="page">
        <div class="page-head">
          <h2>Thématiques</h2>
          <p>Navigation par grand axe éditorial. Cliquez sur un média pour filtrer ses publications.</p>
        </div>
        <div class="cards-stack">${cards}</div>
      </section>`;

    bindMediaChips(el);
  }

  function renderThemeDetail(el, code) {
    const vids = state.videos.filter(v => v.theme === code);
    const media = distinctMedia(vids);
    const subs = SOUS_THEMES[code] || [];
    const subCounts = {};
    vids.forEach(v => { if (v.sous_theme) subCounts[v.sous_theme] = (subCounts[v.sous_theme] || 0) + 1; });

    const recent = vids.slice().sort((a, b) => (b.published_date || 0) - (a.published_date || 0)).slice(0, 6);
    const viewed = vids.slice().sort((a, b) => b.views - a.views).slice(0, 6);

    el.innerHTML = `
      <section class="page">
        <div class="page-head">
          <p class="muted small"><a href="#/themes">← Toutes les thématiques</a></p>
          <h2>${escapeHtml(themeLabel(code))}</h2>
          <p>${vids.length} vidéo${vids.length > 1 ? 's' : ''} · ${media.length} média${media.length > 1 ? 's' : ''} mobilisé${media.length > 1 ? 's' : ''}</p>
        </div>

        <div class="card" style="padding:1.2rem 1.3rem;margin-bottom:1.2rem">
          <h3 style="font-size:1rem;color:var(--blue-900);margin-bottom:.8rem">Médias ayant traité le sujet</h3>
          <div class="media-chips">
            ${media.length
              ? media.map(m => `<button class="chip" data-media="${escapeAttr(m.source)}" data-theme="${code}">
                  ${m.logo ? `<img src="${escapeAttr(m.logo)}" alt="" loading="lazy">` : ''}
                  ${escapeHtml(m.source)} <span class="chip-count">${m.count}</span>
                </button>`).join('')
              : '<span class="muted">Aucun média.</span>'}
          </div>
        </div>

        <div class="card" style="padding:1.2rem 1.3rem;margin-bottom:1.2rem">
          <h3 style="font-size:1rem;color:var(--blue-900);margin-bottom:.8rem">Sous-thèmes</h3>
          <div class="media-chips">
            ${subs.map(s => `<span class="chip">${escapeHtml(s)} <span class="chip-count">${subCounts[s] || 0}</span></span>`).join('')}
          </div>
          <p class="muted small" style="margin-top:.6rem">Les sous-thèmes se définissent dans l'onglet « Classification ».</p>
        </div>

        <div class="page-head" style="margin-top:1.5rem"><h2 style="font-size:1.15rem">Vidéos les plus récentes</h2></div>
        <div class="video-grid">${recent.map(videoCard).join('') || '<p class="empty">Aucune vidéo.</p>'}</div>

        <div class="page-head" style="margin-top:2rem"><h2 style="font-size:1.15rem">Vidéos les plus vues</h2></div>
        <div class="video-grid">${viewed.map(videoCard).join('') || '<p class="empty">Aucune vidéo.</p>'}</div>
      </section>`;

    bindMediaChips(el);
    bindVideoCards(el);
  }

  function renderSources(el) {
    const types = ['TV_NATIONALE', 'PRESSE_NUMERIQUE', 'PARTISANE_PODCAST', 'NON_CLASSE'];

    const cards = types.map(t => {
      const vids = state.videos.filter(v => v.type_chaine === t);
      const media = distinctMedia(vids);
      return `
        <div class="card source-card">
          <div class="source-head">
            <h3>${escapeHtml(typeLabel(t))}</h3>
            <span class="count-pill">${vids.length} vidéo${vids.length > 1 ? 's' : ''}</span>
          </div>
          <p class="muted" style="margin:.4rem 0 0;font-size:.88rem">${sourceDescription(t)}</p>
          <div class="media-chips">
            ${media.length
              ? media.map(m => `<button class="chip" data-media="${escapeAttr(m.source)}" data-type="${t}">
                  ${m.logo ? `<img src="${escapeAttr(m.logo)}" alt="" loading="lazy">` : ''}
                  ${escapeHtml(m.source)} <span class="chip-count">${m.count}</span>
                </button>`).join('')
              : '<span class="muted">Aucun média répertorié.</span>'}
          </div>
          <a class="btn-link" href="#/sources/${t}">Voir le détail →</a>
        </div>`;
    }).join('');

    el.innerHTML = `
      <section class="page">
        <div class="page-head">
          <h2>Types de sources</h2>
          <p>Navigation par nature du média. Cliquez sur un média pour consulter uniquement ses publications.</p>
        </div>
        <div class="cards-stack">${cards}</div>
      </section>`;

    bindMediaChips(el);
  }

  function renderSourceDetail(el, type) {
    const vids = state.videos.filter(v => v.type_chaine === type);
    const media = distinctMedia(vids);

    const rows = media.map(m => {
      const mv = vids.filter(v => v.source === m.source);
      const last = mv.slice().sort((a, b) => (b.published_date || 0) - (a.published_date || 0))[0];
      return `
        <tr>
          <td>
            <div class="media-cell">
              ${m.logo ? `<img class="src-logo" src="${escapeAttr(m.logo)}" alt="" loading="lazy">` : ''}
              <button class="btn-link" style="background:none;border:none;padding:0;font:inherit;color:var(--blue-600);cursor:pointer"
                      data-media="${escapeAttr(m.source)}" data-type="${type}">${escapeHtml(m.source)}</button>
            </div>
          </td>
          <td>${m.count}</td>
          <td>${escapeHtml(last ? (last.published_raw || '—') : '—')}</td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <section class="page">
        <div class="page-head">
          <p class="muted small"><a href="#/sources">← Tous les types de sources</a></p>
          <h2>${escapeHtml(typeLabel(type))}</h2>
          <p>${vids.length} vidéo${vids.length > 1 ? 's' : ''} · ${media.length} média${media.length > 1 ? 's' : ''}</p>
        </div>

        <div class="table-wrap" style="margin-bottom:1.8rem">
          <table class="data">
            <thead><tr><th>Média</th><th>Vidéos</th><th>Dernière publication</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" class="empty">Aucun média.</td></tr>'}</tbody>
          </table>
        </div>

        <div class="page-head" style="margin-top:1rem"><h2 style="font-size:1.15rem">Vidéos de cette catégorie</h2></div>
        <div class="video-grid">${vids.map(videoCard).join('') || '<p class="empty">Aucune vidéo.</p>'}</div>
      </section>`;

    el.querySelectorAll('[data-media]').forEach(btn => {
      btn.addEventListener('click', () => openGalleryWith({ media: btn.dataset.media, type: btn.dataset.type }));
    });
    bindVideoCards(el);
  }

  function renderGallery(el) {
    const opts = Filters.options(state.videos);
    const f = state.filters;

    el.innerHTML = `
      <section class="page">
        <div class="page-head">
          <h2>Galerie des vidéos</h2>
          <p id="galleryCount">—</p>
        </div>

        <div class="card filters-bar">
          <div class="filter-row">
            <label class="field"><span>Recherche</span>
              <input type="search" id="fSearch" placeholder="Titre, média, mot-clé…" value="${escapeAttr(f.search)}">
            </label>
            <label class="field"><span>Type de média</span>
              <select id="fType">
                <option value="">Tous les types</option>
                ${opts.types.map(o => `<option value="${escapeAttr(o.value)}"${o.value === f.type ? ' selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
              </select>
            </label>
            <label class="field"><span>Média</span>
              <select id="fMedia">
                <option value="">Tous les médias</option>
                ${opts.medias.map(o => `<option value="${escapeAttr(o.value)}"${o.value === f.media ? ' selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
              </select>
            </label>
            <label class="field"><span>Thématique</span>
              <select id="fTheme">
                <option value="">Toutes les thématiques</option>
                ${opts.themes.map(o => `<option value="${escapeAttr(o.value)}"${o.value === f.theme ? ' selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
              </select>
            </label>
            <label class="field"><span>Sous-thème</span>
              <select id="fSousTheme">${sousThemeSelectHtml(f.sousTheme)}</select>
            </label>
            <label class="field"><span>Année</span>
              <select id="fYear">
                <option value="">Toutes les années</option>
                ${opts.years.map(o => `<option value="${escapeAttr(o.value)}"${o.value === f.year ? ' selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
              </select>
            </label>
            <label class="field"><span>Période</span>
              <select id="fPeriod">
                <option value=""${f.period === '' ? ' selected' : ''}>Toutes les périodes</option>
                <option value="7"${f.period === '7' ? ' selected' : ''}>7 derniers jours</option>
                <option value="30"${f.period === '30' ? ' selected' : ''}>30 derniers jours</option>
                <option value="90"${f.period === '90' ? ' selected' : ''}>3 derniers mois</option>
              </select>
            </label>
            <label class="field"><span>Tri</span>
              <select id="fSort">
                <option value="recent"${f.sort === 'recent' ? ' selected' : ''}>Plus récentes</option>
                <option value="views"${f.sort === 'views' ? ' selected' : ''}>Plus vues</option>
                <option value="source"${f.sort === 'source' ? ' selected' : ''}>Par source</option>
                <option value="theme"${f.sort === 'theme' ? ' selected' : ''}>Par thématique</option>
              </select>
            </label>
            <button class="btn btn-ghost" id="fReset" type="button">Réinitialiser</button>
          </div>
        </div>

        <div id="galleryResults"></div>
      </section>`;

    bindGalleryControls(el);
    renderGalleryResults();
  }

  function sousThemeSelectHtml(selected) {
    const groups = ['LOGEMENT_URBANISME', 'POUVOIR_ACHAT', 'ACTION_GOUVERNEMENTALE'];
    return `<option value="">Tous les sous-thèmes</option>` + groups.map(g => `
      <optgroup label="${escapeAttr(themeLabel(g))}">
        ${(SOUS_THEMES[g] || []).map(s =>
          `<option value="${escapeAttr(s)}"${s === selected ? ' selected' : ''}>${escapeHtml(s)}</option>`
        ).join('')}
      </optgroup>`).join('');
  }

  function bindGalleryControls(el) {
    const f = state.filters;
    const search = el.querySelector('#fSearch');

    search.addEventListener('input', e => {
      f.search = e.target.value;
      state.galleryPage = 1;
      syncHeaderSearch();
      renderGalleryResults();
    });

    el.querySelector('#fType').addEventListener('change', e => {
      f.type = e.target.value;
      state.galleryPage = 1;
      renderGalleryResults();
    });
    el.querySelector('#fMedia').addEventListener('change', e => {
      f.media = e.target.value;
      state.galleryPage = 1;
      renderGalleryResults();
    });
    el.querySelector('#fTheme').addEventListener('change', e => {
      f.theme = e.target.value;
      state.galleryPage = 1;
      renderGalleryResults();
    });
    el.querySelector('#fSousTheme').addEventListener('change', e => {
      f.sousTheme = e.target.value;
      state.galleryPage = 1;
      renderGalleryResults();
    });
    el.querySelector('#fYear').addEventListener('change', e => {
      f.year = e.target.value;
      state.galleryPage = 1;
      renderGalleryResults();
    });
    el.querySelector('#fPeriod').addEventListener('change', e => {
      f.period = e.target.value;
      state.galleryPage = 1;
      renderGalleryResults();
    });
    el.querySelector('#fSort').addEventListener('change', e => {
      f.sort = e.target.value;
      renderGalleryResults();
    });
    el.querySelector('#fReset').addEventListener('click', () => {
      state.filters = { search: '', type: '', media: '', theme: '', sousTheme: '', year: '', period: '', sort: 'recent' };
      state.galleryPage = 1;
      syncHeaderSearch();
      render();
    });
  }

  function renderGalleryResults() {
    const wrap = document.getElementById('galleryResults');
    if (!wrap) return;

    let list = Filters.apply(state.videos, state.filters);
    list = Filters.sort(list, state.filters.sort);

    const total = list.length;
    const shown = list.slice(0, state.perPage * state.galleryPage);

    const countEl = document.getElementById('galleryCount');
    if (countEl) {
      const summary = activeFiltersSummary();
      countEl.textContent = `${total} vidéo${total > 1 ? 's' : ''} correspondante${total > 1 ? 's' : ''}${summary ? ' — ' + summary : ''}`;
    }

    wrap.innerHTML = `
      <div class="video-grid">
        ${shown.map(videoCard).join('')}
      </div>
      ${total === 0 ? '<p class="empty">Aucune vidéo ne correspond aux critères sélectionnés.</p>' : ''}
      ${shown.length < total
        ? `<div class="load-more-wrap"><button class="btn" id="loadMore" type="button">Charger plus (${total - shown.length} restante${total - shown.length > 1 ? 's' : ''})</button></div>`
        : ''}`;

    const lm = wrap.querySelector('#loadMore');
    if (lm) lm.addEventListener('click', () => {
      state.galleryPage++;
      renderGalleryResults();
    });

    bindVideoCards(wrap);
  }

  function activeFiltersSummary() {
    const f = state.filters;
    const bits = [];
    if (f.search) bits.push(`« ${f.search} »`);
    if (f.type) bits.push(typeLabel(f.type));
    if (f.media) bits.push(f.media);
    if (f.theme) bits.push(themeLabel(f.theme));
    if (f.sousTheme) bits.push(f.sousTheme);
    if (f.year) bits.push(f.year);
    if (f.period) bits.push(`${f.period} derniers jours`);
    return bits.join(' · ');
  }

  function videoCard(v) {
    const thumb = v.thumbnail || '';
    return `
      <article class="video-card" data-id="${escapeAttr(v.video_id)}" tabindex="0"
               role="button" aria-label="${escapeAttr(v.title)}">
        <div class="thumb">
          ${thumb ? `<img src="${escapeAttr(thumb)}" alt="" loading="lazy"
                onerror="this.style.visibility='hidden'">` : ''}
          <span class="duration-badge">${escapeHtml(v.duration.label || '')}</span>
          <span class="play-overlay" aria-hidden="true">▶</span>
        </div>
        <div class="card-body">
          <h3 class="card-title" dir="auto">${escapeHtml(v.title)}</h3>
          <div class="card-source">
            ${v.channel_thumbnail ? `<img class="src-logo" src="${escapeAttr(v.channel_thumbnail)}" alt="" loading="lazy">` : ''}
            <span dir="auto">${escapeHtml(v.source)}</span>
          </div>
          <div class="card-meta">
            <span>👁 ${formatViews(v.views)}</span>
            <span>🕒 ${escapeHtml(v.published_raw || '—')}</span>
          </div>
          <div class="card-badges">
            <span class="badge badge-theme">${escapeHtml(themeShort(v.theme))}</span>
            <span class="badge badge-type">${escapeHtml(typeShort(v.type_chaine))}</span>
          </div>
        </div>
      </article>`;
  }

  function bindVideoCards(scope) {
    scope.querySelectorAll('.video-card').forEach(card => {
      const open = () => {
        const v = byId(card.dataset.id);
        if (v) Player.open(v);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  function bindMediaChips(scope) {
    scope.querySelectorAll('[data-media]').forEach(btn => {
      btn.addEventListener('click', () => {
        openGalleryWith({
          media: btn.dataset.media || '',
          type: btn.dataset.type || '',
          theme: btn.dataset.theme || ''
        });
      });
    });
  }

  function openGalleryWith(patch) {
    state.filters = Object.assign(
      { search: '', type: '', media: '', theme: '', sousTheme: '', year: '', period: '', sort: 'recent' },
      patch
    );
    state.galleryPage = 1;
    syncHeaderSearch();
    if (state.view === 'gallery') {
      render();
    } else {
      location.hash = '#/gallery';
    }
  }

  function distinctMedia(videos) {
    const map = new Map();
    videos.forEach(v => {
      if (!map.has(v.source)) {
        map.set(v.source, { source: v.source, logo: v.channel_thumbnail || '', count: 0 });
      }
      map.get(v.source).count++;
    });
    return [...map.values()].sort((a, b) => b.count - a.count || a.source.localeCompare(b.source, 'fr'));
  }

  function syncHeaderSearch() {
    const input = document.getElementById('globalSearch');
    if (input && input.value !== state.filters.search) {
      input.value = state.filters.search;
    }
  }

  function bindHeaderSearch() {
    const input = document.getElementById('globalSearch');
    if (!input) return;
    let timer = null;
    input.addEventListener('input', e => {
      clearTimeout(timer);
      const val = e.target.value;
      timer = setTimeout(() => {
        state.filters.search = val;
        state.galleryPage = 1;
        if (state.view === 'gallery') {
          const gs = document.getElementById('fSearch');
          if (gs && gs.value !== val) gs.value = val;
          renderGalleryResults();
        } else {
          location.hash = '#/gallery';
        }
      }, 220);
    });
  }

  function onClassChange(select) {
    const id = select.dataset.id;
    const field = select.dataset.field;
    const value = select.value;

    if (field === 'theme') {
      Classification.set(id, { theme: value, sous_theme: '' });
    } else {
      Classification.set(id, { [field]: value });
    }

    rebuild();
    render();
  }

  function refresh() {
    rebuild();
    render();
  }

  async function init() {
    const loading = document.getElementById('loading');
    const errorBox = document.getElementById('error');

    try {
      const [videosRes, clsRes] = await Promise.all([
        fetch('json/videos.json').then(r => {
          if (!r.ok) throw new Error('Impossible de charger json/videos.json (HTTP ' + r.status + ')');
          return r.json();
        }),
        fetch('json/classifications.json')
          .then(r => (r.ok ? r.json() : {}))
          .catch(() => ({}))
      ]);

      state.raw = videosRes;
      state.loadedAt = new Date();

      Classification.init(clsRes);
      rebuild();

      if (loading) loading.classList.add('hidden');

      const lu = document.getElementById('lastUpdated');
      if (lu) {
        lu.textContent = 'Actualisé le ' +
          state.loadedAt.toLocaleDateString('fr-FR') + ' à ' +
          state.loadedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      }

      Player.init();
      bindHeaderSearch();

      window.addEventListener('hashchange', route);
      route();

    } catch (err) {
      if (loading) loading.classList.add('hidden');
      if (errorBox) {
        errorBox.classList.remove('hidden');
        errorBox.innerHTML = '<strong>Erreur de chargement.</strong> ' +
          escapeHtml(err.message) +
          '<br>Vérifiez que le fichier <code>json/videos.json</code> est accessible et que l\'application est servie par un serveur (XAMPP, GitHub Pages…).';
      }
      console.error(err);
    }
  }

  return {
    state,
    init,
    rebuild,
    render,
    refresh,
    onClassChange
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
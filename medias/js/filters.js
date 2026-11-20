/* =========================================================
   Vidéothèque médiatique — recherche et filtres
   ========================================================= */

const Filters = {

  /* Applique tous les filtres combinables */
  apply(videos, f) {
    const q = normalizeText(f.search || '');
    const now = Date.now();

    return videos.filter(v => {
      if (q && !v.search_index.includes(q)) return false;
      if (f.type && v.type_chaine !== f.type) return false;
      if (f.media && v.source !== f.media) return false;
      if (f.theme && v.theme !== f.theme) return false;
      if (f.sousTheme && v.sous_theme !== f.sousTheme) return false;

      if (f.year) {
        const y = v.published_date ? String(v.published_date.getFullYear()) : 'Inconnue';
        if (y !== f.year) return false;
      }

      if (f.period && f.period !== 'all') {
        const days = parseInt(f.period, 10);
        if (!v.published_date) return false;
        if (now - v.published_date.getTime() > days * 86400000) return false;
      }

      return true;
    });
  },

  /* Tri */
  sort(videos, mode) {
    const arr = videos.slice();
    const ts = v => v.published_date ? v.published_date.getTime() : 0;

    switch (mode) {
      case 'views':
        arr.sort((a, b) => b.views - a.views || ts(b) - ts(a));
        break;
      case 'source':
        arr.sort((a, b) => a.source.localeCompare(b.source, 'fr') || ts(b) - ts(a));
        break;
      case 'theme':
        arr.sort((a, b) => a.theme_label.localeCompare(b.theme_label, 'fr') || ts(b) - ts(a));
        break;
      case 'recent':
      default:
        arr.sort((a, b) => ts(b) - ts(a));
        break;
    }
    return arr;
  },

  /* Valeurs distinctes pour alimenter les listes déroulantes */
  options(videos) {
    const uniq = arr => [...new Set(arr)];

    const types = uniq(videos.map(v => v.type_chaine))
      .map(c => ({ value: c, label: typeLabel(c) }));

    const themes = uniq(videos.map(v => v.theme))
      .map(c => ({ value: c, label: themeLabel(c) }));

    const medias = uniq(videos.map(v => v.source))
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .map(s => ({ value: s, label: s }));

    const years = uniq(videos.map(v =>
      v.published_date ? String(v.published_date.getFullYear()) : 'Inconnue'
    )).sort().map(y => ({ value: y, label: y }));

    const sousThemes = uniq(videos.map(v => v.sous_theme).filter(Boolean))
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .map(s => ({ value: s, label: s }));

    return { types, themes, medias, years, sousThemes };
  }
};
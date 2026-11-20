/* =========================================================
   Vidéothèque médiatique — lecteur vidéo (modale)
   ========================================================= */

const Player = {

  init() {
    const modal = document.getElementById('playerModal');
    const closeBtn = document.getElementById('playerClose');
    if (!modal) return;

    closeBtn.addEventListener('click', () => this.close());
    modal.addEventListener('click', e => {
      if (e.target === modal) this.close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) this.close();
    });
  },

  open(video) {
    if (!video) return;
    const modal = document.getElementById('playerModal');
    const wrap = document.getElementById('playerWrap');
    const meta = document.getElementById('playerMeta');

    /* Le lecteur est créé uniquement à l'ouverture (performance) */
    wrap.innerHTML = '';
    if (video.video_id) {
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(video.video_id) + '?autoplay=1&rel=0';
      iframe.title = video.title;
      iframe.setAttribute('allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      wrap.appendChild(iframe);
    }

    const fallback = document.createElement('p');
    fallback.className = 'player-fallback';
    fallback.innerHTML = 'Si la lecture intégrée ne fonctionne pas, ' +
      '<a href="' + escapeAttr(video.url) + '" target="_blank" rel="noopener">voir la vidéo sur YouTube</a>.';
    wrap.appendChild(fallback);

    meta.innerHTML = `
      <h2 id="playerTitle" dir="auto">${escapeHtml(video.title)}</h2>
      <div class="meta-line">
        <span><strong>Média :</strong> ${escapeHtml(video.source)}</span>
        <span><strong>Publication :</strong> ${escapeHtml(video.published_raw || '—')}</span>
        <span><strong>Vues :</strong> ${formatViews(video.views)}</span>
        <span><strong>Durée :</strong> ${escapeHtml(video.duration.label || '—')}</span>
      </div>
      <div class="player-badges">
        <span class="badge badge-theme">${escapeHtml(video.theme_label)}</span>
        <span class="badge badge-type">${escapeHtml(video.type_label)}</span>
        ${video.sous_theme ? `<span class="badge badge-type">${escapeHtml(video.sous_theme)}</span>` : ''}
      </div>
      ${video.description ? `<div class="desc" dir="auto">${escapeHtml(video.description)}</div>` : ''}
      <div style="margin-top:1rem">
        <a class="btn" href="${escapeAttr(video.url)}" target="_blank" rel="noopener">Voir sur YouTube ↗</a>
      </div>
    `;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  close() {
    const modal = document.getElementById('playerModal');
    const wrap = document.getElementById('playerWrap');
    if (wrap) wrap.innerHTML = '';
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};
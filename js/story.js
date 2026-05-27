import { state } from './state.js';
import { navigateTo } from './router.js';

export function renderStoryStudio() {
  const container = document.getElementById('view-story-studio');
  if (!container) return;

  const charsCount = state.characters.length;
  const chapsCount = state.chapters.length;
  const worldCount = state.world.length;
  const beatsCount = state.plotBeats.length;
  const projCount = state.projects.length;

  const chapterPages = state.pages.filter(p => p.type === 'chapter');
  const totalWords = chapterPages.reduce((sum, p) => sum + (p.wordCount || 0), 0);

  container.innerHTML = `
    <div class="page-pad" style="max-width:900px;margin:0 auto;">
      <h1 class="dash-greeting">Story Studio</h1>
      <p class="dash-date">Your creative workspace</p>

      <div class="story-stats-row">
        <div class="stat-card"><span class="stat-card-num">${totalWords.toLocaleString()}</span><span class="stat-card-label">Total words</span></div>
        <div class="stat-card"><span class="stat-card-num">${chapsCount}</span><span class="stat-card-label">Chapters</span></div>
        <div class="stat-card"><span class="stat-card-num">${charsCount}</span><span class="stat-card-label">Characters</span></div>
      </div>

      <div class="gallery-grid story-cards">
        <div class="story-nav-card" data-view="characters">
          <div class="story-nav-card-icon">🧑</div>
          <div class="story-nav-card-title">Characters</div>
          <div class="story-nav-card-count">${charsCount} entries</div>
        </div>
        <div class="story-nav-card" data-view="chapters">
          <div class="story-nav-card-icon">📄</div>
          <div class="story-nav-card-title">Chapters</div>
          <div class="story-nav-card-count">${chapsCount} chapters · ${totalWords.toLocaleString()} words</div>
        </div>
        <div class="story-nav-card" data-view="world">
          <div class="story-nav-card-icon">🌍</div>
          <div class="story-nav-card-title">World</div>
          <div class="story-nav-card-count">${worldCount} entries</div>
        </div>
        <div class="story-nav-card" data-view="plot-beats">
          <div class="story-nav-card-icon">🎭</div>
          <div class="story-nav-card-title">Plot Beats</div>
          <div class="story-nav-card-count">${beatsCount} beats</div>
        </div>
        <div class="story-nav-card" data-view="projects">
          <div class="story-nav-card-icon">🗂️</div>
          <div class="story-nav-card-title">Projects</div>
          <div class="story-nav-card-count">${projCount} projects</div>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.story-nav-card').forEach(card => {
    card.addEventListener('click', () => {
      navigateTo(card.getAttribute('data-view'));
    });
  });
}

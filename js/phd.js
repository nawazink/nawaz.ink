import { renderEngineButtons, getDefaultSearchEngine, openSearch } from './search-engines.js';
import { navigateTo } from './router.js';

const TABS = ['Scholarships', 'Literature', 'Programs', 'Tools', 'Writing'];

const RESOURCES = {
  Scholarships: [
    { icon: '🎓', title: 'ScholarshipPortal', desc: 'Europe-focused scholarship database', url: 'https://www.scholarshipportal.com' },
    { icon: '🌐', title: 'Opportunity Desk', desc: 'Global opportunities for youth', url: 'https://opportunitydesk.org' },
    { icon: '🇬🇧', title: 'Chevening', desc: 'UK government scholarships', url: 'https://www.chevening.org' },
    { icon: '🌍', title: 'Commonwealth', desc: 'Scholarships for developing countries', url: 'https://cscuk.fcdo.gov.uk' },
    { icon: '🇺🇸', title: 'Fulbright', desc: 'US-sponsored international exchange', url: 'https://foreign.fulbrightonline.org' },
    { icon: '🇩🇪', title: 'DAAD', desc: 'German academic exchange service', url: 'https://www.daad.de/en/' },
    { icon: '🇪🇺', title: 'Erasmus+', desc: 'EU education and training program', url: 'https://erasmus-plus.ec.europa.eu' },
    { icon: '🏛️', title: 'Gates Cambridge', desc: 'Full scholarships at Cambridge', url: 'https://www.gatescambridge.org' },
    { icon: '🏅', title: 'Rhodes', desc: 'Postgraduate awards at Oxford', url: 'https://www.rhodeshouse.ox.ac.uk' },
    { icon: '🌏', title: 'ADB Scholarships', desc: 'Asian Development Bank program', url: 'https://www.adb.org/what-we-do/japan-scholarship-program' }
  ],
  Literature: [
    { icon: '🔍', title: 'Google Scholar', desc: 'Broad academic search engine', url: 'https://scholar.google.com' },
    { icon: '🧠', title: 'Semantic Scholar', desc: 'AI-powered research tool', url: 'https://www.semanticscholar.org' },
    { icon: '📚', title: 'JSTOR', desc: 'Digital library of journals and books', url: 'https://www.jstor.org' },
    { icon: '📄', title: 'arXiv', desc: 'Open access preprint repository', url: 'https://arxiv.org' },
    { icon: '🏥', title: 'PubMed', desc: 'Biomedical literature database', url: 'https://pubmed.ncbi.nlm.nih.gov' },
    { icon: '🔬', title: 'ResearchGate', desc: 'Academic social network', url: 'https://www.researchgate.net' },
    { icon: '🎓', title: 'Academia.edu', desc: 'Paper sharing platform', url: 'https://www.academia.edu' },
    { icon: '📝', title: 'SSRN', desc: 'Social science research network', url: 'https://www.ssrn.com' },
    { icon: '📖', title: 'DOAJ', desc: 'Directory of open access journals', url: 'https://doaj.org' },
    { icon: '🌐', title: 'BASE', desc: 'Bielefeld academic search engine', url: 'https://www.base-search.net' }
  ],
  Programs: [
    { icon: '🇪🇺', title: 'PhDportal.eu', desc: 'European PhD positions', url: 'https://www.phdportal.eu' },
    { icon: '🔎', title: 'FindAPhD', desc: 'Global PhD opportunities', url: 'https://www.findaphd.com' },
    { icon: '🇪🇺', title: 'EURAXESS', desc: 'European researcher portal', url: 'https://euraxess.ec.europa.eu' },
    { icon: '🇺🇸', title: 'USNews Rankings', desc: 'US graduate school rankings', url: 'https://www.usnews.com/best-graduate-schools' },
    { icon: '🌍', title: 'QS Rankings', desc: 'World university rankings', url: 'https://www.topuniversities.com' }
  ],
  Tools: [
    { icon: '📎', title: 'Zotero', desc: 'Free reference manager', url: 'https://www.zotero.org' },
    { icon: '📚', title: 'Mendeley', desc: 'Reference manager + network', url: 'https://www.mendeley.com' },
    { icon: '📝', title: 'Overleaf', desc: 'Online LaTeX editor', url: 'https://www.overleaf.com' },
    { icon: '🕸️', title: 'Connected Papers', desc: 'Visual paper exploration', url: 'https://www.connectedpapers.com' },
    { icon: '🐰', title: 'Research Rabbit', desc: 'Paper discovery tool', url: 'https://www.researchrabbit.ai' },
    { icon: '📋', title: 'Notion', desc: 'Notes and project management', url: 'https://www.notion.so' },
    { icon: '🔮', title: 'Obsidian', desc: 'Knowledge base with linking', url: 'https://obsidian.md' },
    { icon: '✍️', title: 'Grammarly', desc: 'Writing assistant', url: 'https://www.grammarly.com' }
  ],
  Writing: [
    { icon: '✍️', title: 'Grammarly', desc: 'AI writing assistant', url: 'https://www.grammarly.com' },
    { icon: '📖', title: 'Hemingway Editor', desc: 'Readability checker', url: 'https://hemingwayapp.com' },
    { icon: '🔍', title: 'Turnitin', desc: 'Plagiarism awareness', url: 'https://www.turnitin.com' },
    { icon: '🖊️', title: 'ProWritingAid', desc: 'Grammar and style editor', url: 'https://prowritingaid.com' },
    { icon: '🌐', title: 'DeepL', desc: 'AI translation tool', url: 'https://www.deepl.com' },
    { icon: '📝', title: 'Overleaf', desc: 'Collaborative LaTeX writing', url: 'https://www.overleaf.com' }
  ]
};

let activeTab = 'Scholarships';

export function renderPhd() {
  const container = document.getElementById('view-phd');
  if (!container) return;

  const catMap = { Scholarships: 'phdScholarships', Literature: 'phdLiterature', Programs: 'phdPrograms' };

  container.innerHTML = `
    <div class="page-pad" style="max-width:1000px;margin:0 auto;">
      <h1 style="font-size:22px;font-weight:600;color:var(--text);">PhD Research</h1>
      <p style="font-size:13px;color:var(--text3);margin-bottom:20px;">Scholarships, funding, literature, programs, and research tools</p>
      <div class="view-toggle" style="margin-bottom:16px;">
        ${TABS.map(t => `<button class="btn btn-sm ${t === activeTab ? 'active' : ''}" data-tab="${t}">${t}</button>`).join('')}
      </div>
      <div id="phd-tab-content"></div>
    </div>
  `;

  container.querySelectorAll('.view-toggle .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.getAttribute('data-tab');
      renderPhd();
    });
  });

  renderTabContent(catMap);
}

function renderTabContent(catMap) {
  const content = document.getElementById('phd-tab-content');
  if (!content) return;

  const cat = catMap[activeTab];
  const hasSearch = !!cat;
  const resources = RESOURCES[activeTab] || [];

  let searchHtml = '';
  if (hasSearch) {
    searchHtml = `
      <div class="search-bar-row" style="margin-bottom:16px;">
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <input class="modal-input" id="phd-search-input" placeholder="Search ${activeTab.toLowerCase()}..." style="flex:1;"/>
          <button class="btn btn-primary btn-sm" id="phd-search-go">Search</button>
        </div>
        <div id="phd-engines" class="engine-row"></div>
      </div>
    `;
  }

  let internalLinks = '';
  if (activeTab === 'Writing') {
    internalLinks = `
      <div style="margin-top:24px;border-top:1px solid var(--border);padding-top:16px;">
        <p style="font-size:12px;color:var(--text3);margin-bottom:8px;">In nawaz.ink:</p>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-sm" id="phd-to-bib">📚 Bibliography</button>
          <button class="btn btn-sm" id="phd-to-journal">📓 Journal</button>
        </div>
      </div>
    `;
  }

  content.innerHTML = `
    ${searchHtml}
    <div class="phd-resource-grid">
      ${resources.map(r => `
        <div class="resource-card" data-url="${r.url}">
          <div class="resource-card-icon">${r.icon}</div>
          <div class="resource-card-title">${r.title}</div>
          <div class="resource-card-desc">${r.desc}</div>
          <span class="resource-card-open">Open →</span>
        </div>
      `).join('')}
    </div>
    ${internalLinks}
  `;

  if (hasSearch) {
    renderEngineButtons('phd-engines', cat);

    const goBtn = document.getElementById('phd-search-go');
    const input = document.getElementById('phd-search-input');
    const doSearch = () => {
      const q = input?.value.trim();
      if (!q) return;
      const eng = getDefaultSearchEngine(cat);
      if (eng) openSearch(q, eng.id, cat);
    };
    goBtn?.addEventListener('click', doSearch);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  }

  content.querySelectorAll('.resource-card').forEach(card => {
    card.addEventListener('click', () => {
      window.open(card.getAttribute('data-url'), '_blank');
    });
  });

  document.getElementById('phd-to-bib')?.addEventListener('click', () => navigateTo('bibliography'));
  document.getElementById('phd-to-journal')?.addEventListener('click', () => navigateTo('journal'));
}

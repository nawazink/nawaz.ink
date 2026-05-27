import { state, saveState, markDirty } from './state.js';

const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Scholarship', 'Gift', 'Refund', 'Other'],
  expense: ['Food', 'Transport', 'Rent', 'Bills', 'Shopping', 'Entertainment', 'Health', 'Education', 'Subscriptions', 'Travel', 'Savings', 'Other']
};

const CURRENCIES = ['$', '€', '£', '¥', '₹', '৳', 'RM', 'kr'];

let activeTab = 'overview';
let filterMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

function ensure() {
  if (!state.finance) state.finance = { transactions: [], budgets: [], accounts: [], currency: '$', goals: [] };
}

export function renderFinance() {
  ensure();
  const container = document.getElementById('view-finance');
  if (!container) return;

  container.innerHTML = `
    <div class="page-pad" style="max-width:960px;margin:0 auto;">
      <div class="db-header">
        <h1 style="font-size:20px;font-weight:600;color:var(--text);">Finance Manager</h1>
        <div class="db-header-actions">
          <input type="month" class="modal-input" id="fin-month" value="${filterMonth}" style="max-width:150px;font-size:11px;padding:4px 8px;"/>
          <button class="btn btn-primary btn-sm" id="fin-add">+ Transaction</button>
        </div>
      </div>

      <div class="view-toggle" style="margin-bottom:14px;">
        <button class="btn btn-sm ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button>
        <button class="btn btn-sm ${activeTab === 'transactions' ? 'active' : ''}" data-tab="transactions">Transactions</button>
        <button class="btn btn-sm ${activeTab === 'budgets' ? 'active' : ''}" data-tab="budgets">Budgets</button>
        <button class="btn btn-sm ${activeTab === 'goals' ? 'active' : ''}" data-tab="goals">Goals</button>
      </div>

      <div id="fin-content"></div>
    </div>
  `;

  container.querySelectorAll('.view-toggle .btn').forEach(btn => {
    btn.addEventListener('click', () => { activeTab = btn.getAttribute('data-tab'); renderFinance(); });
  });

  document.getElementById('fin-month')?.addEventListener('change', (e) => { filterMonth = e.target.value; renderFinance(); });
  document.getElementById('fin-add')?.addEventListener('click', () => openTransactionModal(null));

  if (activeTab === 'overview') renderOverview();
  else if (activeTab === 'transactions') renderTransactions();
  else if (activeTab === 'budgets') renderBudgets();
  else if (activeTab === 'goals') renderGoals();
}

// ─── OVERVIEW ───
function renderOverview() {
  const content = document.getElementById('fin-content');
  if (!content) return;
  const txs = getMonthTransactions();
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const cur = state.finance.currency || '$';

  // Category breakdown
  const catBreakdown = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    catBreakdown[t.category] = (catBreakdown[t.category] || 0) + t.amount;
  });
  const sortedCats = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]);
  const maxCat = sortedCats[0]?.[1] || 1;

  // Daily spending chart (past 30 days)
  const dailyData = buildDailyChart();

  content.innerHTML = `
    <div class="fin-overview-grid">
      <div class="fin-stat-card fin-income"><span class="fin-stat-label">Income</span><span class="fin-stat-value">+${cur}${income.toFixed(2)}</span></div>
      <div class="fin-stat-card fin-expense"><span class="fin-stat-label">Expenses</span><span class="fin-stat-value">-${cur}${expense.toFixed(2)}</span></div>
      <div class="fin-stat-card fin-balance ${balance >= 0 ? 'positive' : 'negative'}"><span class="fin-stat-label">Balance</span><span class="fin-stat-value">${balance >= 0 ? '+' : '-'}${cur}${Math.abs(balance).toFixed(2)}</span></div>
      <div class="fin-stat-card"><span class="fin-stat-label">Transactions</span><span class="fin-stat-value">${txs.length}</span></div>
    </div>

    <div class="dash-row" style="margin-top:12px;">
      <div class="dash-card">
        <div class="dash-card-header">Spending by category</div>
        ${sortedCats.length === 0 ? '<p class="dash-empty">No expenses this month</p>' :
          sortedCats.map(([cat, amt]) => `
            <div class="fin-cat-row">
              <span class="fin-cat-name">${cat}</span>
              <div class="fin-cat-bar-track"><div class="fin-cat-bar-fill" style="width:${(amt/maxCat)*100}%"></div></div>
              <span class="fin-cat-amt">${cur}${amt.toFixed(0)}</span>
            </div>
          `).join('')}
      </div>
      <div class="dash-card">
        <div class="dash-card-header">Daily spending (30 days)</div>
        <div class="graph-row">${dailyData}</div>
      </div>
    </div>

    <div class="dash-card" style="margin-top:10px;">
      <div class="dash-card-header">Recent transactions</div>
      ${renderTransactionList(txs.slice(0, 8))}
    </div>
  `;
}

function buildDailyChart() {
  const days = [];
  const today = new Date();
  const cur = state.finance.currency || '$';
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const spent = state.finance.transactions.filter(t => t.type === 'expense' && t.date === key).reduce((s, t) => s + t.amount, 0);
    days.push({ label: d.getDate(), value: spent });
  }
  const max = Math.max(...days.map(d => d.value), 1);
  return days.map(d => {
    const h = Math.round((d.value / max) * 50);
    return `<div class="graph-bar-wrap"><div class="graph-bar" style="height:${h}px;" title="${cur}${d.value.toFixed(0)}"></div></div>`;
  }).join('');
}

// ─── TRANSACTIONS ───
function renderTransactions() {
  const content = document.getElementById('fin-content');
  if (!content) return;
  const txs = getMonthTransactions();

  content.innerHTML = `
    <div class="db-filter-bar" style="margin-bottom:10px;">
      <input class="modal-input" id="fin-search" placeholder="Search..." style="max-width:200px;font-size:11px;padding:4px 8px;"/>
      <select class="modal-input" id="fin-type-filter" style="max-width:120px;font-size:11px;padding:4px 8px;">
        <option value="">All types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </select>
      <select class="modal-input" id="fin-cat-filter" style="max-width:140px;font-size:11px;padding:4px 8px;">
        <option value="">All categories</option>
        ${[...CATEGORIES.income, ...CATEGORIES.expense].map(c => `<option>${c}</option>`).join('')}
      </select>
    </div>
    <div id="fin-tx-list">${renderTransactionList(txs)}</div>
  `;

  document.getElementById('fin-search')?.addEventListener('input', filterTransactions);
  document.getElementById('fin-type-filter')?.addEventListener('change', filterTransactions);
  document.getElementById('fin-cat-filter')?.addEventListener('change', filterTransactions);
}

function filterTransactions() {
  const q = (document.getElementById('fin-search')?.value || '').toLowerCase();
  const typeF = document.getElementById('fin-type-filter')?.value || '';
  const catF = document.getElementById('fin-cat-filter')?.value || '';
  let txs = getMonthTransactions();
  if (q) txs = txs.filter(t => `${t.description} ${t.category}`.toLowerCase().includes(q));
  if (typeF) txs = txs.filter(t => t.type === typeF);
  if (catF) txs = txs.filter(t => t.category === catF);
  const list = document.getElementById('fin-tx-list');
  if (list) list.innerHTML = renderTransactionList(txs);
}

function renderTransactionList(txs) {
  if (txs.length === 0) return '<p class="dash-empty">No transactions</p>';
  const cur = state.finance.currency || '$';
  return txs.map(t => `
    <div class="fin-tx-row" data-id="${t.id}">
      <div class="fin-tx-left">
        <span class="fin-tx-icon">${t.type === 'income' ? '↗' : '↘'}</span>
        <div>
          <div class="fin-tx-desc">${esc(t.description || t.category)}</div>
          <div class="fin-tx-meta">${t.category} · ${t.date}${t.account ? ' · ' + t.account : ''}</div>
        </div>
      </div>
      <span class="fin-tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${cur}${t.amount.toFixed(2)}</span>
    </div>
  `).join('');
}

// ─── BUDGETS ───
function renderBudgets() {
  const content = document.getElementById('fin-content');
  if (!content) return;
  const budgets = state.finance.budgets || [];
  const txs = getMonthTransactions();
  const cur = state.finance.currency || '$';

  content.innerHTML = `
    <button class="btn btn-sm" id="fin-add-budget" style="margin-bottom:12px;">+ Add budget</button>
    <div class="fin-budgets-grid">
      ${budgets.map(b => {
        const spent = txs.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.amount, 0);
        const pct = Math.min(100, Math.round((spent / b.limit) * 100));
        const over = spent > b.limit;
        return `
          <div class="fin-budget-card ${over ? 'over' : ''}">
            <div class="fin-budget-header">
              <span class="fin-budget-cat">${b.category}</span>
              <button class="btn btn-sm btn-danger fin-budget-del" data-cat="${b.category}">×</button>
            </div>
            <div class="fin-budget-bar-track"><div class="fin-budget-bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div>
            <div class="fin-budget-text">${cur}${spent.toFixed(0)} / ${cur}${b.limit.toFixed(0)} ${over ? '⚠️ Over budget!' : ''}</div>
          </div>
        `;
      }).join('')}
    </div>
    ${budgets.length === 0 ? '<p class="dash-empty">No budgets set. Add one to track spending limits by category.</p>' : ''}
  `;

  document.getElementById('fin-add-budget')?.addEventListener('click', openBudgetModal);
  content.querySelectorAll('.fin-budget-del').forEach(btn => {
    btn.addEventListener('click', () => {
      state.finance.budgets = state.finance.budgets.filter(b => b.category !== btn.getAttribute('data-cat'));
      saveState(); markDirty(); renderFinance();
    });
  });
}

function openBudgetModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:360px;">
      <div class="modal-header"><span class="modal-title">Add Budget</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <label class="bib-form-label">Category</label>
        <select class="modal-input" id="bgt-cat">${CATEGORIES.expense.map(c => `<option>${c}</option>`).join('')}</select>
        <label class="bib-form-label" style="margin-top:10px;">Monthly limit</label>
        <input class="modal-input" id="bgt-limit" type="number" placeholder="500"/>
        <button class="btn btn-primary btn-sm" id="bgt-save" style="margin-top:14px;">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#bgt-save').addEventListener('click', () => {
    const cat = document.getElementById('bgt-cat').value;
    const limit = parseFloat(document.getElementById('bgt-limit').value) || 0;
    if (!limit) return;
    if (!state.finance.budgets) state.finance.budgets = [];
    const existing = state.finance.budgets.find(b => b.category === cat);
    if (existing) existing.limit = limit;
    else state.finance.budgets.push({ category: cat, limit });
    saveState(); markDirty(); overlay.remove(); renderFinance();
  });
}

// ─── ACCOUNTS ───
function renderAccounts() {
  const content = document.getElementById('fin-content');
  if (!content) return;
  const accounts = state.finance.accounts || [];
  const cur = state.finance.currency || '$';

  // Calculate balance per account
  const accBalances = {};
  accounts.forEach(a => { accBalances[a.name] = a.initialBalance || 0; });
  state.finance.transactions.forEach(t => {
    if (t.account && accBalances[t.account] !== undefined) {
      accBalances[t.account] += t.type === 'income' ? t.amount : -t.amount;
    }
  });

  content.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <button class="btn btn-sm" id="fin-add-account">+ Add account</button>
      <div style="margin-left:auto;display:flex;align-items:center;gap:6px;">
        <label style="font-size:11px;color:var(--text3);">Currency:</label>
        <select class="modal-input" id="fin-currency" style="max-width:70px;font-size:11px;padding:3px 6px;">
          ${CURRENCIES.map(c => `<option ${state.finance.currency === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="fin-accounts-grid">
      ${accounts.map(a => `
        <div class="fin-account-card">
          <div class="fin-account-icon">${a.icon || '🏦'}</div>
          <div class="fin-account-name">${esc(a.name)}</div>
          <div class="fin-account-bal">${cur}${(accBalances[a.name] || 0).toFixed(2)}</div>
          <div class="fin-account-type">${a.type || 'General'}</div>
        </div>
      `).join('')}
    </div>
    ${accounts.length === 0 ? '<p class="dash-empty">No accounts. Add your bank accounts, wallets, or cash.</p>' : ''}
  `;

  document.getElementById('fin-add-account')?.addEventListener('click', openAccountModal);
  document.getElementById('fin-currency')?.addEventListener('change', (e) => {
    state.finance.currency = e.target.value;
    saveState(); markDirty(); renderFinance();
  });
}

function openAccountModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:360px;">
      <div class="modal-header"><span class="modal-title">Add Account</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <label class="bib-form-label">Name</label>
        <input class="modal-input" id="acc-name" placeholder="e.g. Main Bank"/>
        <label class="bib-form-label" style="margin-top:10px;">Type</label>
        <select class="modal-input" id="acc-type">
          <option>Bank</option><option>Cash</option><option>Credit Card</option><option>E-Wallet</option><option>Savings</option><option>Investment</option>
        </select>
        <label class="bib-form-label" style="margin-top:10px;">Icon</label>
        <input class="modal-input" id="acc-icon" value="🏦" style="max-width:60px;"/>
        <label class="bib-form-label" style="margin-top:10px;">Initial balance</label>
        <input class="modal-input" id="acc-balance" type="number" value="0"/>
        <button class="btn btn-primary btn-sm" id="acc-save" style="margin-top:14px;">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#acc-save').addEventListener('click', () => {
    const name = document.getElementById('acc-name').value.trim();
    if (!name) return;
    if (!state.finance.accounts) state.finance.accounts = [];
    state.finance.accounts.push({
      name,
      type: document.getElementById('acc-type').value,
      icon: document.getElementById('acc-icon').value.trim() || '🏦',
      initialBalance: parseFloat(document.getElementById('acc-balance').value) || 0
    });
    saveState(); markDirty(); overlay.remove(); renderFinance();
  });
}

// ─── GOALS ───
function renderGoals() {
  const content = document.getElementById('fin-content');
  if (!content) return;
  const goals = state.finance.goals || [];
  const cur = state.finance.currency || '$';

  content.innerHTML = `
    <button class="btn btn-sm" id="fin-add-goal" style="margin-bottom:12px;">+ Add savings goal</button>
    <div class="fin-goals-grid">
      ${goals.map(g => {
        const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
        return `
          <div class="fin-goal-card">
            <div class="fin-goal-icon">${g.icon || '🎯'}</div>
            <div class="fin-goal-name">${esc(g.name)}</div>
            <div class="fin-goal-bar-track"><div class="fin-goal-bar-fill" style="width:${pct}%"></div></div>
            <div class="fin-goal-text">${cur}${g.saved.toFixed(0)} / ${cur}${g.target.toFixed(0)} (${pct}%)</div>
            <div style="display:flex;gap:4px;margin-top:6px;">
              <button class="btn btn-sm fin-goal-add-funds" data-id="${g.id}">+ Add</button>
              <button class="btn btn-sm btn-danger fin-goal-del" data-id="${g.id}">×</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    ${goals.length === 0 ? '<p class="dash-empty">No savings goals. Set targets for things you want to save for.</p>' : ''}
  `;

  document.getElementById('fin-add-goal')?.addEventListener('click', openGoalModal);
  content.querySelectorAll('.fin-goal-add-funds').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const amt = parseFloat(prompt('Amount to add:'));
      if (!amt || isNaN(amt)) return;
      const goal = state.finance.goals.find(g => g.id === id);
      if (goal) { goal.saved += amt; saveState(); markDirty(); renderFinance(); }
    });
  });
  content.querySelectorAll('.fin-goal-del').forEach(btn => {
    btn.addEventListener('click', () => {
      state.finance.goals = state.finance.goals.filter(g => g.id !== btn.getAttribute('data-id'));
      saveState(); markDirty(); renderFinance();
    });
  });
}

function openGoalModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:360px;">
      <div class="modal-header"><span class="modal-title">New Savings Goal</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <label class="bib-form-label">Goal name</label>
        <input class="modal-input" id="goal-name" placeholder="e.g. New laptop"/>
        <label class="bib-form-label" style="margin-top:10px;">Target amount</label>
        <input class="modal-input" id="goal-target" type="number"/>
        <label class="bib-form-label" style="margin-top:10px;">Icon</label>
        <input class="modal-input" id="goal-icon" value="🎯" style="max-width:60px;"/>
        <button class="btn btn-primary btn-sm" id="goal-save" style="margin-top:14px;">Create</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#goal-save').addEventListener('click', () => {
    const name = document.getElementById('goal-name').value.trim();
    const target = parseFloat(document.getElementById('goal-target').value) || 0;
    if (!name || !target) return;
    if (!state.finance.goals) state.finance.goals = [];
    state.finance.goals.push({ id: crypto.randomUUID(), name, target, saved: 0, icon: document.getElementById('goal-icon').value.trim() || '🎯' });
    saveState(); markDirty(); overlay.remove(); renderFinance();
  });
}

// ─── TRANSACTION MODAL ───
function openTransactionModal(id) {
  const existing = id ? state.finance.transactions.find(t => t.id === id) : null;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px;">
      <div class="modal-header"><span class="modal-title">${existing ? 'Edit' : 'New'} Transaction</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <button class="btn btn-sm fin-type-btn ${(!existing || existing.type === 'expense') ? 'active' : ''}" data-type="expense" style="flex:1;">Expense</button>
          <button class="btn btn-sm fin-type-btn ${existing?.type === 'income' ? 'active' : ''}" data-type="income" style="flex:1;">Income</button>
        </div>
        <label class="bib-form-label">Amount</label>
        <input class="modal-input" id="tx-amount" type="number" step="0.01" value="${existing?.amount || ''}" placeholder="0.00"/>
        <label class="bib-form-label" style="margin-top:10px;">Description</label>
        <input class="modal-input" id="tx-desc" value="${esc(existing?.description || '')}"/>
        <label class="bib-form-label" style="margin-top:10px;">Category</label>
        <select class="modal-input" id="tx-cat">
          ${CATEGORIES.expense.map(c => `<option ${existing?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <label class="bib-form-label" style="margin-top:10px;">Date</label>
        <input class="modal-input" id="tx-date" type="date" value="${existing?.date || new Date().toISOString().slice(0, 10)}"/>
        <label class="bib-form-label" style="margin-top:10px;">Notes</label>
        <input class="modal-input" id="tx-notes" value="${esc(existing?.notes || '')}"/>
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="btn btn-primary" id="tx-save">Save</button>
          ${existing ? '<button class="btn btn-danger" id="tx-del">Delete</button>' : ''}
          <button class="btn btn-ghost" id="tx-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  let txType = existing?.type || 'expense';

  // Type toggle
  overlay.querySelectorAll('.fin-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      txType = btn.getAttribute('data-type');
      overlay.querySelectorAll('.fin-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Update category options
      const catSelect = document.getElementById('tx-cat');
      if (catSelect) {
        catSelect.innerHTML = CATEGORIES[txType].map(c => `<option>${c}</option>`).join('');
      }
    });
  });

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#tx-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#tx-save').addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('tx-amount').value) || 0;
    if (!amount) return;
    const data = {
      type: txType,
      amount,
      description: document.getElementById('tx-desc').value.trim(),
      category: document.getElementById('tx-cat').value,
      date: document.getElementById('tx-date').value,
      notes: document.getElementById('tx-notes').value.trim(),
      updatedAt: Date.now()
    };
    if (existing) { Object.assign(existing, data); }
    else { state.finance.transactions.push({ id: crypto.randomUUID(), ...data, createdAt: Date.now() }); }
    saveState(); markDirty(); overlay.remove(); renderFinance();
  });

  if (existing) {
    overlay.querySelector('#tx-del')?.addEventListener('click', () => {
      state.finance.transactions = state.finance.transactions.filter(t => t.id !== id);
      saveState(); markDirty(); overlay.remove(); renderFinance();
    });
  }
}

// ─── HELPERS ───
function getMonthTransactions() {
  return state.finance.transactions
    .filter(t => t.date && t.date.startsWith(filterMonth))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

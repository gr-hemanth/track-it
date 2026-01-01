import { createClient } from '@supabase/supabase-js';
import './style.css';

// TODO: Replace with your actual Supabase project details
const SUPABASE_URL = 'https://hallwqyefzegwgmwcztu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGx3cXllZnplZ3dnbXdjenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDY0MzgsImV4cCI6MjA4MTk4MjQzOH0.HaTKAyceAKClMMMHMxLndMjeHDnpr9Vnn6urMgsECEY';

// Render UI structure
document.querySelector('#app').innerHTML = `
  <main class="app-container">
    <header class="app-header">
      <div class="brand">Track It</div>
    </header>
    
    <div id="config-warning" class="config-warning" style="display: none;">
      ⚠️ Please configure SUPABASE_URL and KEY in src/main.js
    </div>

    <div id="config-warning" class="config-warning" style="display: none;">
      ⚠️ Please configure SUPABASE_URL and KEY in src/main.js
    </div>

    <section class="overview-section">
      <h2 class="section-header">Dashboard</h2>
      <div class="summary-card">
        <span class="summary-label">Total Spent</span>
        <div id="total-display" class="summary-amount">$0.00</div>
      </div>
      <div id="insights-section" class="insights-card" style="display: none;">
        <div class="insights-icon">💡</div>
        <div id="insights-text" class="insights-text"></div>
      </div>
    </section>

    <section class="add-section">
      <h2 class="section-header">New Entry</h2>
      <div class="add-expense-form">
        <div class="form-row">
          <input type="text" id="category" class="input-field" placeholder="Category" />
          <input type="date" id="date" class="input-field" />
        </div>
        <div class="form-row">
          <input type="number" id="amount" class="input-field" placeholder="0.00" />
        </div>
        <button id="save-btn" class="btn-primary">Add Expense</button>
      </div>
    </section>

    <section class="list-section">
      <div class="list-header-row">
        <h2 class="section-header">History</h2>
        <div class="filter-wrapper">
          <select id="filter-category" class="filter-select">
            <option value="all">All Categories</option>
          </select>
        </div>
      </div>
      <div id="loading" class="loading" style="display: none;">Loading...</div>
      <ul id="expenses-list" class="expenses-list"></ul>
    </section>
  </main>
`;

let supabase;
const isConfigured = SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_KEY.length > 20;

if (isConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    console.error("Supabase init error:", e);
    document.getElementById('config-warning').textContent = "Error initializing Supabase: " + e.message;
    document.getElementById('config-warning').style.display = 'block';
  }
} else {
  document.getElementById('config-warning').style.display = 'block';
  // Mock supabase for UI testing
  supabase = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } }),
      insert: () => Promise.resolve({ error: { message: "Supabase not configured" } })
    })
  };
}

const categoryInput = document.getElementById('category');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const saveBtn = document.getElementById('save-btn');
const expensesList = document.getElementById('expenses-list');
const loading = document.getElementById('loading');
const totalDisplay = document.getElementById('total-display');
const filterCategory = document.getElementById('filter-category');
const insightsSection = document.getElementById('insights-section');
const insightsText = document.getElementById('insights-text');

// Set default date to today
dateInput.valueAsDate = new Date();

let allExpenses = [];

function generateInsights(expenses) {
  if (!expenses || expenses.length === 0) {
    insightsSection.style.display = 'none';
    return;
  }

  // Calculate totals by category
  const categoryTotals = expenses.reduce((acc, curr) => {
    const amount = parseFloat(curr.amount) || 0;
    acc[curr.category] = (acc[curr.category] || 0) + amount;
    return acc;
  }, {});

  // Find top category
  let topCategory = '';
  let maxAmount = 0;
  for (const [cat, total] of Object.entries(categoryTotals)) {
    if (total > maxAmount) {
      maxAmount = total;
      topCategory = cat;
    }
  }

  const totalSpent = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  // Generate friendly message
  let message = '';
  if (expenses.length < 3) {
    message = "Keep tracking expenses to reveal your spending habits!";
  } else if (topCategory) {
    const percent = Math.round((maxAmount / totalSpent) * 100);
    message = `You spent <strong>$${maxAmount.toFixed(0)}</strong> on <strong>${topCategory}</strong> this period. That's ${percent}% of your total.`;
  } else {
    message = `You've tracked ${expenses.length} expenses. Great start!`;
  }

  insightsText.innerHTML = message;
  insightsSection.style.display = 'flex';
}

function renderExpenses(expenses) {
  if (!expenses || expenses.length === 0) {
    expensesList.innerHTML = '<li class="empty">No expenses found.</li>';
    totalDisplay.textContent = 'Total: $0.00';
    insightsSection.style.display = 'none';
    return;
  }

  const total = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  totalDisplay.textContent = `Total: $${total.toFixed(2)}`;

  // Update insights based on visibility
  generateInsights(expenses);

  expensesList.innerHTML = expenses.map(expense => `
    <li class="expense-card">
      <div class="expense-info">
        <span class="cat-name">${expense.category}</span>
        <span class="date-label">${new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </div>
      <span class="expense-amount-display">$${parseFloat(expense.amount).toFixed(2)}</span>
    </li>
  `).join('');
}

function populateFilterOptions() {
  const categories = [...new Set(allExpenses.map(e => e.category))].sort();
  const currentVal = filterCategory.value;

  filterCategory.innerHTML = '<option value="all">All Categories</option>';

  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    filterCategory.appendChild(option);
  });

  // Restore selection if possible
  if (categories.includes(currentVal)) {
    filterCategory.value = currentVal;
  }
}

function filterExpenses() {
  const selectedCategory = filterCategory.value;
  if (selectedCategory === 'all') {
    renderExpenses(allExpenses);
  } else {
    const filtered = allExpenses.filter(e => e.category === selectedCategory);
    renderExpenses(filtered);
  }
}

async function fetchExpenses() {
  loading.style.display = 'block';
  expensesList.innerHTML = '';

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });

  loading.style.display = 'none';

  if (error) {
    console.error('Error fetching expenses:', error);
    expensesList.innerHTML = '<li class="error">Error loading expenses. Check console.</li>';
    return;
  }

  allExpenses = data || [];
  populateFilterOptions();
  filterExpenses(); // Renders based on current filter state
}

async function saveExpense() {
  const category = categoryInput.value;
  const amount = amountInput.value;
  const date = dateInput.value;

  if (!category || !amount || !date) {
    alert('Please fill in all fields');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const { error } = await supabase
    .from('expenses')
    .insert([{ category, amount, date }]);

  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Expense';

  if (error) {
    console.error('Error saving expense:', error);
    alert('Error saving expense. See console for details.');
  } else {
    // Clear form
    categoryInput.value = '';
    amountInput.value = '';
    dateInput.valueAsDate = new Date();
    // Refresh list
    fetchExpenses();
  }
}

saveBtn.addEventListener('click', saveExpense);
filterCategory.addEventListener('change', filterExpenses);

// Initial fetch
fetchExpenses();


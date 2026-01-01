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
        <div id="total-display" class="summary-amount">₹0.00</div>
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
          <select id="category" class="input-field">
            <option value="" disabled selected>Select category</option>
            <option value="Food">Food</option>
            <option value="Travel">Travel</option>
            <option value="Stationery">Stationery</option>
            <option value="Miscellaneous">Miscellaneous</option>
          </select>
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
} 
if (isConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    console.error("Supabase init error:", e);
    document.getElementById('config-warning').textContent =
      "Error initializing Supabase: " + e.message;
    document.getElementById('config-warning').style.display = 'block';
    throw e;
  }
} else {
  document.getElementById('config-warning').textContent =
    "Supabase is not configured properly.";
  document.getElementById('config-warning').style.display = 'block';
  throw new Error("Supabase not configured");
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
    message = `You spent <strong>₹${maxAmount.toFixed(0)}</strong> on <strong>${topCategory}</strong> this period. That's ${percent}% of your total.`;
  } else {
    message = `You've tracked ${expenses.length} expenses. Great start!`;
  }

  insightsText.innerHTML = message;
  insightsSection.style.display = 'flex';
}

function renderExpenses(expenses) {
  if (!expenses || expenses.length === 0) {
    expensesList.innerHTML = '<li class="empty">No expenses found.</li>';
    totalDisplay.textContent = 'Total: ₹0.00';
    insightsSection.style.display = 'none';
    return;
  }

  const total = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  totalDisplay.textContent = `Total: ₹${total.toFixed(2)}`;

  // Update insights based on visibility
  generateInsights(expenses);

  expensesList.innerHTML = expenses.map(expense => `
    <li class="expense-card">
      <div class="expense-info">
        <span class="cat-name">${expense.category}</span>
        <input 
          type="date" 
          class="date-edit-input" 
          value="${expense.date.split('T')[0]}" 
          data-id="${expense.id}"
        />
      </div>
      <div class="expense-actions">
        <span class="expense-amount-display">₹${parseFloat(expense.amount).toFixed(2)}</span>
        <button class="delete-btn" data-id="${expense.id}" title="Delete Expense">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </li>
  `).join('');
}

async function deleteExpense(id) {
  console.log('Attempting to delete expense:', id);
  // Disable button to prevent double-click? (handled by fetch refresh usually, but good practice)

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting expense:', error);
    alert('Failed to delete expense: ' + error.message);
  } else {
    console.log('Expense deleted successfully');
    await fetchExpenses(); // Wait for refresh
  }
}

async function updateExpenseDate(id, newDate) {
  console.log('Updating date for expense:', id, 'to', newDate);

  const { error } = await supabase
    .from('expenses')
    .update({ date: newDate })
    .eq('id', id);

  if (error) {
    console.error('Error updating date:', error);
    alert('Failed to update date: ' + error.message);
  } else {
    console.log('Date updated successfully');
    await fetchExpenses(); // Wait for refresh
  }
}

// Event Delegation for History List
expensesList.addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('.delete-btn');
  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    deleteExpense(id);
  }
});

expensesList.addEventListener('change', (e) => {
  if (e.target.classList.contains('date-edit-input')) {
    const id = e.target.dataset.id;
    const newDate = e.target.value;
    updateExpenseDate(id, newDate);
  }
});

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


import { createClient } from '@supabase/supabase-js';
import './style.css';

// TODO: Replace with your actual Supabase project details
const SUPABASE_URL = 'https://hallwqyefzegwgmwcztu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbGx3cXllZnplZ3dnbXdjenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDY0MzgsImV4cCI6MjA4MTk4MjQzOH0.HaTKAyceAKClMMMHMxLndMjeHDnpr9Vnn6urMgsECEY';

// Render UI first
document.querySelector('#app').innerHTML = `
  <div class="container">
    <h1 class="title">TRACK_IT</h1>
    
    <div id="config-warning" class="error" style="display: none; margin-bottom: 1rem; border: 1px solid red; background: #2a1111;">
      ⚠️ Please configure SUPABASE_URL and KEY in src/main.js
    </div>

    <div class="card form-container">
      <div class="input-group">
        <input type="text" id="category" placeholder="Category (e.g., Food)" />
      </div>
      <div class="input-group">
        <input type="number" id="amount" placeholder="Amount" />
      </div>
      <div class="input-group">
        <input type="date" id="date" />
      </div>
      <button id="save-btn" class="action-btn">Save Expense</button>
    </div>

    <div class="expenses-container">
      <h2>Recent Expenses</h2>
      <div id="loading" class="loading">Loading...</div>
      <ul id="expenses-list" class="expenses-list"></ul>
    </div>
  </div>
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
  // Mock supabase for UI testing without crashing
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

// Set default date to today
dateInput.valueAsDate = new Date();

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

  if (!data || data.length === 0) {
    expensesList.innerHTML = '<li class="empty">No expenses found.</li>';
    return;
  }

  expensesList.innerHTML = data.map(expense => `
    <li class="expense-item">
      <span class="expense-category">${expense.category}</span>
      <span class="expense-date">${new Date(expense.date).toLocaleDateString()}</span>
      <span class="expense-amount">$${expense.amount}</span>
    </li>
  `).join('');
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

// Initial fetch
fetchExpenses();


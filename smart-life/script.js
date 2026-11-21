/* ==========================================================================
   Smart Life — Premium Personal Life Toolkit (Modular Vanilla JS SPA/PWA)
   Offline-first • LocalStorage Persistence • GitHub Pages Compatible
   ========================================================================== */

(function () {
  'use strict';

  const STORAGE_KEY = 'smart_life_app_v1';

  /* ------------------------------------------------------------------------
     1. Utilities & Date Helpers
     ------------------------------------------------------------------------ */
  const Utils = {
    uid(prefix = 'id') {
      return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    },
    todayISO() {
      const d = new Date();
      return Utils.toISO(d);
    },
    toISO(dateObj) {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    },
    addDaysISO(iso, offset) {
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d + offset);
      return Utils.toISO(dt);
    },
    formatDate(iso) {
      if (!iso) return '';
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    },
    formatShortDay(iso) {
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString(undefined, { weekday: 'short' });
    },
    getWeekDates(baseIso = Utils.todayISO()) {
      const [y, m, d] = baseIso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const day = dt.getDay(); // 0=Sun
      const diffToMon = (day === 0 ? -6 : 1 - day);
      const monday = new Date(y, m - 1, d + diffToMon);
      return Array.from({ length: 7 }, (_, i) => {
        const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        return Utils.toISO(cur);
      });
    },
    getLastNDays(n = 7) {
      const today = Utils.todayISO();
      return Array.from({ length: n }, (_, i) => Utils.addDaysISO(today, i - (n - 1)));
    },
    getMonthDays(year, monthIndex) {
      const firstDay = new Date(year, monthIndex, 1).getDay();
      const totalDays = new Date(year, monthIndex + 1, 0).getDate();
      return { firstDay, totalDays };
    },
    escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    formatCurrency(val, symbol = '₹') {
      const num = Number(val) || 0;
      const abs = Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
      return `${num < 0 ? '-' : ''}${symbol}${abs}`;
    },
    daysUntilMonthDay(mmdd) {
      if (!mmdd || !mmdd.includes('-')) return 999;
      const parts = mmdd.split('-').map(Number);
      const month = parts.length === 3 ? parts[1] : parts[0];
      const day = parts.length === 3 ? parts[2] : parts[1];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let target = new Date(now.getFullYear(), month - 1, day);
      if (target < today) {
        target = new Date(now.getFullYear() + 1, month - 1, day);
      }
      return Math.round((target - today) / 86400000);
    },
    calcHoursBetween(bed, wake) {
      if (!bed || !wake) return 0;
      const [bh, bm] = bed.split(':').map(Number);
      const [wh, wm] = wake.split(':').map(Number);
      let mins = (wh * 60 + wm) - (bh * 60 + bm);
      if (mins <= 0) mins += 1440;
      return Math.round((mins / 60) * 10) / 10;
    },
    initials(name) {
      const parts = (name || 'Smart Life').trim().split(/\s+/);
      return ((parts[0]?.[0] || 'S') + (parts[1]?.[0] || parts[0]?.[1] || 'L')).toUpperCase();
    }
  };

  /* ------------------------------------------------------------------------
     2. Tool Catalog (for Quick Tools, Favorites, Search, Mobile More Drawer)
     ------------------------------------------------------------------------ */
  const TOOLS = [
    { id: 'planner', name: 'Daily Planner', desc: 'Tasks, routines & time blocks', route: 'planner', icon: 'calendar' },
    { id: 'habits', name: 'Habit Tracker', desc: 'Streaks & daily consistency', route: 'habits', icon: 'chart' },
    { id: 'goals', name: 'Goal Management', desc: 'Milestones & deadlines', route: 'goals', icon: 'target' },
    { id: 'finance', name: 'Personal Finance', desc: 'Budget, expenses & savings', route: 'finance', icon: 'wallet' },
    { id: 'timer', name: 'Time Management', desc: 'Pomodoro, focus & stopwatch', route: 'timer', icon: 'clock' },
    { id: 'health', name: 'Health & Lifestyle', desc: 'Water, sleep, walks & meals', route: 'health', icon: 'heart' },
    { id: 'organizer', name: 'Personal Organizer', desc: 'Notes, diary, birthdays & lists', route: 'organizer', icon: 'book' },
    { id: 'ai', name: 'AI Assistant', desc: 'Smart templates & planning', route: 'ai', icon: 'spark' },
    { id: 'premium', name: 'Smart Life Premium', desc: '₹399/mo plan & billing', route: 'premium', icon: 'star' },
    { id: 'settings', name: 'Settings & Backup', desc: 'Theme, profile & export/import', route: 'settings', icon: 'settings' }
  ];

  /* ------------------------------------------------------------------------
     3. Default Seed Data & LocalStorage Store
     ------------------------------------------------------------------------ */
  function createDefaultState() {
    const today = Utils.todayISO();
    const yesterday = Utils.addDaysISO(today, -1);
    const twoDaysAgo = Utils.addDaysISO(today, -2);
    const currentMonth = today.slice(0, 7);

    return {
      profile: {
        name: 'Aarav Sharma',
        headline: 'Balanced Focus & Growth',
        workspace: 'My Personal Space',
        currency: '₹',
        dailyFocusGoalHours: 4
      },
      theme: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      favorites: ['planner', 'habits', 'finance', 'timer', 'ai'],
      subscription: {
        plan: 'free', // 'free' | 'premium_demo'
        pricePerMonth: 399,
        currency: '₹',
        startedAt: null,
        paymentMethodPlaceholder: 'UPI (Placeholder)',
        billingHistory: []
      },
      planner: {
        tasks: [
          { id: Utils.uid('t'), title: 'Review top 3 priorities for today', date: today, time: '09:00', priority: 'High', category: 'Work', completed: true },
          { id: Utils.uid('t'), title: 'Complete 25-minute deep focus sprint', date: today, time: '10:30', priority: 'High', category: 'Focus', completed: false },
          { id: Utils.uid('t'), title: 'Log daily groceries & household budget', date: today, time: '18:00', priority: 'Medium', category: 'Finance', completed: false },
          { id: Utils.uid('t'), title: 'Evening 30-min walk outdoors', date: today, time: '19:00', priority: 'Low', category: 'Lifestyle', completed: false },
          { id: Utils.uid('t'), title: 'Plan weekend meal prep', date: Utils.addDaysISO(today, 1), time: '11:00', priority: 'Medium', category: 'Personal', completed: false }
        ],
        checklists: [
          {
            id: Utils.uid('cl'),
            title: 'Morning Launch Checklist',
            items: [
              { id: Utils.uid('ci'), text: 'Drink a glass of water', done: true },
              { id: Utils.uid('ci'), text: 'Check calendar & important dates', done: true },
              { id: Utils.uid('ci'), text: 'Pick 1 non-negotiable goal', done: false }
            ]
          }
        ],
        routines: [
          { id: Utils.uid('rt'), period: 'Morning', time: '07:00', title: 'Hydrate, stretch & sunlight', doneDates: [today] },
          { id: Utils.uid('rt'), period: 'Morning', time: '07:45', title: '10-minute daily planning', doneDates: [] },
          { id: Utils.uid('rt'), period: 'Afternoon', time: '13:30', title: 'Screen break & mindful lunch', doneDates: [] },
          { id: Utils.uid('rt'), period: 'Evening', time: '21:30', title: 'Digital sunset & gratitude note', doneDates: [] }
        ],
        timeBlocks: [
          { id: Utils.uid('tb'), date: today, hour: '09:00', title: 'Deep Work Block', tag: 'Focus' },
          { id: Utils.uid('tb'), date: today, hour: '14:00', title: 'Admin & Messages', tag: 'Personal' },
          { id: Utils.uid('tb'), date: today, hour: '18:00', title: 'Fitness & Walk', tag: 'Health' }
        ]
      },
      habits: [
        { id: Utils.uid('hb'), name: 'Morning Hydration (2L+)', category: 'Lifestyle', targetDays: 7, reminder: '08:00', completedDates: [twoDaysAgo, yesterday, today] },
        { id: Utils.uid('hb'), name: 'Read 20 Pages', category: 'Learning', targetDays: 7, reminder: '21:00', completedDates: [twoDaysAgo, yesterday] },
        { id: Utils.uid('hb'), name: '30m Focused Deep Work', category: 'Productivity', targetDays: 5, reminder: '10:00', completedDates: [yesterday, today] },
        { id: Utils.uid('hb'), name: 'Zero Impulse Spending Day', category: 'Finance', targetDays: 6, reminder: '20:00', completedDates: [twoDaysAgo] }
      ],
      goals: [
        {
          id: Utils.uid('gl'),
          title: 'Build 6-Month Emergency Fund',
          category: 'Financial',
          deadline: Utils.addDaysISO(today, 90),
          progress: 65,
          notes: 'Automate monthly transfer on salary day.',
          milestones: [
            { id: Utils.uid('ms'), text: 'Open dedicated high-yield savings bucket', done: true },
            { id: Utils.uid('ms'), text: 'Reach first ₹50,000 milestone', done: true },
            { id: Utils.uid('ms'), text: 'Reach ₹1,00,000 milestone', done: false }
          ]
        },
        {
          id: Utils.uid('gl'),
          title: 'Complete Full-Stack TypeScript Course',
          category: 'Learning',
          deadline: Utils.addDaysISO(today, 45),
          progress: 40,
          notes: '45 minutes every weekday morning.',
          milestones: [
            { id: Utils.uid('ms'), text: 'Finish core modules 1–4', done: true },
            { id: Utils.uid('ms'), text: 'Build capstone project', done: false }
          ]
        },
        {
          id: Utils.uid('gl'),
          title: 'Walk 8,000+ Steps 5 Days a Week',
          category: 'Health & Fitness',
          deadline: Utils.addDaysISO(today, 30),
          progress: 75,
          notes: 'Consistent outdoor evening walks.',
          milestones: [
            { id: Utils.uid('ms'), text: 'Week 1 consistency complete', done: true },
            { id: Utils.uid('ms'), text: 'Week 2 consistency complete', done: true }
          ]
        }
      ],
      finance: {
        monthlyBudget: 25000,
        savingsGoal: 100000,
        currentSavings: 64500,
        transactions: [
          { id: Utils.uid('tx'), type: 'income', amount: 65000, category: 'Salary', date: `${currentMonth}-01`, note: 'Monthly salary credit' },
          { id: Utils.uid('tx'), type: 'expense', amount: 8500, category: 'Housing', date: `${currentMonth}-03`, note: 'Rent & maintenance' },
          { id: Utils.uid('tx'), type: 'expense', amount: 3250, category: 'Food', date: yesterday, note: 'Weekly groceries & produce' },
          { id: Utils.uid('tx'), type: 'expense', amount: 1450, category: 'Utilities', date: today, note: 'Fiber internet & mobile bill' },
          { id: Utils.uid('tx'), type: 'expense', amount: 980, category: 'Transport', date: today, note: 'Metro card top-up & commute' }
        ]
      },
      timer: {
        pomodoroWorkMin: 25,
        pomodoroShortMin: 5,
        pomodoroLongMin: 15,
        soundEnabled: true,
        sessions: [
          { id: Utils.uid('tm'), label: 'Morning Planning & Inbox Zero', mode: 'Pomodoro', minutes: 25, date: today, timestamp: new Date().toISOString() },
          { id: Utils.uid('tm'), label: 'Project Architecture Draft', mode: 'Focus', minutes: 45, date: yesterday, timestamp: new Date(Date.now() - 86400000).toISOString() }
        ]
      },
      health: {
        waterGoalCups: 8,
        waterByDate: { [today]: 4, [yesterday]: 7 },
        sleepLogs: [
          { id: Utils.uid('sl'), date: today, bedtime: '23:15', wakeTime: '06:45', hours: 7.5, quality: 4, note: 'Rested well' },
          { id: Utils.uid('sl'), date: yesterday, bedtime: '23:45', wakeTime: '06:30', hours: 6.8, quality: 3, note: 'Slightly late night' }
        ],
        walkStepGoal: 8000,
        walkLogs: [
          { id: Utils.uid('wk'), date: today, steps: 5400, distanceKm: 4.1, minutes: 45 },
          { id: Utils.uid('wk'), date: yesterday, steps: 8350, distanceKm: 6.4, minutes: 65 }
        ],
        exercises: [
          { id: Utils.uid('ex'), name: 'Mobility & Core Stretch', day: 'Mon', duration: 20, completed: true },
          { id: Utils.uid('ex'), name: 'Brisk Outdoor Walk', day: 'Wed', duration: 40, completed: false },
          { id: Utils.uid('ex'), name: 'Bodyweight Strength', day: 'Fri', duration: 30, completed: false }
        ],
        meals: {
          Mon: { breakfast: 'Oats with berries & seeds', lunch: 'Dal, brown rice & salad', dinner: 'Grilled paneer & veggies', snack: 'Roasted almonds' },
          Tue: { breakfast: 'Vegetable poha', lunch: 'Quinoa chickpea bowl', dinner: 'Soup & multigrain toast', snack: 'Seasonal fruit' },
          Wed: { breakfast: 'Moong chilla & mint chutney', lunch: 'Rajma & steamed rice', dinner: 'Stir-fry tofu & greens', snack: 'Yogurt & walnuts' },
          Thu: { breakfast: 'Smoothie bowl', lunch: 'Whole wheat wrap & salad', dinner: 'Khichdi & cucumber raita', snack: 'Sprouts chaat' },
          Fri: { breakfast: 'Idli & sambar', lunch: 'Millet pulao & curd', dinner: 'Light vegetable curry', snack: 'Mixed seeds' },
          Sat: { breakfast: 'Avocado & egg toast', lunch: 'Homemade thali', dinner: 'Pasta primavera', snack: 'Dark chocolate & tea' },
          Sun: { breakfast: 'Masala dosa', lunch: 'Family lunch', dinner: 'Light salad & soup', snack: 'Fresh coconut water' }
        },
        wellnessJournal: [
          { id: Utils.uid('wj'), date: today, mood: 'Energized', energy: 4, note: 'Steady morning routine helped me start calmly.' }
        ],
        wellnessChecklist: [
          { id: Utils.uid('wc'), text: '10 min morning sunlight', doneDates: [today] },
          { id: Utils.uid('wc'), text: '5 min posture & neck stretch', doneDates: [] },
          { id: Utils.uid('wc'), text: 'Mindful screen-free break', doneDates: [] },
          { id: Utils.uid('wc'), text: 'Hydration target check', doneDates: [] }
        ]
      },
      organizer: {
        notes: [
          { id: Utils.uid('nt'), title: 'Q4 Personal Priorities', tag: 'Focus', pinned: true, content: '1. Keep mornings distraction-free until 10:30 AM.\n2. Track every expense weekly.\n3. Sleep before 11:15 PM.', updatedAt: today },
          { id: Utils.uid('nt'), title: 'Book Recommendations', tag: 'Reading', pinned: false, content: '- Atomic Habits\n- Deep Work\n- The Psychology of Money', updatedAt: yesterday }
        ],
        diary: [
          { id: Utils.uid('dr'), date: today, mood: 'Grateful', title: 'Clear mind, steady pace', content: 'Felt productive after setting clear time blocks for the morning.' }
        ],
        importantDates: [
          { id: Utils.uid('id'), title: 'Mom’s Birthday', type: 'Birthday', date: `${today.slice(0, 4)}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.min(28, new Date().getDate() + 3)).padStart(2, '0')}`, note: 'Order flowers & call early' },
          { id: Utils.uid('id'), title: 'Passport Renewal Check', type: 'Important Date', date: Utils.addDaysISO(today, 20), note: 'Verify documents' }
        ],
        events: [
          { id: Utils.uid('ev'), title: 'Sunday Coffee Catch-up', date: Utils.addDaysISO(today, 2), time: '11:00', location: 'Third Wave Roasters', note: 'Bring notebook' }
        ],
        shoppingList: [
          { id: Utils.uid('sh'), listType: 'Grocery', text: 'Fresh spinach & avocados', done: false },
          { id: Utils.uid('sh'), listType: 'Grocery', text: 'Rolled oats & almond milk', done: true },
          { id: Utils.uid('sh'), listType: 'Shopping', text: 'USB-C braided cable', done: false }
        ],
        checklists: {
          travel: [
            { id: Utils.uid('tr'), text: 'Photo ID / Passport', done: true },
            { id: Utils.uid('tr'), text: 'Phone charger & power bank', done: false },
            { id: Utils.uid('tr'), text: 'Toiletries pouch', done: false },
            { id: Utils.uid('tr'), text: 'Travel tickets & offline copies', done: false }
          ],
          documents: [
            { id: Utils.uid('dc'), text: 'Government ID & Address Proof', done: true },
            { id: Utils.uid('dc'), text: 'Tax & Bank Statements Backup', done: true },
            { id: Utils.uid('dc'), text: 'Insurance Policy PDF', done: false }
          ]
        }
      },
      ai: {
        provider: 'demo', // 'demo' | 'gemini' | 'openai' | 'custom'
        model: 'smart-life-demo-v1',
        endpoint: '',
        apiKey: '', // Stored only locally if user chooses to enter one
        history: []
      },
      activities: [
        { id: Utils.uid('ac'), text: 'Initialized Smart Life personal workspace', category: 'System', route: 'dashboard', time: new Date().toISOString() },
        { id: Utils.uid('ac'), text: 'Completed task "Review top 3 priorities for today"', category: 'Planner', route: 'planner', time: new Date(Date.now() - 3600000).toISOString() },
        { id: Utils.uid('ac'), text: 'Logged 25m Pomodoro focus session', category: 'Timer', route: 'timer', time: new Date(Date.now() - 7200000).toISOString() }
      ]
    };
  }

  const Store = {
    state: null,
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.state = this.mergeDefaults(createDefaultState(), parsed);
        } else {
          this.state = createDefaultState();
          this.save();
        }
      } catch (err) {
        console.warn('Smart Life: Failed to read localStorage, resetting defaults.', err);
        this.state = createDefaultState();
      }
      return this.state;
    },
    mergeDefaults(def, saved) {
      if (!saved || typeof saved !== 'object') return def;
      const out = Array.isArray(def) ? [...def] : { ...def };
      for (const key of Object.keys(saved)) {
        if (saved[key] && typeof saved[key] === 'object' && !Array.isArray(saved[key]) && def[key] && typeof def[key] === 'object' && !Array.isArray(def[key])) {
          out[key] = this.mergeDefaults(def[key], saved[key]);
        } else {
          out[key] = saved[key];
        }
      }
      return out;
    },
    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (err) {
        UI.toast('Could not save to LocalStorage (storage full or blocked).', 'warning');
      }
    },
    logActivity(text, category = 'General', route = 'dashboard') {
      this.state.activities.unshift({
        id: Utils.uid('ac'),
        text,
        category,
        route,
        time: new Date().toISOString()
      });
      if (this.state.activities.length > 30) {
        this.state.activities = this.state.activities.slice(0, 30);
      }
      this.save();
    },
    computeProductivityScore() {
      const today = Utils.todayISO();
      const tasksToday = this.state.planner.tasks.filter(t => t.date === today);
      const taskRate = tasksToday.length
        ? tasksToday.filter(t => t.completed).length / tasksToday.length
        : 0.6;

      const habits = this.state.habits;
      const habitRate = habits.length
        ? habits.filter(h => h.completedDates.includes(today)).length / habits.length
        : 0.6;

      const routines = this.state.planner.routines;
      const routineRate = routines.length
        ? routines.filter(r => r.doneDates.includes(today)).length / routines.length
        : 0.5;

      const focusMinsToday = this.state.timer.sessions
        .filter(s => s.date === today)
        .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
      const focusGoalMins = (Number(this.state.profile.dailyFocusGoalHours) || 2) * 60;
      const focusRate = Math.min(1, focusMinsToday / Math.max(30, focusGoalMins * 0.5));

      const score = Math.round((taskRate * 0.35 + habitRate * 0.35 + routineRate * 0.15 + focusRate * 0.15) * 100);
      return Math.max(0, Math.min(100, score));
    },
    getAlerts() {
      const alerts = [];
      const today = Utils.todayISO();
      const month = today.slice(0, 7);
      const sym = this.state.profile.currency || '₹';

      // Budget alert
      const spent = this.state.finance.transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(month))
        .reduce((s, t) => s + Number(t.amount), 0);
      const budget = Number(this.state.finance.monthlyBudget) || 0;
      if (budget > 0) {
        const pct = Math.round((spent / budget) * 100);
        if (pct >= 100) {
          alerts.push({ level: 'danger', title: 'Monthly Budget Exceeded', msg: `Spent ${Utils.formatCurrency(spent, sym)} of ${Utils.formatCurrency(budget, sym)} (${pct}%).`, route: 'finance' });
        } else if (pct >= 80) {
          alerts.push({ level: 'warning', title: 'Budget Alert (80%+)', msg: `You have used ${pct}% of your monthly budget.`, route: 'finance' });
        }
      }

      // Upcoming birthdays / important dates within 7 days
      this.state.organizer.importantDates.forEach(item => {
        const days = Utils.daysUntilMonthDay(item.date);
        if (days <= 7) {
          alerts.push({
            level: 'info',
            title: `${item.type}: ${item.title}`,
            msg: days === 0 ? 'Happening today!' : `In ${days} day${days === 1 ? '' : 's'} (${Utils.formatDate(item.date)})`,
            route: 'organizer'
          });
        }
      });

      // High-priority tasks due today
      const urgent = this.state.planner.tasks.filter(t => t.date === today && !t.completed && t.priority === 'High');
      if (urgent.length) {
        alerts.push({
          level: 'info',
          title: `${urgent.length} High-Priority Task${urgent.length > 1 ? 's' : ''} Today`,
          msg: urgent.map(u => u.title).slice(0, 2).join(', '),
          route: 'planner'
        });
      }
      return alerts;
    }
  };

  /* ------------------------------------------------------------------------
     4. Functional SVG Charts
     ------------------------------------------------------------------------ */
  const Charts = {
    radialScore(percent, label = 'Score') {
      const r = 46;
      const c = 2 * Math.PI * r;
      const offset = c - (Math.max(0, Math.min(100, percent)) / 100) * c;
      return `
        <svg viewBox="0 0 120 120" width="112" height="112" aria-label="${label} ${percent}%">
          <defs>
            <linearGradient id="slRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#14B8A6"/>
              <stop offset="100%" stop-color="#7C3AED"/>
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--border-color)" stroke-width="10"/>
          <circle cx="60" cy="60" r="${r}" fill="none" stroke="url(#slRingGrad)" stroke-width="10"
            stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
            transform="rotate(-90 60 60)"/>
          <text x="60" y="58" text-anchor="middle" font-size="22" font-weight="800" fill="currentColor">${percent}%</text>
          <text x="60" y="75" text-anchor="middle" font-size="10" font-weight="600" fill="var(--text-muted)">${Utils.escapeHtml(label)}</text>
        </svg>
      `;
    },

    barChart(points, options = {}) {
      const maxVal = Math.max(options.minMax || 10, ...points.map(p => p.value));
      const height = 150;
      const barW = 28;
      const gap = 18;
      const padL = 16;
      const totalW = padL * 2 + points.length * (barW + gap) - gap;
      const gradId = `barGrad_${Math.random().toString(36).slice(2, 6)}`;
      const c1 = options.color1 || '#14B8A6';
      const c2 = options.color2 || '#7C3AED';

      const bars = points.map((p, i) => {
        const barH = Math.max(4, Math.round((p.value / maxVal) * 100));
        const x = padL + i * (barW + gap);
        const y = 116 - barH;
        return `
          <g>
            <rect x="${x}" y="16" width="${barW}" height="100" rx="8" fill="var(--bg-hover)"/>
            <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="8" fill="url(#${gradId})">
              <title>${Utils.escapeHtml(p.label)}: ${p.value}${options.unit || ''}</title>
            </rect>
            <text x="${x + barW / 2}" y="${Math.max(12, y - 5)}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text-secondary)">${p.value}${options.unit || ''}</text>
            <text x="${x + barW / 2}" y="136" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--text-muted)">${Utils.escapeHtml(p.label)}</text>
          </g>
        `;
      }).join('');

      return `
        <svg viewBox="0 0 ${totalW} ${height}" width="100%" height="160" role="img" aria-label="${Utils.escapeHtml(options.ariaLabel || 'Bar Chart')}">
          <defs>
            <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${c2}"/>
              <stop offset="100%" stop-color="${c1}"/>
            </linearGradient>
          </defs>
          ${bars}
        </svg>
      `;
    },

    donutChart(segments, centerTop = 'Total', centerVal = '0') {
      const total = segments.reduce((s, x) => s + x.value, 0);
      const palette = ['#0D9488', '#7C3AED', '#14B8A6', '#8B5CF6', '#F59E0B', '#0EA5E9', '#EC4899'];
      if (total <= 0) {
        return `<div class="empty-state">No spending recorded for this month yet.</div>`;
      }
      const r = 48;
      const circ = 2 * Math.PI * r;
      let acc = 0;
      const arcs = segments.map((seg, idx) => {
        const frac = seg.value / total;
        const dash = frac * circ;
        const offset = -acc * circ;
        acc += frac;
        const color = palette[idx % palette.length];
        return `<circle cx="65" cy="65" r="${r}" fill="none" stroke="${color}" stroke-width="18"
          stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${offset}" transform="rotate(-90 65 65)">
          <title>${Utils.escapeHtml(seg.label)}: ${seg.displayValue || seg.value}</title>
        </circle>`;
      }).join('');

      const legend = segments.map((seg, idx) => `
        <span class="legend-item">
          <span class="legend-swatch" style="background:${palette[idx % palette.length]}"></span>
          <span>${Utils.escapeHtml(seg.label)} (${Math.round((seg.value / total) * 100)}%)</span>
        </span>
      `).join('');

      return `
        <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
          <svg viewBox="0 0 130 130" width="136" height="136" style="flex-shrink:0;">
            ${arcs}
            <text x="65" y="61" text-anchor="middle" font-size="10" font-weight="600" fill="var(--text-muted)">${Utils.escapeHtml(centerTop)}</text>
            <text x="65" y="77" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor">${Utils.escapeHtml(centerVal)}</text>
          </svg>
          <div class="chart-legend" style="margin-top:0;flex:1;flex-direction:column;gap:7px;">
            ${legend}
          </div>
        </div>
      `;
    }
  };

  /* ------------------------------------------------------------------------
     5. Habit Streak & Stats Logic
     ------------------------------------------------------------------------ */
  function calculateHabitStreaks(habit) {
    const set = new Set(habit.completedDates || []);
    const today = Utils.todayISO();
    let current = 0;
    let cursor = set.has(today) ? today : Utils.addDaysISO(today, -1);
    while (set.has(cursor)) {
      current++;
      cursor = Utils.addDaysISO(cursor, -1);
    }

    const sorted = Array.from(set).sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const d of sorted) {
      if (prev && Utils.addDaysISO(prev, 1) === d) {
        run++;
      } else {
        run = 1;
      }
      if (run > best) best = run;
      prev = d;
    }
    return { current, best };
  }

  /* ------------------------------------------------------------------------
     6. Global UI, Navigation, Theme, Modal, Toast, Search, PWA
     ------------------------------------------------------------------------ */
  const Router = {
    current: 'dashboard',
    subTab: {},
    calendarMonthOffset: 0,
    selectedCalendarDate: Utils.todayISO(),
    go(route, tab = null) {
      const valid = TOOLS.some(t => t.route === route) || route === 'dashboard';
      this.current = valid ? route : 'dashboard';
      if (tab) this.subTab[this.current] = tab;
      window.location.hash = `#${this.current}`;
      UI.closeSidebar();
      UI.render();
      document.getElementById('mainContent')?.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const UI = {
    deferredInstallPrompt: null,

    init() {
      this.applyTheme(Store.state.theme);
      this.bindGlobalEvents();
      const hashRoute = window.location.hash.replace('#', '');
      if (hashRoute && (hashRoute === 'dashboard' || TOOLS.some(t => t.route === hashRoute))) {
        Router.current = hashRoute;
      }
      this.render();
      this.registerServiceWorker();
    },

    applyTheme(theme) {
      Store.state.theme = theme === 'dark' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', Store.state.theme);
      const sun = document.getElementById('themeIconSun');
      const moon = document.getElementById('themeIconMoon');
      if (sun && moon) {
        sun.classList.toggle('hidden', Store.state.theme !== 'dark');
        moon.classList.toggle('hidden', Store.state.theme === 'dark');
      }
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', Store.state.theme === 'dark' ? '#111827' : '#0D9488');
      }
    },

    toast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      if (!container) return;
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.textContent = message;
      container.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        setTimeout(() => el.remove(), 220);
      }, 3000);
    },

    openModal(title, htmlContent) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML = htmlContent;
      document.getElementById('modalBackdrop').classList.remove('hidden');
    },

    closeModal() {
      document.getElementById('modalBackdrop').classList.add('hidden');
      document.getElementById('modalBody').innerHTML = '';
    },

    openSidebar() {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('sidebarScrim').classList.add('open');
    },

    closeSidebar() {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarScrim').classList.remove('open');
    },

    updateChrome() {
      const s = Store.state;
      const titles = {
        dashboard: 'Dashboard',
        planner: 'Daily Planner',
        habits: 'Habit Tracker',
        goals: 'Goal Management',
        finance: 'Personal Finance',
        timer: 'Time Management',
        health: 'Health & Lifestyle',
        organizer: 'Personal Organizer',
        ai: 'AI Everyday Assistant',
        premium: 'Smart Life Premium',
        settings: 'Settings & Profile'
      };
      document.getElementById('topbarTitle').textContent = titles[Router.current] || 'Smart Life';
      document.getElementById('topbarDate').textContent = new Date().toLocaleDateString(undefined, {
        weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
      });
      document.getElementById('sidebarWorkspaceName').textContent = s.profile.workspace || 'My Personal Space';
      document.getElementById('topbarAvatarInitials').textContent = Utils.initials(s.profile.name);
      document.getElementById('topbarScoreValue').textContent = Store.computeProductivityScore();

      const planBadge = document.getElementById('sidebarPlanBadge');
      if (planBadge) {
        const isPrem = s.subscription.plan === 'premium_demo';
        planBadge.textContent = isPrem ? 'Demo Pro' : 'Free';
        planBadge.className = `nav-badge ${isPrem ? 'badge-violet' : 'badge-teal'}`;
      }

      // Active nav items
      document.querySelectorAll('.nav-item[data-route]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.route === Router.current);
      });
      document.querySelectorAll('.mobile-nav-item[data-route]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.route === Router.current);
      });

      // Sidebar favorites
      const favList = document.getElementById('sidebarFavoritesList');
      if (favList) {
        const favTools = TOOLS.filter(t => s.favorites.includes(t.route));
        favList.innerHTML = favTools.length
          ? favTools.map(t => `
              <button class="nav-item ${Router.current === t.route ? 'active' : ''}" data-route="${t.route}">
                <span class="nav-icon" style="color:#F59E0B;">★</span>
                <span>${Utils.escapeHtml(t.name)}</span>
              </button>
            `).join('')
          : `<div style="padding:4px 12px;font-size:0.76rem;color:var(--text-muted);">Star a tool to pin it here</div>`;
      }

      // Alerts dot
      const alerts = Store.getAlerts();
      const dot = document.getElementById('alertsBadge');
      if (dot) dot.classList.toggle('hidden', alerts.length === 0);

      // Offline pill
      const offPill = document.getElementById('offlinePill');
      if (offPill) offPill.classList.toggle('hidden', navigator.onLine !== false);
    },

    render() {
      this.updateChrome();
      const main = document.getElementById('mainContent');
      if (!main) return;

      const views = {
        dashboard: Views.dashboard,
        planner: Views.planner,
        habits: Views.habits,
        goals: Views.goals,
        finance: Views.finance,
        timer: Views.timer,
        health: Views.health,
        organizer: Views.organizer,
        ai: Views.ai,
        premium: Views.premium,
        settings: Views.settings
      };

      const renderer = views[Router.current] || Views.dashboard;
      main.innerHTML = renderer();
      Binders.bindCurrentView();
    },

    bindGlobalEvents() {
      // Navigation click delegation
      document.addEventListener('click', (e) => {
        const favBtn = e.target.closest('[data-toggle-fav]');
        if (favBtn) {
          e.stopPropagation();
          const id = favBtn.dataset.toggleFav;
          const idx = Store.state.favorites.indexOf(id);
          if (idx >= 0) {
            Store.state.favorites.splice(idx, 1);
            UI.toast('Removed from Favorites', 'info');
          } else {
            Store.state.favorites.push(id);
            UI.toast('Added to Favorites ★', 'success');
          }
          Store.save();
          UI.render();
          return;
        }

        const routeBtn = e.target.closest('[data-route]');
        if (routeBtn) {
          e.preventDefault();
          const r = routeBtn.dataset.route;
          const tab = routeBtn.dataset.tab || null;
          Router.go(r, tab);
          return;
        }

        const editWs = e.target.closest('[data-action="edit-workspace"]');
        if (editWs) {
          UI.openWorkspaceModal();
        }
      });

      document.getElementById('openSidebarBtn')?.addEventListener('click', () => this.openSidebar());
      document.getElementById('closeSidebarBtn')?.addEventListener('click', () => this.closeSidebar());
      document.getElementById('sidebarScrim')?.addEventListener('click', () => this.closeSidebar());

      document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
        this.applyTheme(Store.state.theme === 'dark' ? 'light' : 'dark');
        Store.save();
        this.toast(`Switched to ${Store.state.theme} mode`, 'info');
      });

      document.getElementById('modalCloseBtn')?.addEventListener('click', () => this.closeModal());
      document.getElementById('modalBackdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'modalBackdrop') this.closeModal();
      });

      document.getElementById('quickAddBtn')?.addEventListener('click', () => this.openQuickAddModal());
      document.getElementById('alertsBellBtn')?.addEventListener('click', () => this.openAlertsModal());
      document.getElementById('mobileMoreBtn')?.addEventListener('click', () => this.openMobileToolsModal());

      // Global search
      const searchInput = document.getElementById('globalSearchInput');
      const resultsBox = document.getElementById('globalSearchResults');
      if (searchInput && resultsBox) {
        searchInput.addEventListener('input', () => {
          const q = searchInput.value.trim().toLowerCase();
          if (!q) {
            resultsBox.classList.add('hidden');
            return;
          }
          const hits = this.runGlobalSearch(q);
          if (!hits.length) {
            resultsBox.innerHTML = `<div style="padding:12px;font-size:0.84rem;color:var(--text-muted);">No matches for "${Utils.escapeHtml(q)}"</div>`;
          } else {
            resultsBox.innerHTML = hits.slice(0, 10).map(h => `
              <button class="search-result-item" data-route="${h.route}">
                <div>
                  <div style="font-weight:600;font-size:0.86rem;">${Utils.escapeHtml(h.title)}</div>
                  <div style="font-size:0.74rem;color:var(--text-muted);">${Utils.escapeHtml(h.sub)}</div>
                </div>
                <span class="tag tag-teal">${Utils.escapeHtml(h.type)}</span>
              </button>
            `).join('');
          }
          resultsBox.classList.remove('hidden');
        });

        document.addEventListener('click', (e) => {
          if (!e.target.closest('.topbar-search-wrap')) {
            resultsBox.classList.add('hidden');
          }
        });

        document.addEventListener('keydown', (e) => {
          if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            searchInput.focus();
          } else if (e.key === 'Escape') {
            resultsBox.classList.add('hidden');
            this.closeModal();
          }
        });
      }

      window.addEventListener('hashchange', () => {
        const h = window.location.hash.replace('#', '');
        if (h && h !== Router.current) {
          Router.current = h;
          this.render();
        }
      });

      window.addEventListener('online', () => this.updateChrome());
      window.addEventListener('offline', () => this.updateChrome());

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredInstallPrompt = e;
        document.getElementById('installPwaBtn')?.classList.remove('hidden');
      });

      document.getElementById('installPwaBtn')?.addEventListener('click', async () => {
        if (!this.deferredInstallPrompt) return;
        this.deferredInstallPrompt.prompt();
        const choice = await this.deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          this.toast('Smart Life installed to your device!', 'success');
        }
        this.deferredInstallPrompt = null;
        document.getElementById('installPwaBtn')?.classList.add('hidden');
      });
    },

    runGlobalSearch(q) {
      const s = Store.state;
      const hits = [];
      TOOLS.forEach(t => {
        if (t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)) {
          hits.push({ type: 'Tool', title: t.name, sub: t.desc, route: t.route });
        }
      });
      s.planner.tasks.forEach(t => {
        if (t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) {
          hits.push({ type: 'Task', title: t.title, sub: `${t.date} • ${t.priority}`, route: 'planner' });
        }
      });
      s.habits.forEach(h => {
        if (h.name.toLowerCase().includes(q)) {
          hits.push({ type: 'Habit', title: h.name, sub: h.category, route: 'habits' });
        }
      });
      s.goals.forEach(g => {
        if (g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)) {
          hits.push({ type: 'Goal', title: g.title, sub: `${g.progress}% • ${g.category}`, route: 'goals' });
        }
      });
      s.organizer.notes.forEach(n => {
        if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) {
          hits.push({ type: 'Note', title: n.title, sub: n.tag, route: 'organizer' });
        }
      });
      s.finance.transactions.forEach(tx => {
        if (tx.note.toLowerCase().includes(q) || tx.category.toLowerCase().includes(q)) {
          hits.push({ type: 'Finance', title: `${tx.category}: ${Utils.formatCurrency(tx.amount, s.profile.currency)}`, sub: tx.note || tx.date, route: 'finance' });
        }
      });
      return hits;
    },

    openWorkspaceModal() {
      const p = Store.state.profile;
      this.openModal('Personal Workspace', `
        <form id="workspaceForm" class="stack-md">
          <div class="field">
            <label for="wsNameInput">Workspace Name</label>
            <input class="input" id="wsNameInput" value="${Utils.escapeHtml(p.workspace)}" required>
          </div>
          <div class="field">
            <label for="wsHeadlineInput">Focus Motto / Headline</label>
            <input class="input" id="wsHeadlineInput" value="${Utils.escapeHtml(p.headline)}">
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button type="button" class="btn btn-soft" id="wsCancelBtn">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Workspace</button>
          </div>
        </form>
      `);
      document.getElementById('wsCancelBtn').onclick = () => this.closeModal();
      document.getElementById('workspaceForm').onsubmit = (e) => {
        e.preventDefault();
        Store.state.profile.workspace = document.getElementById('wsNameInput').value.trim() || 'My Personal Space';
        Store.state.profile.headline = document.getElementById('wsHeadlineInput').value.trim();
        Store.save();
        Store.logActivity(`Updated workspace "${Store.state.profile.workspace}"`, 'Workspace', 'dashboard');
        this.closeModal();
        this.render();
        this.toast('Workspace updated', 'success');
      };
    },

    openQuickAddModal() {
      const today = Utils.todayISO();
      this.openModal('Quick Add to Smart Life', `
        <div class="tabs-bar" id="qaTabs">
          <button type="button" class="tab-btn active" data-qa="task">Task</button>
          <button type="button" class="tab-btn" data-qa="expense">Expense</button>
          <button type="button" class="tab-btn" data-qa="note">Note</button>
          <button type="button" class="tab-btn" data-qa="habit">Habit</button>
        </div>
        <form id="qaForm" class="stack-md">
          <div id="qaFields"></div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button type="button" class="btn btn-soft" id="qaCancelBtn">Cancel</button>
            <button type="submit" class="btn btn-gradient">Save Item</button>
          </div>
        </form>
      `);

      let mode = 'task';
      const renderFields = () => {
        const box = document.getElementById('qaFields');
        if (mode === 'task') {
          box.innerHTML = `
            <div class="field"><label>Task Title</label><input class="input" name="title" placeholder="e.g. Pay electricity bill" required></div>
            <div class="form-grid">
              <div class="field"><label>Date</label><input class="input" type="date" name="date" value="${today}"></div>
              <div class="field"><label>Priority</label><select class="select" name="priority"><option>High</option><option selected>Medium</option><option>Low</option></select></div>
            </div>
          `;
        } else if (mode === 'expense') {
          box.innerHTML = `
            <div class="form-grid">
              <div class="field"><label>Amount (${Store.state.profile.currency})</label><input class="input" type="number" step="0.01" name="amount" placeholder="250" required></div>
              <div class="field"><label>Category</label><select class="select" name="category"><option>Food</option><option>Transport</option><option>Shopping</option><option>Utilities</option><option>Health</option><option>Entertainment</option><option>Other</option></select></div>
            </div>
            <div class="field"><label>Note</label><input class="input" name="note" placeholder="Coffee, groceries..."></div>
          `;
        } else if (mode === 'note') {
          box.innerHTML = `
            <div class="field"><label>Note Title</label><input class="input" name="title" placeholder="Quick thought..." required></div>
            <div class="field"><label>Content</label><textarea class="textarea" name="content" placeholder="Write your note..."></textarea></div>
          `;
        } else {
          box.innerHTML = `
            <div class="field"><label>Habit Name</label><input class="input" name="name" placeholder="e.g. Meditate 10 minutes" required></div>
            <div class="field"><label>Category</label><select class="select" name="category"><option>Lifestyle</option><option>Productivity</option><option>Learning</option><option>Finance</option></select></div>
          `;
        }
      };
      renderFields();

      document.querySelectorAll('#qaTabs .tab-btn').forEach(btn => {
        btn.onclick = () => {
          mode = btn.dataset.qa;
          document.querySelectorAll('#qaTabs .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
          renderFields();
        };
      });

      document.getElementById('qaCancelBtn').onclick = () => this.closeModal();
      document.getElementById('qaForm').onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        if (mode === 'task') {
          const title = fd.get('title').toString().trim();
          Store.state.planner.tasks.unshift({
            id: Utils.uid('t'),
            title,
            date: fd.get('date') || today,
            time: '',
            priority: fd.get('priority') || 'Medium',
            category: 'Personal',
            completed: false
          });
          Store.logActivity(`Added task "${title}"`, 'Planner', 'planner');
        } else if (mode === 'expense') {
          const amount = Number(fd.get('amount')) || 0;
          const cat = fd.get('category') || 'Other';
          Store.state.finance.transactions.unshift({
            id: Utils.uid('tx'),
            type: 'expense',
            amount,
            category: cat,
            date: today,
            note: fd.get('note').toString().trim()
          });
          Store.logActivity(`Recorded ${Utils.formatCurrency(amount, Store.state.profile.currency)} expense (${cat})`, 'Finance', 'finance');
        } else if (mode === 'note') {
          const title = fd.get('title').toString().trim();
          Store.state.organizer.notes.unshift({
            id: Utils.uid('nt'),
            title,
            tag: 'Quick',
            pinned: false,
            content: fd.get('content').toString().trim(),
            updatedAt: today
          });
          Store.logActivity(`Saved note "${title}"`, 'Organizer', 'organizer');
        } else {
          const name = fd.get('name').toString().trim();
          Store.state.habits.push({
            id: Utils.uid('hb'),
            name,
            category: fd.get('category') || 'Lifestyle',
            targetDays: 7,
            reminder: '09:00',
            completedDates: []
          });
          Store.logActivity(`Created habit "${name}"`, 'Habits', 'habits');
        }
        Store.save();
        this.closeModal();
        this.render();
        this.toast('Saved!', 'success');
      };
    },

    openAlertsModal() {
      const alerts = Store.getAlerts();
      this.openModal('Reminders & Smart Alerts', alerts.length
        ? `<div class="stack-md">${alerts.map(a => `
            <div class="alert-banner alert-${a.level}" style="margin-bottom:0;">
              <div>
                <strong>${Utils.escapeHtml(a.title)}</strong>
                <div style="font-size:0.82rem;margin-top:2px;">${Utils.escapeHtml(a.msg)}</div>
              </div>
              <button class="btn btn-soft btn-sm" data-route="${a.route}" id="alertGo_${Math.random().toString(36).slice(2, 6)}">Open</button>
            </div>
          `).join('')}</div>`
        : `<div class="empty-state">You are all caught up! No urgent reminders or budget alerts right now.</div>`);

      document.querySelectorAll('#modalBody [data-route]').forEach(b => {
        b.addEventListener('click', () => this.closeModal());
      });
    },

    openMobileToolsModal() {
      this.openModal('All Smart Life Tools', `
        <div class="quick-tools-grid">
          ${TOOLS.map(t => `
            <button class="tool-card" data-route="${t.route}" onclick="document.getElementById('modalCloseBtn').click()">
              <strong style="font-size:0.9rem;">${Utils.escapeHtml(t.name)}</strong>
              <span style="font-size:0.76rem;color:var(--text-muted);">${Utils.escapeHtml(t.desc)}</span>
            </button>
          `).join('')}
        </div>
      `);
    },

    registerServiceWorker() {
      if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        navigator.serviceWorker.register('./service-worker.js').catch(() => {});
      }
    }
  };

  /* ------------------------------------------------------------------------
     7. Timer Engine (Persistent Background Interval across Views)
     ------------------------------------------------------------------------ */
  const TimerEngine = {
    mode: 'pomodoro', // 'pomodoro' | 'focus' | 'countdown' | 'stopwatch'
    phase: 'Work', // 'Work' | 'Short Break' | 'Long Break'
    running: false,
    secondsLeft: 25 * 60,
    totalSeconds: 25 * 60,
    elapsedSeconds: 0,
    laps: [],
    sessionLabel: 'Deep Focus Session',
    intervalId: null,
    breakBanner: '',

    formatTime(sec) {
      const s = Math.max(0, Math.floor(sec));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const r = s % 60;
      if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
      return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
    },

    setMode(mode, customSecs = null) {
      this.pause();
      this.mode = mode;
      this.breakBanner = '';
      if (mode === 'pomodoro') {
        this.phase = 'Work';
        this.totalSeconds = (Store.state.timer.pomodoroWorkMin || 25) * 60;
        this.secondsLeft = this.totalSeconds;
      } else if (mode === 'focus') {
        this.phase = 'Focus';
        this.totalSeconds = customSecs || 45 * 60;
        this.secondsLeft = this.totalSeconds;
      } else if (mode === 'countdown') {
        this.phase = 'Countdown';
        this.totalSeconds = customSecs || 10 * 60;
        this.secondsLeft = this.totalSeconds;
      } else {
        this.phase = 'Stopwatch';
        this.elapsedSeconds = 0;
        this.laps = [];
      }
      if (Router.current === 'timer') UI.render();
    },

    start() {
      if (this.running) return;
      this.running = true;
      this.breakBanner = '';
      this.intervalId = setInterval(() => this.tick(), 1000);
      if (Router.current === 'timer') this.updateDomClock();
    },

    pause() {
      this.running = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (Router.current === 'timer') UI.render();
    },

    reset() {
      this.pause();
      if (this.mode === 'stopwatch') {
        this.elapsedSeconds = 0;
        this.laps = [];
      } else {
        this.secondsLeft = this.totalSeconds;
      }
      if (Router.current === 'timer') UI.render();
    },

    lap() {
      if (this.mode !== 'stopwatch') return;
      this.laps.unshift(this.formatTime(this.elapsedSeconds));
      if (Router.current === 'timer') UI.render();
    },

    tick() {
      if (this.mode === 'stopwatch') {
        this.elapsedSeconds++;
      } else {
        if (this.secondsLeft > 0) {
          this.secondsLeft--;
        }
        if (this.secondsLeft <= 0) {
          this.onComplete();
          return;
        }
      }
      if (Router.current === 'timer') this.updateDomClock();
    },

    updateDomClock() {
      const clk = document.getElementById('liveTimerClock');
      const ring = document.getElementById('liveTimerRing');
      if (clk) {
        clk.textContent = this.mode === 'stopwatch'
          ? this.formatTime(this.elapsedSeconds)
          : this.formatTime(this.secondsLeft);
      }
      if (ring && this.mode !== 'stopwatch' && this.totalSeconds > 0) {
        const r = 90;
        const c = 2 * Math.PI * r;
        const frac = this.secondsLeft / this.totalSeconds;
        ring.setAttribute('stroke-dashoffset', String(c * (1 - frac)));
      }
    },

    playChime() {
      if (!Store.state.timer.soundEnabled) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } catch (_) {}
    },

    onComplete() {
      this.pause();
      this.playChime();
      const mins = Math.max(1, Math.round(this.totalSeconds / 60));
      if (this.mode === 'pomodoro' && this.phase === 'Work') {
        Store.state.timer.sessions.unshift({
          id: Utils.uid('tm'),
          label: this.sessionLabel || 'Pomodoro Work',
          mode: 'Pomodoro',
          minutes: mins,
          date: Utils.todayISO(),
          timestamp: new Date().toISOString()
        });
        Store.logActivity(`Completed ${mins}m Pomodoro "${this.sessionLabel}"`, 'Timer', 'timer');
        Store.save();
        this.breakBanner = `Great work! Take a ${Store.state.timer.pomodoroShortMin || 5}-minute stretch & hydration break.`;
        UI.toast('Focus block complete! Time for a short break.', 'success');
      } else if (this.mode === 'focus') {
        Store.state.timer.sessions.unshift({
          id: Utils.uid('tm'),
          label: this.sessionLabel || 'Focus Session',
          mode: 'Focus',
          minutes: mins,
          date: Utils.todayISO(),
          timestamp: new Date().toISOString()
        });
        Store.logActivity(`Completed ${mins}m Focus Session`, 'Timer', 'timer');
        Store.save();
        this.breakBanner = 'Focus timer finished! Step away from the screen for 5 minutes.';
        UI.toast('Focus timer finished!', 'success');
      } else {
        UI.toast(`${this.phase} timer finished!`, 'info');
      }
      if (Router.current === 'timer' || Router.current === 'dashboard') UI.render();
    }
  };

  /* ------------------------------------------------------------------------
     8. AI Engine (AI-Ready Architecture + Clearly Labelled Demo Mode)
     ------------------------------------------------------------------------ */
  const AI_TEMPLATES = [
    { id: 'daily_plan', title: 'Daily Plan Generator', desc: 'Builds an hour-by-hour plan from your tasks & habits', actionType: 'task', defaultInput: 'Balanced workday with deep focus, errands, and evening rest' },
    { id: 'goal_planner', title: 'Goal Planner', desc: 'Breaks any ambition into concrete milestones', actionType: 'goal', defaultInput: 'Learn conversational Spanish in 90 days' },
    { id: 'habit_suggest', title: 'Habit Suggestions', desc: 'Recommends tiny repeatable habits for your focus area', actionType: 'habit', defaultInput: 'Better morning energy and financial discipline' },
    { id: 'productivity', title: 'Productivity Assistant', desc: 'Diagnoses bottlenecks using your live workspace stats', actionType: null, defaultInput: 'How can I finish high-priority tasks earlier in the day?' },
    { id: 'decision', title: 'Decision Brainstorming', desc: 'Structured pros, cons & next-step experiment', actionType: null, defaultInput: 'Should I switch to freelancing or keep a hybrid role?' },
    { id: 'message', title: 'Personal Message Generator', desc: 'Polite, warm personal or professional messages', actionType: null, defaultInput: 'Warm thank-you message to a mentor after a career chat' },
    { id: 'reminder', title: 'Reminder Planning', desc: 'Turns an upcoming event into timed checklists', actionType: 'task', defaultInput: 'Preparing for a 3-day weekend trip next Friday' },
    { id: 'weekend', title: 'Weekend Planner', desc: 'Balances rest, home reset, hobbies & social time', actionType: null, defaultInput: 'Refreshing weekend with light chores and outdoor time' },
    { id: 'travel', title: 'Travel Itinerary Planner', desc: 'Day-by-day trip flow & packing essentials', actionType: null, defaultInput: '3-day Jaipur cultural & food trip' },
    { id: 'meal', title: 'Meal Plan Suggestions', desc: 'Wholesome daily meals aligned to everyday lifestyle', actionType: null, defaultInput: 'High-protein vegetarian Indian weekday meals' }
  ];

  const AIEngine = {
    selectedTemplate: 'daily_plan',
    loading: false,
    error: '',
    lastOutput: null,

    buildLocalDemoResponse(templateId, userPrompt) {
      const s = Store.state;
      const today = Utils.todayISO();
      const pendingTasks = s.planner.tasks.filter(t => !t.completed).slice(0, 4);
      const habits = s.habits.slice(0, 4);
      const focusMins = s.timer.sessions.filter(x => x.date === today).reduce((a, b) => a + Number(b.minutes), 0);

      switch (templateId) {
        case 'daily_plan':
          return {
            text: `SMART LIFE DEMO PLAN (${Utils.formatDate(today)})\nFocus Theme: ${userPrompt}\n\n• 08:00 – 09:00 | Morning Routine & Hydration\n  Start with water + 10m sunlight. Check habits: ${habits.map(h => h.name).join(', ') || 'Hydration'}.\n\n• 09:00 – 11:00 | Deep Work Block\n  Tackle your top task: "${pendingTasks[0]?.title || 'Primary Priority Task'}". Use two 25m Pomodoro sprints.\n\n• 13:00 – 14:00 | Mindful Lunch & Screen Break\n  Step away from screens for 20 minutes.\n\n• 15:00 – 17:00 | Execution & Admin\n  Clear remaining items: ${pendingTasks.slice(1).map(t => t.title).join('; ') || 'Messages & planning'}.\n\n• 19:00 – 21:00 | Movement & Wind-Down\n  30m walk, log expenses, and set tomorrow's top 1 priority.`,
            suggestedAction: { type: 'task', title: `AI Plan Focus: ${pendingTasks[0]?.title || userPrompt.slice(0, 40)}` }
          };
        case 'goal_planner':
          return {
            text: `GOAL BLUEPRINT: ${userPrompt}\n\n1. Target Outcome (90 Days): Define a measurable finish line.\n2. Weekly Cadence: 4 focused sessions/week (30–45 mins each).\n3. Suggested Milestones:\n   - Milestone 1 (Weeks 1–2): Set up tools, workspace & baseline.\n   - Milestone 2 (Weeks 3–6): Build daily consistency & first mini-project.\n   - Milestone 3 (Weeks 7–10): Review progress & close skill gaps.\n   - Milestone 4 (Weeks 11–12): Final review & celebrate completion.`,
            suggestedAction: { type: 'goal', title: userPrompt.slice(0, 55), category: 'Personal' }
          };
        case 'habit_suggest':
          return {
            text: `HABIT STACK SUGGESTIONS FOR: "${userPrompt}"\n\n1. Anchor Habit (2 mins): After morning tea/coffee, write down 1 financial or focus intention.\n2. Movement Cue: 15-minute brisk walk right after lunch.\n3. Evening Close: Spend 3 minutes logging today's expenses & checking off habits.\n\nTip: Start with a 70% consistency target for week 1 before scaling duration.`,
            suggestedAction: { type: 'habit', name: `Daily Check-in: ${userPrompt.slice(0, 32)}`, category: 'Lifestyle' }
          };
        case 'productivity':
          return {
            text: `PRODUCTIVITY INSIGHT (Based on your workspace)\n\n• Current Score: ${Store.computeProductivityScore()}% | Focus Today: ${focusMins} mins\n• Open Tasks: ${s.planner.tasks.filter(t => !t.completed).length}\n\nRecommendations for "${userPrompt}":\n1. Use the "Rule of 1": Lock your first 45-minute block before opening messages.\n2. Batch low-energy chores (bills, groceries) into one 30-minute evening slot.\n3. Pair your Pomodoro Timer with a single task label to prevent context switching.`,
            suggestedAction: null
          };
        case 'decision':
          return {
            text: `DECISION MATRIX: ${userPrompt}\n\n• Upside / Opportunities:\n  - Higher autonomy, skill growth, and alignment with long-term goals.\n• Risks / Friction:\n  - Short-term uncertainty, ramp-up effort, and cash-flow buffer needs.\n• Reversible 14-Day Experiment:\n  Test the idea on a small scale for 2 weeks while keeping your financial runway intact (current savings: ${Utils.formatCurrency(s.finance.currentSavings, s.profile.currency)}).`,
            suggestedAction: null
          };
        case 'message':
          return {
            text: `PERSONAL MESSAGE DRAFTS (${userPrompt}):\n\nOption 1 (Warm & Concise):\n"Hi! Thank you so much for taking the time to connect. I really appreciated your perspective and clear advice—it gave me great clarity on my next steps. Wishing you a wonderful week ahead!"\n\nOption 2 (Friendly & Direct):\n"Hey! Just wanted to drop a quick note to say thanks again for your help recently. Grateful for your support—let's catch up again soon!"`,
            suggestedAction: null
          };
        case 'reminder':
          return {
            text: `TIMED REMINDER CHECKLIST: ${userPrompt}\n\n• T-7 Days: Confirm bookings, itinerary & required documents.\n• T-2 Days: Pack essentials & charge power bank.\n• T-1 Day: Set out-of-office / bill auto-pay check.\n• Day-Of (2 hrs prior): Final wallet, keys, ID & water bottle check.`,
            suggestedAction: { type: 'task', title: `Prepare checklist: ${userPrompt.slice(0, 38)}` }
          };
        case 'weekend':
          return {
            text: `BALANCED WEEKEND PLAN (${userPrompt}):\n\nSaturday:\n• Morning: Slow breakfast, light tidy-up (45m max), grocery run.\n• Afternoon: Hobby / creative time or coffee with a friend.\n• Evening: Movie, cooking, or relaxed walk.\n\nSunday:\n• Morning: Outdoor movement & digital detox until noon.\n• Afternoon: 20-minute Weekly Planner & budget reset for Monday.\n• Evening: Early dinner & restful sleep prep.`,
            suggestedAction: null
          };
        case 'travel':
          return {
            text: `3-DAY ITINERARY OUTLINE: ${userPrompt}\n\n• Day 1 — Arrival & Local Rhythm: Check in, neighborhood walk, sunset viewpoint, signature local dinner.\n• Day 2 — Highlights & Culture: Early morning landmark visit (beat crowds), artisan market, relaxed cafe afternoon.\n• Day 3 — Hidden Gems & Departure: Morning park/breakfast, souvenir pickup, smooth departure buffer.\n\nChecklist tip: Open Personal Organizer > Travel Checklist to tick off your packing items!`,
            suggestedAction: null
          };
        case 'meal':
        default:
          return {
            text: `BALANCED MEAL IDEAS (${userPrompt}):\n*(Lifestyle inspiration — adjust to personal dietary preferences)*\n\n• Breakfast: Moong dal chilla with veggies & mint chutney (or oats + nuts).\n• Lunch: Protein-rich lentil/paneer bowl with brown rice or millet + cucumber salad.\n• Snack: Roasted makhana, seasonal fruit, or sprouts.\n• Dinner: Light vegetable stir-fry, soup, or khichdi 2–3 hours before sleep.`,
            suggestedAction: null
          };
      }
    },

    async run(templateId, promptText) {
      const s = Store.state.ai;
      this.loading = true;
      this.error = '';
      if (Router.current === 'ai') UI.render();

      const prompt = (promptText || '').trim();
      const tpl = AI_TEMPLATES.find(t => t.id === templateId) || AI_TEMPLATES[0];

      // Demo Mode: Explicit local template engine (never pretends an external AI call happened)
      if (s.provider === 'demo' || !s.apiKey.trim()) {
        await new Promise(r => setTimeout(r, 420));
        const res = this.buildLocalDemoResponse(templateId, prompt || tpl.defaultInput);
        this.lastOutput = {
          id: Utils.uid('ai'),
          templateTitle: tpl.title,
          prompt: prompt || tpl.defaultInput,
          response: res.text,
          suggestedAction: res.suggestedAction,
          modeLabel: 'Demo Mode — Local Template Engine (No External API Call Made)',
          isDemo: true,
          timestamp: new Date().toISOString()
        };
        s.history.unshift(this.lastOutput);
        if (s.history.length > 20) s.history = s.history.slice(0, 20);
        Store.logActivity(`Ran AI Demo template "${tpl.title}"`, 'AI Assistant', 'ai');
        Store.save();
        this.loading = false;
        if (Router.current === 'ai') UI.render();
        return;
      }

      // Live User-Configured Endpoint Mode
      try {
        let replyText = '';
        const sysPrompt = `You are Smart Life, a concise personal productivity & everyday life assistant. Respond clearly with structured bullet points. Task: ${tpl.title}.`;

        if (s.provider === 'gemini') {
          const model = s.model || 'gemini-2.5-flash';
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(s.apiKey.trim())}`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${sysPrompt}\n\nUser request: ${prompt}` }] }]
            })
          });
          if (!resp.ok) throw new Error(`Provider returned HTTP ${resp.status}`);
          const data = await resp.json();
          replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          const url = s.provider === 'custom' && s.endpoint
            ? s.endpoint.trim()
            : 'https://api.openai.com/v1/chat/completions';
          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${s.apiKey.trim()}`
            },
            body: JSON.stringify({
              model: s.model || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: prompt }
              ]
            })
          });
          if (!resp.ok) throw new Error(`Provider returned HTTP ${resp.status}`);
          const data = await resp.json();
          replyText = data?.choices?.[0]?.message?.content || data?.text || '';
        }

        if (!replyText) throw new Error('Empty response received from AI provider.');

        this.lastOutput = {
          id: Utils.uid('ai'),
          templateTitle: tpl.title,
          prompt,
          response: replyText,
          suggestedAction: null,
          modeLabel: `Live API (${s.provider} • ${s.model})`,
          isDemo: false,
          timestamp: new Date().toISOString()
        };
        s.history.unshift(this.lastOutput);
        if (s.history.length > 20) s.history = s.history.slice(0, 20);
        Store.logActivity(`Generated AI response via ${s.provider}`, 'AI Assistant', 'ai');
        Store.save();
      } catch (err) {
        this.error = `External AI request failed: ${err.message}. Check your API settings or switch to Demo Mode.`;
      } finally {
        this.loading = false;
        if (Router.current === 'ai') UI.render();
      }
    }
  };

  /* ------------------------------------------------------------------------
     9. View Renderers
     ------------------------------------------------------------------------ */
  const Views = {
    dashboard() {
      const s = Store.state;
      const today = Utils.todayISO();
      const month = today.slice(0, 7);
      const sym = s.profile.currency || '₹';
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

      const tasksToday = s.planner.tasks.filter(t => t.date === today);
      const tasksDone = tasksToday.filter(t => t.completed).length;
      const habitsDone = s.habits.filter(h => h.completedDates.includes(today)).length;
      const focusMinsToday = s.timer.sessions.filter(x => x.date === today).reduce((a, b) => a + Number(b.minutes), 0);

      const monthExpenses = s.finance.transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(month))
        .reduce((a, b) => a + Number(b.amount), 0);
      const budgetLeft = (Number(s.finance.monthlyBudget) || 0) - monthExpenses;
      const score = Store.computeProductivityScore();

      // Daily Progress Bar aggregate
      const totalTodayItems = tasksToday.length + s.habits.length + s.planner.routines.length;
      const doneTodayItems = tasksDone + habitsDone + s.planner.routines.filter(r => r.doneDates.includes(today)).length;
      const dailyPct = totalTodayItems ? Math.round((doneTodayItems / totalTodayItems) * 100) : 0;

      // 7-day habit completion data
      const last7 = Utils.getLastNDays(7);
      const habit7Data = last7.map(d => {
        const done = s.habits.filter(h => h.completedDates.includes(d)).length;
        const pct = s.habits.length ? Math.round((done / s.habits.length) * 100) : 0;
        return { label: Utils.formatShortDay(d), value: pct };
      });

      // Weekly productivity summary (completed tasks + focus blocks per day)
      const weeklyProdData = last7.map(d => {
        const tCount = s.planner.tasks.filter(t => t.date === d && t.completed).length;
        const hCount = s.habits.filter(h => h.completedDates.includes(d)).length;
        return { label: Utils.formatShortDay(d), value: tCount + hCount };
      });

      // Expense chart segments
      const catTotals = {};
      s.finance.transactions.filter(t => t.type === 'expense' && t.date.startsWith(month)).forEach(tx => {
        catTotals[tx.category] = (catTotals[tx.category] || 0) + Number(tx.amount);
      });
      const expenseSegments = Object.entries(catTotals).map(([label, value]) => ({
        label,
        value,
        displayValue: Utils.formatCurrency(value, sym)
      }));

      // Savings progress
      const savingsPct = s.finance.savingsGoal > 0
        ? Math.min(100, Math.round((s.finance.currentSavings / s.finance.savingsGoal) * 100))
        : 0;

      // Mini Calendar
      const now = new Date();
      const calDate = new Date(now.getFullYear(), now.getMonth() + Router.calendarMonthOffset, 1);
      const calYear = calDate.getFullYear();
      const calMonth = calDate.getMonth();
      const calMonthLabel = calDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const { firstDay, totalDays } = Utils.getMonthDays(calYear, calMonth);
      const eventDates = new Set([
        ...s.planner.tasks.map(t => t.date),
        ...s.organizer.events.map(e => e.date)
      ]);

      let calCells = Array.from({ length: firstDay }, () => `<div class="calendar-day empty"></div>`).join('');
      for (let d = 1; d <= totalDays; d++) {
        const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cls = ['calendar-day'];
        if (iso === today) cls.push('today');
        if (iso === Router.selectedCalendarDate) cls.push('selected');
        const hasDot = eventDates.has(iso);
        calCells += `<button class="${cls.join(' ')}" data-cal-date="${iso}">${d}${hasDot ? '<span class="calendar-dot"></span>' : ''}</button>`;
      }

      const selectedDayTasks = s.planner.tasks.filter(t => t.date === Router.selectedCalendarDate);
      const selectedDayEvents = s.organizer.events.filter(e => e.date === Router.selectedCalendarDate);

      // Favorite tools
      const favTools = TOOLS.filter(t => s.favorites.includes(t.route));

      return `
        <section class="hero-banner">
          <div>
            <span class="hero-badge">✦ ${Utils.escapeHtml(s.profile.workspace)} • ${Utils.escapeHtml(s.profile.headline)}</span>
            <h2>${greeting}, ${Utils.escapeHtml(s.profile.name.split(' ')[0])}!</h2>
            <p>You have ${tasksToday.length - tasksDone} tasks left today, ${habitsDone}/${s.habits.length} habits checked, and ${focusMinsToday} focus minutes logged.</p>
            <div class="hero-actions">
              <button class="btn hero-btn-light btn-sm" data-route="planner">Open Daily Planner</button>
              <button class="btn hero-btn-glass btn-sm" data-route="ai">Ask AI Assistant</button>
              <button class="btn hero-btn-glass btn-sm" data-route="timer">Start Pomodoro</button>
            </div>
          </div>
          <div class="hero-visual">
            <div style="background:rgba(255,255,255,0.16);border-radius:18px;padding:12px 16px;text-align:center;backdrop-filter:blur(6px);">
              ${Charts.radialScore(score, 'Productivity')}
            </div>
            <img src="./assets/illustrations/hero-workspace.svg" alt="Smart Life workspace illustration" class="hero-illustration hide-sm">
          </div>
        </section>

        <!-- Today's Overview KPIs -->
        <section class="grid-4" style="margin-bottom:18px;">
          <div class="card kpi-card">
            <div class="kpi-top"><span class="kpi-label">Daily Tasks</span><span class="kpi-icon">✓</span></div>
            <div class="kpi-value">${tasksDone} / ${tasksToday.length}</div>
            <div class="kpi-meta">${tasksToday.length ? Math.round((tasksDone / tasksToday.length) * 100) : 0}% completed today</div>
          </div>
          <div class="card kpi-card">
            <div class="kpi-top"><span class="kpi-label">Daily Habits</span><span class="kpi-icon kpi-icon-violet">🔥</span></div>
            <div class="kpi-value">${habitsDone} / ${s.habits.length}</div>
            <div class="kpi-meta">${s.habits.length ? Math.round((habitsDone / s.habits.length) * 100) : 0}% checked in today</div>
          </div>
          <div class="card kpi-card">
            <div class="kpi-top"><span class="kpi-label">Focus Time</span><span class="kpi-icon">⏱</span></div>
            <div class="kpi-value">${focusMinsToday} min</div>
            <div class="kpi-meta">Goal: ${s.profile.dailyFocusGoalHours} hrs/day</div>
          </div>
          <div class="card kpi-card">
            <div class="kpi-top"><span class="kpi-label">Budget Remaining</span><span class="kpi-icon kpi-icon-violet">${Utils.escapeHtml(sym)}</span></div>
            <div class="kpi-value" style="color:${budgetLeft < 0 ? 'var(--danger)' : 'inherit'}">${Utils.formatCurrency(budgetLeft, sym)}</div>
            <div class="kpi-meta">Spent ${Utils.formatCurrency(monthExpenses, sym)} this month</div>
          </div>
        </section>

        <!-- Daily Progress Bar -->
        <section class="card" style="margin-bottom:18px;">
          <div class="card-header" style="margin-bottom:10px;">
            <div>
              <h3 class="card-title">Today's Overall Progress</h3>
              <p class="card-subtitle">${doneTodayItems} of ${totalTodayItems} daily tasks, habits &amp; routine steps complete</p>
            </div>
            <span class="tag tag-teal">${dailyPct}% Complete</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${dailyPct}%"></div></div>
        </section>

        <!-- Core Action Grid: Tasks, Habits, Calendar -->
        <section class="grid-3" style="margin-bottom:18px;">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Daily Tasks</h3>
              <button class="btn btn-soft btn-sm" data-route="planner">All Tasks</button>
            </div>
            <form id="dashQuickTaskForm" style="display:flex;gap:8px;margin-bottom:12px;">
              <input class="input" id="dashQuickTaskInput" placeholder="Add a task for today..." required>
              <button type="submit" class="btn btn-primary btn-sm">Add</button>
            </form>
            <div class="item-list">
              ${tasksToday.length ? tasksToday.slice(0, 5).map(t => `
                <div class="list-row">
                  <div class="list-row-left">
                    <button class="check-circle ${t.completed ? 'checked' : ''}" data-toggle-task="${t.id}" aria-label="Toggle task">${t.completed ? '✓' : ''}</button>
                    <div class="item-text">
                      <div class="item-title ${t.completed ? 'done' : ''}">${Utils.escapeHtml(t.title)}</div>
                      <div class="item-sub"><span>${Utils.escapeHtml(t.priority)}</span>${t.time ? `<span>• ${Utils.escapeHtml(t.time)}</span>` : ''}</div>
                    </div>
                  </div>
                </div>
              `).join('') : `<div class="empty-state">No tasks scheduled for today.</div>`}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Daily Habits</h3>
              <button class="btn btn-soft btn-sm" data-route="habits">Manage</button>
            </div>
            <div class="item-list">
              ${s.habits.length ? s.habits.slice(0, 5).map(h => {
                const done = h.completedDates.includes(today);
                const streak = calculateHabitStreaks(h).current;
                return `
                  <div class="list-row">
                    <div class="list-row-left">
                      <button class="check-circle ${done ? 'checked' : ''}" data-toggle-habit="${h.id}" aria-label="Toggle habit">${done ? '✓' : ''}</button>
                      <div class="item-text">
                        <div class="item-title ${done ? 'done' : ''}">${Utils.escapeHtml(h.name)}</div>
                        <div class="item-sub"><span>${Utils.escapeHtml(h.category)}</span><span>• 🔥 ${streak}d streak</span></div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('') : `<div class="empty-state">Create your first habit to build streaks!</div>`}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">${Utils.escapeHtml(calMonthLabel)}</h3>
              <div style="display:flex;gap:4px;">
                <button class="icon-btn-sm" id="calPrevBtn" aria-label="Previous month">◀</button>
                <button class="icon-btn-sm" id="calNextBtn" aria-label="Next month">▶</button>
              </div>
            </div>
            <div class="calendar-grid" style="margin-bottom:12px;">
              ${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => `<div class="calendar-weekday">${w}</div>`).join('')}
              ${calCells}
            </div>
            <div style="border-top:1px solid var(--border-soft);padding-top:10px;font-size:0.8rem;">
              <strong>${Utils.formatDate(Router.selectedCalendarDate)}:</strong>
              ${selectedDayTasks.length + selectedDayEvents.length === 0
                ? `<span style="color:var(--text-muted);"> No scheduled tasks or events.</span>`
                : `<ul style="margin:6px 0 0;padding-left:16px;color:var(--text-secondary);">
                    ${selectedDayTasks.slice(0, 3).map(t => `<li>${Utils.escapeHtml(t.title)}</li>`).join('')}
                    ${selectedDayEvents.slice(0, 2).map(e => `<li>📅 ${Utils.escapeHtml(e.title)}</li>`).join('')}
                  </ul>`
              }
            </div>
          </div>
        </section>

        <!-- Routine, Personal Goals, Quick Tools & Favorites -->
        <section class="grid-3" style="margin-bottom:18px;">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Daily Routine</h3>
              <button class="btn btn-soft btn-sm" data-route="planner" data-tab="routine">Edit</button>
            </div>
            <div class="item-list">
              ${s.planner.routines.map(r => {
                const done = r.doneDates.includes(today);
                return `
                  <div class="list-row">
                    <div class="list-row-left">
                      <button class="check-circle ${done ? 'checked' : ''}" data-toggle-routine="${r.id}">${done ? '✓' : ''}</button>
                      <div class="item-text">
                        <div class="item-title ${done ? 'done' : ''}">${Utils.escapeHtml(r.title)}</div>
                        <div class="item-sub"><span>${Utils.escapeHtml(r.period)}</span><span>• ${Utils.escapeHtml(r.time)}</span></div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Personal Goals</h3>
              <button class="btn btn-soft btn-sm" data-route="goals">All Goals</button>
            </div>
            <div class="stack-md">
              ${s.goals.slice(0, 3).map(g => `
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:0.86rem;font-weight:600;margin-bottom:6px;">
                    <span>${Utils.escapeHtml(g.title)}</span>
                    <span class="tag tag-violet">${g.progress}%</span>
                  </div>
                  <div class="progress-track"><div class="progress-fill" style="width:${g.progress}%"></div></div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Quick Tools &amp; Favorites</h3>
              <span class="tag tag-teal">★ ${favTools.length} Pinned</span>
            </div>
            <div class="quick-tools-grid">
              ${TOOLS.slice(0, 6).map(t => {
                const isFav = s.favorites.includes(t.route);
                return `
                  <div class="tool-card" style="cursor:pointer;" data-route="${t.route}">
                    <button class="fav-star-btn ${isFav ? 'active' : ''}" data-toggle-fav="${t.route}" title="Toggle Favorite" aria-label="Favorite ${Utils.escapeHtml(t.name)}">${isFav ? '★' : '☆'}</button>
                    <strong style="font-size:0.86rem;padding-right:18px;">${Utils.escapeHtml(t.name)}</strong>
                    <span style="font-size:0.74rem;color:var(--text-muted);">${Utils.escapeHtml(t.desc)}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </section>

        <!-- Dashboard Visualizations -->
        <section class="grid-2" style="margin-bottom:18px;">
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Habit Completion Chart (7 Days)</h3>
                <p class="card-subtitle">Daily percentage of habits completed</p>
              </div>
              <button class="btn btn-soft btn-sm" data-route="habits">Details</button>
            </div>
            <div class="chart-wrap">${Charts.barChart(habit7Data, { unit: '%', minMax: 100, ariaLabel: '7 day habit completion chart' })}</div>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Monthly Expense Chart</h3>
                <p class="card-subtitle">Category breakdown for ${Utils.escapeHtml(month)}</p>
              </div>
              <button class="btn btn-soft btn-sm" data-route="finance">Finance</button>
            </div>
            ${Charts.donutChart(expenseSegments, 'Spent', Utils.formatCurrency(monthExpenses, sym))}
          </div>
        </section>

        <section class="grid-3">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Weekly Productivity Summary</h3>
            </div>
            <div class="chart-wrap">${Charts.barChart(weeklyProdData, { color1: '#0D9488', color2: '#14B8A6', minMax: 6, ariaLabel: 'Weekly productivity summary' })}</div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Savings Progress &amp; Goal Overview</h3>
            </div>
            <div class="stack-md">
              <div style="padding:12px;border-radius:12px;background:var(--bg-surface-soft);">
                <div style="display:flex;justify-content:space-between;font-size:0.86rem;font-weight:700;margin-bottom:6px;">
                  <span>Savings Goal</span>
                  <span>${Utils.formatCurrency(s.finance.currentSavings, sym)} / ${Utils.formatCurrency(s.finance.savingsGoal, sym)}</span>
                </div>
                <div class="progress-track"><div class="progress-fill" style="width:${savingsPct}%"></div></div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">${savingsPct}% of target saved</div>
              </div>
              <div style="font-size:0.84rem;color:var(--text-secondary);">
                <strong>Activity Overview:</strong> ${s.planner.tasks.filter(t => t.completed).length} tasks finished • ${s.timer.sessions.length} focus sessions • ${s.organizer.notes.length} notes saved.
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Recent Activities</h3>
            </div>
            <div class="item-list">
              ${s.activities.slice(0, 5).map(ac => `
                <div class="list-row" style="padding:10px 12px;cursor:pointer;" data-route="${ac.route}">
                  <div class="item-text">
                    <div class="item-title" style="font-size:0.84rem;">${Utils.escapeHtml(ac.text)}</div>
                    <div class="item-sub"><span>${Utils.escapeHtml(ac.category)}</span><span>• ${new Date(ac.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </section>
      `;
    },

    planner() {
      const s = Store.state.planner;
      const tab = Router.subTab.planner || 'daily';
      const today = Utils.todayISO();
      const weekDates = Utils.getWeekDates(today);

      let tabBody = '';
      if (tab === 'daily' || tab === 'tasks') {
        const list = tab === 'daily' ? s.tasks.filter(t => t.date === today) : s.tasks;
        tabBody = `
          <div class="card" style="margin-bottom:18px;">
            <h3 class="card-title" style="margin-bottom:12px;">Add New Task</h3>
            <form id="plannerAddTaskForm" class="form-grid">
              <div class="field"><label>Task Title</label><input class="input" name="title" placeholder="What needs to get done?" required></div>
              <div class="field"><label>Date</label><input class="input" type="date" name="date" value="${today}"></div>
              <div class="field"><label>Time</label><input class="input" type="time" name="time"></div>
              <div class="field"><label>Priority</label><select class="select" name="priority"><option>High</option><option selected>Medium</option><option>Low</option></select></div>
              <div class="field"><label>Category</label><select class="select" name="category"><option>Work</option><option>Personal</option><option>Focus</option><option>Finance</option><option>Lifestyle</option></select></div>
              <div class="field" style="justify-content:flex-end;"><button type="submit" class="btn btn-primary">Add Task</button></div>
            </form>
          </div>
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">${tab === 'daily' ? `Today's Tasks (${Utils.formatDate(today)})` : 'All Tasks'}</h3>
              <span class="tag tag-teal">${list.filter(x => x.completed).length}/${list.length} Done</span>
            </div>
            <div class="item-list">
              ${list.length ? list.map(t => `
                <div class="list-row">
                  <div class="list-row-left">
                    <button class="check-circle ${t.completed ? 'checked' : ''}" data-toggle-task="${t.id}">${t.completed ? '✓' : ''}</button>
                    <div class="item-text">
                      <div class="item-title ${t.completed ? 'done' : ''}">${Utils.escapeHtml(t.title)}</div>
                      <div class="item-sub">
                        <span class="tag tag-${t.priority.toLowerCase()}">${Utils.escapeHtml(t.priority)}</span>
                        <span>${Utils.escapeHtml(t.category)}</span>
                        <span>• ${Utils.formatDate(t.date)} ${t.time || ''}</span>
                      </div>
                    </div>
                  </div>
                  <button class="btn btn-danger-soft btn-sm" data-delete-task="${t.id}">Delete</button>
                </div>
              `).join('') : `<div class="empty-state">No tasks in this view yet.</div>`}
            </div>
          </div>
        `;
      } else if (tab === 'weekly') {
        tabBody = `
          <div class="grid-2">
            ${weekDates.map(d => {
              const items = s.tasks.filter(t => t.date === d);
              return `
                <div class="card">
                  <div class="card-header">
                    <h3 class="card-title">${Utils.formatShortDay(d)} — ${Utils.formatDate(d)}</h3>
                    ${d === today ? '<span class="tag tag-teal">Today</span>' : ''}
                  </div>
                  <div class="item-list">
                    ${items.length ? items.map(t => `
                      <div class="list-row">
                        <div class="list-row-left">
                          <button class="check-circle ${t.completed ? 'checked' : ''}" data-toggle-task="${t.id}">${t.completed ? '✓' : ''}</button>
                          <div class="item-text"><div class="item-title ${t.completed ? 'done' : ''}">${Utils.escapeHtml(t.title)}</div></div>
                        </div>
                      </div>
                    `).join('') : `<div class="empty-state">No tasks scheduled</div>`}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else if (tab === 'monthly') {
        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth();
        const { firstDay, totalDays } = Utils.getMonthDays(y, m);
        let cells = Array.from({ length: firstDay }, () => `<div class="calendar-day empty"></div>`).join('');
        for (let d = 1; d <= totalDays; d++) {
          const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const count = s.tasks.filter(t => t.date === iso).length;
          cells += `<button class="calendar-day ${iso === today ? 'today' : ''} ${iso === Router.selectedCalendarDate ? 'selected' : ''}" data-cal-date="${iso}" style="min-height:56px;">
            <span>${d}</span>
            ${count ? `<span style="font-size:0.68rem;opacity:0.85;">${count} task${count > 1 ? 's' : ''}</span>` : ''}
          </button>`;
        }
        const dayTasks = s.tasks.filter(t => t.date === Router.selectedCalendarDate);
        tabBody = `
          <div class="grid-2">
            <div class="card">
              <h3 class="card-title" style="margin-bottom:12px;">${now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
              <div class="calendar-grid">
                ${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => `<div class="calendar-weekday">${w}</div>`).join('')}
                ${cells}
              </div>
            </div>
            <div class="card">
              <h3 class="card-title" style="margin-bottom:12px;">Tasks for ${Utils.formatDate(Router.selectedCalendarDate)}</h3>
              <div class="item-list">
                ${dayTasks.length ? dayTasks.map(t => `
                  <div class="list-row">
                    <div class="list-row-left">
                      <button class="check-circle ${t.completed ? 'checked' : ''}" data-toggle-task="${t.id}">${t.completed ? '✓' : ''}</button>
                      <div class="item-text"><div class="item-title ${t.completed ? 'done' : ''}">${Utils.escapeHtml(t.title)}</div></div>
                    </div>
                  </div>
                `).join('') : `<div class="empty-state">No tasks on this day.</div>`}
              </div>
            </div>
          </div>
        `;
      } else if (tab === 'checklist') {
        tabBody = `
          <div class="card" style="margin-bottom:18px;">
            <form id="addChecklistForm" style="display:flex;gap:10px;flex-wrap:wrap;">
              <input class="input" style="flex:1;min-width:200px;" name="title" placeholder="New checklist name (e.g. Weekend Prep)" required>
              <button class="btn btn-primary" type="submit">Create Checklist</button>
            </form>
          </div>
          <div class="grid-2">
            ${s.checklists.map(cl => `
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">${Utils.escapeHtml(cl.title)}</h3>
                  <button class="btn btn-danger-soft btn-sm" data-del-cl="${cl.id}">Delete</button>
                </div>
                <form class="addClItemForm" data-cl-id="${cl.id}" style="display:flex;gap:8px;margin-bottom:12px;">
                  <input class="input" name="text" placeholder="Add checklist item..." required>
                  <button class="btn btn-soft btn-sm" type="submit">Add</button>
                </form>
                <div class="item-list">
                  ${cl.items.map(it => `
                    <div class="list-row">
                      <div class="list-row-left">
                        <button class="check-circle ${it.done ? 'checked' : ''}" data-toggle-cl="${cl.id}:${it.id}">${it.done ? '✓' : ''}</button>
                        <div class="item-title ${it.done ? 'done' : ''}">${Utils.escapeHtml(it.text)}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      } else if (tab === 'routine') {
        tabBody = `
          <div class="card" style="margin-bottom:18px;">
            <h3 class="card-title" style="margin-bottom:12px;">Add Routine Step</h3>
            <form id="addRoutineForm" class="form-grid">
              <div class="field"><label>Step Title</label><input class="input" name="title" placeholder="e.g. 15m Meditation" required></div>
              <div class="field"><label>Period</label><select class="select" name="period"><option>Morning</option><option>Afternoon</option><option>Evening</option></select></div>
              <div class="field"><label>Time</label><input class="input" type="time" name="time" value="08:00"></div>
              <div class="field" style="justify-content:flex-end;"><button type="submit" class="btn btn-primary">Add Routine</button></div>
            </form>
          </div>
          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Daily Routine Schedule</h3>
            <div class="item-list">
              ${s.routines.map(r => {
                const done = r.doneDates.includes(today);
                return `
                  <div class="list-row">
                    <div class="list-row-left">
                      <button class="check-circle ${done ? 'checked' : ''}" data-toggle-routine="${r.id}">${done ? '✓' : ''}</button>
                      <div class="item-text">
                        <div class="item-title ${done ? 'done' : ''}">${Utils.escapeHtml(r.title)}</div>
                        <div class="item-sub"><span class="tag tag-violet">${Utils.escapeHtml(r.period)}</span><span>${Utils.escapeHtml(r.time)}</span></div>
                      </div>
                    </div>
                    <button class="btn btn-danger-soft btn-sm" data-del-routine="${r.id}">Remove</button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      } else {
        // Time blocking & Daily Schedule
        const hours = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
        tabBody = `
          <div class="card" style="margin-bottom:18px;">
            <h3 class="card-title" style="margin-bottom:12px;">Schedule Time Block (Today)</h3>
            <form id="addTimeBlockForm" class="form-grid">
              <div class="field"><label>Hour Slot</label><select class="select" name="hour">${hours.map(h => `<option>${h}</option>`).join('')}</select></div>
              <div class="field"><label>Block Title</label><input class="input" name="title" placeholder="Deep Work / Meeting / Break" required></div>
              <div class="field"><label>Tag</label><select class="select" name="tag"><option>Focus</option><option>Work</option><option>Health</option><option>Personal</option></select></div>
              <div class="field" style="justify-content:flex-end;"><button type="submit" class="btn btn-violet">Block Time</button></div>
            </form>
          </div>
          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Daily Time-Blocked Schedule</h3>
            <div class="item-list">
              ${hours.map(h => {
                const blk = s.timeBlocks.find(b => b.date === today && b.hour === h);
                return `
                  <div class="list-row">
                    <div class="list-row-left">
                      <strong style="min-width:56px;color:var(--teal-600);">${h}</strong>
                      ${blk
                        ? `<div class="item-text"><span class="item-title">${Utils.escapeHtml(blk.title)}</span> <span class="tag tag-teal">${Utils.escapeHtml(blk.tag)}</span></div>`
                        : `<span style="color:var(--text-muted);font-size:0.84rem;">Open slot</span>`}
                    </div>
                    ${blk ? `<button class="btn btn-danger-soft btn-sm" data-del-tb="${blk.id}">Clear</button>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      return `
        <div class="page-header">
          <div class="page-header-left">
            <h2>Daily &amp; Life Planner</h2>
            <p>Plan your day, week, month, priorities, routines, checklists, and time blocks.</p>
          </div>
          <button class="btn btn-soft btn-sm" data-toggle-fav="planner">${Store.state.favorites.includes('planner') ? '★ Favorited' : '☆ Favorite'}</button>
        </div>
        <div class="tabs-bar">
          ${[
            ['daily', 'Daily Planner'],
            ['weekly', 'Weekly Planner'],
            ['monthly', 'Monthly Planner'],
            ['tasks', 'Task Manager'],
            ['checklist', 'Checklists'],
            ['routine', 'Routine Planner'],
            ['timeblock', 'Time Blocking']
          ].map(([k, lbl]) => `<button class="tab-btn ${tab === k ? 'active' : ''}" data-planner-tab="${k}">${lbl}</button>`).join('')}
        </div>
        ${tabBody}
      `;
    },

    habits() {
      const s = Store.state.habits;
      const today = Utils.todayISO();
      const last7 = Utils.getLastNDays(7);
      const last30 = Utils.getLastNDays(30);

      const totalCheckins = s.reduce((sum, h) => sum + h.completedDates.length, 0);
      const weekRate = s.length
        ? Math.round((s.reduce((sum, h) => sum + last7.filter(d => h.completedDates.includes(d)).length, 0) / (s.length * 7)) * 100)
        : 0;
      const monthRate = s.length
        ? Math.round((s.reduce((sum, h) => sum + last30.filter(d => h.completedDates.includes(d)).length, 0) / (s.length * 30)) * 100)
        : 0;

      const chartPoints = last7.map(d => ({
        label: Utils.formatShortDay(d),
        value: s.length ? Math.round((s.filter(h => h.completedDates.includes(d)).length / s.length) * 100) : 0
      }));

      // Current month habit calendar
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth();
      const { firstDay, totalDays } = Utils.getMonthDays(y, m);
      let calCells = Array.from({ length: firstDay }, () => `<div class="calendar-day empty"></div>`).join('');
      for (let d = 1; d <= totalDays; d++) {
        const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const doneCount = s.filter(h => h.completedDates.includes(iso)).length;
        const pct = s.length ? Math.round((doneCount / s.length) * 100) : 0;
        const bg = pct >= 75 ? 'background:var(--teal-600);color:#fff;' : pct > 0 ? 'background:var(--teal-50);' : '';
        calCells += `<div class="calendar-day ${iso === today ? 'today' : ''}" style="${bg}" title="${iso}: ${doneCount}/${s.length} habits">
          <span>${d}</span>
          <span style="font-size:0.65rem;">${doneCount}/${s.length}</span>
        </div>`;
      }

      return `
        <div class="page-header">
          <div class="page-header-left">
            <h2>Habit Tracker</h2>
            <p>Build daily momentum with streaks, weekly &amp; monthly progress, and habit calendar.</p>
          </div>
          <button class="btn btn-soft btn-sm" data-toggle-fav="habits">${Store.state.favorites.includes('habits') ? '★ Favorited' : '☆ Favorite'}</button>
        </div>

        <div class="grid-4" style="margin-bottom:18px;">
          <div class="card kpi-card"><span class="kpi-label">Active Habits</span><div class="kpi-value">${s.length}</div></div>
          <div class="card kpi-card"><span class="kpi-label">7-Day Progress</span><div class="kpi-value">${weekRate}%</div></div>
          <div class="card kpi-card"><span class="kpi-label">30-Day Progress</span><div class="kpi-value">${monthRate}%</div></div>
          <div class="card kpi-card"><span class="kpi-label">Total Check-ins</span><div class="kpi-value">${totalCheckins}</div></div>
        </div>

        <div class="card" style="margin-bottom:18px;">
          <h3 class="card-title" style="margin-bottom:12px;">Create New Habit</h3>
          <form id="addHabitForm" class="form-grid">
            <div class="field"><label>Habit Name</label><input class="input" name="name" placeholder="e.g. 15m Morning Reading" required></div>
            <div class="field"><label>Category</label><select class="select" name="category"><option>Lifestyle</option><option>Productivity</option><option>Learning</option><option>Finance</option><option>Health</option></select></div>
            <div class="field"><label>Weekly Target (days)</label><input class="input" type="number" min="1" max="7" name="targetDays" value="7"></div>
            <div class="field"><label>Reminder Time</label><input class="input" type="time" name="reminder" value="09:00"></div>
            <div class="field" style="justify-content:flex-end;"><button type="submit" class="btn btn-primary">Add Habit</button></div>
          </form>
        </div>

        <div class="grid-2" style="margin-bottom:18px;">
          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Today's Check-In &amp; Streaks</h3>
            <div class="item-list">
              ${s.length ? s.map(h => {
                const done = h.completedDates.includes(today);
                const streaks = calculateHabitStreaks(h);
                const wCount = last7.filter(d => h.completedDates.includes(d)).length;
                return `
                  <div class="list-row">
                    <div class="list-row-left">
                      <button class="check-circle ${done ? 'checked' : ''}" data-toggle-habit="${h.id}">${done ? '✓' : ''}</button>
                      <div class="item-text">
                        <div class="item-title ${done ? 'done' : ''}">${Utils.escapeHtml(h.name)}</div>
                        <div class="item-sub">
                          <span class="tag tag-teal">${Utils.escapeHtml(h.category)}</span>
                          <span>🔥 ${streaks.current}d streak (Best: ${streaks.best}d)</span>
                          <span>• ${wCount}/${h.targetDays} this week</span>
                        </div>
                      </div>
                    </div>
                    <button class="btn btn-danger-soft btn-sm" data-del-habit="${h.id}">Delete</button>
                  </div>
                `;
              }).join('') : `<div class="empty-state">No habits yet. Add one above!</div>`}
            </div>
          </div>

          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">7-Day Habit Completion Chart</h3>
            <div class="chart-wrap">${Charts.barChart(chartPoints, { unit: '%', minMax: 100 })}</div>
            <h4 style="margin:16px 0 8px;font-size:0.9rem;">Monthly Habit Calendar</h4>
            <div class="calendar-grid">
              ${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => `<div class="calendar-weekday">${w}</div>`).join('')}
              ${calCells}
            </div>
          </div>
        </div>
      `;
    },

    goals() {
      const catFilter = Router.subTab.goals || 'All';
      const cats = ['All', 'Personal', 'Financial', 'Health & Fitness', 'Career', 'Learning'];
      const list = catFilter === 'All' ? Store.state.goals : Store.state.goals.filter(g => g.category === catFilter);

      return `
        <div class="page-header">
          <div class="page-header-left">
            <h2>Goal Management</h2>
            <p>Track personal, financial, fitness, career &amp; learning goals with milestones.</p>
          </div>
          <button class="btn btn-soft btn-sm" data-toggle-fav="goals">${Store.state.favorites.includes('goals') ? '★ Favorited' : '☆ Favorite'}</button>
        </div>

        <div class="tabs-bar">
          ${cats.map(c => `<button class="tab-btn ${catFilter === c ? 'active' : ''}" data-goal-cat="${c}">${c}</button>`).join('')}
        </div>

        <div class="card" style="margin-bottom:18px;">
          <h3 class="card-title" style="margin-bottom:12px;">Create New Goal</h3>
          <form id="addGoalForm" class="form-grid">
            <div class="field"><label>Goal Title</label><input class="input" name="title" placeholder="e.g. Save ₹1,00,000" required></div>
            <div class="field"><label>Category</label><select class="select" name="category">${cats.slice(1).map(c => `<option>${c}</option>`).join('')}</select></div>
            <div class="field"><label>Deadline</label><input class="input" type="date" name="deadline" value="${Utils.addDaysISO(Utils.todayISO(), 60)}"></div>
            <div class="field"><label>Initial Progress (%)</label><input class="input" type="number" min="0" max="100" name="progress" value="10"></div>
            <div class="field"><label>Notes</label><input class="input" name="notes" placeholder="Why this matters..."></div>
            <div class="field" style="justify-content:flex-end;"><button type="submit" class="btn btn-violet">Add Goal</button></div>
          </form>
        </div>

        <div class="grid-2">
          ${list.length ? list.map(g => `
            <div class="card">
              <div class="card-header">
                <div>
                  <span class="tag tag-violet" style="margin-bottom:6px;">${Utils.escapeHtml(g.category)}</span>
                  <h3 class="card-title">${Utils.escapeHtml(g.title)}</h3>
                  <p class="card-subtitle">Deadline: ${Utils.formatDate(g.deadline)}</p>
                </div>
                <button class="btn btn-danger-soft btn-sm" data-del-goal="${g.id}">Delete</button>
              </div>
              ${g.notes ? `<p style="font-size:0.84rem;color:var(--text-secondary);margin:0 0 12px;">${Utils.escapeHtml(g.notes)}</p>` : ''}
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <div class="progress-track" style="flex:1;"><div class="progress-fill" style="width:${g.progress}%"></div></div>
                <strong>${g.progress}%</strong>
                <button class="btn btn-soft btn-sm" data-step-goal="${g.id}:10">+10%</button>
                <button class="btn btn-soft btn-sm" data-step-goal="${g.id}:-10">-10%</button>
              </div>
              <div style="border-top:1px solid var(--border-soft);padding-top:10px;">
                <strong style="font-size:0.82rem;">Milestones</strong>
                <form class="addMilestoneForm" data-goal-id="${g.id}" style="display:flex;gap:8px;margin:8px 0;">
                  <input class="input" name="text" placeholder="Add milestone..." required>
                  <button class="btn btn-primary btn-sm" type="submit">Add</button>
                </form>
                <div class="item-list">
                  ${(g.milestones || []).map(ms => `
                    <div class="list-row" style="padding:8px 10px;">
                      <div class="list-row-left">
                        <button class="check-circle ${ms.done ? 'checked' : ''}" data-toggle-ms="${g.id}:${ms.id}">${ms.done ? '✓' : ''}</button>
                        <div class="item-title ${ms.done ? 'done' : ''}" style="font-size:0.84rem;">${Utils.escapeHtml(ms.text)}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `).join('') : `<div class="empty-state">No goals in this category yet.</div>`}
        </div>
      `;
    },

    finance() {
      const f = Store.state.finance;
      const sym = Store.state.profile.currency || '₹';
      const month = Utils.todayISO().slice(0, 7);
      const monthTx = f.transactions.filter(t => t.date.startsWith(month));
      const totalIncome = monthTx.filter(t => t.type === 'income').reduce((a, b) => a + Number(b.amount), 0);
      const totalExpense = monthTx.filter(t => t.type === 'expense').reduce((a, b) => a + Number(b.amount), 0);
      const net = totalIncome - totalExpense;
      const budgetPct = f.monthlyBudget > 0 ? Math.round((totalExpense / f.monthlyBudget) * 100) : 0;
      const savingsPct = f.savingsGoal > 0 ? Math.min(100, Math.round((f.currentSavings / f.savingsGoal) * 100)) : 0;

      const catMap = {};
      monthTx.filter(t => t.type === 'expense').forEach(t => {
        catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
      });
      const segments = Object.entries(catMap).map(([label, value]) => ({
        label, value, displayValue: Utils.formatCurrency(value, sym)
      }));

      let budgetAlertHtml = '';
      if (budgetPct >= 100) {
        budgetAlertHtml = `<div class="alert-banner alert-danger"><div><strong>Budget Alert: Monthly limit exceeded!</strong> You have spent ${Utils.formatCurrency(totalExpense, sym)} against your ${Utils.formatCurrency(f.monthlyBudget, sym)} budget (${budgetPct}%).</div></div>`;
      } else if (budgetPct >= 80) {
        budgetAlertHtml = `<div class="alert-banner alert-warning"><div><strong>Budget Alert: Approaching limit (${budgetPct}%)</strong> — ${Utils.formatCurrency(f.monthlyBudget - totalExpense, sym)} remaining this month.</div></div>`;
      }

      return `
        <div class="page-header">
          <div class="page-header-left">
            <h2>Personal Finance</h2>
            <p>Track daily expenses, income, monthly budgets, savings goals &amp; category spending.</p>
          </div>
          <button class="btn btn-soft btn-sm" data-toggle-fav="finance">${Store.state.favorites.includes('finance') ? '★ Favorited' : '☆ Favorite'}</button>
        </div>

        ${budgetAlertHtml}

        <div class="grid-4" style="margin-bottom:18px;">
          <div class="card kpi-card"><span class="kpi-label">Monthly Income</span><div class="kpi-value" style="color:var(--success);">${Utils.formatCurrency(totalIncome, sym)}</div></div>
          <div class="card kpi-card"><span class="kpi-label">Monthly Expenses</span><div class="kpi-value" style="color:var(--danger);">${Utils.formatCurrency(totalExpense, sym)}</div></div>
          <div class="card kpi-card"><span class="kpi-label">Net Balance</span><div class="kpi-value">${Utils.formatCurrency(net, sym)}</div></div>
          <div class="card kpi-card"><span class="kpi-label">Budget Used</span><div class="kpi-value">${budgetPct}%</div><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, budgetPct)}%"></div></div></div>
        </div>

        <div class="grid-2" style="margin-bottom:18px;">
          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Record Expense or Income</h3>
            <form id="addTxForm" class="form-grid">
              <div class="field"><label>Type</label><select class="select" name="type"><option value="expense">Expense</option><option value="income">Income</option></select></div>
              <div class="field"><label>Amount (${Utils.escapeHtml(sym)})</label><input class="input" type="number" step="0.01" name="amount" required placeholder="500"></div>
              <div class="field"><label>Category</label><select class="select" name="category"><option>Food</option><option>Transport</option><option>Housing</option><option>Utilities</option><option>Shopping</option><option>Health</option><option>Entertainment</option><option>Education</option><option>Salary</option><option>Freelance</option><option>Other</option></select></div>
              <div class="field"><label>Date</label><input class="input" type="date" name="date" value="${Utils.todayISO()}"></div>
              <div class="field" style="grid-column:1 / -1;"><label>Note</label><input class="input" name="note" placeholder="Description..."></div>
              <div class="field"><button type="submit" class="btn btn-primary">Save Transaction</button></div>
            </form>
          </div>

          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Monthly Budget &amp; Savings Goal</h3>
            <form id="budgetSavingsForm" class="form-grid" style="margin-bottom:14px;">
              <div class="field"><label>Monthly Budget (${Utils.escapeHtml(sym)})</label><input class="input" type="number" name="monthlyBudget" value="${f.monthlyBudget}" required></div>
              <div class="field"><label>Savings Target (${Utils.escapeHtml(sym)})</label><input class="input" type="number" name="savingsGoal" value="${f.savingsGoal}" required></div>
              <div class="field"><label>Current Saved (${Utils.escapeHtml(sym)})</label><input class="input" type="number" name="currentSavings" value="${f.currentSavings}" required></div>
              <div class="field" style="justify-content:flex-end;"><button type="submit" class="btn btn-violet">Update Targets</button></div>
            </form>
            <div style="padding:12px;border-radius:12px;background:var(--bg-surface-soft);">
              <div style="display:flex;justify-content:space-between;font-size:0.86rem;font-weight:700;margin-bottom:6px;">
                <span>Savings Progress</span>
                <span>${savingsPct}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" style="width:${savingsPct}%"></div></div>
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Monthly Spending Summary</h3>
            ${Charts.donutChart(segments, 'Total', Utils.formatCurrency(totalExpense, sym))}
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Transaction History</h3>
              <span class="tag tag-teal">${f.transactions.length} Entries</span>
            </div>
            <div class="item-list" style="max-height:340px;overflow-y:auto;">
              ${f.transactions.length ? f.transactions.map(tx => `
                <div class="list-row">
                  <div class="item-text">
                    <div class="item-title">${Utils.escapeHtml(tx.category)} ${tx.note ? `— ${Utils.escapeHtml(tx.note)}` : ''}</div>
                    <div class="item-sub"><span>${Utils.formatDate(tx.date)}</span><span>• ${tx.type.toUpperCase()}</span></div>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <strong style="color:${tx.type === 'income' ? 'var(--success)' : 'var(--danger)'};">
                      ${tx.type === 'income' ? '+' : '-'}${Utils.formatCurrency(tx.amount, sym)}
                    </strong>
                    <button class="btn btn-danger-soft btn-sm" data-del-tx="${tx.id}">×</button>
                  </div>
                </div>
              `).join('') : `<div class="empty-state">No transactions recorded yet.</div>`}
            </div>
          </div>
        </div>
      `;
    },

    timer() {
      const t = TimerEngine;
      const s = Store.state.timer;
      const today = Utils.todayISO();
      const todayMins = s.sessions.filter(x => x.date === today).reduce((a, b) => a + Number(b.minutes), 0);
      const r = 90;
      const c = 2 * Math.PI * r;
      const frac = t.mode === 'stopwatch' ? 1 : (t.totalSeconds > 0 ? t.secondsLeft / t.totalSeconds : 1);
      const dashOffset = c * (1 - frac);

      return `
        <div class="page-header">
          <div class="page-header-left">
            <h2>Time Management &amp; Focus</h2>
            <p>Pomodoro timer, focus timer, countdown, stopwatch, break reminders &amp; session log.</p>
          </div>
          <button class="btn btn-soft btn-sm" data-toggle-fav="timer">${Store.state.favorites.includes('timer') ? '★ Favorited' : '☆ Favorite'}</button>
        </div>

        ${t.breakBanner ? `<div class="alert-banner alert-success"><div><strong>Break Reminder:</strong> ${Utils.escapeHtml(t.breakBanner)}</div><button class="btn btn-soft btn-sm" id="dismissBreakBtn">Dismiss</button></div>` : ''}

        <div class="tabs-bar">
          ${[
            ['pomodoro', 'Pomodoro Timer'],
            ['focus', 'Focus Timer'],
            ['countdown', 'Countdown Timer'],
            ['stopwatch', 'Stopwatch']
          ].map(([k, lbl]) => `<button class="tab-btn ${t.mode === k ? 'active' : ''}" data-timer-mode="${k}">${lbl}</button>`).join('')}
        </div>

        <div class="grid-2">
          <div class="card timer-display-card">
            <div class="field" style="width:100%;max-width:320px;margin-bottom:8px;">
              <input class="input" id="timerSessionLabel" value="${Utils.escapeHtml(t.sessionLabel)}" placeholder="What are you focusing on?">
            </div>

            <div class="timer-ring-wrap">
              <svg viewBox="0 0 210 210" width="210" height="210">
                <defs>
                  <linearGradient id="tmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#0D9488"/><stop offset="100%" stop-color="#7C3AED"/>
                  </linearGradient>
                </defs>
                <circle cx="105" cy="105" r="${r}" fill="none" stroke="var(--border-color)" stroke-width="12"/>
                <circle id="liveTimerRing" cx="105" cy="105" r="${r}" fill="none" stroke="url(#tmGrad)" stroke-width="12"
                  stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 105 105)"/>
              </svg>
              <div class="timer-ring-text">
                <div class="timer-clock" id="liveTimerClock">${t.mode === 'stopwatch' ? t.formatTime(t.elapsedSeconds) : t.formatTime(t.secondsLeft)}</div>
                <div class="timer-mode-label">${Utils.escapeHtml(t.phase)}</div>
              </div>
            </div>

            <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:16px;">
              ${t.running
                ? `<button class="btn btn-violet" id="timerPauseBtn">Pause</button>`
                : `<button class="btn btn-gradient" id="timerStartBtn">Start</button>`}
              <button class="btn btn-soft" id="timerResetBtn">Reset</button>
              ${t.mode === 'stopwatch' ? `<button class="btn btn-primary" id="timerLapBtn">Lap</button>` : ''}
            </div>

            ${t.mode === 'pomodoro' ? `
              <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
                <button class="btn btn-soft btn-sm" data-pomo-preset="work">Work (${s.pomodoroWorkMin}m)</button>
                <button class="btn btn-soft btn-sm" data-pomo-preset="short">Short Break (${s.pomodoroShortMin}m)</button>
                <button class="btn btn-soft btn-sm" data-pomo-preset="long">Long Break (${s.pomodoroLongMin}m)</button>
              </div>
            ` : t.mode === 'focus' || t.mode === 'countdown' ? `
              <form id="customTimerForm" style="display:flex;gap:8px;align-items:center;justify-content:center;">
                <input class="input" style="width:90px;" type="number" min="1" max="180" name="mins" value="15">
                <span style="font-size:0.84rem;">minutes</span>
                <button class="btn btn-soft btn-sm" type="submit">Set</button>
              </form>
            ` : ''}

            ${t.mode === 'stopwatch' && t.laps.length ? `
              <div style="width:100%;margin-top:14px;text-align:left;">
                <strong style="font-size:0.84rem;">Laps</strong>
                <div class="item-list" style="margin-top:6px;">${t.laps.map((l, idx) => `<div class="list-row" style="padding:6px 10px;"><span>Lap ${t.laps.length - idx}</span><strong>${l}</strong></div>`).join('')}</div>
              </div>
            ` : ''}
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Work Session Tracker</h3>
                <p class="card-subtitle">${todayMins} focus minutes logged today</p>
              </div>
              <button class="btn btn-soft btn-sm" id="logManualSessionBtn">+ Log Manual</button>
            </div>
            <div class="item-list" style="max-height:360px;overflow-y:auto;">
              ${s.sessions.length ? s.sessions.map(ses => `
                <div class="list-row">
                  <div class="item-text">
                    <div class="item-title">${Utils.escapeHtml(ses.label)}</div>
                    <div class="item-sub"><span class="tag tag-teal">${Utils.escapeHtml(ses.mode)}</span><span>${ses.minutes} min</span><span>• ${Utils.formatDate(ses.date)}</span></div>
                  </div>
                </div>
              `).join('') : `<div class="empty-state">Complete a timer or log a manual work session!</div>`}
            </div>
          </div>
        </div>
      `;
    },

    health() {
      const h = Store.state.health;
      const today = Utils.todayISO();
      const cups = h.waterByDate[today] || 0;
      const waterPct = Math.min(100, Math.round((cups / (h.waterGoalCups || 8)) * 100));
      const todayWalk = h.walkLogs.filter(w => w.date === today).reduce((a, b) => a + Number(b.steps), 0);
      const walkPct = Math.min(100, Math.round((todayWalk / (h.walkStepGoal || 8000)) * 100));

      return `
        <div class="page-header">
          <div class="page-header-left">
            <h2>Health &amp; Lifestyle</h2>
            <p>Everyday personal hydration, sleep, walking, exercise, meals &amp; wellness reflection.</p>
          </div>
          <button class="btn btn-soft btn-sm" data-toggle-fav="health">${Store.state.favorites.includes('health') ? '★ Favorited' : '☆ Favorite'}</button>
        </div>

        <div class="alert-banner alert-info">
          <div><strong>Lifestyle Tracking Notice:</strong> These features are personal everyday lifestyle organization tools and do not provide medical advice, diagnosis, or treatment.</div>
          <img src="./assets/illustrations/wellness-balance.svg" alt="Wellness illustration" style="width:68px;border-radius:10px;" class="hide-sm">
        </div>

        <div class="grid-3" style="margin-bottom:18px;">
          <!-- Water Intake -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Water Intake Tracker</h3>
              <span class="tag tag-teal">${cups} / ${h.waterGoalCups} cups</span>
            </div>
            <div class="progress-track" style="margin-bottom:14px;"><div class="progress-fill" style="width:${waterPct}%"></div></div>
            <div style="display:flex;gap:10px;">
              <button class="btn btn-primary btn-sm" id="waterPlusBtn">+1 Glass (250ml)</button>
              <button class="btn btn-soft btn-sm" id="waterMinusBtn">-1</button>
            </div>
          </div>

          <!-- Walking Tracker Manual -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Walking Tracker (Manual)</h3>
              <span class="tag tag-violet">${todayWalk.toLocaleString()} / ${h.walkStepGoal.toLocaleString()} steps</span>
            </div>
            <div class="progress-track" style="margin-bottom:12px;"><div class="progress-fill" style="width:${walkPct}%"></div></div>
            <form id="addWalkForm" style="display:flex;gap:8px;flex-wrap:wrap;">
              <input class="input" style="flex:1;min-width:100px;" type="number" name="steps" placeholder="Steps" required>
              <input class="input" style="width:85px;" type="number" step="0.1" name="km" placeholder="km">
              <button class="btn btn-violet btn-sm" type="submit">Log</button>
            </form>
          </div>

          <!-- Daily Wellness Checklist -->
          <div class="card">
            <h3 class="card-title" style="margin-bottom:10px;">Daily Wellness Checklist</h3>
            <div class="item-list">
              ${h.wellnessChecklist.map(wc => {
                const done = wc.doneDates.includes(today);
                return `
                  <div class="list-row" style="padding:8px 10px;">
                    <div class="list-row-left">
                      <button class="check-circle ${done ? 'checked' : ''}" data-toggle-wc="${wc.id}">${done ? '✓' : ''}</button>
                      <div class="item-title ${done ? 'done' : ''}" style="font-size:0.84rem;">${Utils.escapeHtml(wc.text)}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="grid-2" style="margin-bottom:18px;">
          <!-- Sleep Log -->
          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Sleep Log</h3>
            <form id="addSleepForm" class="form-grid" style="margin-bottom:14px;">
              <div class="field"><label>Bedtime</label><input class="input" type="time" name="bedtime" value="23:00" required></div>
              <div class="field"><label>Wake Time</label><input class="input" type="time" name="wakeTime" value="06:45" required></div>
              <div class="field"><label>Quality (1-5)</label><select class="select" name="quality"><option>5</option><option selected>4</option><option>3</option><option>2</option><option>1</option></select></div>
              <div class="field" style="justify-content:flex-end;"><button type="submit" class="btn btn-primary">Log Sleep</button></div>
            </form>
            <div class="item-list">
              ${h.sleepLogs.slice(0, 4).map(sl => `
                <div class="list-row">
                  <div class="item-text">
                    <div class="item-title">${sl.hours} hrs (${sl.bedtime} → ${sl.wakeTime})</div>
                    <div class="item-sub"><span>${Utils.formatDate(sl.date)}</span><span>• Quality ${sl.quality}/5</span></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Exercise Planner -->
          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Exercise Planner</h3>
            <form id="addExerciseForm" class="form-grid" style="margin-bottom:14px;">
              <div class="field"><label>Activity</label><input class="input" name="name" placeholder="Yoga / Cycling / Walk" required></div>
              <div class="field"><label>Day</label><select class="select" name="day"><option>Mon</option><option>Tue</option><option>Wed</option><option>Thu</option><option>Fri</option><option>Sat</option><option>Sun</option></select></div>
              <div class="field"><label>Minutes</label><input class="input" type="number" name="duration" value="30"></div>
              <div class="field" style="justify-content:flex-end;"><button type="submit" class="btn btn-violet">Plan</button></div>
            </form>
            <div class="item-list">
              ${h.exercises.map(ex => `
                <div class="list-row">
                  <div class="list-row-left">
                    <button class="check-circle ${ex.completed ? 'checked' : ''}" data-toggle-ex="${ex.id}">${ex.completed ? '✓' : ''}</button>
                    <div class="item-text">
                      <div class="item-title ${ex.completed ? 'done' : ''}">${Utils.escapeHtml(ex.name)}</div>
                      <div class="item-sub"><span>${ex.day}</span><span>• ${ex.duration} min</span></div>
                    </div>
                  </div>
                  <button class="btn btn-danger-soft btn-sm" data-del-ex="${ex.id}">×</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="grid-2">
          <!-- Meal Planner -->
          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Weekly Meal Planner</h3>
            <form id="mealPlanForm" class="form-grid">
              <div class="field"><label>Day</label><select class="select" id="mealDaySelect" name="day">${Object.keys(h.meals).map(d => `<option>${d}</option>`).join('')}</select></div>
              <div class="field"><label>Breakfast</label><input class="input" name="breakfast" id="mealBreakfast" value="${Utils.escapeHtml(h.meals.Mon.breakfast)}"></div>
              <div class="field"><label>Lunch</label><input class="input" name="lunch" id="mealLunch" value="${Utils.escapeHtml(h.meals.Mon.lunch)}"></div>
              <div class="field"><label>Dinner</label><input class="input" name="dinner" id="mealDinner" value="${Utils.escapeHtml(h.meals.Mon.dinner)}"></div>
              <div class="field"><label>Snack</label><input class="input" name="snack" id="mealSnack" value="${Utils.escapeHtml(h.meals.Mon.snack)}"></div>
              <div class="field" style="justify-content:flex-end;"><button type="submit" class="btn btn-primary">Save Day Meals</button></div>
            </form>
          </div>

          <!-- Personal Wellness Journal -->
          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Personal Wellness Journal</h3>
            <form id="addWellnessJournalForm" class="stack-md" style="gap:10px;margin-bottom:14px;">
              <div class="form-grid">
                <div class="field"><label>Mood</label><select class="select" name="mood"><option>Energized</option><option>Calm</option><option>Balanced</option><option>Tired</option><option>Stressed</option></select></div>
                <div class="field"><label>Energy (1-5)</label><input class="input" type="number" min="1" max="5" name="energy" value="4"></div>
              </div>
              <textarea class="textarea" name="note" placeholder="How are you feeling today?" required></textarea>
              <button type="submit" class="btn btn-primary btn-sm">Save Entry</button>
            </form>
            <div class="item-list">
              ${h.wellnessJournal.slice(0, 3).map(w => `
                <div class="list-row">
                  <div class="item-text">
                    <div class="item-title">${Utils.escapeHtml(w.mood)} (Energy ${w.energy}/5) — ${Utils.formatDate(w.date)}</div>
                    <div class="item-sub">${Utils.escapeHtml(w.note)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    },

    organizer() {
      const o = Store.state.organizer;
      const tab = Router.subTab.organizer || 'notes';
      let body = '';

      if (tab === 'notes') {
        body = `
          <div class="card" style="margin-bottom:18px;">
            <h3 class="card-title" style="margin-bottom:12px;">Create Note</h3>
            <form id="addNoteForm" class="stack-md" style="gap:10px;">
              <div class="form-grid">
                <div class="field"><label>Title</label><input class="input" name="title" placeholder="Note title" required></div>
                <div class="field"><label>Tag</label><input class="input" name="tag" placeholder="Work / Idea / Personal" value="Personal"></div>
              </div>
              <textarea class="textarea" name="content" placeholder="Write your note..." required></textarea>
              <div><button class="btn btn-primary" type="submit">Save Note</button></div>
            </form>
          </div>
          <div class="grid-2">
            ${o.notes.map(n => `
              <div class="card">
                <div class="card-header">
                  <div>
                    <span class="tag tag-teal">${Utils.escapeHtml(n.tag)}</span>
                    <h3 class="card-title" style="margin-top:6px;">${n.pinned ? '📌 ' : ''}${Utils.escapeHtml(n.title)}</h3>
                  </div>
                  <div style="display:flex;gap:6px;">
                    <button class="btn btn-soft btn-sm" data-pin-note="${n.id}">${n.pinned ? 'Unpin' : 'Pin'}</button>
                    <button class="btn btn-danger-soft btn-sm" data-del-note="${n.id}">Delete</button>
                  </div>
                </div>
                <p style="white-space:pre-wrap;font-size:0.88rem;color:var(--text-secondary);margin:0;">${Utils.escapeHtml(n.content)}</p>
              </div>
            `).join('')}
          </div>
        `;
      } else if (tab === 'diary') {
        body = `
          <div class="card" style="margin-bottom:18px;">
            <h3 class="card-title" style="margin-bottom:12px;">Personal Diary &amp; Journal</h3>
            <form id="addDiaryForm" class="stack-md" style="gap:10px;">
              <div class="form-grid">
                <div class="field"><label>Title</label><input class="input" name="title" placeholder="Today's headline..." required></div>
                <div class="field"><label>Mood</label><select class="select" name="mood"><option>Grateful</option><option>Focused</option><option>Peaceful</option><option>Reflective</option><option>Hopeful</option></select></div>
              </div>
              <textarea class="textarea" name="content" placeholder="Write freely about your day..." required></textarea>
              <div><button class="btn btn-violet" type="submit">Save Diary Entry</button></div>
            </form>
          </div>
          <div class="stack-md">
            ${o.diary.map(d => `
              <div class="card">
                <div class="card-header">
                  <div><span class="tag tag-violet">${Utils.escapeHtml(d.mood)}</span> <strong style="margin-left:8px;">${Utils.escapeHtml(d.title)}</strong></div>
                  <span style="font-size:0.8rem;color:var(--text-muted);">${Utils.formatDate(d.date)}</span>
                </div>
                <p style="margin:0;white-space:pre-wrap;color:var(--text-secondary);font-size:0.9rem;">${Utils.escapeHtml(d.content)}</p>
              </div>
            `).join('')}
          </div>
        `;
      } else if (tab === 'dates') {
        body = `
          <div class="grid-2">
            <div class="card">
              <h3 class="card-title" style="margin-bottom:12px;">Important Dates &amp; Birthdays</h3>
              <form id="addImportantDateForm" class="form-grid" style="margin-bottom:14px;">
                <div class="field"><label>Name / Title</label><input class="input" name="title" placeholder="e.g. Priya's Birthday" required></div>
                <div class="field"><label>Type</label><select class="select" name="type"><option>Birthday</option><option>Anniversary</option><option>Important Date</option></select></div>
                <div class="field"><label>Date</label><input class="input" type="date" name="date" required></div>
                <div class="field"><label>Reminder Note</label><input class="input" name="note" placeholder="Gift idea..."></div>
                <div class="field"><button class="btn btn-primary" type="submit">Save Date</button></div>
              </form>
              <div class="item-list">
                ${o.importantDates.map(id => {
                  const days = Utils.daysUntilMonthDay(id.date);
                  return `
                    <div class="list-row">
                      <div class="item-text">
                        <div class="item-title">${Utils.escapeHtml(id.title)} <span class="tag tag-violet">${Utils.escapeHtml(id.type)}</span></div>
                        <div class="item-sub"><span>${Utils.formatDate(id.date)}</span><span>• ${days === 0 ? 'Today!' : `In ${days} days`}</span>${id.note ? `<span>• ${Utils.escapeHtml(id.note)}</span>` : ''}</div>
                      </div>
                      <button class="btn btn-danger-soft btn-sm" data-del-impdate="${id.id}">×</button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <div class="card">
              <h3 class="card-title" style="margin-bottom:12px;">Event Planner</h3>
              <form id="addEventForm" class="form-grid" style="margin-bottom:14px;">
                <div class="field"><label>Event Title</label><input class="input" name="title" placeholder="Dinner / Meetup" required></div>
                <div class="field"><label>Date</label><input class="input" type="date" name="date" value="${Utils.todayISO()}"></div>
                <div class="field"><label>Time</label><input class="input" type="time" name="time" value="18:00"></div>
                <div class="field"><label>Location</label><input class="input" name="location" placeholder="Venue"></div>
                <div class="field"><button class="btn btn-violet" type="submit">Add Event</button></div>
              </form>
              <div class="item-list">
                ${o.events.map(ev => `
                  <div class="list-row">
                    <div class="item-text">
                      <div class="item-title">${Utils.escapeHtml(ev.title)}</div>
                      <div class="item-sub"><span>${Utils.formatDate(ev.date)} ${ev.time}</span>${ev.location ? `<span>• ${Utils.escapeHtml(ev.location)}</span>` : ''}</div>
                    </div>
                    <button class="btn btn-danger-soft btn-sm" data-del-event="${ev.id}">×</button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      } else if (tab === 'shopping') {
        body = `
          <div class="card" style="margin-bottom:18px;">
            <form id="addShopForm" class="form-grid">
              <div class="field"><label>Item</label><input class="input" name="text" placeholder="Add grocery or shopping item..." required></div>
              <div class="field"><label>List</label><select class="select" name="listType"><option>Grocery</option><option>Shopping</option></select></div>
              <div class="field" style="justify-content:flex-end;"><button type="submit" class="btn btn-primary">Add Item</button></div>
            </form>
          </div>
          <div class="grid-2">
            ${['Grocery', 'Shopping'].map(lt => {
              const items = o.shoppingList.filter(i => i.listType === lt);
              return `
                <div class="card">
                  <div class="card-header">
                    <h3 class="card-title">${lt} List</h3>
                    <button class="btn btn-soft btn-sm" data-clear-shop="${lt}">Clear Checked</button>
                  </div>
                  <div class="item-list">
                    ${items.length ? items.map(it => `
                      <div class="list-row">
                        <div class="list-row-left">
                          <button class="check-circle ${it.done ? 'checked' : ''}" data-toggle-shop="${it.id}">${it.done ? '✓' : ''}</button>
                          <div class="item-title ${it.done ? 'done' : ''}">${Utils.escapeHtml(it.text)}</div>
                        </div>
                        <button class="btn btn-danger-soft btn-sm" data-del-shop="${it.id}">×</button>
                      </div>
                    `).join('') : `<div class="empty-state">Your ${lt.toLowerCase()} list is empty.</div>`}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else {
        // Travel & Document Checklists
        body = `
          <div class="grid-2">
            ${[
              ['travel', 'Travel Checklist'],
              ['documents', 'Document Checklist']
            ].map(([key, title]) => `
              <div class="card">
                <h3 class="card-title" style="margin-bottom:12px;">${title}</h3>
                <form class="addOrgCheckForm" data-org-list="${key}" style="display:flex;gap:8px;margin-bottom:12px;">
                  <input class="input" name="text" placeholder="Add item..." required>
                  <button class="btn btn-primary btn-sm" type="submit">Add</button>
                </form>
                <div class="item-list">
                  ${o.checklists[key].map(it => `
                    <div class="list-row">
                      <div class="list-row-left">
                        <button class="check-circle ${it.done ? 'checked' : ''}" data-toggle-orgcl="${key}:${it.id}">${it.done ? '✓' : ''}</button>
                        <div class="item-title ${it.done ? 'done' : ''}">${Utils.escapeHtml(it.text)}</div>
                      </div>
                      <button class="btn btn-danger-soft btn-sm" data-del-orgcl="${key}:${it.id}">×</button>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

      return `
        <div class="page-header">
          <div class="page-header-left">
            <h2>Personal Organizer</h2>
            <p>Notes, personal diary, birthday reminders, events, groceries, travel &amp; document checklists.</p>
          </div>
          <button class="btn btn-soft btn-sm" data-toggle-fav="organizer">${Store.state.favorites.includes('organizer') ? '★ Favorited' : '☆ Favorite'}</button>
        </div>
        <div class="tabs-bar">
          ${[
            ['notes', 'Notes'],
            ['diary', 'Journal & Diary'],
            ['dates', 'Birthdays & Events'],
            ['shopping', 'Shopping & Grocery'],
            ['checklists', 'Travel & Documents']
          ].map(([k, lbl]) => `<button class="tab-btn ${tab === k ? 'active' : ''}" data-org-tab="${k}">${lbl}</button>`).join('')}
        </div>
        ${body}
      `;
    },

    ai() {
      const s = Store.state.ai;
      const tpl = AI_TEMPLATES.find(t => t.id === AIEngine.selectedTemplate) || AI_TEMPLATES[0];
      const isDemo = s.provider === 'demo' || !s.apiKey.trim();

      return `
        <div class="page-header">
          <div class="page-header-left">
            <h2>AI Everyday Assistant</h2>
            <p>AI-ready productivity templates, planners &amp; decision helper.</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="tag ${isDemo ? 'tag-teal' : 'tag-violet'}">${isDemo ? 'Demo Mode (Local Templates)' : `API Connected (${s.provider})`}</span>
            <button class="btn btn-soft btn-sm" id="openAiSettingsBtn">AI Settings</button>
          </div>
        </div>

        <div class="alert-banner ${isDemo ? 'alert-info' : 'alert-success'}">
          <div>
            ${isDemo
              ? `<strong>Demo Mode Active:</strong> Generating smart structured responses locally using your Smart Life workspace data and template logic. No external AI API call is made.`
              : `<strong>Custom AI Provider Configured:</strong> Requests will be sent directly from your browser to <code>${Utils.escapeHtml(s.provider)}</code> (${Utils.escapeHtml(s.model)}). Never commit API keys to public repos.`}
          </div>
          <img src="./assets/illustrations/ai-assistant.svg" alt="AI Assistant illustration" style="width:68px;border-radius:10px;" class="hide-sm">
        </div>

        <div class="card" style="margin-bottom:18px;">
          <h3 class="card-title" style="margin-bottom:12px;">Choose a Prompt Template</h3>
          <div class="ai-template-grid">
            ${AI_TEMPLATES.map(t => `
              <button class="ai-template-card ${AIEngine.selectedTemplate === t.id ? 'active' : ''}" data-ai-tpl="${t.id}">
                <strong style="font-size:0.86rem;display:block;margin-bottom:4px;">${Utils.escapeHtml(t.title)}</strong>
                <span style="font-size:0.75rem;color:var(--text-muted);">${Utils.escapeHtml(t.desc)}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <h3 class="card-title" style="margin-bottom:10px;">${Utils.escapeHtml(tpl.title)}</h3>
            <form id="aiRunForm" class="stack-md">
              <div class="field">
                <label>Your Prompt / Context</label>
                <textarea class="textarea" id="aiPromptInput" placeholder="${Utils.escapeHtml(tpl.defaultInput)}">${Utils.escapeHtml(tpl.defaultInput)}</textarea>
              </div>
              <div style="display:flex;gap:10px;align-items:center;">
                <button type="submit" class="btn btn-gradient" ${AIEngine.loading ? 'disabled' : ''}>
                  ${AIEngine.loading ? 'Generating...' : 'Generate Plan'}
                </button>
                ${AIEngine.loading ? `<div class="loader-dots"><span></span><span></span><span></span></div>` : ''}
              </div>
            </form>
            ${AIEngine.error ? `<div class="alert-banner alert-danger" style="margin-top:14px;margin-bottom:0;">${Utils.escapeHtml(AIEngine.error)}</div>` : ''}
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Assistant Response</h3>
              ${AIEngine.lastOutput ? `<button class="btn btn-soft btn-sm" id="copyAiOutBtn">Copy</button>` : ''}
            </div>
            ${AIEngine.lastOutput ? `
              <div style="margin-bottom:10px;"><span class="tag ${AIEngine.lastOutput.isDemo ? 'tag-teal' : 'tag-violet'}">${Utils.escapeHtml(AIEngine.lastOutput.modeLabel)}</span></div>
              <div class="ai-output-box">${Utils.escapeHtml(AIEngine.lastOutput.response)}</div>
              ${AIEngine.lastOutput.suggestedAction ? `
                <div style="margin-top:12px;">
                  <button class="btn btn-primary btn-sm" id="applyAiActionBtn">+ Save Suggested Item to Workspace</button>
                </div>
              ` : ''}
            ` : `<div class="empty-state">Select a template and click <strong>Generate Plan</strong> to see your structured output.</div>`}
          </div>
        </div>

        ${s.history.length ? `
          <div class="card" style="margin-top:18px;">
            <div class="card-header">
              <h3 class="card-title">Saved AI History</h3>
              <button class="btn btn-soft btn-sm" id="clearAiHistoryBtn">Clear History</button>
            </div>
            <div class="item-list">
              ${s.history.slice(0, 6).map(h => `
                <div class="list-row">
                  <div class="item-text">
                    <div class="item-title">${Utils.escapeHtml(h.templateTitle)} — ${Utils.escapeHtml(h.prompt)}</div>
                    <div class="item-sub"><span>${Utils.escapeHtml(h.modeLabel)}</span><span>• ${new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                  </div>
                  <button class="btn btn-soft btn-sm" data-view-ai="${h.id}">View</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      `;
    },

    premium() {
      const sub = Store.state.subscription;
      const isPrem = sub.plan === 'premium_demo';

      return `
        <div class="page-header">
          <div class="page-header-left">
            <h2>Smart Life Premium</h2>
            <p>Upgrade your personal productivity &amp; everyday life operating system.</p>
          </div>
          <span class="tag ${isPrem ? 'tag-violet' : 'tag-teal'}">Status: ${isPrem ? 'Premium Demo Preview Active' : 'Free Plan'}</span>
        </div>

        <div class="grid-2">
          <div class="pricing-card">
            <span class="tag tag-violet" style="margin-bottom:10px;">Primary Paid Plan</span>
            <h3 style="margin:0 0 6px;font-size:1.5rem;font-weight:800;">Smart Life Premium</h3>
            <div style="display:flex;align-items:baseline;gap:6px;margin:10px 0 6px;">
              <span class="price-figure">₹399</span>
              <span style="color:var(--text-muted);font-weight:600;">/ month</span>
            </div>
            <p style="font-size:0.88rem;color:var(--text-secondary);margin:0;">Everything you need for daily planning, habits, goals, finance &amp; AI workflows.</p>

            <ul class="feature-checklist">
              <li>✓ Premium personal tools</li>
              <li>✓ Advanced daily planner</li>
              <li>✓ Habit tracking &amp; analytics</li>
              <li>✓ Goal &amp; milestone tracking</li>
              <li>✓ Personal finance &amp; budget alerts</li>
              <li>✓ Productivity &amp; Pomodoro tools</li>
              <li>✓ AI life assistant templates</li>
              <li>✓ Advanced journal &amp; organizer</li>
              <li>✓ Premium templates</li>
              <li>✓ Higher usage limits</li>
            </ul>

            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              ${isPrem
                ? `<button class="btn btn-danger-soft" id="cancelSubBtn">Cancel Subscription</button>`
                : `<button class="btn btn-gradient" id="upgradeSubBtn">Upgrade to ₹399/month</button>`}
            </div>
          </div>

          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Billing &amp; Subscription Status</h3>
            <div class="alert-banner alert-info">
              <div><strong>Payment Gateway Notice:</strong> This frontend includes a billing &amp; payment integration placeholder UI. No real payment processor is connected and no money is charged.</div>
            </div>
            <div class="item-list" style="margin-bottom:14px;">
              <div class="list-row"><span>Current Plan</span><strong>${isPrem ? 'Smart Life Premium (Demo Preview)' : 'Free Personal Plan'}</strong></div>
              <div class="list-row"><span>Monthly Price</span><strong>₹399 / month</strong></div>
              <div class="list-row"><span>Payment Method</span><strong>${Utils.escapeHtml(sub.paymentMethodPlaceholder)}</strong></div>
              <div class="list-row"><span>Status</span><strong>${isPrem ? 'Preview Active (Not Billed)' : 'Active (Free Tier)'}</strong></div>
            </div>
            ${sub.billingHistory.length ? `
              <strong style="font-size:0.84rem;">Billing Interface Log</strong>
              <div class="item-list" style="margin-top:8px;">
                ${sub.billingHistory.map(b => `
                  <div class="list-row" style="padding:8px 12px;">
                    <span>${Utils.escapeHtml(b.note)}</span>
                    <span class="tag tag-teal">${Utils.formatDate(b.date)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    },

    settings() {
      const p = Store.state.profile;
      return `
        <div class="page-header">
          <div class="page-header-left">
            <h2>Settings &amp; Personal Profile</h2>
            <p>Customize your profile, theme, currency, PWA installation &amp; data backup.</p>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Personal Profile</h3>
            <form id="profileSettingsForm" class="form-grid">
              <div class="field"><label>Full Name</label><input class="input" name="name" value="${Utils.escapeHtml(p.name)}" required></div>
              <div class="field"><label>Workspace Name</label><input class="input" name="workspace" value="${Utils.escapeHtml(p.workspace)}" required></div>
              <div class="field"><label>Headline</label><input class="input" name="headline" value="${Utils.escapeHtml(p.headline)}"></div>
              <div class="field"><label>Currency Symbol</label><select class="select" name="currency">${['₹', '$', '€', '£'].map(c => `<option ${p.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
              <div class="field"><label>Daily Focus Goal (Hours)</label><input class="input" type="number" min="1" max="14" name="dailyFocusGoalHours" value="${p.dailyFocusGoalHours}"></div>
              <div class="field" style="justify-content:flex-end;"><button class="btn btn-primary" type="submit">Save Profile</button></div>
            </form>
          </div>

          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Appearance, Backup &amp; PWA</h3>
            <div class="stack-md">
              <div class="list-row">
                <div><strong>Color Theme</strong><div style="font-size:0.78rem;color:var(--text-muted);">Current: ${Store.state.theme} mode</div></div>
                <button class="btn btn-soft btn-sm" id="settingsThemeBtn">Toggle Light/Dark</button>
              </div>
              <div class="list-row">
                <div><strong>Export Workspace Data</strong><div style="font-size:0.78rem;color:var(--text-muted);">Download full JSON backup</div></div>
                <button class="btn btn-primary btn-sm" id="exportDataBtn">Export JSON</button>
              </div>
              <div class="list-row">
                <div><strong>Import Workspace Data</strong><div style="font-size:0.78rem;color:var(--text-muted);">Restore from Smart Life JSON</div></div>
                <label class="btn btn-soft btn-sm" style="cursor:pointer;">
                  Import JSON
                  <input type="file" id="importDataInput" accept="application/json" class="hidden">
                </label>
              </div>
              <div class="list-row">
                <div><strong>Reset to Starter Sample</strong><div style="font-size:0.78rem;color:var(--text-muted);">Restores initial sample workspace</div></div>
                <button class="btn btn-danger-soft btn-sm" id="resetDataBtn">Reset Data</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  };

  /* ------------------------------------------------------------------------
     10. View Event Binders
     ------------------------------------------------------------------------ */
  const Binders = {
    bindCurrentView() {
      const today = Utils.todayISO();

      // Common toggles (Tasks, Habits, Routines, Calendar)
      document.querySelectorAll('[data-toggle-task]').forEach(btn => {
        btn.onclick = () => {
          const t = Store.state.planner.tasks.find(x => x.id === btn.dataset.toggleTask);
          if (!t) return;
          t.completed = !t.completed;
          Store.logActivity(`${t.completed ? 'Completed' : 'Reopened'} task "${t.title}"`, 'Planner', 'planner');
          Store.save();
          UI.render();
        };
      });

      document.querySelectorAll('[data-toggle-habit]').forEach(btn => {
        btn.onclick = () => {
          const h = Store.state.habits.find(x => x.id === btn.dataset.toggleHabit);
          if (!h) return;
          const idx = h.completedDates.indexOf(today);
          if (idx >= 0) h.completedDates.splice(idx, 1);
          else {
            h.completedDates.push(today);
            Store.logActivity(`Checked in habit "${h.name}"`, 'Habits', 'habits');
          }
          Store.save();
          UI.render();
        };
      });

      document.querySelectorAll('[data-toggle-routine]').forEach(btn => {
        btn.onclick = () => {
          const r = Store.state.planner.routines.find(x => x.id === btn.dataset.toggleRoutine);
          if (!r) return;
          const idx = r.doneDates.indexOf(today);
          if (idx >= 0) r.doneDates.splice(idx, 1);
          else r.doneDates.push(today);
          Store.save();
          UI.render();
        };
      });

      document.querySelectorAll('[data-cal-date]').forEach(btn => {
        btn.onclick = () => {
          Router.selectedCalendarDate = btn.dataset.calDate;
          UI.render();
        };
      });

      document.getElementById('calPrevBtn')?.addEventListener('click', () => { Router.calendarMonthOffset--; UI.render(); });
      document.getElementById('calNextBtn')?.addEventListener('click', () => { Router.calendarMonthOffset++; UI.render(); });

      // Dashboard Quick Task
      document.getElementById('dashQuickTaskForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('dashQuickTaskInput');
        const title = input.value.trim();
        if (!title) return;
        Store.state.planner.tasks.unshift({
          id: Utils.uid('t'), title, date: today, time: '', priority: 'Medium', category: 'Personal', completed: false
        });
        Store.logActivity(`Added task "${title}"`, 'Planner', 'planner');
        Store.save();
        UI.render();
        UI.toast('Task added for today', 'success');
      });

      // Planner Binders
      document.querySelectorAll('[data-planner-tab]').forEach(b => {
        b.onclick = () => { Router.subTab.planner = b.dataset.plannerTab; UI.render(); };
      });
      document.getElementById('plannerAddTaskForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const title = fd.get('title').toString().trim();
        Store.state.planner.tasks.unshift({
          id: Utils.uid('t'),
          title,
          date: fd.get('date') || today,
          time: fd.get('time') || '',
          priority: fd.get('priority') || 'Medium',
          category: fd.get('category') || 'Work',
          completed: false
        });
        Store.logActivity(`Added task "${title}"`, 'Planner', 'planner');
        Store.save();
        UI.render();
        UI.toast('Task saved', 'success');
      });
      document.querySelectorAll('[data-delete-task]').forEach(b => {
        b.onclick = () => {
          Store.state.planner.tasks = Store.state.planner.tasks.filter(t => t.id !== b.dataset.deleteTask);
          Store.save();
          UI.render();
        };
      });
      document.getElementById('addChecklistForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = new FormData(e.target).get('title').toString().trim();
        Store.state.planner.checklists.unshift({ id: Utils.uid('cl'), title, items: [] });
        Store.save();
        UI.render();
      });
      document.querySelectorAll('.addClItemForm').forEach(f => {
        f.onsubmit = (e) => {
          e.preventDefault();
          const cl = Store.state.planner.checklists.find(c => c.id === f.dataset.clId);
          if (!cl) return;
          cl.items.push({ id: Utils.uid('ci'), text: new FormData(f).get('text').toString().trim(), done: false });
          Store.save();
          UI.render();
        };
      });
      document.querySelectorAll('[data-toggle-cl]').forEach(b => {
        b.onclick = () => {
          const [cid, iid] = b.dataset.toggleCl.split(':');
          const cl = Store.state.planner.checklists.find(c => c.id === cid);
          const it = cl?.items.find(i => i.id === iid);
          if (it) { it.done = !it.done; Store.save(); UI.render(); }
        };
      });
      document.querySelectorAll('[data-del-cl]').forEach(b => {
        b.onclick = () => {
          Store.state.planner.checklists = Store.state.planner.checklists.filter(c => c.id !== b.dataset.delCl);
          Store.save();
          UI.render();
        };
      });
      document.getElementById('addRoutineForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        Store.state.planner.routines.push({
          id: Utils.uid('rt'), title: fd.get('title').toString().trim(), period: fd.get('period'), time: fd.get('time'), doneDates: []
        });
        Store.save();
        UI.render();
      });
      document.querySelectorAll('[data-del-routine]').forEach(b => {
        b.onclick = () => {
          Store.state.planner.routines = Store.state.planner.routines.filter(r => r.id !== b.dataset.delRoutine);
          Store.save();
          UI.render();
        };
      });
      document.getElementById('addTimeBlockForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const hour = fd.get('hour');
        Store.state.planner.timeBlocks = Store.state.planner.timeBlocks.filter(tb => !(tb.date === today && tb.hour === hour));
        Store.state.planner.timeBlocks.push({
          id: Utils.uid('tb'), date: today, hour, title: fd.get('title').toString().trim(), tag: fd.get('tag')
        });
        Store.save();
        UI.render();
        UI.toast(`Time block set for ${hour}`, 'success');
      });
      document.querySelectorAll('[data-del-tb]').forEach(b => {
        b.onclick = () => {
          Store.state.planner.timeBlocks = Store.state.planner.timeBlocks.filter(tb => tb.id !== b.dataset.delTb);
          Store.save();
          UI.render();
        };
      });

      // Habits Binders
      document.getElementById('addHabitForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const name = fd.get('name').toString().trim();
        Store.state.habits.push({
          id: Utils.uid('hb'),
          name,
          category: fd.get('category'),
          targetDays: Number(fd.get('targetDays')) || 7,
          reminder: fd.get('reminder') || '09:00',
          completedDates: []
        });
        Store.logActivity(`Created habit "${name}"`, 'Habits', 'habits');
        Store.save();
        UI.render();
        UI.toast('Habit created', 'success');
      });
      document.querySelectorAll('[data-del-habit]').forEach(b => {
        b.onclick = () => {
          Store.state.habits = Store.state.habits.filter(h => h.id !== b.dataset.delHabit);
          Store.save();
          UI.render();
        };
      });

      // Goals Binders
      document.querySelectorAll('[data-goal-cat]').forEach(b => {
        b.onclick = () => { Router.subTab.goals = b.dataset.goalCat; UI.render(); };
      });
      document.getElementById('addGoalForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const title = fd.get('title').toString().trim();
        Store.state.goals.unshift({
          id: Utils.uid('gl'),
          title,
          category: fd.get('category'),
          deadline: fd.get('deadline'),
          progress: Math.max(0, Math.min(100, Number(fd.get('progress')) || 0)),
          notes: fd.get('notes').toString().trim(),
          milestones: []
        });
        Store.logActivity(`Added goal "${title}"`, 'Goals', 'goals');
        Store.save();
        UI.render();
        UI.toast('Goal added', 'success');
      });
      document.querySelectorAll('[data-step-goal]').forEach(b => {
        b.onclick = () => {
          const [id, delta] = b.dataset.stepGoal.split(':');
          const g = Store.state.goals.find(x => x.id === id);
          if (!g) return;
          g.progress = Math.max(0, Math.min(100, g.progress + Number(delta)));
          Store.save();
          UI.render();
        };
      });
      document.querySelectorAll('[data-del-goal]').forEach(b => {
        b.onclick = () => {
          Store.state.goals = Store.state.goals.filter(g => g.id !== b.dataset.delGoal);
          Store.save();
          UI.render();
        };
      });
      document.querySelectorAll('.addMilestoneForm').forEach(f => {
        f.onsubmit = (e) => {
          e.preventDefault();
          const g = Store.state.goals.find(x => x.id === f.dataset.goalId);
          if (!g) return;
          g.milestones.push({ id: Utils.uid('ms'), text: new FormData(f).get('text').toString().trim(), done: false });
          Store.save();
          UI.render();
        };
      });
      document.querySelectorAll('[data-toggle-ms]').forEach(b => {
        b.onclick = () => {
          const [gid, mid] = b.dataset.toggleMs.split(':');
          const g = Store.state.goals.find(x => x.id === gid);
          const ms = g?.milestones.find(m => m.id === mid);
          if (ms) { ms.done = !ms.done; Store.save(); UI.render(); }
        };
      });

      // Finance Binders
      document.getElementById('addTxForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const amount = Number(fd.get('amount')) || 0;
        const type = fd.get('type');
        const category = fd.get('category');
        Store.state.finance.transactions.unshift({
          id: Utils.uid('tx'),
          type,
          amount,
          category,
          date: fd.get('date') || today,
          note: fd.get('note').toString().trim()
        });
        Store.logActivity(`Logged ${type} ${Utils.formatCurrency(amount, Store.state.profile.currency)} (${category})`, 'Finance', 'finance');
        Store.save();
        UI.render();
        UI.toast('Transaction recorded', 'success');
      });
      document.getElementById('budgetSavingsForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        Store.state.finance.monthlyBudget = Number(fd.get('monthlyBudget')) || 0;
        Store.state.finance.savingsGoal = Number(fd.get('savingsGoal')) || 0;
        Store.state.finance.currentSavings = Number(fd.get('currentSavings')) || 0;
        Store.save();
        UI.render();
        UI.toast('Budget & savings updated', 'success');
      });
      document.querySelectorAll('[data-del-tx]').forEach(b => {
        b.onclick = () => {
          Store.state.finance.transactions = Store.state.finance.transactions.filter(t => t.id !== b.dataset.delTx);
          Store.save();
          UI.render();
        };
      });

      // Timer Binders
      document.querySelectorAll('[data-timer-mode]').forEach(b => {
        b.onclick = () => TimerEngine.setMode(b.dataset.timerMode);
      });
      document.getElementById('timerSessionLabel')?.addEventListener('input', (e) => {
        TimerEngine.sessionLabel = e.target.value;
      });
      document.getElementById('timerStartBtn')?.addEventListener('click', () => TimerEngine.start());
      document.getElementById('timerPauseBtn')?.addEventListener('click', () => TimerEngine.pause());
      document.getElementById('timerResetBtn')?.addEventListener('click', () => TimerEngine.reset());
      document.getElementById('timerLapBtn')?.addEventListener('click', () => TimerEngine.lap());
      document.getElementById('dismissBreakBtn')?.addEventListener('click', () => { TimerEngine.breakBanner = ''; UI.render(); });
      document.querySelectorAll('[data-pomo-preset]').forEach(b => {
        b.onclick = () => {
          TimerEngine.pause();
          const p = b.dataset.pomoPreset;
          if (p === 'work') {
            TimerEngine.phase = 'Work';
            TimerEngine.totalSeconds = (Store.state.timer.pomodoroWorkMin || 25) * 60;
          } else if (p === 'short') {
            TimerEngine.phase = 'Short Break';
            TimerEngine.totalSeconds = (Store.state.timer.pomodoroShortMin || 5) * 60;
          } else {
            TimerEngine.phase = 'Long Break';
            TimerEngine.totalSeconds = (Store.state.timer.pomodoroLongMin || 15) * 60;
          }
          TimerEngine.secondsLeft = TimerEngine.totalSeconds;
          UI.render();
        };
      });
      document.getElementById('customTimerForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const mins = Math.max(1, Number(new FormData(e.target).get('mins')) || 15);
        TimerEngine.setMode(TimerEngine.mode, mins * 60);
      });
      document.getElementById('logManualSessionBtn')?.addEventListener('click', () => {
        Store.state.timer.sessions.unshift({
          id: Utils.uid('tm'),
          label: TimerEngine.sessionLabel || 'Focus Work Session',
          mode: 'Manual',
          minutes: 25,
          date: today,
          timestamp: new Date().toISOString()
        });
        Store.logActivity('Logged 25m manual work session', 'Timer', 'timer');
        Store.save();
        UI.render();
        UI.toast('Logged 25m work session', 'success');
      });

      // Health & Lifestyle Binders
      document.getElementById('waterPlusBtn')?.addEventListener('click', () => {
        Store.state.health.waterByDate[today] = (Store.state.health.waterByDate[today] || 0) + 1;
        Store.save();
        UI.render();
      });
      document.getElementById('waterMinusBtn')?.addEventListener('click', () => {
        Store.state.health.waterByDate[today] = Math.max(0, (Store.state.health.waterByDate[today] || 0) - 1);
        Store.save();
        UI.render();
      });
      document.getElementById('addWalkForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const steps = Number(fd.get('steps')) || 0;
        const km = Number(fd.get('km')) || Math.round((steps * 0.00075) * 10) / 10;
        Store.state.health.walkLogs.unshift({ id: Utils.uid('wk'), date: today, steps, distanceKm: km, minutes: Math.round(steps / 100) });
        Store.logActivity(`Logged ${steps.toLocaleString()} steps`, 'Health', 'health');
        Store.save();
        UI.render();
        UI.toast('Walk logged', 'success');
      });
      document.querySelectorAll('[data-toggle-wc]').forEach(b => {
        b.onclick = () => {
          const item = Store.state.health.wellnessChecklist.find(x => x.id === b.dataset.toggleWc);
          if (!item) return;
          const idx = item.doneDates.indexOf(today);
          if (idx >= 0) item.doneDates.splice(idx, 1);
          else item.doneDates.push(today);
          Store.save();
          UI.render();
        };
      });
      document.getElementById('addSleepForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const bed = fd.get('bedtime'), wake = fd.get('wakeTime');
        Store.state.health.sleepLogs.unshift({
          id: Utils.uid('sl'), date: today, bedtime: bed, wakeTime: wake,
          hours: Utils.calcHoursBetween(bed, wake), quality: Number(fd.get('quality')), note: ''
        });
        Store.save();
        UI.render();
        UI.toast('Sleep log saved', 'success');
      });
      document.getElementById('addExerciseForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        Store.state.health.exercises.push({
          id: Utils.uid('ex'), name: fd.get('name').toString().trim(), day: fd.get('day'), duration: Number(fd.get('duration')) || 30, completed: false
        });
        Store.save();
        UI.render();
      });
      document.querySelectorAll('[data-toggle-ex]').forEach(b => {
        b.onclick = () => {
          const ex = Store.state.health.exercises.find(x => x.id === b.dataset.toggleEx);
          if (ex) { ex.completed = !ex.completed; Store.save(); UI.render(); }
        };
      });
      document.querySelectorAll('[data-del-ex]').forEach(b => {
        b.onclick = () => {
          Store.state.health.exercises = Store.state.health.exercises.filter(x => x.id !== b.dataset.delEx);
          Store.save();
          UI.render();
        };
      });
      const mealDaySel = document.getElementById('mealDaySelect');
      if (mealDaySel) {
        mealDaySel.onchange = () => {
          const m = Store.state.health.meals[mealDaySel.value];
          if (!m) return;
          document.getElementById('mealBreakfast').value = m.breakfast;
          document.getElementById('mealLunch').value = m.lunch;
          document.getElementById('mealDinner').value = m.dinner;
          document.getElementById('mealSnack').value = m.snack;
        };
        document.getElementById('mealPlanForm').onsubmit = (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          Store.state.health.meals[fd.get('day')] = {
            breakfast: fd.get('breakfast').toString(),
            lunch: fd.get('lunch').toString(),
            dinner: fd.get('dinner').toString(),
            snack: fd.get('snack').toString()
          };
          Store.save();
          UI.toast(`Saved meals for ${fd.get('day')}`, 'success');
        };
      }
      document.getElementById('addWellnessJournalForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        Store.state.health.wellnessJournal.unshift({
          id: Utils.uid('wj'), date: today, mood: fd.get('mood'), energy: Number(fd.get('energy')), note: fd.get('note').toString().trim()
        });
        Store.save();
        UI.render();
        UI.toast('Wellness reflection saved', 'success');
      });

      // Organizer Binders
      document.querySelectorAll('[data-org-tab]').forEach(b => {
        b.onclick = () => { Router.subTab.organizer = b.dataset.orgTab; UI.render(); };
      });
      document.getElementById('addNoteForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const title = fd.get('title').toString().trim();
        Store.state.organizer.notes.unshift({
          id: Utils.uid('nt'), title, tag: fd.get('tag').toString().trim() || 'Personal', pinned: false, content: fd.get('content').toString().trim(), updatedAt: today
        });
        Store.logActivity(`Saved note "${title}"`, 'Organizer', 'organizer');
        Store.save();
        UI.render();
        UI.toast('Note saved', 'success');
      });
      document.querySelectorAll('[data-pin-note]').forEach(b => {
        b.onclick = () => {
          const n = Store.state.organizer.notes.find(x => x.id === b.dataset.pinNote);
          if (n) { n.pinned = !n.pinned; Store.state.organizer.notes.sort((a, b) => Number(b.pinned) - Number(a.pinned)); Store.save(); UI.render(); }
        };
      });
      document.querySelectorAll('[data-del-note]').forEach(b => {
        b.onclick = () => { Store.state.organizer.notes = Store.state.organizer.notes.filter(x => x.id !== b.dataset.delNote); Store.save(); UI.render(); };
      });
      document.getElementById('addDiaryForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        Store.state.organizer.diary.unshift({
          id: Utils.uid('dr'), date: today, mood: fd.get('mood'), title: fd.get('title').toString().trim(), content: fd.get('content').toString().trim()
        });
        Store.save();
        UI.render();
        UI.toast('Diary entry saved', 'success');
      });
      document.getElementById('addImportantDateForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        Store.state.organizer.importantDates.push({
          id: Utils.uid('id'), title: fd.get('title').toString().trim(), type: fd.get('type'), date: fd.get('date'), note: fd.get('note').toString().trim()
        });
        Store.save();
        UI.render();
        UI.toast('Important date saved', 'success');
      });
      document.querySelectorAll('[data-del-impdate]').forEach(b => {
        b.onclick = () => { Store.state.organizer.importantDates = Store.state.organizer.importantDates.filter(x => x.id !== b.dataset.delImpdate); Store.save(); UI.render(); };
      });
      document.getElementById('addEventForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        Store.state.organizer.events.push({
          id: Utils.uid('ev'), title: fd.get('title').toString().trim(), date: fd.get('date'), time: fd.get('time'), location: fd.get('location').toString().trim(), note: ''
        });
        Store.save();
        UI.render();
        UI.toast('Event planned', 'success');
      });
      document.querySelectorAll('[data-del-event]').forEach(b => {
        b.onclick = () => { Store.state.organizer.events = Store.state.organizer.events.filter(x => x.id !== b.dataset.delEvent); Store.save(); UI.render(); };
      });
      document.getElementById('addShopForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        Store.state.organizer.shoppingList.unshift({
          id: Utils.uid('sh'), listType: fd.get('listType'), text: fd.get('text').toString().trim(), done: false
        });
        Store.save();
        UI.render();
      });
      document.querySelectorAll('[data-toggle-shop]').forEach(b => {
        b.onclick = () => {
          const it = Store.state.organizer.shoppingList.find(x => x.id === b.dataset.toggleShop);
          if (it) { it.done = !it.done; Store.save(); UI.render(); }
        };
      });
      document.querySelectorAll('[data-del-shop]').forEach(b => {
        b.onclick = () => { Store.state.organizer.shoppingList = Store.state.organizer.shoppingList.filter(x => x.id !== b.dataset.delShop); Store.save(); UI.render(); };
      });
      document.querySelectorAll('[data-clear-shop]').forEach(b => {
        b.onclick = () => {
          Store.state.organizer.shoppingList = Store.state.organizer.shoppingList.filter(x => !(x.listType === b.dataset.clearShop && x.done));
          Store.save();
          UI.render();
        };
      });
      document.querySelectorAll('.addOrgCheckForm').forEach(f => {
        f.onsubmit = (e) => {
          e.preventDefault();
          Store.state.organizer.checklists[f.dataset.orgList].push({
            id: Utils.uid('oc'), text: new FormData(f).get('text').toString().trim(), done: false
          });
          Store.save();
          UI.render();
        };
      });
      document.querySelectorAll('[data-toggle-orgcl]').forEach(b => {
        b.onclick = () => {
          const [k, id] = b.dataset.toggleOrgcl.split(':');
          const it = Store.state.organizer.checklists[k]?.find(x => x.id === id);
          if (it) { it.done = !it.done; Store.save(); UI.render(); }
        };
      });
      document.querySelectorAll('[data-del-orgcl]').forEach(b => {
        b.onclick = () => {
          const [k, id] = b.dataset.delOrgcl.split(':');
          Store.state.organizer.checklists[k] = Store.state.organizer.checklists[k].filter(x => x.id !== id);
          Store.save();
          UI.render();
        };
      });

      // AI Binders
      document.querySelectorAll('[data-ai-tpl]').forEach(b => {
        b.onclick = () => { AIEngine.selectedTemplate = b.dataset.aiTpl; UI.render(); };
      });
      document.getElementById('aiRunForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        AIEngine.run(AIEngine.selectedTemplate, document.getElementById('aiPromptInput').value);
      });
      document.getElementById('copyAiOutBtn')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(AIEngine.lastOutput?.response || '');
        UI.toast('Copied response to clipboard', 'success');
      });
      document.getElementById('applyAiActionBtn')?.addEventListener('click', () => {
        const act = AIEngine.lastOutput?.suggestedAction;
        if (!act) return;
        if (act.type === 'task') {
          Store.state.planner.tasks.unshift({
            id: Utils.uid('t'), title: act.title, date: today, time: '', priority: 'High', category: 'Focus', completed: false
          });
          UI.toast('Added suggested task to Daily Planner!', 'success');
        } else if (act.type === 'goal') {
          Store.state.goals.unshift({
            id: Utils.uid('gl'), title: act.title, category: act.category || 'Personal', deadline: Utils.addDaysISO(today, 90), progress: 5, notes: 'Generated via AI Assistant', milestones: []
          });
          UI.toast('Saved goal to Goal Management!', 'success');
        } else if (act.type === 'habit') {
          Store.state.habits.push({
            id: Utils.uid('hb'), name: act.name, category: act.category || 'Lifestyle', targetDays: 7, reminder: '08:30', completedDates: []
          });
          UI.toast('Added habit to Habit Tracker!', 'success');
        }
        Store.save();
      });
      document.querySelectorAll('[data-view-ai]').forEach(b => {
        b.onclick = () => {
          const item = Store.state.ai.history.find(x => x.id === b.dataset.viewAi);
          if (item) { AIEngine.lastOutput = item; UI.render(); }
        };
      });
      document.getElementById('clearAiHistoryBtn')?.addEventListener('click', () => {
        Store.state.ai.history = [];
        Store.save();
        UI.render();
      });
      document.getElementById('openAiSettingsBtn')?.addEventListener('click', () => {
        const s = Store.state.ai;
        UI.openModal('AI Provider & API Settings', `
          <form id="aiSettingsForm" class="stack-md">
            <div class="alert-banner alert-info" style="margin-bottom:0;">
              <div>Smart Life never hardcodes secret API keys. Demo Mode works 100% locally. If you choose a live provider, your key stays strictly in your browser's LocalStorage.</div>
            </div>
            <div class="field">
              <label>Provider Mode</label>
              <select class="select" name="provider">
                <option value="demo" ${s.provider === 'demo' ? 'selected' : ''}>Demo Mode (Local Templates — Recommended Default)</option>
                <option value="gemini" ${s.provider === 'gemini' ? 'selected' : ''}>Google Gemini (User Runtime Key)</option>
                <option value="openai" ${s.provider === 'openai' ? 'selected' : ''}>OpenAI-Compatible (User Runtime Key)</option>
                <option value="custom" ${s.provider === 'custom' ? 'selected' : ''}>Custom Proxy Endpoint</option>
              </select>
            </div>
            <div class="field">
              <label>Model Selection</label>
              <select class="select" name="model">
                <option value="smart-life-demo-v1" ${s.model === 'smart-life-demo-v1' ? 'selected' : ''}>smart-life-demo-v1 (Local)</option>
                <option value="gemini-2.5-flash" ${s.model === 'gemini-2.5-flash' ? 'selected' : ''}>gemini-2.5-flash</option>
                <option value="gpt-4o-mini" ${s.model === 'gpt-4o-mini' ? 'selected' : ''}>gpt-4o-mini</option>
              </select>
            </div>
            <div class="field">
              <label>Custom Endpoint URL (if Custom Proxy)</label>
              <input class="input" name="endpoint" value="${Utils.escapeHtml(s.endpoint)}" placeholder="https://your-backend-proxy.example.com/ai">
            </div>
            <div class="field">
              <label>API Key (Optional — stored only in this browser)</label>
              <input class="input" type="password" name="apiKey" value="${Utils.escapeHtml(s.apiKey)}" placeholder="Leave blank for Demo Mode">
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
              <button type="button" class="btn btn-soft" onclick="document.getElementById('modalCloseBtn').click()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save AI Settings</button>
            </div>
          </form>
        `);
        document.getElementById('aiSettingsForm').onsubmit = (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          Store.state.ai.provider = fd.get('provider');
          Store.state.ai.model = fd.get('model');
          Store.state.ai.endpoint = fd.get('endpoint').toString().trim();
          Store.state.ai.apiKey = fd.get('apiKey').toString().trim();
          Store.save();
          UI.closeModal();
          UI.render();
          UI.toast('AI settings saved', 'success');
        };
      });

      // Premium Subscription Binders (Honest Payment Placeholder — Never fakes payment success)
      document.getElementById('upgradeSubBtn')?.addEventListener('click', () => {
        UI.openModal('Smart Life Premium — ₹399/month', `
          <div class="stack-md">
            <div class="alert-banner alert-warning" style="margin-bottom:0;">
              <div><strong>Payment Integration Placeholder:</strong> No payment processor (Razorpay / Stripe / UPI gateway) is connected in this standalone client build. No real charge can or will occur.</div>
            </div>
            <div class="field">
              <label>Preferred Billing Method (Placeholder)</label>
              <select class="select" id="billMethodSelect">
                <option>UPI (Placeholder)</option>
                <option>Debit / Credit Card (Placeholder)</option>
                <option>NetBanking (Placeholder)</option>
              </select>
            </div>
            <div class="list-row">
              <span>Plan Summary</span>
              <strong>Smart Life Premium • ₹399 / month</strong>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
              <button class="btn btn-soft" onclick="document.getElementById('modalCloseBtn').click()">Close</button>
              <button class="btn btn-violet" id="enableDemoPreviewBtn">Enable Demo UI Preview (No Charge)</button>
            </div>
          </div>
        `);
        document.getElementById('enableDemoPreviewBtn').onclick = () => {
          const method = document.getElementById('billMethodSelect').value;
          Store.state.subscription.plan = 'premium_demo';
          Store.state.subscription.startedAt = today;
          Store.state.subscription.paymentMethodPlaceholder = method;
          Store.state.subscription.billingHistory.unshift({
            date: today,
            note: `Demo UI Preview activated (₹399/mo placeholder — not billed)`
          });
          Store.logActivity('Enabled Smart Life Premium Demo Preview', 'Subscription', 'premium');
          Store.save();
          UI.closeModal();
          UI.render();
          UI.toast('Premium Demo Preview enabled (not a real payment)', 'info');
        };
      });

      document.getElementById('cancelSubBtn')?.addEventListener('click', () => {
        Store.state.subscription.plan = 'free';
        Store.state.subscription.billingHistory.unshift({
          date: today,
          note: 'Subscription preview cancelled — reverted to Free plan'
        });
        Store.save();
        UI.render();
        UI.toast('Reverted to Free plan', 'info');
      });

      // Settings Binders
      document.getElementById('profileSettingsForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        Store.state.profile = {
          name: fd.get('name').toString().trim() || 'User',
          workspace: fd.get('workspace').toString().trim() || 'My Personal Space',
          headline: fd.get('headline').toString().trim(),
          currency: fd.get('currency') || '₹',
          dailyFocusGoalHours: Number(fd.get('dailyFocusGoalHours')) || 4
        };
        Store.save();
        UI.render();
        UI.toast('Profile saved', 'success');
      });

      document.getElementById('settingsThemeBtn')?.addEventListener('click', () => {
        UI.applyTheme(Store.state.theme === 'dark' ? 'light' : 'dark');
        Store.save();
        UI.render();
      });

      document.getElementById('exportDataBtn')?.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(Store.state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smart-life-backup-${today}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UI.toast('Backup exported!', 'success');
      });

      document.getElementById('importDataInput')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(String(reader.result));
            if (!parsed || typeof parsed !== 'object' || !parsed.planner || !parsed.finance) {
              throw new Error('Invalid Smart Life backup format.');
            }
            Store.state = Store.mergeDefaults(createDefaultState(), parsed);
            Store.save();
            UI.applyTheme(Store.state.theme);
            UI.render();
            UI.toast('Workspace data imported successfully!', 'success');
          } catch (err) {
            UI.toast(`Import failed: ${err.message}`, 'error');
          }
        };
        reader.readAsText(file);
      });

      document.getElementById('resetDataBtn')?.addEventListener('click', () => {
        UI.openModal('Confirm Reset', `
          <p style="margin-top:0;">Reset your Smart Life workspace back to the initial starter sample? Export a JSON backup first if you want to keep your entries.</p>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button class="btn btn-soft" onclick="document.getElementById('modalCloseBtn').click()">Cancel</button>
            <button class="btn btn-danger-soft" id="confirmResetAllBtn">Yes, Reset Workspace</button>
          </div>
        `);
        document.getElementById('confirmResetAllBtn').onclick = () => {
          Store.state = createDefaultState();
          Store.save();
          UI.closeModal();
          UI.applyTheme(Store.state.theme);
          UI.render();
          UI.toast('Workspace reset to starter sample', 'info');
        };
      });
    }
  };

  /* ------------------------------------------------------------------------
     11. Bootstrap
     ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    Store.load();
    UI.init();
  });
})();

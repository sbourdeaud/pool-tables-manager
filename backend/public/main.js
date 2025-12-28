(function(){
  console.log('=== MAIN.JS LOADED ===');
  const themeBtn = document.getElementById('themeBtn');
  const title = document.getElementById('title');
  const app = document.getElementById('app');
  console.log('Elements:', { themeBtn, title, app });
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalDrinksList = document.getElementById('modalDrinksList');
  const modalClose = document.getElementById('modalClose');
  const transferModal = document.getElementById('transferModal');
  const transferTableList = document.getElementById('transferTableList');
  const transferClose = document.getElementById('transferClose');
  const settlementModal = document.getElementById('settlementModal');
  const settlementContent = document.getElementById('settlementContent');
  const settlementClose = document.getElementById('settlementClose');
  
  // Audio system for UI feedback
  let audioContext = null;
  let audioEnabled = localStorage.getItem('audio_cues') !== 'false';
  
  // Duration update interval
  let durationUpdateInterval = null;
  
  function initAudio(){
    if(!audioContext && audioEnabled){
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
  
  function playClickSound(){
    if(!audioEnabled) return;
    initAudio();
    if(!audioContext) return;
    
    // Create a sharp, crisp mouse click sound
    const now = audioContext.currentTime;
    const duration = 0.03;
    
    // High frequency component (mechanical click)
    const oscillator1 = audioContext.createOscillator();
    oscillator1.type = 'square';
    oscillator1.frequency.setValueAtTime(1200, now);
    
    const gain1 = audioContext.createGain();
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    oscillator1.connect(gain1);
    gain1.connect(audioContext.destination);
    oscillator1.start(now);
    oscillator1.stop(now + duration);
    
    // Low frequency thump
    const oscillator2 = audioContext.createOscillator();
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(80, now);
    
    const gain2 = audioContext.createGain();
    gain2.gain.setValueAtTime(0.1, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.5);
    
    oscillator2.connect(gain2);
    gain2.connect(audioContext.destination);
    oscillator2.start(now);
    oscillator2.stop(now + duration * 0.5);
  }
  const checkoutModal = document.getElementById('checkoutModal');
  const checkoutContent = document.getElementById('checkoutContent');
  const checkoutClose = document.getElementById('checkoutClose');
  const startSessionModal = document.getElementById('startSessionModal');
  const startSessionCancel = document.getElementById('startSessionCancel');
  const startSessionConfirm = document.getElementById('startSessionConfirm');
  const subMinus = document.getElementById('subMinus');
  const subPlus = document.getElementById('subPlus');
  const subCount = document.getElementById('subCount');
  const nonsubMinus = document.getElementById('nonsubMinus');
  const nonsubPlus = document.getElementById('nonsubPlus');
  const nonsubCount = document.getElementById('nonsubCount');
  async function loadAppName(){
    try{
      const res = await fetch('/api/settings');
      const settings = res.ok ? await res.json() : {};
      title.textContent = settings.app_name || 'Pool Hall';
    }catch(err){
      console.warn('Failed to load app name', err);
    }
  }
  loadAppName();

  // On initial load, check auth/bootstrap state and show modal for login/setup when needed
  const authModal = document.getElementById('authModal');
  const authModalHeader = document.getElementById('authModalHeader');
  const authSetupFields = document.getElementById('authSetupFields');
  const authLoginFields = document.getElementById('authLoginFields');
  const authMessage = document.getElementById('authMessage');
  const authNewPassword = document.getElementById('authNewPassword');
  const authConfirmPassword = document.getElementById('authConfirmPassword');
  const authPassword = document.getElementById('authPassword');
  const authCancel = document.getElementById('authCancel');
  const authSubmit = document.getElementById('authSubmit');

  function showAuthModal(){ authModal.style.display = 'block'; modalBackdrop.style.display = 'flex'; }
  function hideAuthModal(){ authModal.style.display = 'none'; modalBackdrop.style.display = 'none'; }

  authCancel.addEventListener('click', ()=>{ hideAuthModal(); });

  async function checkAuthOnLoad(){
    try{
      const res = await fetch('/api/auth/info');
      if(!res.ok) return;
      const info = await res.json();
      if(info.oidc_enabled && !info.authenticated){
        window.location.href = '/auth/login';
        return;
      }

      if(!info.oidc_enabled){
        if(!info.local_admin_setup){
          // show setup form
          authModalHeader.textContent = 'Initial Admin Setup';
          authMessage.textContent = 'Define a local admin password (username: admin). Keep it secure.';
          authSetupFields.style.display = 'flex';
          authLoginFields.style.display = 'none';
          showAuthModal();
          authSubmit.onclick = async ()=>{
            const pw = authNewPassword.value || '';
            const pw2 = authConfirmPassword.value || '';
            if(pw.length < 6){ alert('Password must be at least 6 characters'); return; }
            if(pw !== pw2){ alert('Passwords do not match'); return; }
            const setupRes = await fetch('/api/auth/local-setup', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ password: pw }) });
            if(setupRes.ok){ hideAuthModal(); alert('Admin password saved. Please log in.'); checkAuthOnLoad(); }
            else { const t = await setupRes.json().catch(()=>null); alert('Failed to save admin password: ' + (t?.error || setupRes.status)); }
          };
        } else if(!info.authenticated){
          // show login form
          authModalHeader.textContent = 'Admin Login';
          authMessage.textContent = 'Enter the local admin password.';
          authSetupFields.style.display = 'none';
          authLoginFields.style.display = 'flex';
          showAuthModal();
          authSubmit.onclick = async ()=>{
            const pw = authPassword.value || '';
            if(pw.length === 0){ alert('Enter password'); return; }
            const loginRes = await fetch('/auth/local/login', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ username: 'admin', password: pw }) });
            if(loginRes.ok){ hideAuthModal(); alert('Logged in successfully'); location.reload(); }
            else { const t = await loginRes.json().catch(()=>null); alert('Login failed: ' + (t?.error || loginRes.status)); }
          };
        }
      }
    }catch(err){ console.warn('Auth check failed', err); }
  }
  checkAuthOnLoad();
  
  let savedLang = localStorage.getItem('lang') || 'en';

  function fetchLocale(locale){
    return fetch('/api/i18n/' + locale).then(r=>r.json()).catch(()=>({ app_title: 'Pool Hall', drinks_heading: 'Drinks' }));
  }

  async function loadLocale(locale){
    const bundle = await fetchLocale(locale);
    title.textContent = bundle.app_title;
  }

  function applyTheme(pref){
    if(pref === 'dark') document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
  }

  // Navigation
  const navDashboard = document.getElementById('navDashboard');
  const navAdmin = document.getElementById('navAdmin');
  const logoLink = document.getElementById('logoLink');

  navDashboard.addEventListener('click', e => { e.preventDefault(); renderDashboard(); });
  navAdmin.addEventListener('click', e => { e.preventDefault(); renderAdminDashboard(); });
  logoLink.addEventListener('click', e => { e.preventDefault(); renderDashboard(); });

  // Views
  // Admin dashboard with tiles for each management area
  async function renderAdminDashboard(){
    app.innerHTML = '';
    const h = document.createElement('h2'); h.textContent = 'Admin'; app.appendChild(h);
    const grid = document.createElement('div'); grid.style.display='grid'; grid.style.gridTemplateColumns='repeat(auto-fit,minmax(400px,1fr))'; grid.style.gap='12px';

    const makeTile = (icon, title, desc, onClick)=>{
      const t = document.createElement('div'); t.className='card admin-tile'; t.style.padding='18px';
      const iconEl = document.createElement('div');
      if(icon === 'beer'){
        iconEl.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M4 2L6 22H17L19 2H4M6.2 4H16.8L16.5 7.23C13.18 8.5 11.85 7.67 11.38 7.31C11.13 7.12 10.77 6.69 10.11 6.39C9.45 6.08 8.55 6 7.5 6.32C7.09 6.43 6.77 6.61 6.5 6.79L6.2 4M8.86 8.11C9.05 8.11 9.16 8.15 9.27 8.2C9.5 8.3 9.71 8.55 10.17 8.9C11.03 9.56 13.03 10.36 16.26 9.41L15.2 20H7.8L6.71 9.06C6.76 9 6.91 8.89 7.17 8.71C7.5 8.5 7.91 8.28 8 8.25L8 8.25H8.03C8.41 8.14 8.67 8.1 8.86 8.11Z" /></svg>';
      } else if(icon === 'chart'){
        iconEl.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z" /></svg>';
      } else if(icon === 'settings'){
        iconEl.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M10,22C9.75,22 9.54,21.82 9.5,21.58L9.13,18.93C8.5,18.68 7.96,18.34 7.44,17.94L4.95,18.95C4.73,19.03 4.46,18.95 4.34,18.73L2.34,15.27C2.21,15.05 2.27,14.78 2.46,14.63L4.57,12.97L4.5,12L4.57,11L2.46,9.37C2.27,9.22 2.21,8.95 2.34,8.73L4.34,5.27C4.46,5.05 4.73,4.96 4.95,5.05L7.44,6.05C7.96,5.66 8.5,5.32 9.13,5.07L9.5,2.42C9.54,2.18 9.75,2 10,2H14C14.25,2 14.46,2.18 14.5,2.42L14.87,5.07C15.5,5.32 16.04,5.66 16.56,6.05L19.05,5.05C19.27,4.96 19.54,5.05 19.66,5.27L21.66,8.73C21.79,8.95 21.73,9.22 21.54,9.37L19.43,11L19.5,12L19.43,13L21.54,14.63C21.73,14.78 21.79,15.05 21.66,15.27L19.66,18.73C19.54,18.95 19.27,19.04 19.05,18.95L16.56,17.95C16.04,18.34 15.5,18.68 14.87,18.93L14.5,21.58C14.46,21.82 14.25,22 14,22H10M11.25,4L10.88,6.61C9.68,6.86 8.62,7.5 7.85,8.39L5.44,7.35L4.69,8.65L6.8,10.2C6.4,11.37 6.4,12.64 6.8,13.8L4.68,15.36L5.43,16.66L7.86,15.62C8.63,16.5 9.68,17.14 10.87,17.38L11.24,20H12.76L13.13,17.39C14.32,17.14 15.37,16.5 16.14,15.62L18.57,16.66L19.32,15.36L17.2,13.81C17.6,12.64 17.6,11.37 17.2,10.2L19.31,8.65L18.56,7.35L16.15,8.39C15.38,7.5 14.32,6.86 13.12,6.62L12.75,4H11.25Z" /></svg>';
      } else if(icon === 'account'){
        iconEl.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" /></svg>';
      } else if(icon === 'billiards'){
        iconEl.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M20.31,16.44L14.54,6.47C13.72,5.04 11.89,4.55 10.46,5.38C10,5.64 9.63,6 9.36,6.47L3.6,16.44C2.77,17.87 3.26,19.69 4.69,20.5C5.14,20.78 5.65,20.92 6.18,20.92H17.73C19.38,20.91 20.72,19.57 20.71,17.92C20.71,17.4 20.57,16.89 20.31,16.44M5.37,17.43L11.11,7.47C11.38,7 12,6.82 12.46,7.1C12.62,7.18 12.75,7.31 12.84,7.47L18.58,17.43C18.85,17.91 18.69,18.5 18.21,18.79C18.06,18.88 17.89,18.93 17.72,18.93H6.21C5.66,18.92 5.21,18.47 5.22,17.92C5.22,17.75 5.26,17.58 5.35,17.43H5.37M11.97,13.45C10.87,13.45 10,12.56 10,11.46C10,10.35 10.87,9.46 11.97,9.46A2,2 0 0,1 13.97,11.46C13.97,12.56 13.07,13.45 11.95,13.45H11.97M9.46,17.93C8.36,17.93 7.47,17.04 7.47,15.94C7.47,14.84 8.36,13.95 9.46,13.95C10.56,13.95 11.46,14.84 11.46,15.94C11.46,17.04 10.56,17.93 9.46,17.93M14.44,17.93A2,2 0 0,1 12.45,15.94A2,2 0 0,1 14.44,13.95C15.54,13.95 16.44,14.84 16.44,15.94C16.44,17.04 15.54,17.93 14.44,17.93Z" /></svg>';
      } else {
        iconEl.textContent = icon;
      }
      iconEl.style.fontSize='32px'; iconEl.style.marginBottom='8px'; iconEl.style.fontWeight='bold';
      const tt = document.createElement('div'); tt.style.fontWeight='700'; tt.style.fontSize='16px'; tt.textContent = title;
      const dd = document.createElement('div'); dd.style.margin='8px 0'; dd.style.fontSize='14px'; dd.style.opacity='0.8'; dd.textContent = desc;
      t.appendChild(iconEl); t.appendChild(tt); t.appendChild(dd);
      t.addEventListener('click', ()=>{ playClickSound(); onClick(); });
      return t;
    };

    grid.appendChild(makeTile('beer', 'Drinks Menu','Add, edit or remove drinks', ()=> renderAdmin()));
    grid.appendChild(makeTile('billiards', 'Table Types & Inventory','Manage table types and add/remove tables', ()=> renderTableManagement()));
    grid.appendChild(makeTile('account', 'Subscriptions','Create and remove subscriptions', ()=> renderSubscriptions()));
    grid.appendChild(makeTile('chart', 'Reports','Generate financial reports', ()=> renderReports()));
    grid.appendChild(makeTile('settings', 'Settings','Change language and currency', ()=> renderSettings()));
    app.appendChild(grid);
    return;
  }

  async function renderDrinksList(locale = 'en', currency = '$'){
    const res = await fetch('/api/drinks?lang=' + locale);
    const list = await res.json();
    const ul = document.createElement('ul');
    list.forEach(d => { const li = document.createElement('li'); li.textContent = `${d.name} — ${currency}${(d.price_cents/100).toFixed(2)}`; ul.appendChild(li); });
    return ul;
  }

  // Drinks manager (previously renderAdmin)
  async function renderAdmin(){
    app.innerHTML = '';
    const h = document.createElement('h2'); h.textContent = 'Admin — Drinks';
    app.appendChild(h);
    const manageTablesBtn = document.createElement('button'); manageTablesBtn.textContent = 'Manage Tables';
    manageTablesBtn.addEventListener('click', ()=> renderTableManagement());
    app.appendChild(manageTablesBtn);
    
    const settingsRes = await fetch('/api/settings');
    const settings = settingsRes.ok ? await settingsRes.json() : {};
    const currency = settings.currency || localStorage.getItem('currency') || '$';
    localStorage.setItem('currency', currency);
    
    const addForm = document.createElement('form');
    addForm.innerHTML = `
      <input name="drink_name" placeholder="Drink Name" required />
      <label>Price: <input name="drink_price" placeholder="0.00" type="number" step="0.01" min="0" required style="width:100px" /> ${currency}</label>
      <label><input type="checkbox" name="taxable" checked /> Taxable</label>
      <button type="submit">Add Drink</button>
    `;
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(addForm).entries());
      const priceCents = Math.round(parseFloat(fd.drink_price || 0) * 100);
      await fetch('/api/admin/drinks', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ name_en: fd.drink_name, name_fr: fd.drink_name, price_cents: priceCents, taxable: !!fd.taxable }) });
      renderAdmin();
    });
    app.appendChild(addForm);

    const res = await fetch('/api/drinks?lang=' + savedLang);
    const list = await res.json();
    const ul = document.createElement('ul');
    for(const d of list){
      const li = document.createElement('li');
      li.textContent = `${d.name} — ${currency}${(d.price_cents/100).toFixed(2)}`;
      const edit = document.createElement('button'); edit.textContent = 'Edit';
      edit.addEventListener('click', async ()=>{
        const newName = prompt('Drink Name', d.name);
        if(!newName) return;
        const newPrice = prompt('Price (' + currency + ')', (d.price_cents/100).toFixed(2));
        if(!newPrice) return;
        const priceCents = Math.round(parseFloat(newPrice) * 100);
        await fetch('/api/admin/drinks/' + d.id, { method: 'PUT', headers: { 'Content-Type':'application/json'}, body: JSON.stringify({ name_en: newName, name_fr: newName, price_cents: priceCents, taxable: true }) });
        renderAdmin();
      });
      const del = document.createElement('button'); del.textContent = 'Delete';
      del.addEventListener('click', async ()=>{ if(!confirm('Delete?')) return; await fetch('/api/admin/drinks/' + d.id, { method: 'DELETE' }); renderAdmin(); });
      li.appendChild(edit); li.appendChild(del);
      ul.appendChild(li);
    }
    app.appendChild(ul);
  }

  // Table management view
  async function renderTableManagement(){
    app.innerHTML = '';
    const h = document.createElement('h2'); h.textContent = 'Table Management'; app.appendChild(h);
    // fetch types, tables and sessions
    const [typesRes, tablesRes, sessionsRes] = await Promise.all([fetch('/api/table-types'), fetch('/api/tables'), fetch('/api/sessions')]);
    const types = await typesRes.json();
    const tables = await tablesRes.json();
    const sessions = await sessionsRes.json();

    const currency = localStorage.getItem('currency') || '$';
    
    const typeForm = document.createElement('form');
    typeForm.innerHTML = `<input name="name_en" placeholder="Type name (EN)" required /> <input name="base_hourly" placeholder="Hourly rate (${currency})" type="number" step="0.01" min="0" required /> <button type="submit">Add Table Type</button>`;
    typeForm.addEventListener('submit', async (e)=>{ e.preventDefault(); const fd = Object.fromEntries(new FormData(typeForm).entries()); const cents = Math.round(parseFloat(fd.base_hourly || 0) * 100); await fetch('/api/table-types', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name_en: fd.name_en, name_fr: fd.name_en, base_hourly_cents: cents }) }); renderTableManagement(); });
    app.appendChild(typeForm);

    const addTableForm = document.createElement('form');
    addTableForm.innerHTML = `
      <label>Type: <select name="tableTypeId">${types.map(t=>`<option value="${t.id}">${t.name_en}</option>`).join('')}</select></label>
      <label>Quantity: <input name="quantity" type="number" value="1" min="1" required /></label>
      <button type="submit">Add Tables</button>
    `;
    addTableForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(addTableForm).entries());
      try{
        const quantity = parseInt(fd.quantity||1,10);
        const resp = await fetch('/api/tables/bulk', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tableTypeId: fd.tableTypeId, quantity }) });
        if(!resp.ok){
          const text = await resp.text().catch(()=>null);
          console.error('add tables failed', resp.status, text);
          alert('Failed to add tables: ' + (text || resp.status));
          return;
        }
        const created = await resp.json();
        console.log('Tables created:', created);
        // success - refresh view
        renderTableManagement();
      }catch(err){ console.error('add tables error', err); alert('Failed to add tables (network)'); }
    });
    app.appendChild(addTableForm);

    const list = document.createElement('div'); list.style.marginTop = '12px';
    const typesHeader = document.createElement('h3'); typesHeader.textContent = 'Types'; list.appendChild(typesHeader);
    for(const t of types){
      const row = document.createElement('div'); row.style.display='flex'; row.style.gap='8px'; row.style.alignItems='center';
      row.innerHTML = `<div style="flex:1">${t.name_en} — ${currency}${(t.base_hourly_cents/100).toFixed(2)}/hour</div>`;
      
      const editBtn = document.createElement('button'); 
      editBtn.textContent = 'Edit'; 
      editBtn.addEventListener('click', async ()=>{
        const newRate = prompt(`Enter new hourly rate for ${t.name_en} (in ${currency}):`, (t.base_hourly_cents/100).toFixed(2));
        if(newRate === null) return; // cancelled
        const rateFloat = parseFloat(newRate);
        if(isNaN(rateFloat) || rateFloat < 0){
          alert('Invalid rate. Please enter a positive number.');
          return;
        }
        const cents = Math.round(rateFloat * 100);
        try{
          const resp = await fetch('/api/table-types/' + t.id, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name_en: t.name_en, name_fr: t.name_fr, base_hourly_cents: cents })
          });
          if(!resp.ok){
            alert('Failed to update table type');
            return;
          }
          renderTableManagement();
        }catch(e){
          console.error(e);
          alert('Failed to update table type: ' + e.message);
        }
      });
      row.appendChild(editBtn);
      
      const del = document.createElement('button'); del.textContent = 'Delete'; del.addEventListener('click', async ()=>{ if(!confirm('Delete type? (will fail if tables exist)')) return; const r = await fetch('/api/table-types/' + t.id, { method:'DELETE' }); if(r.status===409) return alert('Cannot delete: tables exist for this type'); renderTableManagement(); });
      row.appendChild(del);
      list.appendChild(row);
    }

    const tablesHeader = document.createElement('h3'); tablesHeader.textContent = 'Tables'; list.appendChild(tablesHeader);
    // Sort tables by number
    const sortedTables = [...tables].sort((a, b) => a.number - b.number);
    for(const tb of sortedTables){
      const row = document.createElement('div'); row.style.display='flex'; row.style.gap='8px'; row.style.alignItems='center';
      const sess = sessions.find(s => s.tableId === tb.id && s.status === 'active');
      const tableType = types.find(t => t.id === tb.tableTypeId);
      const typeName = tableType ? tableType.name_en : 'Unknown';
      const txt = document.createElement('div'); txt.style.flex = '1'; txt.textContent = `#${tb.number} — Type: ${typeName} — Status: ${tb.status}`;
      row.appendChild(txt);
      
      // Edit number button
      const editNumBtn = document.createElement('button'); editNumBtn.textContent = 'Edit #'; editNumBtn.title = 'Edit table number';
      editNumBtn.addEventListener('click', async ()=>{ 
        const newNum = prompt('New table number:', tb.number);
        if(!newNum || newNum === tb.number.toString()) return;
        const num = parseInt(newNum, 10);
        if(isNaN(num) || num < 1) return alert('Invalid number');
        try{
          await fetch('/api/tables/' + tb.id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ number: num }) });
          renderTableManagement();
        }catch(e){ alert('Failed to update table number'); }
      });
      row.appendChild(editNumBtn);
      if(sess){
        const endBtn = document.createElement('button'); endBtn.textContent = 'End Session'; endBtn.addEventListener('click', async ()=>{ if(!confirm('End session?')) return; await fetch('/api/sessions/' + sess.id + '/end', { method: 'PATCH' }); renderTableManagement(); });
        row.appendChild(endBtn);
      } else {
        const startBtn = document.createElement('button'); startBtn.textContent = 'Start Session'; startBtn.addEventListener('click', async ()=>{ const players = Number(prompt('Number of players','1'))||1; await fetch('/api/sessions', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tableId: tb.id, numberOfPlayers: players }) }); renderTableManagement(); });
        row.appendChild(startBtn);
      }
      // Maintenance mode toggle
      const maintenanceBtn = document.createElement('button');
      if(tb.status === 'maintenance'){
        maintenanceBtn.textContent = 'Exit Maintenance';
        maintenanceBtn.style.backgroundColor = '#10b981';
      } else {
        maintenanceBtn.textContent = 'Maintenance';
        maintenanceBtn.style.backgroundColor = '#f59e0b';
      }
      maintenanceBtn.addEventListener('click', async ()=>{
        const newStatus = tb.status === 'maintenance' ? 'available' : 'maintenance';
        if(sess && newStatus === 'maintenance'){
          alert('Cannot set to maintenance: active session exists');
          return;
        }
        try {
          console.log('[Maintenance] Updating table', tb.id, 'to status:', newStatus);
          const response = await fetch('/api/tables/' + tb.id, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: newStatus }) });
          console.log('[Maintenance] Response status:', response.status);
          if(!response.ok){
            const errorText = await response.text();
            console.error('[Maintenance] Error response:', errorText);
            try {
              const error = JSON.parse(errorText);
              alert('Failed to update table status: ' + (error.error || 'Unknown error'));
            } catch {
              alert('Failed to update table status: ' + errorText);
            }
            return;
          }
          const result = await response.json();
          console.log('[Maintenance] Success:', result);
          renderTableManagement();
        } catch(e){
          console.error('[Maintenance] Exception:', e);
          alert('Error updating table status: ' + e.message);
        }
      });
      row.appendChild(maintenanceBtn);
      const del = document.createElement('button'); del.textContent = 'Delete'; del.addEventListener('click', async ()=>{ if(!confirm('Delete table?')) return; await fetch('/api/tables/' + tb.id, { method:'DELETE' }); renderTableManagement(); });
      row.appendChild(del);
      list.appendChild(row);
    }

    app.appendChild(list);
  }

  async function renderDashboard(){
    app.innerHTML = '';
    
    // Clear existing duration update interval
    if(durationUpdateInterval) {
      clearInterval(durationUpdateInterval);
      durationUpdateInterval = null;
    }
    
    const h = document.createElement('h2'); h.textContent = 'Tables'; app.appendChild(h);
    // fetch types, tables and sessions in parallel
    const [typesRes, tablesRes, sessionsRes] = await Promise.all([fetch('/api/table-types'), fetch('/api/tables'), fetch('/api/sessions')]);
    const types = await typesRes.json();
    const tables = await tablesRes.json();
    const sessions = await sessionsRes.json();

    // group tables by type
    const byType = {};
    for(const t of types) byType[t.id] = { type: t, tables: [] };
    for(const tb of tables){
      // Skip tables in maintenance mode
      if(tb.status === 'maintenance') continue;
      if(!byType[tb.tableTypeId]) byType[tb.tableTypeId] = { type: { id: tb.tableTypeId, name_en: 'Unknown' }, tables: [] };
      byType[tb.tableTypeId].tables.push(tb);
    }

    // palette for table type accents
    const palette = ['#2563eb','#059669','#d97706','#7c3aed','#e11d48','#06b6d4'];
    const container = document.createElement('div'); container.style.display = 'grid'; container.style.gap = '16px';

    for(const [typeId, group] of Object.entries(byType)){
      const typeCard = document.createElement('div'); typeCard.className = 'type-card card';
      const color = palette[Math.abs(hashCode(String(typeId))) % palette.length];
      const header = document.createElement('div'); header.className = 'type-header';
      const badge = document.createElement('div'); badge.className = 'type-badge'; badge.style.background = color; 
      
      // Add flag icon based on table type
      const typeName = group.type.name_en || 'Type';
      let flagIcon = '';
      if(typeName === 'American'){
        flagIcon = '<svg width="30" height="20" viewBox="0 0 30 20" style="display:inline-block;vertical-align:middle;margin-right:6px"><rect width="30" height="20" fill="#B22234"/><rect y="1.54" width="30" height="1.54" fill="white"/><rect y="4.62" width="30" height="1.54" fill="white"/><rect y="7.69" width="30" height="1.54" fill="white"/><rect y="10.77" width="30" height="1.54" fill="white"/><rect y="13.85" width="30" height="1.54" fill="white"/><rect y="16.92" width="30" height="1.54" fill="white"/><rect width="12" height="10.77" fill="#3C3B6E"/></svg>';
      } else if(typeName === 'Pool'){
        flagIcon = '<svg width="30" height="20" viewBox="0 0 30 20" style="display:inline-block;vertical-align:middle;margin-right:6px"><rect width="30" height="20" fill="#003399"/><g transform="translate(15,10)"><circle cx="0" cy="-3.33" r="0.77" fill="#FFCC00"/><circle cx="2.31" cy="-2.39" r="0.77" fill="#FFCC00"/><circle cx="2.85" cy="-0.19" r="0.77" fill="#FFCC00"/><circle cx="1.76" cy="2.08" r="0.77" fill="#FFCC00"/><circle cx="-0.54" cy="3.27" r="0.77" fill="#FFCC00"/><circle cx="-2.77" cy="2.39" r="0.77" fill="#FFCC00"/><circle cx="-3.68" cy="0.19" r="0.77" fill="#FFCC00"/><circle cx="-2.59" cy="-2.08" r="0.77" fill="#FFCC00"/><circle cx="-0.29" cy="-3.27" r="0.77" fill="#FFCC00"/><circle cx="2.08" cy="-2.59" r="0.77" fill="#FFCC00"/><circle cx="3.27" cy="-0.54" r="0.77" fill="#FFCC00"/><circle cx="2.39" cy="2.77" r="0.77" fill="#FFCC00"/></g></svg>';
      } else if(typeName === 'Snooker'){
        flagIcon = '<svg width="30" height="20" viewBox="0 0 30 20" style="display:inline-block;vertical-align:middle;margin-right:6px"><rect width="30" height="20" fill="#012169"/><path d="M0 0 L30 20 M0 20 L30 0" stroke="white" stroke-width="2.5"/><path d="M0 0 L30 20 M0 20 L30 0" stroke="#C8102E" stroke-width="1.5"/><path d="M15 0 L15 20 M0 10 L30 10" stroke="white" stroke-width="4"/><path d="M15 0 L15 20 M0 10 L30 10" stroke="#C8102E" stroke-width="2.4"/></svg>';
      } else if(typeName === 'French'){
        flagIcon = '<svg width="30" height="20" viewBox="0 0 30 20" style="display:inline-block;vertical-align:middle;margin-right:6px"><rect width="10" height="20" fill="#002395"/><rect x="10" width="10" height="20" fill="white"/><rect x="20" width="10" height="20" fill="#ED2939"/></svg>';
      }
      
      badge.innerHTML = flagIcon + (group.type.name_en || 'Type');
      const title = document.createElement('div'); title.className = 'type-title'; title.textContent = `${group.type.name_en || 'Type'} — ${group.tables.length} tables`;
      header.appendChild(badge); header.appendChild(title);
      typeCard.appendChild(header);

      const grid = document.createElement('div'); grid.className = 'tables-grid';
      for(const tb of group.tables){
        const tile = document.createElement('div'); tile.className = 'table-tile';
        const sess = sessions.find(s => s.tableId === tb.id && s.status === 'active');
        
        // Set tile color based on status
        if(sess){
          tile.style.background = 'linear-gradient(180deg, rgba(220, 38, 38, 0.15), rgba(185, 28, 28, 0.1))';
          tile.style.borderLeft = '3px solid rgba(220, 38, 38, 0.6)';
        } else {
          tile.style.background = 'linear-gradient(180deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))';
          tile.style.borderLeft = '3px solid rgba(16, 185, 129, 0.6)';
        }
        
        const top = document.createElement('div'); top.className = 'table-top';
        const num = document.createElement('div'); num.className = 'table-num'; 
        num.textContent = `#${tb.number}`;
        if (sess && sess.pin) {
          const pinSpan = document.createElement('span');
          pinSpan.style.fontSize = '14px';
          pinSpan.style.fontWeight = '700';
          pinSpan.style.marginLeft = '8px';
          pinSpan.style.fontFamily = 'monospace';
          pinSpan.style.letterSpacing = '1px';
          pinSpan.style.opacity = '0.8';
          pinSpan.textContent = `(${sess.pin})`;
          num.appendChild(pinSpan);
        }
        const status = document.createElement('div'); status.className = 'table-status'; status.textContent = tb.status;
        top.appendChild(num); top.appendChild(status);
        tile.appendChild(top);

        const middle = document.createElement('div'); middle.style.display='flex'; middle.style.flexDirection='column'; middle.style.gap='8px';
        
        if(sess){
          // Players row
          const players = document.createElement('div'); players.className = 'player-row'; players.style.alignItems='center';
          const playerIcon = document.createElement('span'); 
          playerIcon.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" /></svg>';
          const playerCount = document.createElement('span'); playerCount.textContent = `${sess.numberOfPlayers||1} player${(sess.numberOfPlayers||1)>1?'s':''}`; playerCount.style.fontWeight='600'; playerCount.style.marginLeft='6px';
          players.appendChild(playerIcon); players.appendChild(playerCount);
          const removePlayer = document.createElement('button'); removePlayer.className='icon-btn'; removePlayer.innerHTML='−'; removePlayer.style.fontSize='20px'; removePlayer.style.fontWeight='bold'; removePlayer.title='Remove player'; removePlayer.style.marginLeft='auto';
          removePlayer.addEventListener('click', (evt)=>{ evt.stopPropagation(); showSettlementModal(sess.id, sess.numberOfPlayers||1); });
          if((sess.numberOfPlayers||1) > 1) players.appendChild(removePlayer);
          const addPlayer = document.createElement('button'); addPlayer.className='icon-btn'; addPlayer.innerHTML='+'; addPlayer.style.fontSize='20px'; addPlayer.style.fontWeight='bold'; addPlayer.title='Add player'; addPlayer.style.marginLeft=(sess.numberOfPlayers||1) > 1 ? '4px' : 'auto';
          addPlayer.addEventListener('click', async (evt)=>{ evt.stopPropagation(); const newCount = (sess.numberOfPlayers||1)+1; await fetch('/api/sessions/' + sess.id, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ numberOfPlayers: newCount }) }); renderDashboard(); });
          players.appendChild(addPlayer);
          middle.appendChild(players);
          
          // Duration row with hours:minutes:seconds and billing
          const started = new Date(sess.startedAt);
          if(!sess.startedAt || isNaN(started.getTime())){
            console.error('Invalid startedAt for session:', sess.id, 'value:', sess.startedAt);
          }
          const elapsedMs = Date.now() - started.getTime();
          const totalSeconds = Math.floor(elapsedMs / 1000);
          const hours = Math.max(0, Math.floor(totalSeconds / 3600));
          const minutes = Math.max(0, Math.floor((totalSeconds % 3600) / 60));
          const seconds = Math.max(0, totalSeconds % 60);
          const hoursCharged = Math.max(0, Math.ceil(elapsedMs / 3600000)); // Any hour started is charged
          const durRow = document.createElement('div'); durRow.style.fontSize='14px'; durRow.style.display='flex'; durRow.style.gap='8px'; durRow.style.alignItems='center';
          durRow.dataset.sessionStart = sess.startedAt; // Store start time for updates
          const timeIcon = document.createElement('span'); 
          timeIcon.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg>';
          const timeText = document.createElement('span'); timeText.textContent = `${hours}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`; timeText.className = 'duration-time';
          const billingText = document.createElement('span'); billingText.textContent = `(${hoursCharged}h charged)`; billingText.style.opacity='0.6'; billingText.style.fontSize='12px'; billingText.className = 'duration-billing';
          durRow.appendChild(timeIcon); durRow.appendChild(timeText); durRow.appendChild(billingText);
          middle.appendChild(durRow);
          
          // Tab total row (loaded async)
          const tabRow = document.createElement('div'); tabRow.className='tab-info';
          const tabLabel = document.createElement('span'); tabLabel.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:middle;margin-right:6px"><path d="M2,5H22V20H2V5M20,18V7H4V18H20M17,8A2,2 0 0,0 19,10V15A2,2 0 0,0 17,17H7A2,2 0 0,0 5,15V10A2,2 0 0,0 7,8H17M17,13V12C17,10.9 16.33,10 15.5,10C14.67,10 14,10.9 14,12V13C14,14.1 14.67,15 15.5,15C16.33,15 17,14.1 17,13M15.5,11A0.5,0.5 0 0,1 16,11.5V13.5A0.5,0.5 0 0,1 15.5,14A0.5,0.5 0 0,1 15,13.5V11.5A0.5,0.5 0 0,1 15.5,11M13,13V12C13,10.9 12.33,10 11.5,10C10.67,10 10,10.9 10,12V13C10,14.1 10.67,15 11.5,15C12.33,15 13,14.1 13,13M11.5,11A0.5,0.5 0 0,1 12,11.5V13.5A0.5,0.5 0 0,1 11.5,14A0.5,0.5 0 0,1 11,13.5V11.5A0.5,0.5 0 0,1 11.5,11M8,15H9V10H8L7,10.5V11.5L8,11V15Z"/></svg>Tab: ${localStorage.getItem('currency')||'$'}0.00`; tabLabel.style.flex='1';
          const addDrink = document.createElement('button'); addDrink.className='icon-btn'; addDrink.innerHTML='<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M4 2L6 22H17L19 2H4M6.2 4H16.8L16.5 7.23C13.18 8.5 11.85 7.67 11.38 7.31C11.13 7.12 10.77 6.69 10.11 6.39C9.45 6.08 8.55 6 7.5 6.32C7.09 6.43 6.77 6.61 6.5 6.79L6.2 4M8.86 8.11C9.05 8.11 9.16 8.15 9.27 8.2C9.5 8.3 9.71 8.55 10.17 8.9C11.03 9.56 13.03 10.36 16.26 9.41L15.2 20H7.8L6.71 9.06C6.76 9 6.91 8.89 7.17 8.71C7.5 8.5 7.91 8.28 8 8.25L8 8.25H8.03C8.41 8.14 8.67 8.1 8.86 8.11Z" /></svg>'; addDrink.title='Add drink';
          addDrink.addEventListener('click', (evt)=>{ evt.stopPropagation(); showAddDrinkModal(sess.id); });
          tabRow.appendChild(tabLabel); tabRow.appendChild(addDrink);
          middle.appendChild(tabRow);
          
          // Fetch tab total async
          (async ()=>{
            try{
              const detail = await fetch('/api/sessions/' + sess.id + '?t=' + Date.now()).then(r=>r.json());
              tabLabel.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:middle;margin-right:6px"><path d="M2,5H22V20H2V5M20,18V7H4V18H20M17,8A2,2 0 0,0 19,10V15A2,2 0 0,0 17,17H7A2,2 0 0,0 5,15V10A2,2 0 0,0 7,8H17M17,13V12C17,10.9 16.33,10 15.5,10C14.67,10 14,10.9 14,12V13C14,14.1 14.67,15 15.5,15C16.33,15 17,14.1 17,13M15.5,11A0.5,0.5 0 0,1 16,11.5V13.5A0.5,0.5 0 0,1 15.5,14A0.5,0.5 0 0,1 15,13.5V11.5A0.5,0.5 0 0,1 15.5,11M13,13V12C13,10.9 12.33,10 11.5,10C10.67,10 14,10.9 10,12V13C10,14.1 10.67,15 11.5,15C12.33,15 13,14.1 13,13M11.5,11A0.5,0.5 0 0,1 12,11.5V13.5A0.5,0.5 0 0,1 11.5,14A0.5,0.5 0 0,1 11,13.5V11.5A0.5,0.5 0 0,1 11.5,11M8,15H9V10H8L7,10.5V11.5L8,11V15Z"/></svg>Tab: ${localStorage.getItem('currency')||'$'}${(detail.totalCents/100).toFixed(2)}`;
            }catch(e){}
          })();
        } else {
          // Available table - show start button
          const avail = document.createElement('div'); avail.textContent = '✓ Available'; avail.style.color='rgba(255,255,255,0.5)'; avail.style.fontSize='14px'; avail.style.marginBottom='8px';
          middle.appendChild(avail);
          
          const startBtn = document.createElement('button'); startBtn.className='start-btn'; startBtn.innerHTML='▶ Start Session';
          startBtn.addEventListener('click', (evt)=>{
            evt.stopPropagation();
            showStartSessionModal(tb.id);
          });
          middle.appendChild(startBtn);
        }
        tile.appendChild(middle);

        // action buttons integrated at bottom
        if(sess){
          const actions = document.createElement('div'); actions.className = 'tile-actions';
          
          const transferBtn = document.createElement('button'); transferBtn.className = 'tile-action'; transferBtn.innerHTML='↔ Transfer'; transferBtn.title='Transfer';
          transferBtn.addEventListener('click', async (evt)=>{
            evt.stopPropagation();
            showTransferModal(sess.id, tb.id, tables, types);
          });
          actions.appendChild(transferBtn);
          
          const checkoutBtn = document.createElement('button'); checkoutBtn.className = 'tile-action'; checkoutBtn.innerHTML='✓ Checkout'; checkoutBtn.title='Checkout';
          checkoutBtn.addEventListener('click', async (evt)=>{
            evt.stopPropagation();
            showCheckoutModal(sess.id, sess.numberOfPlayers || 1);
          });
          actions.appendChild(checkoutBtn);
          
          tile.appendChild(actions);
        } else {
          // For available tables, show delete option
          const actions = document.createElement('div'); actions.className = 'tile-actions';
          
          const maintenanceBtn = document.createElement('button'); 
          maintenanceBtn.className = 'tile-action'; 
          maintenanceBtn.innerHTML='⚠ Maintenance'; 
          maintenanceBtn.title='Set to maintenance mode';
          maintenanceBtn.addEventListener('click', async (evt)=>{
            evt.stopPropagation();
            if(confirm('Set this table to maintenance mode?')){
              try {
                await fetch('/api/tables/' + tb.id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'maintenance' }) });
                renderDashboard();
              } catch(e){
                console.error('Error setting maintenance mode:', e);
                alert('Failed to set maintenance mode');
              }
            }
          });
          actions.appendChild(maintenanceBtn);
          
          const delBtn = document.createElement('button'); delBtn.className = 'tile-action'; delBtn.innerHTML='× Delete'; delBtn.title='Delete table';
          delBtn.addEventListener('click', async (evt)=>{
            evt.stopPropagation();
            if(confirm('Delete this table?')){
              await fetch('/api/tables/' + tb.id, { method:'DELETE' });
              renderDashboard();
            }
          });
          actions.appendChild(delBtn);
          tile.appendChild(actions);
        }

        grid.appendChild(tile);
      }
      typeCard.appendChild(grid);
      container.appendChild(typeCard);
    }
    app.appendChild(container);

    // Set up duration update interval (every minute)
    durationUpdateInterval = setInterval(() => {
      const durationRows = document.querySelectorAll('[data-session-start]');
      durationRows.forEach(durRow => {
        const started = new Date(durRow.dataset.sessionStart);
        if(!durRow.dataset.sessionStart || isNaN(started.getTime())) return;
        const elapsedMs = Date.now() - started.getTime();
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const hours = Math.max(0, Math.floor(totalSeconds / 3600));
        const minutes = Math.max(0, Math.floor((totalSeconds % 3600) / 60));
        const seconds = Math.max(0, totalSeconds % 60);
        const hoursCharged = Math.max(0, Math.ceil(elapsedMs / 3600000));
        
        const timeText = durRow.querySelector('.duration-time');
        const billingText = durRow.querySelector('.duration-billing');
        if(timeText) timeText.textContent = `${hours}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
        if(billingText) billingText.textContent = `(${hoursCharged}h charged)`;
      });
    }, 60000); // Update every 60 seconds

    // helper: deterministic hash for palette
    function hashCode(str){ let h=0; for(let i=0;i<str.length;i++){ h = ((h<<5)-h) + str.charCodeAt(i); h |= 0 } return h; }
  }

  // Modal helpers
  function hideModal(){ 
    modalBackdrop.style.display = 'none'; 
    modalDrinksList.innerHTML = ''; 
    document.getElementById('addDrinkModal').style.display = 'none';
    transferModal.style.display = 'none';
    checkoutModal.style.display = 'none';
    startSessionModal.style.display = 'none';
    settlementModal.style.display = 'none';
  }
  modalClose.addEventListener('click', ()=> hideModal());
  transferClose.addEventListener('click', ()=> hideModal());
  checkoutClose.addEventListener('click', ()=> hideModal());
  startSessionCancel.addEventListener('click', ()=> hideModal());
  settlementClose.addEventListener('click', ()=> hideModal());

  async function showAddDrinkModal(sessionId){
    modalDrinksList.innerHTML = '<div>Loading…</div>';
    document.getElementById('addDrinkModal').style.display = 'block';
    transferModal.style.display = 'none';
    checkoutModal.style.display = 'none';
    modalBackdrop.style.display = 'flex';
    try{
      // Fetch current session items
      const sessionData = await fetch('/api/sessions/' + sessionId).then(r=>r.json());
      const existingItems = sessionData.items || [];
      
      modalDrinksList.innerHTML = '';
      
      // Show existing items with remove button
      if(existingItems.length > 0){
        const existingHeader = document.createElement('div'); existingHeader.textContent = 'Current Tab Items:'; existingHeader.style.fontWeight = '600'; existingHeader.style.marginBottom = '8px'; existingHeader.style.marginTop = '8px';
        modalDrinksList.appendChild(existingHeader);
        
        for(const item of existingItems){
          const itemRow = document.createElement('div'); itemRow.style.display='flex'; itemRow.style.justifyContent='space-between'; itemRow.style.alignItems='center'; itemRow.style.gap='8px'; itemRow.style.marginBottom='4px'; itemRow.style.padding='4px'; itemRow.style.background='rgba(255,255,255,0.03)'; itemRow.style.borderRadius='4px';
          const itemInfo = document.createElement('div'); itemInfo.textContent = `${item.quantity}x ${item.description} — ${localStorage.getItem('currency')||'$'}${(item.totalCents/100).toFixed(2)}`;
          const removeBtn = document.createElement('button'); removeBtn.innerHTML = '<span style="font-size:20px;font-weight:bold">×</span>'; removeBtn.className='icon-btn'; removeBtn.title='Remove';
          removeBtn.addEventListener('click', async ()=>{
            if(!confirm('Remove this item?')) return;
            await fetch('/api/sessions/' + sessionId + '/items/' + item.id, { method:'DELETE' });
            renderDashboard();
            showAddDrinkModal(sessionId);
          });
          itemRow.appendChild(itemInfo); itemRow.appendChild(removeBtn);
          modalDrinksList.appendChild(itemRow);
        }
        
        const divider = document.createElement('hr'); divider.style.margin='16px 0'; divider.style.border='none'; divider.style.borderTop='1px solid rgba(255,255,255,0.1)';
        modalDrinksList.appendChild(divider);
      }
      
      const addHeader = document.createElement('div'); addHeader.textContent = 'Add Drinks:'; addHeader.style.fontWeight = '600'; addHeader.style.marginBottom = '8px';
      modalDrinksList.appendChild(addHeader);
      
      const drinks = await fetch('/api/drinks?lang=' + savedLang).then(r=>r.json());
      for(const d of drinks){
        const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center'; row.style.gap='8px';
        const left = document.createElement('div'); left.textContent = `${d.name} — ${localStorage.getItem('currency')||'$'}${(d.price_cents/100).toFixed(2)}`;
        const controls = document.createElement('div'); controls.style.display='flex'; controls.style.gap='8px';
        const qty = document.createElement('input'); qty.type='number'; qty.value='1'; qty.min='1'; qty.style.width='60px';
        const addBtn = document.createElement('button'); addBtn.textContent = 'Add';
        addBtn.addEventListener('click', async ()=>{
          const q = Number(qty.value) || 1;
          await fetch('/api/sessions/' + sessionId + '/items', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ type:'menu_item', description: d.name, quantity: q, unitPrice: d.price_cents }) });
          renderDashboard();
          showAddDrinkModal(sessionId);
        });
        controls.appendChild(qty); controls.appendChild(addBtn);
        row.appendChild(left); row.appendChild(controls);
        modalDrinksList.appendChild(row);
      }
    }catch(e){ modalDrinksList.innerHTML = '<div>Failed loading drinks</div>'; }
  }

  async function showTransferModal(sessionId, currentTableId, tables, types){
    transferTableList.innerHTML = '';
    document.getElementById('addDrinkModal').style.display = 'none';
    transferModal.style.display = 'block';
    checkoutModal.style.display = 'none';
    modalBackdrop.style.display = 'flex';
    
    const availableTables = tables.filter(t => t.id !== currentTableId && t.status === 'available');
    if(availableTables.length === 0){
      transferTableList.innerHTML = '<div style="padding:12px; opacity:0.6">No available tables to transfer to</div>';
      return;
    }
    
    for(const t of availableTables){
      const type = types.find(tp => tp.id === t.tableTypeId);
      const item = document.createElement('div'); item.className = 'table-select-item';
      const typeName = document.createElement('div'); typeName.style.fontWeight = '600'; typeName.style.marginBottom = '4px'; typeName.textContent = `${type?.name_en || 'Unknown'} #${t.number}`;
      const status = document.createElement('div'); status.style.fontSize = '12px'; status.style.opacity = '0.7'; status.textContent = 'Available';
      item.appendChild(typeName); item.appendChild(status);
      item.addEventListener('click', async ()=>{
        try{
          const response = await fetch('/api/sessions/' + sessionId + '/switch', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ newTableId: t.id }) });
          if(!response.ok){
            const errorData = await response.json().catch(()=>({}));
            if(errorData.error === 'table_unavailable'){
              alert('Table is no longer available. Please try another table.');
            } else {
              alert('Transfer failed: ' + (errorData.error || 'Unknown error'));
            }
            return;
          }
          hideModal();
          renderDashboard();
        }catch(e){ 
          console.error('Transfer error:', e);
          alert('Transfer failed: ' + e.message); 
        }
      });
      transferTableList.appendChild(item);
    }
  }

  async function showSettlementModal(sessionId, originalPlayerCount){
    settlementContent.innerHTML = '<div>Loading...</div>';
    document.getElementById('addDrinkModal').style.display = 'none';
    transferModal.style.display = 'none';
    checkoutModal.style.display = 'none';
    settlementModal.style.display = 'block';
    modalBackdrop.style.display = 'flex';
    
    try{
      const detail = await fetch('/api/sessions/' + sessionId).then(r=>r.json());
      const currency = localStorage.getItem('currency') || '$';
      const items = detail.items || [];
      const tableCharge = detail.tableCharge || 0;
      const subscriberCount = detail.subscriberCount || 0;
      const nonSubscriberCount = originalPlayerCount - subscriberCount;
      
      console.log('[Settlement] Original player count:', originalPlayerCount);
      console.log('[Settlement] Subscriber count:', subscriberCount);
      console.log('[Settlement] Non-subscriber count:', nonSubscriberCount);
      console.log('[Settlement] Table charge:', tableCharge);
      
      settlementContent.innerHTML = '';
      
      const infoDiv = document.createElement('div');
      infoDiv.style.marginBottom = '16px';
      infoDiv.style.padding = '12px';
      infoDiv.style.background = 'rgba(255,255,255,0.03)';
      infoDiv.style.borderRadius = '8px';
      infoDiv.innerHTML = `<div style="font-weight:600; margin-bottom:4px">Settling for 1 player leaving</div><div style="opacity:0.7; font-size:14px">Select items and table charge portion</div>`;
      settlementContent.appendChild(infoDiv);
      
      // Subscriber checkbox (if there are subscribers in the session)
      if(subscriberCount > 0){
        const subSection = document.createElement('div');
        subSection.style.marginBottom = '16px';
        subSection.style.padding = '12px';
        subSection.style.background = 'rgba(59, 130, 246, 0.1)';
        subSection.style.borderRadius = '8px';
        subSection.style.border = '1px solid rgba(59, 130, 246, 0.3)';
        
        const subCheckbox = document.createElement('label');
        subCheckbox.style.display = 'flex';
        subCheckbox.style.alignItems = 'center';
        subCheckbox.style.gap = '8px';
        subCheckbox.style.cursor = 'pointer';
        subCheckbox.innerHTML = `<input type="checkbox" id="settleSubscriber" style="cursor:pointer"/> This player is a subscriber`;
        subSection.appendChild(subCheckbox);
        
        const subHelp = document.createElement('div');
        subHelp.style.fontSize = '12px';
        subHelp.style.opacity = '0.7';
        subHelp.style.marginTop = '4px';
        subHelp.textContent = 'Check if the leaving player is a subscriber (affects remaining charge calculation)';
        subSection.appendChild(subHelp);
        
        settlementContent.appendChild(subSection);
      }
      
      // Table charge section
      if(tableCharge > 0){
        const started = new Date(detail.session.startedAt);
        const elapsedMs = Date.now() - started.getTime();
        const hoursCharged = Math.ceil(elapsedMs / 3600000);
        
        const tableSection = document.createElement('div');
        tableSection.style.marginBottom = '16px';
        
        const tableHeader = document.createElement('div');
        tableHeader.style.fontWeight = '600';
        tableHeader.style.marginBottom = '8px';
        tableHeader.textContent = 'Table Charge:';
        tableSection.appendChild(tableHeader);
        
        const tableOptions = document.createElement('div');
        tableOptions.style.display = 'flex';
        tableOptions.style.flexDirection = 'column';
        tableOptions.style.gap = '8px';
        
        const noTableOption = document.createElement('label');
        noTableOption.style.display = 'flex';
        noTableOption.style.alignItems = 'center';
        noTableOption.style.gap = '8px';
        noTableOption.style.padding = '8px';
        noTableOption.style.borderRadius = '6px';
        noTableOption.style.border = '1px solid rgba(255,255,255,0.1)';
        noTableOption.style.cursor = 'pointer';
        noTableOption.innerHTML = `<input type="radio" name="tableOption" value="none" checked style="cursor:pointer"/> No table charge (${currency}0.00)`;
        tableOptions.appendChild(noTableOption);
        
        const shareOption = document.createElement('label');
        shareOption.style.display = 'flex';
        shareOption.style.alignItems = 'center';
        shareOption.style.gap = '8px';
        shareOption.style.padding = '8px';
        shareOption.style.borderRadius = '6px';
        shareOption.style.border = '1px solid rgba(255,255,255,0.1)';
        shareOption.style.cursor = 'pointer';
        const playerShare = nonSubscriberCount > 0 ? Math.round(tableCharge / nonSubscriberCount) : 0;
        const displayText = nonSubscriberCount > 0 
          ? `Player's share (${currency}${(playerShare/100).toFixed(2)} = ${currency}${(tableCharge/100).toFixed(2)} ÷ ${nonSubscriberCount} non-subscribers)`
          : `Player's share (${currency}0.00 - subscribers don't pay table charge)`;
        shareOption.innerHTML = `<input type="radio" name="tableOption" value="share" style="cursor:pointer"/> ${displayText}`;
        tableOptions.appendChild(shareOption);
        
        const fullOption = document.createElement('label');
        fullOption.style.display = 'flex';
        fullOption.style.alignItems = 'center';
        fullOption.style.gap = '8px';
        fullOption.style.padding = '8px';
        fullOption.style.borderRadius = '6px';
        fullOption.style.border = '1px solid rgba(255,255,255,0.1)';
        fullOption.style.cursor = 'pointer';
        fullOption.innerHTML = `<input type="radio" name="tableOption" value="full" style="cursor:pointer"/> Full table charge (${currency}${(tableCharge/100).toFixed(2)})`;
        tableOptions.appendChild(fullOption);
        
        tableSection.appendChild(tableOptions);
        settlementContent.appendChild(tableSection);
      }
      
      // Drinks section
      if(items.length > 0){
        const drinksSection = document.createElement('div');
        drinksSection.style.marginBottom = '16px';
        
        const drinksHeader = document.createElement('div');
        drinksHeader.style.fontWeight = '600';
        drinksHeader.style.marginBottom = '8px';
        drinksHeader.textContent = 'Drinks/Items:';
        drinksSection.appendChild(drinksHeader);
        
        const drinksList = document.createElement('div');
        drinksList.style.display = 'flex';
        drinksList.style.flexDirection = 'column';
        drinksList.style.gap = '6px';
        drinksList.style.maxHeight = '200px';
        drinksList.style.overflowY = 'auto';
        
        for(const item of items){
          const itemRow = document.createElement('div');
          itemRow.style.display = 'flex';
          itemRow.style.alignItems = 'center';
          itemRow.style.gap = '8px';
          itemRow.style.padding = '8px';
          itemRow.style.borderRadius = '6px';
          itemRow.style.border = '1px solid rgba(255,255,255,0.1)';
          
          const itemInfo = document.createElement('div');
          itemInfo.style.flex = '1';
          itemInfo.innerHTML = `<div style="font-weight:500">${item.description}</div><div style="font-size:12px;opacity:0.7">${currency}${(item.unitPrice/100).toFixed(2)} each</div>`;
          
          const qtyInput = document.createElement('input');
          qtyInput.type = 'number';
          qtyInput.className = 'settle-qty';
          qtyInput.min = '0';
          qtyInput.max = item.quantity;
          qtyInput.value = '0';
          qtyInput.style.width = '60px';
          qtyInput.dataset.itemId = item.id;
          qtyInput.dataset.unitPrice = item.unitPrice;
          qtyInput.dataset.maxQty = item.quantity;
          
          const qtyLabel = document.createElement('span');
          qtyLabel.style.fontSize = '14px';
          qtyLabel.style.opacity = '0.7';
          qtyLabel.textContent = `/ ${item.quantity}`;
          
          itemRow.appendChild(itemInfo);
          itemRow.appendChild(qtyInput);
          itemRow.appendChild(qtyLabel);
          drinksList.appendChild(itemRow);
        }
        
        drinksSection.appendChild(drinksList);
        settlementContent.appendChild(drinksSection);
      }
      
      // Total display
      const totalDiv = document.createElement('div');
      totalDiv.style.marginTop = '16px';
      totalDiv.style.padding = '12px';
      totalDiv.style.background = 'rgba(16, 185, 129, 0.1)';
      totalDiv.style.borderRadius = '8px';
      totalDiv.style.fontWeight = '600';
      totalDiv.style.fontSize = '18px';
      totalDiv.id = 'settlementTotal';
      totalDiv.textContent = `Settlement Total: ${currency}0.00`;
      settlementContent.appendChild(totalDiv);
      
      // Update total function
      const updateTotal = () => {
        let total = 0;
        
        // Add table charge if selected
        const tableOption = document.querySelector('input[name="tableOption"]:checked');
        if(tableOption && tableOption.value === 'share'){
          total += Math.round(tableCharge / originalPlayerCount);
        } else if(tableOption && tableOption.value === 'full'){
          total += tableCharge;
        }
        
        // Add selected drinks
        document.querySelectorAll('.settle-qty').forEach(input => {
          const qty = parseInt(input.value) || 0;
          const unitPrice = parseInt(input.dataset.unitPrice) || 0;
          total += qty * unitPrice;
        });
        
        totalDiv.textContent = `Settlement Total: ${currency}${(total/100).toFixed(2)}`;
      };
      
      // Add event listeners
      document.querySelectorAll('input[name="tableOption"]').forEach(radio => {
        radio.addEventListener('change', updateTotal);
      });
      document.querySelectorAll('.settle-qty').forEach(input => {
        input.addEventListener('input', updateTotal);
      });
      
      // Action buttons
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.marginTop = '16px';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.flex = '1';
      cancelBtn.addEventListener('click', ()=>{ hideModal(); });
      actions.appendChild(cancelBtn);
      
      const printBtn = document.createElement('button');
      printBtn.textContent = '🖨 Print Receipt';
      printBtn.style.flex = '1';
      printBtn.addEventListener('click', async ()=>{
        const tableOption = document.querySelector('input[name="tableOption"]:checked');
        let tableSettlement = 0;
        if(tableOption && tableOption.value === 'share'){
          tableSettlement = nonSubscriberCount > 0 ? Math.round(tableCharge / nonSubscriberCount) : 0;
        } else if(tableOption && tableOption.value === 'full'){
          tableSettlement = tableCharge;
        }
        
        const selectedItems = [];
        document.querySelectorAll('.settle-qty').forEach(input => {
          const qty = parseInt(input.value) || 0;
          if(qty > 0){
            selectedItems.push({itemId: input.dataset.itemId, quantity: qty});
          }
        });
        
        await printSettlementReceipt(sessionId, tableSettlement, selectedItems, items, currency);
      });
      actions.appendChild(printBtn);
      
      const settleBtn = document.createElement('button');
      settleBtn.textContent = '✓ Settle & Remove Player';
      settleBtn.style.flex = '2';
      settleBtn.style.background = '#10b981';
      settleBtn.style.color = '#fff';
      settleBtn.style.fontWeight = '600';
      settleBtn.addEventListener('click', async ()=>{
        const tableOption = document.querySelector('input[name="tableOption"]:checked');
        let tableSettlement = 0;
        if(tableOption && tableOption.value === 'share'){
          tableSettlement = nonSubscriberCount > 0 ? Math.round(tableCharge / nonSubscriberCount) : 0;
        } else if(tableOption && tableOption.value === 'full'){
          tableSettlement = tableCharge;
        }
        
        const selectedItems = [];
        document.querySelectorAll('.settle-qty').forEach(input => {
          const qty = parseInt(input.value) || 0;
          if(qty > 0){
            selectedItems.push({itemId: input.dataset.itemId, quantity: qty});
          }
        });
        
        try{
          // Check if settling player is a subscriber
          const isSubscriber = document.getElementById('settleSubscriber')?.checked || false;
          
          await fetch('/api/sessions/' + sessionId + '/settle', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              tableSettlementCents: tableSettlement,
              items: selectedItems,
              isSubscriber: isSubscriber
            })
          });
          
          // Update player count
          const newCount = Math.max(1, (originalPlayerCount)-1);
          await fetch('/api/sessions/' + sessionId, {
            method:'PATCH',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ numberOfPlayers: newCount })
          });
          
          hideModal();
          // Delay to ensure database updates are visible, then force refresh
          setTimeout(() => renderDashboard(), 300);
        }catch(e){
          alert('Settlement failed: ' + e.message);
        }
      });
      actions.appendChild(settleBtn);
      
      settlementContent.appendChild(actions);
      
    }catch(e){
      settlementContent.innerHTML = '<div style="color:#ef4444">Error loading session details</div>';
    }
  }

  async function showCheckoutModal(sessionId, numberOfPlayers){
    checkoutContent.innerHTML = '<div>Loading...</div>';
    document.getElementById('addDrinkModal').style.display = 'none';
    transferModal.style.display = 'none';
    checkoutModal.style.display = 'block';
    modalBackdrop.style.display = 'flex';
    
    try{
      const detail = await fetch('/api/sessions/' + sessionId).then(r=>r.json());
      const currency = localStorage.getItem('currency') || '$';
      const items = detail.items || [];
      const tableCharge = detail.tableCharge || 0;
      
      checkoutContent.innerHTML = '';
      
      // Tab Details Section
      const detailsHeader = document.createElement('div'); 
      detailsHeader.style.fontWeight = '600'; 
      detailsHeader.style.marginBottom = '12px'; 
      detailsHeader.textContent = 'Tab Details:';
      checkoutContent.appendChild(detailsHeader);
      
      const itemsContainer = document.createElement('div');
      itemsContainer.style.marginBottom = '16px';
      itemsContainer.style.maxHeight = '300px';
      itemsContainer.style.overflowY = 'auto';
      
      let subtotalCents = tableCharge;
      const adjustedItems = [];
      
      // Add table charge as first item if it exists
      if(tableCharge > 0){
        const started = new Date(detail.session.startedAt);
        const elapsedMs = Date.now() - started.getTime();
        const hoursCharged = Math.ceil(elapsedMs / 3600000);
        
        const tableRow = document.createElement('div');
        tableRow.style.display = 'flex';
        tableRow.style.justifyContent = 'space-between';
        tableRow.style.alignItems = 'center';
        tableRow.style.gap = '8px';
        tableRow.style.padding = '8px';
        tableRow.style.background = 'rgba(16, 185, 129, 0.1)';
        tableRow.style.borderRadius = '6px';
        tableRow.style.marginBottom = '6px';
        
        const tableInfo = document.createElement('div');
        tableInfo.style.flex = '1';
        tableInfo.innerHTML = `<div style="font-weight:500">Table Time</div><div style="font-size:12px;opacity:0.7">${hoursCharged}h charged</div>`;
        
        const tableTotal = document.createElement('div');
        tableTotal.style.fontWeight = '600';
        tableTotal.style.minWidth = '80px';
        tableTotal.style.textAlign = 'right';
        tableTotal.textContent = `${currency}${(tableCharge/100).toFixed(2)}`;
        
        tableRow.appendChild(tableInfo);
        tableRow.appendChild(tableTotal);
        itemsContainer.appendChild(tableRow);
      }
      
      for(const item of items){
        const itemRow = document.createElement('div');
        itemRow.style.display = 'flex';
        itemRow.style.justifyContent = 'space-between';
        itemRow.style.alignItems = 'center';
        itemRow.style.gap = '8px';
        itemRow.style.padding = '8px';
        itemRow.style.background = 'rgba(255,255,255,0.03)';
        itemRow.style.borderRadius = '6px';
        itemRow.style.marginBottom = '6px';
        
        const itemInfo = document.createElement('div');
        itemInfo.style.flex = '1';
        itemInfo.innerHTML = `<div style="font-weight:500">${item.description}</div><div style="font-size:12px;opacity:0.7">${item.quantity} × ${currency}${(item.unitPrice/100).toFixed(2)}</div>`;
        
        const itemControls = document.createElement('div');
        itemControls.style.display = 'flex';
        itemControls.style.alignItems = 'center';
        itemControls.style.gap = '8px';
        
        const qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.value = item.quantity;
        qtyInput.min = '0';
        qtyInput.style.width = '60px';
        qtyInput.dataset.itemId = item.id;
        
        const itemTotal = document.createElement('div');
        itemTotal.style.fontWeight = '600';
        itemTotal.style.minWidth = '80px';
        itemTotal.style.textAlign = 'right';
        const itemTotalCents = item.quantity * item.unitPrice;
        itemTotal.textContent = `${currency}${(itemTotalCents/100).toFixed(2)}`;
        
        qtyInput.addEventListener('input', ()=>{
          const newQty = Math.max(0, Number(qtyInput.value) || 0);
          const newTotal = newQty * item.unitPrice;
          itemTotal.textContent = `${currency}${(newTotal/100).toFixed(2)}`;
          updateCheckoutTotals();
        });
        
        itemControls.appendChild(qtyInput);
        itemControls.appendChild(itemTotal);
        itemRow.appendChild(itemInfo);
        itemRow.appendChild(itemControls);
        itemsContainer.appendChild(itemRow);
        
        subtotalCents += itemTotalCents;
        adjustedItems.push({ id: item.id, qtyInput, unitPrice: item.unitPrice });
      }
      
      checkoutContent.appendChild(itemsContainer);
      
      // Discount Section
      const discountRow = document.createElement('div');
      discountRow.style.display = 'flex';
      discountRow.style.justifyContent = 'space-between';
      discountRow.style.alignItems = 'center';
      discountRow.style.padding = '8px';
      discountRow.style.background = 'rgba(255,255,255,0.05)';
      discountRow.style.borderRadius = '6px';
      discountRow.style.marginBottom = '12px';
      
      const discountLabel = document.createElement('div');
      discountLabel.style.fontWeight = '500';
      discountLabel.textContent = 'Discount:';
      
      const discountControls = document.createElement('div');
      discountControls.style.display = 'flex';
      discountControls.style.alignItems = 'center';
      discountControls.style.gap = '8px';
      
      const discountInput = document.createElement('input');
      discountInput.type = 'number';
      discountInput.value = '0';
      discountInput.min = '0';
      discountInput.step = '1';
      discountInput.style.width = '80px';
      discountInput.id = 'discountInput';
      
      const discountType = document.createElement('select');
      discountType.style.width = '60px';
      discountType.innerHTML = '<option value="%">%</option><option value="fixed">$</option>';
      discountType.id = 'discountType';
      
      discountInput.addEventListener('input', updateCheckoutTotals);
      discountType.addEventListener('change', updateCheckoutTotals);
      
      discountControls.appendChild(discountInput);
      discountControls.appendChild(discountType);
      discountRow.appendChild(discountLabel);
      discountRow.appendChild(discountControls);
      checkoutContent.appendChild(discountRow);
      
      // Totals Section
      const totalsContainer = document.createElement('div');
      totalsContainer.style.padding = '12px';
      totalsContainer.style.background = 'rgba(16, 185, 129, 0.1)';
      totalsContainer.style.borderRadius = '8px';
      totalsContainer.style.marginBottom = '16px';
      
      const subtotalRow = document.createElement('div');
      subtotalRow.style.display = 'flex';
      subtotalRow.style.justifyContent = 'space-between';
      subtotalRow.style.marginBottom = '6px';
      subtotalRow.innerHTML = `<div>Subtotal:</div><div id="subtotalAmount">${currency}${(subtotalCents/100).toFixed(2)}</div>`;
      
      const discountAmountRow = document.createElement('div');
      discountAmountRow.style.display = 'flex';
      discountAmountRow.style.justifyContent = 'space-between';
      discountAmountRow.style.marginBottom = '6px';
      discountAmountRow.style.color = '#10b981';
      discountAmountRow.innerHTML = `<div>Discount:</div><div id="discountAmount">-${currency}0.00</div>`;
      
      const totalRow = document.createElement('div');
      totalRow.style.display = 'flex';
      totalRow.style.justifyContent = 'space-between';
      totalRow.style.fontSize = '20px';
      totalRow.style.fontWeight = '700';
      totalRow.style.paddingTop = '8px';
      totalRow.style.borderTop = '1px solid rgba(255,255,255,0.2)';
      totalRow.innerHTML = `<div>Total:</div><div id="totalAmount">${currency}${(subtotalCents/100).toFixed(2)}</div>`;
      
      totalsContainer.appendChild(subtotalRow);
      totalsContainer.appendChild(discountAmountRow);
      totalsContainer.appendChild(totalRow);
      checkoutContent.appendChild(totalsContainer);
      
      function updateCheckoutTotals(){
        let newSubtotal = tableCharge;
        adjustedItems.forEach(item => {
          const qty = Number(item.qtyInput.value) || 0;
          newSubtotal += qty * item.unitPrice;
        });
        
        const discountVal = Number(discountInput.value) || 0;
        const isPercent = discountType.value === '%';
        let discountCents = 0;
        
        if(isPercent){
          discountCents = Math.round(newSubtotal * discountVal / 100);
        } else {
          discountCents = Math.round(discountVal * 100);
        }
        
        const finalTotal = Math.max(0, newSubtotal - discountCents);
        
        document.getElementById('subtotalAmount').textContent = `${currency}${(newSubtotal/100).toFixed(2)}`;
        document.getElementById('discountAmount').textContent = `-${currency}${(discountCents/100).toFixed(2)}`;
        document.getElementById('totalAmount').textContent = `${currency}${(finalTotal/100).toFixed(2)}`;
      }
      
      // Action Buttons
      const actionsRow = document.createElement('div');
      actionsRow.style.display = 'flex';
      actionsRow.style.gap = '8px';
      actionsRow.style.marginTop = '12px';
      
      const printBtn = document.createElement('button');
      printBtn.textContent = '🖨 Print';
      printBtn.style.flex = '1';
      printBtn.addEventListener('click', async ()=>{
        await printReceipt(detail, adjustedItems, discountInput.value, discountType.value, currency);
      });
      
      const completeBtn = document.createElement('button');
      completeBtn.textContent = '✓ Complete Payment';
      completeBtn.style.flex = '2';
      completeBtn.style.background = '#10b981';
      completeBtn.style.color = '#fff';
      completeBtn.style.fontWeight = '600';
      completeBtn.addEventListener('click', async ()=>{
        if(confirm('Complete payment and end session?')){
          await fetch('/api/sessions/' + sessionId + '/end', { method: 'PATCH' });
          hideModal();
          renderDashboard();
        }
      });
      
      actionsRow.appendChild(printBtn);
      actionsRow.appendChild(completeBtn);
      checkoutContent.appendChild(actionsRow);
      
      if(numberOfPlayers > 1){
        const splitInfo = document.createElement('div');
        splitInfo.style.marginTop = '12px';
        splitInfo.style.padding = '8px';
        splitInfo.style.background = 'rgba(255,255,255,0.03)';
        splitInfo.style.borderRadius = '6px';
        splitInfo.style.fontSize = '14px';
        splitInfo.style.textAlign = 'center';
        splitInfo.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:middle;margin-right:4px"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" /></svg>${numberOfPlayers} players • <span id="perPlayerAmount">${currency}${(subtotalCents/100/numberOfPlayers).toFixed(2)}</span> per person`;
        checkoutContent.appendChild(splitInfo);
        
        const originalUpdate = updateCheckoutTotals;
        updateCheckoutTotals = function(){
          originalUpdate();
          const total = Number(document.getElementById('totalAmount').textContent.replace(currency, ''));
          document.getElementById('perPlayerAmount').textContent = `${currency}${(total/numberOfPlayers).toFixed(2)}`;
        };
      }
      
    }catch(e){ checkoutContent.innerHTML = '<div>Failed loading session details</div>'; }
  }
  
  async function printSettlementReceipt(sessionId, tableSettlement, selectedItems, itemsData, currency){
    // Fetch app name from settings
    let appName = 'Pool Tables Manager';
    try{
      const res = await fetch('/api/settings');
      const settings = res.ok ? await res.json() : {};
      appName = settings.app_name || 'Pool Tables Manager';
    }catch(err){
      console.warn('Failed to load app name for receipt', err);
    }
    
    const printWindow = window.open('', '', 'width=300,height=600');
    
    // Fetch session and table info
    let tableName = 'N/A';
    let tableType = '';
    let startTime = 'N/A';
    
    try{
      const [detailRes, tablesRes, typesRes] = await Promise.all([
        fetch('/api/sessions/' + sessionId),
        fetch('/api/tables'),
        fetch('/api/table-types')
      ]);
      
      if(detailRes.ok){
        const detail = await detailRes.json();
        startTime = detail.session ? new Date(detail.session.startedAt).toLocaleString() : 'N/A';
        
        if(detail.session && detail.session.tableId && tablesRes.ok){
          const tables = await tablesRes.json();
          const table = tables.find(t => t.id === detail.session.tableId);
          if(table){
            tableName = table.name || `Table #${table.number || 'N/A'}`;
            
            if(typesRes.ok){
              const types = await typesRes.json();
              const type = types.find(tt => tt.id === table.tableTypeId);
              if(type){
                tableType = ` (${type.name_en || type.name || ''})`;
              }
            }
          }
        }
      }
    }catch(err){
      console.warn('Failed to fetch info for settlement receipt', err);
    }
    
    const settlementTime = new Date().toLocaleString();
    
    let subtotal = 0;
    let itemsHTML = '';
    
    // Add table charge settlement if any
    if(tableSettlement > 0){
      subtotal += tableSettlement;
      itemsHTML += `<tr><td>Table Charge (Player Share)</td><td>1</td><td style="text-align:right">${currency}${(tableSettlement/100).toFixed(2)}</td><td style="text-align:right">${currency}${(tableSettlement/100).toFixed(2)}</td></tr>`;
    }
    
    // Add settled drinks
    for(const selectedItem of selectedItems){
      const item = itemsData.find(i => i.id === selectedItem.itemId);
      if(item){
        const settleQty = selectedItem.quantity;
        const settleTotal = settleQty * item.unitPrice;
        subtotal += settleTotal;
        itemsHTML += `<tr><td>${item.description}</td><td>${settleQty}</td><td style="text-align:right">${currency}${(item.unitPrice/100).toFixed(2)}</td><td style="text-align:right">${currency}${(settleTotal/100).toFixed(2)}</td></tr>`;
      }
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Settlement Receipt - ${tableName}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 20px; }
            h2 { text-align: center; margin-bottom: 10px; }
            h3 { text-align: center; margin-bottom: 20px; font-weight: normal; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { padding: 4px; text-align: left; }
            th { border-bottom: 2px solid #000; }
            .totals { border-top: 2px solid #000; font-weight: bold; }
            .info { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <h2>${appName}</h2>
          <h3>Partial Settlement Receipt</h3>
          <div class="info">
            <div>Table: ${tableName}${tableType}</div>
            <div>Session Start: ${startTime}</div>
            <div>Settlement: ${settlementTime}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th style="text-align:right">Price</th>
                <th style="text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          <table>
            <tr class="totals">
              <td>SETTLEMENT TOTAL</td>
              <td></td>
              <td></td>
              <td style="text-align:right">${currency}${(subtotal/100).toFixed(2)}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; text-align: center; font-size: 10px;">
            <p>Thank you!</p>
            <p>This is a partial settlement. Remaining charges will be settled when the session ends.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  async function printReceipt(detail, adjustedItems, discountValue, discountType, currency){
    // Fetch app name from settings
    let appName = 'Pool Tables Manager';
    try{
      const res = await fetch('/api/settings');
      const settings = res.ok ? await res.json() : {};
      appName = settings.app_name || 'Pool Tables Manager';
    }catch(err){
      console.warn('Failed to load app name for receipt', err);
    }
    
    const printWindow = window.open('', '', 'width=300,height=600');
    const items = detail.items || [];
    const tableCharge = detail.tableCharge || 0;
    
    let subtotal = tableCharge;
    let itemsHTML = '';
    
    // Add table charge as first line item if it exists
    if(tableCharge > 0){
      const started = new Date(detail.session.startedAt);
      const elapsedMs = Date.now() - started.getTime();
      const hoursCharged = Math.ceil(elapsedMs / 3600000);
      const hourlyRate = tableCharge / hoursCharged;
      itemsHTML += `<tr><td>Table Time (${hoursCharged}h)</td><td>1</td><td style="text-align:right">${currency}${(hourlyRate/100).toFixed(2)}/h</td><td style="text-align:right">${currency}${(tableCharge/100).toFixed(2)}</td></tr>`;
    }
    
    // Add drinks and other items
    itemsHTML += adjustedItems.map((adjItem, idx) => {
      const item = items[idx];
      const qty = Number(adjItem.qtyInput.value) || 0;
      const total = qty * item.unitPrice;
      subtotal += total;
      return `<tr><td>${item.description}</td><td>${qty}</td><td style="text-align:right">${currency}${(item.unitPrice/100).toFixed(2)}</td><td style="text-align:right">${currency}${(total/100).toFixed(2)}</td></tr>`;
    }).join('');
    
    const discountVal = Number(discountValue) || 0;
    let discountCents = 0;
    if(discountType === '%'){
      discountCents = Math.round(subtotal * discountVal / 100);
    } else {
      discountCents = Math.round(discountVal * 100);
    }
    
    const finalTotal = Math.max(0, subtotal - discountCents);
    
    // Fetch table information and type
    let tableName = 'N/A';
    let tableType = '';
    if(detail.session && detail.session.tableId){
      try{
        const [tablesRes, typesRes] = await Promise.all([fetch('/api/tables'), fetch('/api/table-types')]);
        if(tablesRes.ok){
          const tables = await tablesRes.json();
          const table = tables.find(t => t.id === detail.session.tableId);
          if(table){
            tableName = table.name || `Table #${table.number || 'N/A'}`;
            
            // Get table type name
            if(typesRes.ok){
              const types = await typesRes.json();
              const type = types.find(tt => tt.id === table.tableTypeId);
              if(type){
                tableType = ` (${type.name_en || type.name || ''})`;
              }
            }
          }
        }
      }catch(err){
        console.warn('Failed to fetch table info for receipt', err);
      }
    }
    
    const startTime = detail.session ? new Date(detail.session.startedAt).toLocaleString() : 'N/A';
    const endTime = new Date().toLocaleString();
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${tableName}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 20px; }
            h2 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { padding: 4px; text-align: left; }
            th { border-bottom: 2px solid #000; }
            .totals { border-top: 2px solid #000; font-weight: bold; }
            .info { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <h2>${appName}</h2>
          <div class="info">
            <div>Table: ${tableName}${tableType}</div>
            <div>Start: ${startTime}</div>
            <div>End: ${endTime}</div>
            <div>Players: ${detail.numberOfPlayers || 1}</div>
          </div>
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          <table class="totals">
            <tr><td>Subtotal:</td><td style="text-align:right">${currency}${(subtotal/100).toFixed(2)}</td></tr>
            ${discountCents > 0 ? `<tr><td>Discount:</td><td style="text-align:right">-${currency}${(discountCents/100).toFixed(2)}</td></tr>` : ''}
            <tr><td>TOTAL:</td><td style="text-align:right">${currency}${(finalTotal/100).toFixed(2)}</td></tr>
          </table>
          <div style="text-align:center; margin-top:20px">Thank you!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  function showStartSessionModal(tableId){
    document.getElementById('addDrinkModal').style.display = 'none';
    transferModal.style.display = 'none';
    checkoutModal.style.display = 'none';
    startSessionModal.style.display = 'block';
    modalBackdrop.style.display = 'flex';
    
    // Reset counts
    let subscribers = 0;
    let nonsubscribers = 1;
    subCount.textContent = subscribers;
    nonsubCount.textContent = nonsubscribers;
    
    // Set up +/- handlers
    subMinus.onclick = ()=>{ if(subscribers > 0) { subscribers--; subCount.textContent = subscribers; } };
    subPlus.onclick = ()=>{ subscribers++; subCount.textContent = subscribers; };
    nonsubMinus.onclick = ()=>{ if(nonsubscribers > 0) { nonsubscribers--; nonsubCount.textContent = nonsubscribers; } };
    nonsubPlus.onclick = ()=>{ nonsubscribers++; nonsubCount.textContent = nonsubscribers; };
    
    // Confirm handler
    startSessionConfirm.onclick = async ()=>{
      const total = subscribers + nonsubscribers;
      if(total === 0) return alert('Must have at least one player');
      try {
        const response = await fetch('/api/sessions', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tableId, numberOfPlayers: total, subscriberCount: subscribers }) });
        if (!response.ok) {
          const error = await response.json();
          if (error.error === 'table_unavailable') {
            alert('This table is already occupied');
          } else {
            alert('Failed to start session');
          }
          return;
        }
        const newSession = await response.json();
        console.log('New session created:', newSession);
        hideModal();
        // Small delay to ensure database commit completes
        await new Promise(resolve => setTimeout(resolve, 200));
        renderDashboard();
      } catch (err) {
        console.error(err);
        alert('Failed to start session');
      }
    };
  }

  async function renderSettings(){
    app.innerHTML = '';
    const h = document.createElement('h2'); h.textContent = 'Settings'; app.appendChild(h);
    const settingsRes = await fetch('/api/settings');
    const settings = settingsRes.ok ? await settingsRes.json() : {};
    const currency = settings.currency || localStorage.getItem('currency') || '$';
    localStorage.setItem('currency', currency);

    const form = document.createElement('div'); form.style.display='flex'; form.style.flexDirection='column'; form.style.gap='16px'; form.style.maxWidth='400px';
    
    const appNameRow = document.createElement('div');
    const appNameLabel = document.createElement('label'); appNameLabel.textContent = 'Application Name: '; appNameLabel.style.fontWeight='600';
    const appNameInput = document.createElement('input'); appNameInput.type='text'; appNameInput.style.marginLeft='8px'; appNameInput.style.width='200px'; appNameInput.value = settings.app_name || 'Pool Hall'; appNameInput.placeholder = 'Pool Hall';
    appNameInput.addEventListener('change', async (e)=>{ const val = e.target.value; try{ await fetch('/api/settings', { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ app_name: val }) }); title.textContent = val || 'Pool Hall'; }catch(err){ console.warn('failed saving setting', err); } });
    appNameRow.appendChild(appNameLabel); appNameRow.appendChild(appNameInput);
    const appNameHelp = document.createElement('div'); appNameHelp.style.fontSize='12px'; appNameHelp.style.opacity='0.7'; appNameHelp.style.marginTop='4px'; appNameHelp.textContent = 'Display name shown in the header';
    appNameRow.appendChild(appNameHelp);
    form.appendChild(appNameRow);
    
    const langRow = document.createElement('div');
    const langLabel = document.createElement('label'); langLabel.textContent = 'Language: '; langLabel.style.fontWeight='600';
    const selLang = document.createElement('select'); selLang.style.marginLeft='8px'; selLang.innerHTML = '<option value="en">English</option><option value="fr">Français</option>';
    selLang.value = savedLang;
    selLang.addEventListener('change', (e)=>{ savedLang = e.target.value; localStorage.setItem('lang', savedLang); loadLocale(savedLang); renderSettings(); });
    langRow.appendChild(langLabel); langRow.appendChild(selLang);
    form.appendChild(langRow);

    const curRow = document.createElement('div');
    const curLabel = document.createElement('label'); curLabel.textContent = 'Currency: '; curLabel.style.fontWeight='600';
    const selCur = document.createElement('select'); selCur.style.marginLeft='8px'; selCur.innerHTML = '<option value="$">$ (USD)</option><option value="€">€ (EUR)</option><option value="£">£ (GBP)</option>';
    selCur.value = currency;
    selCur.addEventListener('change', async (e)=>{ const cur = e.target.value; localStorage.setItem('currency', cur); try{ await fetch('/api/settings', { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ currency: cur }) }); }catch(err){ console.warn('failed saving setting', err); } renderSettings(); });
    curRow.appendChild(curLabel); curRow.appendChild(selCur);
    form.appendChild(curRow);

    const discountRow = document.createElement('div');
    const discountLabel = document.createElement('label'); discountLabel.textContent = 'Subscriber Discount (%): '; discountLabel.style.fontWeight='600';
    const discountInput = document.createElement('input'); discountInput.type='number'; discountInput.style.marginLeft='8px'; discountInput.style.width='80px'; discountInput.min='0'; discountInput.max='100'; discountInput.value = settings.subscriber_discount || '50';
    discountInput.addEventListener('change', async (e)=>{ const val = e.target.value; try{ await fetch('/api/settings', { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ subscriber_discount: val }) }); }catch(err){ console.warn('failed saving setting', err); } });
    discountRow.appendChild(discountLabel); discountRow.appendChild(discountInput);
    const discountHelp = document.createElement('div'); discountHelp.style.fontSize='12px'; discountHelp.style.opacity='0.7'; discountHelp.style.marginTop='4px'; discountHelp.textContent = 'Discount applied to non-subscribers playing with subscribers';
    discountRow.appendChild(discountHelp);
    form.appendChild(discountRow);
    
    const audioRow = document.createElement('div');
    const audioLabel = document.createElement('label'); audioLabel.textContent = 'Audio Cues: '; audioLabel.style.fontWeight='600';
    const audioToggle = document.createElement('input'); audioToggle.type='checkbox'; audioToggle.style.marginLeft='8px'; audioToggle.checked = audioEnabled;
    audioToggle.addEventListener('change', (e)=>{ 
      audioEnabled = e.target.checked; 
      localStorage.setItem('audio_cues', audioEnabled); 
      if(audioEnabled) playClickSound();
    });
    audioRow.appendChild(audioLabel); audioRow.appendChild(audioToggle);
    const audioHelp = document.createElement('div'); audioHelp.style.fontSize='12px'; audioHelp.style.opacity='0.7'; audioHelp.style.marginTop='4px'; audioHelp.textContent = 'Play subtle click sounds when interacting with the UI';
    audioRow.appendChild(audioHelp);
    form.appendChild(audioRow);

    // OIDC Settings
    const oidcSection = document.createElement('div');
    oidcSection.style.border = '1px dashed rgba(255,255,255,0.06)';
    oidcSection.style.padding = '12px';
    oidcSection.style.borderRadius = '6px';
    const oidcTitle = document.createElement('h3'); oidcTitle.textContent = 'OpenID Connect (OIDC) Settings'; oidcTitle.style.marginTop = '0'; oidcSection.appendChild(oidcTitle);

    const oidcEnableRow = document.createElement('div');
    const oidcEnableLabel = document.createElement('label'); oidcEnableLabel.textContent = 'Enable OIDC (admin pages): '; oidcEnableLabel.style.fontWeight='600';
    const oidcEnable = document.createElement('input'); oidcEnable.type='checkbox'; oidcEnable.style.marginLeft='8px'; oidcEnable.checked = settings.oidc_enabled === 'true';
    oidcEnable.addEventListener('change', async (e)=>{ const val = e.target.checked ? 'true' : 'false'; try{ await fetch('/api/settings', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ oidc_enabled: val }) }); alert('OIDC enabled set to: ' + val); renderSettings(); }catch(err){ console.warn('failed saving oidc_enabled', err); alert('Failed to save setting'); } });
    oidcEnableRow.appendChild(oidcEnableLabel); oidcEnableRow.appendChild(oidcEnable);
    const oidcEnableHelp = document.createElement('div'); oidcEnableHelp.style.fontSize='12px'; oidcEnableHelp.style.opacity='0.7'; oidcEnableHelp.style.marginTop='4px'; oidcEnableHelp.textContent = 'When enabled, admin pages require OIDC login. Keep disabled to avoid lockout.';
    oidcSection.appendChild(oidcEnableRow); oidcSection.appendChild(oidcEnableHelp);

    const issuerRow = document.createElement('div'); const issuerLabel = document.createElement('label'); issuerLabel.textContent = 'Issuer URL: '; issuerLabel.style.fontWeight='600';
    const issuerInput = document.createElement('input'); issuerInput.type='text'; issuerInput.style.marginLeft='8px'; issuerInput.style.width='100%'; issuerInput.value = settings.oidc_issuer || '';
    issuerInput.addEventListener('change', async (e)=>{ try{ await fetch('/api/settings', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ oidc_issuer: e.target.value }) }); alert('Saved'); }catch(err){ console.warn('failed saving oidc_issuer', err); alert('Failed to save setting'); } });
    issuerRow.appendChild(issuerLabel); issuerRow.appendChild(issuerInput); oidcSection.appendChild(issuerRow);

    const clientIdRow = document.createElement('div'); const clientIdLabel = document.createElement('label'); clientIdLabel.textContent = 'Client ID: '; clientIdLabel.style.fontWeight='600';
    const clientIdInput = document.createElement('input'); clientIdInput.type='text'; clientIdInput.style.marginLeft='8px'; clientIdInput.style.width='100%'; clientIdInput.value = settings.oidc_client_id || '';
    clientIdInput.addEventListener('change', async (e)=>{ try{ await fetch('/api/settings', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ oidc_client_id: e.target.value }) }); alert('Saved'); }catch(err){ console.warn('failed saving oidc_client_id', err); alert('Failed to save setting'); } });
    clientIdRow.appendChild(clientIdLabel); clientIdRow.appendChild(clientIdInput); oidcSection.appendChild(clientIdRow);

    const clientSecretRow = document.createElement('div'); const clientSecretLabel = document.createElement('label'); clientSecretLabel.textContent = 'Client Secret: '; clientSecretLabel.style.fontWeight='600';
    const clientSecretInput = document.createElement('input'); clientSecretInput.type='password'; clientSecretInput.style.marginLeft='8px'; clientSecretInput.style.width='100%'; clientSecretInput.value = settings.oidc_client_secret || '';
    clientSecretInput.addEventListener('change', async (e)=>{ try{ await fetch('/api/settings', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ oidc_client_secret: e.target.value }) }); alert('Saved'); }catch(err){ console.warn('failed saving oidc_client_secret', err); alert('Failed to save setting'); } });
    clientSecretRow.appendChild(clientSecretLabel); clientSecretRow.appendChild(clientSecretInput); oidcSection.appendChild(clientSecretRow);

    const scopeRow = document.createElement('div'); const scopeLabel = document.createElement('label'); scopeLabel.textContent = 'Scope: '; scopeLabel.style.fontWeight='600';
    const scopeInput = document.createElement('input'); scopeInput.type='text'; scopeInput.style.marginLeft='8px'; scopeInput.style.width='100%'; scopeInput.value = settings.oidc_scope || 'openid profile email';
    scopeInput.addEventListener('change', async (e)=>{ try{ await fetch('/api/settings', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ oidc_scope: e.target.value }) }); alert('Saved'); }catch(err){ console.warn('failed saving oidc_scope', err); alert('Failed to save setting'); } });
    scopeRow.appendChild(scopeLabel); scopeRow.appendChild(scopeInput); oidcSection.appendChild(scopeRow);

    const redirectRow = document.createElement('div'); const redirectLabel = document.createElement('label'); redirectLabel.textContent = 'Redirect URI: '; redirectLabel.style.fontWeight='600';
    const redirectInput = document.createElement('input'); redirectInput.type='text'; redirectInput.style.marginLeft='8px'; redirectInput.style.width='100%'; redirectInput.value = settings.oidc_redirect_uri || '';
    redirectInput.addEventListener('change', async (e)=>{ try{ await fetch('/api/settings', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ oidc_redirect_uri: e.target.value }) }); alert('Saved'); }catch(err){ console.warn('failed saving oidc_redirect_uri', err); alert('Failed to save setting'); } });
    redirectRow.appendChild(redirectLabel); redirectRow.appendChild(redirectInput); oidcSection.appendChild(redirectRow);

    const testRow = document.createElement('div'); testRow.style.marginTop='8px';
    const testBtn = document.createElement('button'); testBtn.textContent = 'Test OIDC (opens login)'; testBtn.addEventListener('click', async ()=>{
      // Try opening /auth/login which will validate OIDC config server-side
      window.open('/auth/login', '_blank');
    });
    testRow.appendChild(testBtn);
    const testHelp = document.createElement('div'); testHelp.style.fontSize='12px'; testHelp.style.opacity='0.8'; testHelp.style.marginTop='6px'; testHelp.textContent = 'Opens the OIDC login flow in a new tab. Ensure values are saved before testing.';
    oidcSection.appendChild(testRow); oidcSection.appendChild(testHelp);

    form.appendChild(oidcSection);

    // Danger Zone Section
    const dangerZone = document.createElement('div');
    dangerZone.style.marginTop = '32px';
    dangerZone.style.padding = '16px';
    dangerZone.style.border = '2px solid #ef4444';
    dangerZone.style.borderRadius = '8px';
    dangerZone.style.background = 'rgba(239, 68, 68, 0.1)';
    
    const dangerTitle = document.createElement('h3');
    dangerTitle.textContent = '⚠️ Danger Zone';
    dangerTitle.style.color = '#ef4444';
    dangerTitle.style.marginTop = '0';
    dangerZone.appendChild(dangerTitle);
    
    const clearHistoryBtn = document.createElement('button');
    clearHistoryBtn.textContent = '🗑️ Clear All Session History';
    clearHistoryBtn.style.background = '#dc2626';
    clearHistoryBtn.style.color = 'white';
    clearHistoryBtn.style.border = 'none';
    clearHistoryBtn.style.padding = '12px 24px';
    clearHistoryBtn.style.borderRadius = '6px';
    clearHistoryBtn.style.cursor = 'pointer';
    clearHistoryBtn.style.fontWeight = '600';
    clearHistoryBtn.addEventListener('click', async ()=>{
      const firstConfirm = confirm('⚠️ WARNING: This will permanently delete ALL session history and tab data. This action cannot be undone.\n\nAre you sure you want to continue?');
      if(!firstConfirm) return;
      
      const secondConfirm = confirm('⚠️ FINAL WARNING: This will delete all historical data forever.\n\nType YES in your mind and click OK to proceed, or Cancel to abort.');
      if(!secondConfirm) return;
      
      try{
        const response = await fetch('/api/admin/clear-history', { method: 'DELETE' });
        if(response.ok){
          alert('✓ All session history has been cleared successfully.');
          renderSettings();
        } else {
          const error = await response.json();
          alert('Failed to clear history: ' + (error.error || 'Unknown error'));
        }
      }catch(err){
        alert('Failed to clear history: ' + err.message);
      }
    });
    
    const clearHistoryHelp = document.createElement('div');
    clearHistoryHelp.style.fontSize = '12px';
    clearHistoryHelp.style.opacity = '0.7';
    clearHistoryHelp.style.marginTop = '8px';
    clearHistoryHelp.textContent = 'Deletes all completed sessions, tab items, and history. Active sessions will not be affected.';
    
    dangerZone.appendChild(clearHistoryBtn);
    dangerZone.appendChild(clearHistoryHelp);
    // Local admin management (rotate / clear)
    const securityTitle = document.createElement('h4');
    securityTitle.textContent = 'Local Admin (Recovery)';
    securityTitle.style.marginTop = '12px';
    dangerZone.appendChild(securityTitle);

    if(settings.local_admin_password_hash){
      const rotateDiv = document.createElement('div');
      rotateDiv.style.display = 'flex'; rotateDiv.style.flexDirection = 'column'; rotateDiv.style.gap = '8px'; rotateDiv.style.marginTop = '8px';
      rotateDiv.innerHTML = `
        <div style="font-weight:600">Rotate admin password</div>
      `;
      const cur = document.createElement('input'); cur.type='password'; cur.placeholder='Current password'; cur.style.width='100%';
      const nw = document.createElement('input'); nw.type='password'; nw.placeholder='New password'; nw.style.width='100%';
      const nw2 = document.createElement('input'); nw2.type='password'; nw2.placeholder='Confirm new password'; nw2.style.width='100%';
      const rotateBtn = document.createElement('button'); rotateBtn.textContent = 'Rotate Password'; rotateBtn.style.background='#f59e0b'; rotateBtn.style.color='#000';
      rotateBtn.addEventListener('click', async ()=>{
        if(!confirm('Rotate admin password?')) return;
        if(nw.value.length < 6){ alert('New password must be at least 6 characters'); return; }
        if(nw.value !== nw2.value){ alert('Passwords do not match'); return; }
        try{
          const resp = await fetch('/api/auth/local-rotate', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ currentPassword: cur.value, newPassword: nw.value }) });
          const body = await resp.json().catch(()=>null);
          if(!resp.ok) return alert('Failed to rotate: ' + (body?.error || resp.status));
          alert('Password rotated successfully');
          cur.value=''; nw.value=''; nw2.value='';
        }catch(err){ alert('Rotate failed: ' + err.message); }
      });
      rotateDiv.appendChild(cur); rotateDiv.appendChild(nw); rotateDiv.appendChild(nw2); rotateDiv.appendChild(rotateBtn);
      dangerZone.appendChild(rotateDiv);

      const clearAdminDiv = document.createElement('div'); clearAdminDiv.style.marginTop='12px';
      const clearAdminBtn = document.createElement('button'); clearAdminBtn.textContent = '🔓 Clear Local Admin (allow re-bootstrap)'; clearAdminBtn.style.background='#ef4444'; clearAdminBtn.style.color='#fff';
      clearAdminBtn.addEventListener('click', async ()=>{
        const ok = confirm('This will remove the local admin password and allow re-setup. Are you sure?');
        if(!ok) return;
        try{
          const resp = await fetch('/api/auth/local-clear', { method: 'DELETE' });
          const body = await resp.json().catch(()=>null);
          if(!resp.ok) return alert('Failed to clear: ' + (body?.error || resp.status));
          alert('Local admin cleared. App can be reconfigured for local admin.');
          renderSettings();
        }catch(err){ alert('Clear failed: ' + err.message); }
      });
      clearAdminDiv.appendChild(clearAdminBtn);
      dangerZone.appendChild(clearAdminDiv);
    } else {
      const setupDiv = document.createElement('div'); setupDiv.style.marginTop='8px';
      const setupNote = document.createElement('div'); setupNote.textContent = 'No local admin is configured. You can create one here (only available if OIDC is disabled).'; setupDiv.appendChild(setupNote);
      const pw1 = document.createElement('input'); pw1.type='password'; pw1.placeholder='New admin password'; pw1.style.width='100%'; pw1.style.marginTop='6px';
      const pw2 = document.createElement('input'); pw2.type='password'; pw2.placeholder='Confirm password'; pw2.style.width='100%'; pw2.style.marginTop='6px';
      const setupBtn = document.createElement('button'); setupBtn.textContent = 'Create Local Admin'; setupBtn.style.background='#10b981'; setupBtn.style.color='#fff'; setupBtn.addEventListener('click', async ()=>{
        if(pw1.value.length < 6) return alert('Password too short');
        if(pw1.value !== pw2.value) return alert('Passwords do not match');
        try{
          const resp = await fetch('/api/auth/local-setup', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: pw1.value }) });
          const body = await resp.json().catch(()=>null);
          if(!resp.ok) return alert('Failed to create admin: ' + (body?.error || resp.status));
          alert('Local admin created. Please log in.'); renderSettings();
        }catch(err){ alert('Create failed: ' + err.message); }
      });
      setupDiv.appendChild(pw1); setupDiv.appendChild(pw2); setupDiv.appendChild(setupBtn);
      dangerZone.appendChild(setupDiv);
    }
    form.appendChild(dangerZone);

    const backBtn = document.createElement('button'); backBtn.textContent = '← Back to Admin'; backBtn.style.marginTop='12px';
    backBtn.addEventListener('click', ()=> renderAdminDashboard());
    form.appendChild(backBtn);

    app.appendChild(form);
  }

  async function renderReports(){
    app.innerHTML = '';
    const h = document.createElement('h2'); h.textContent = 'Financial Reports'; app.appendChild(h);
    
    const currency = localStorage.getItem('currency') || '$';
    
    const form = document.createElement('form');
    form.style.marginBottom = '24px';
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate Monday of current week
    const getMondayOfWeek = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      return new Date(d.setDate(diff));
    };
    const mondayOfWeek = getMondayOfWeek(today);
    const mondayStr = mondayOfWeek.toISOString().split('T')[0];
    
    form.innerHTML = `
      <label>Period Type:
        <select name="periodType" required style="margin:8px">
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="quarter">Quarter</option>
          <option value="year">Year</option>
        </select>
      </label>
      <label id="dateLabel">Date:
        <input name="date" type="date" value="${todayStr}" required style="margin:8px" />
      </label>
      <label id="weekLabel" style="display:none">Week Starting:
        <input name="weekDate" type="date" value="${mondayStr}" required style="margin:8px" />
      </label>
      <label id="yearLabel" style="display:none">Year:
        <input name="year" type="number" value="${today.getFullYear()}" min="2020" max="2099" required style="width:100px; margin:8px" />
      </label>
      <label id="monthLabel" style="display:none">Month:
        <input name="month" type="number" value="${today.getMonth()+1}" min="1" max="12" required style="width:80px; margin:8px" />
      </label>
      <label id="quarterLabel" style="display:none">Quarter:
        <select name="quarter" style="margin:8px">
          <option value="1">Q1 (Jan-Mar)</option>
          <option value="2">Q2 (Apr-Jun)</option>
          <option value="3">Q3 (Jul-Sep)</option>
          <option value="4">Q4 (Oct-Dec)</option>
        </select>
      </label>
      <button type="submit" style="margin-left:8px">Generate Report</button>
    `;
    
    const periodTypeSelect = form.querySelector('[name="periodType"]');
    const dateLabel = form.querySelector('#dateLabel');
    const weekLabel = form.querySelector('#weekLabel');
    const yearLabel = form.querySelector('#yearLabel');
    const monthLabel = form.querySelector('#monthLabel');
    const quarterLabel = form.querySelector('#quarterLabel');
    
    periodTypeSelect.addEventListener('change', ()=>{
      if(periodTypeSelect.value === 'day'){
        dateLabel.style.display = 'inline';
        weekLabel.style.display = 'none';
        yearLabel.style.display = 'none';
        monthLabel.style.display = 'none';
        quarterLabel.style.display = 'none';
      } else if(periodTypeSelect.value === 'week'){
        dateLabel.style.display = 'none';
        weekLabel.style.display = 'inline';
        yearLabel.style.display = 'none';
        monthLabel.style.display = 'none';
        quarterLabel.style.display = 'none';
      } else if(periodTypeSelect.value === 'month'){
        dateLabel.style.display = 'none';
        yearLabel.style.display = 'inline';
        monthLabel.style.display = 'inline';
        quarterLabel.style.display = 'none';
      } else if(periodTypeSelect.value === 'quarter'){
        dateLabel.style.display = 'none';
        weekLabel.style.display = 'none';
        yearLabel.style.display = 'inline';
        monthLabel.style.display = 'none';
        quarterLabel.style.display = 'inline';
      } else {
        dateLabel.style.display = 'none';
        weekLabel.style.display = 'none';
        yearLabel.style.display = 'inline';
        monthLabel.style.display = 'none';
        quarterLabel.style.display = 'none';
      }
    });
    
    const reportDiv = document.createElement('div');
    reportDiv.id = 'reportResults';
    
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(form).entries());
      reportDiv.innerHTML = '<div style="opacity:0.7">Generating report...</div>';
      
      try {
        const params = new URLSearchParams({
          periodType: fd.periodType,
          ...(fd.periodType === 'day' && { date: fd.date }),
          ...(fd.periodType === 'week' && { weekDate: fd.weekDate }),
          ...(fd.periodType !== 'day' && fd.periodType !== 'week' && { year: fd.year }),
          ...(fd.periodType === 'month' && { month: fd.month }),
          ...(fd.periodType === 'quarter' && { quarter: fd.quarter })
        });
        
        const res = await fetch('/api/reports/financial?' + params);
        const report = await res.json();
        
        if(!res.ok || report.error) {
          reportDiv.innerHTML = `<div style="color:#ff4444; padding:12px">Error generating report: ${report.error || 'Server error'}</div>`;
          return;
        }
        
        reportDiv.innerHTML = '';
        const reportCard = document.createElement('div');
        reportCard.className = 'card';
        reportCard.style.padding = '20px';
        reportCard.style.marginTop = '16px';
        
        const title = document.createElement('h3');
        title.textContent = `Report: ${fd.periodType === 'day' ? new Date(fd.date).toLocaleDateString() : fd.periodType === 'week' ? `Week of ${new Date(fd.weekDate).toLocaleDateString()}` : fd.periodType === 'month' ? `${getMonthName(parseInt(fd.month))} ${fd.year}` : fd.periodType === 'quarter' ? `Q${fd.quarter} ${fd.year}` : fd.year}`;
        reportCard.appendChild(title);
        
        const totalRow = document.createElement('div');
        totalRow.style.fontSize = '24px';
        totalRow.style.fontWeight = '700';
        totalRow.style.marginTop = '16px';
        totalRow.style.marginBottom = '24px';
        totalRow.textContent = `Total Revenue: ${currency}${(report.totalRevenue/100).toFixed(2)}`;
        reportCard.appendChild(totalRow);
        
        const breakdownTitle = document.createElement('h4');
        breakdownTitle.textContent = 'Breakdown:';
        breakdownTitle.style.marginTop = '16px';
        reportCard.appendChild(breakdownTitle);
        
        const tableTypesTitle = document.createElement('div');
        tableTypesTitle.style.fontWeight = '600';
        tableTypesTitle.style.marginTop = '12px';
        tableTypesTitle.textContent = 'Table Hourly Charges by Type:';
        reportCard.appendChild(tableTypesTitle);
        
        for(const [typeName, amount] of Object.entries(report.byTableType)){
          const row = document.createElement('div');
          row.style.padding = '8px 0';
          row.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
          row.innerHTML = `<span style="opacity:0.8">${typeName}:</span> <span style="float:right; font-weight:600">${currency}${(amount/100).toFixed(2)}</span>`;
          reportCard.appendChild(row);
        }
        
        const drinksRow = document.createElement('div');
        drinksRow.style.padding = '8px 0';
        drinksRow.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        drinksRow.style.marginTop = '12px';
        drinksRow.innerHTML = `<span style="opacity:0.8">Bar/Drinks:</span> <span style="float:right; font-weight:600">${currency}${(report.drinksTotal/100).toFixed(2)}</span>`;
        reportCard.appendChild(drinksRow);
        
        const subsRow = document.createElement('div');
        subsRow.style.padding = '8px 0';
        subsRow.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        subsRow.innerHTML = `<span style="opacity:0.8">Subscriptions:</span> <span style="float:right; font-weight:600">${currency}${(report.subscriptionsTotal/100).toFixed(2)}</span>`;
        reportCard.appendChild(subsRow);
        
        // Add Pie Chart
        const chartSection = document.createElement('div');
        chartSection.style.marginTop = '32px';
        
        const chartTitle = document.createElement('h4');
        chartTitle.textContent = 'Revenue Distribution:';
        chartSection.appendChild(chartTitle);
        
        const pieCanvas = document.createElement('canvas');
        pieCanvas.id = 'pieChart';
        pieCanvas.style.maxHeight = '350px';
        chartSection.appendChild(pieCanvas);
        reportCard.appendChild(chartSection);
        
        // Prepare pie chart data
        const pieLabels = [];
        const pieData = [];
        const pieColors = [];
        
        // Add table types
        const colorPalette = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];
        let colorIndex = 0;
        for(const [typeName, amount] of Object.entries(report.byTableType)){
          if(amount > 0){
            pieLabels.push(typeName + ' Tables');
            pieData.push(amount/100);
            pieColors.push(colorPalette[colorIndex % colorPalette.length]);
            colorIndex++;
          }
        }
        
        // Add drinks
        if(report.drinksTotal > 0){
          pieLabels.push('Drinks/Bar');
          pieData.push(report.drinksTotal/100);
          pieColors.push('#06b6d4');
        }
        
        // Add subscriptions
        if(report.subscriptionsTotal > 0){
          pieLabels.push('Subscriptions');
          pieData.push(report.subscriptionsTotal/100);
          pieColors.push('#8b5cf6');
        }
        
        setTimeout(() => {
          new Chart(pieCanvas, {
            type: 'pie',
            data: {
              labels: pieLabels,
              datasets: [{
                data: pieData,
                backgroundColor: pieColors,
                borderWidth: 2,
                borderColor: '#0b1220'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { position: 'right', labels: { color: '#e6eef6', font: { size: 13 } } },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const total = context.dataset.data.reduce((a,b) => a+b, 0);
                      const percentage = ((value/total)*100).toFixed(1);
                      return `${label}: ${currency}${value.toFixed(2)} (${percentage}%)`;
                    }
                  }
                }
              }
            }
          });
        }, 100);
        
        // Add time-series chart for weekly, monthly and quarterly reports
        if((fd.periodType === 'week' || fd.periodType === 'month' || fd.periodType === 'quarter') && report.timeSeries){
          const timeChartSection = document.createElement('div');
          timeChartSection.style.marginTop = '32px';
          
          const timeChartTitle = document.createElement('h4');
          timeChartTitle.textContent = fd.periodType === 'week' ? 'Daily Revenue:' : fd.periodType === 'month' ? 'Daily Revenue:' : 'Weekly Revenue:';
          timeChartSection.appendChild(timeChartTitle);
          
          const lineCanvas = document.createElement('canvas');
          lineCanvas.id = 'lineChart';
          lineCanvas.style.maxHeight = '400px';
          timeChartSection.appendChild(lineCanvas);
          reportCard.appendChild(timeChartSection);
          
          // For monthly reports, show day of week in labels
          let timeLabels = report.timeSeries.map(t => t.label);
          if(fd.periodType === 'month' && report.timeSeries[0] && report.timeSeries[0].dayOfWeek){
            timeLabels = report.timeSeries.map(t => `${t.label}\n${t.dayOfWeek}`);
          }
          const datasets = [];
          
          // Total revenue dataset
          datasets.push({
            label: 'Total Revenue',
            data: report.timeSeries.map(t => t.total/100),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            fill: true,
            tension: 0.4,
            borderWidth: 3
          });
          
          // Table charges dataset
          if(report.timeSeries.some(t => t.tables > 0)){
            datasets.push({
              label: 'Table Charges',
              data: report.timeSeries.map(t => t.tables/100),
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              fill: true,
              tension: 0.4,
              borderWidth: 2
            });
          }
          
          // Drinks dataset
          if(report.timeSeries.some(t => t.drinks > 0)){
            datasets.push({
              label: 'Drinks',
              data: report.timeSeries.map(t => t.drinks/100),
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.2)',
              fill: true,
              tension: 0.4,
              borderWidth: 2
            });
          }
          
          // Subscriptions dataset
          if(report.timeSeries.some(t => t.subscriptions > 0)){
            datasets.push({
              label: 'Subscriptions',
              data: report.timeSeries.map(t => t.subscriptions/100),
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              fill: true,
              tension: 0.4,
              borderWidth: 2
            });
          }
          
          setTimeout(() => {
            new Chart(lineCanvas, {
              type: 'line',
              data: { labels: timeLabels, datasets },
              options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { position: 'top', labels: { color: '#e6eef6', font: { size: 13 } } },
                  tooltip: {
                    callbacks: {
                      label: (context) => `${context.dataset.label}: ${currency}${context.parsed.y.toFixed(2)}`
                    }
                  }
                },
                scales: {
                  x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                  y: { ticks: { color: '#9ca3af', callback: (value) => currency + value.toFixed(0) }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
              }
            });
          }, 100);
        }
        
        // Add day of week analysis for monthly reports
        if(fd.periodType === 'month' && report.dayOfWeekAnalysis){
          const dowSection = document.createElement('div');
          dowSection.style.marginTop = '32px';
          
          const dowTitle = document.createElement('h4');
          dowTitle.textContent = 'Revenue by Day of Week:';
          dowSection.appendChild(dowTitle);
          
          const dowList = document.createElement('div');
          dowList.style.display = 'grid';
          dowList.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
          dowList.style.gap = '12px';
          dowList.style.marginTop = '12px';
          
          for(const dow of report.dayOfWeekAnalysis){
            const dowCard = document.createElement('div');
            dowCard.style.padding = '12px';
            dowCard.style.borderRadius = '8px';
            dowCard.style.background = 'rgba(255,255,255,0.03)';
            dowCard.style.border = '1px solid rgba(255,255,255,0.06)';
            
            const dowName = document.createElement('div');
            dowName.style.fontWeight = '600';
            dowName.style.marginBottom = '4px';
            dowName.textContent = dow.day;
            dowCard.appendChild(dowName);
            
            const dowRevenue = document.createElement('div');
            dowRevenue.style.fontSize = '20px';
            dowRevenue.style.fontWeight = '700';
            dowRevenue.style.color = '#10b981';
            dowRevenue.textContent = `${currency}${(dow.total/100).toFixed(2)}`;
            dowCard.appendChild(dowRevenue);
            
            const dowCount = document.createElement('div');
            dowCount.style.fontSize = '12px';
            dowCount.style.opacity = '0.7';
            dowCount.style.marginTop = '4px';
            dowCount.textContent = `${dow.count} day${dow.count !== 1 ? 's' : ''}`;
            dowCard.appendChild(dowCount);
            
            dowList.appendChild(dowCard);
          }
          
          dowSection.appendChild(dowList);
          reportCard.appendChild(dowSection);
        }
        
        // Add export buttons
        const exportSection = document.createElement('div');
        exportSection.style.marginTop = '24px';
        exportSection.style.display = 'flex';
        exportSection.style.gap = '8px';
        
        const exportPdfBtn = document.createElement('button');
        exportPdfBtn.textContent = '📄 Export to PDF';
        exportPdfBtn.style.padding = '10px 16px';
        exportPdfBtn.style.background = '#ef4444';
        exportPdfBtn.style.color = '#fff';
        exportPdfBtn.style.fontWeight = '600';
        exportPdfBtn.style.border = 'none';
        exportPdfBtn.style.borderRadius = '8px';
        exportPdfBtn.style.cursor = 'pointer';
        exportPdfBtn.addEventListener('click', async ()=>{
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const margin = 15;
          const contentWidth = pageWidth - (2 * margin);
          
          // Title
          pdf.setFontSize(20);
          pdf.text(`Financial Report`, margin, 20);
          pdf.setFontSize(12);
          pdf.text(`${fd.periodType === 'day' ? new Date(fd.date).toLocaleDateString() : fd.periodType === 'week' ? `Week of ${new Date(fd.weekDate).toLocaleDateString()}` : fd.periodType === 'month' ? `${getMonthName(parseInt(fd.month))} ${fd.year}` : fd.periodType === 'quarter' ? `Q${fd.quarter} ${fd.year}` : fd.year}`, margin, 28);
          
          // Summary
          pdf.setFontSize(14);
          pdf.text('Summary:', margin, 40);
          pdf.setFontSize(11);
          pdf.text(`Total Revenue: ${currency}${(report.totalRevenue/100).toFixed(2)}`, margin + 5, 48);
          
          let yPos = 56;
          pdf.text('Breakdown:', margin + 5, yPos);
          yPos += 8;
          
          for(const [typeName, amount] of Object.entries(report.byTableType)){
            pdf.text(`  ${typeName} Tables: ${currency}${(amount/100).toFixed(2)}`, margin + 10, yPos);
            yPos += 6;
          }
          pdf.text(`  Drinks/Bar: ${currency}${(report.drinksTotal/100).toFixed(2)}`, margin + 10, yPos);
          yPos += 6;
          pdf.text(`  Subscriptions: ${currency}${(report.subscriptionsTotal/100).toFixed(2)}`, margin + 10, yPos);
          
          // Add charts as images with proper scaling
          const pieChart = document.getElementById('pieChart');
          if(pieChart){
            pdf.addPage();
            pdf.setFontSize(16);
            pdf.text('Revenue Distribution', margin, 20);
            
            // Get chart dimensions and calculate aspect ratio
            const chartWidth = pieChart.width;
            const chartHeight = pieChart.height;
            const aspectRatio = chartHeight / chartWidth;
            
            // Calculate dimensions to fit in page
            const maxChartHeight = pageHeight - 50;
            let pdfChartWidth = contentWidth;
            let pdfChartHeight = pdfChartWidth * aspectRatio;
            
            // Scale down if too tall
            if(pdfChartHeight > maxChartHeight){
              pdfChartHeight = maxChartHeight;
              pdfChartWidth = pdfChartHeight / aspectRatio;
            }
            
            const pieImg = pieChart.toDataURL('image/png', 1.0);
            const xPos = margin + (contentWidth - pdfChartWidth) / 2;
            pdf.addImage(pieImg, 'PNG', xPos, 30, pdfChartWidth, pdfChartHeight);
          }
          
          const lineChart = document.getElementById('lineChart');
          if(lineChart){
            pdf.addPage();
            pdf.setFontSize(16);
            pdf.text(fd.periodType === 'week' ? 'Daily Revenue' : fd.periodType === 'month' ? 'Daily Revenue' : 'Weekly Revenue', margin, 20);
            
            // Get chart dimensions and calculate aspect ratio
            const chartWidth = lineChart.width;
            const chartHeight = lineChart.height;
            const aspectRatio = chartHeight / chartWidth;
            
            // Calculate dimensions to fit in page
            const maxChartHeight = pageHeight - 50;
            let pdfChartWidth = contentWidth;
            let pdfChartHeight = pdfChartWidth * aspectRatio;
            
            // Scale down if too tall
            if(pdfChartHeight > maxChartHeight){
              pdfChartHeight = maxChartHeight;
              pdfChartWidth = pdfChartHeight / aspectRatio;
            }
            
            const lineImg = lineChart.toDataURL('image/png', 1.0);
            const xPos = margin + (contentWidth - pdfChartWidth) / 2;
            pdf.addImage(lineImg, 'PNG', xPos, 30, pdfChartWidth, pdfChartHeight);
          }
          
          pdf.save(`report-${fd.periodType}-${fd.periodType === 'day' ? fd.date : fd.periodType === 'week' ? fd.weekDate : fd.periodType === 'month' ? `${fd.year}-${fd.month}` : fd.periodType === 'quarter' ? `${fd.year}-Q${fd.quarter}` : fd.year}.pdf`);
        });
        
        const exportExcelBtn = document.createElement('button');
        exportExcelBtn.textContent = '📈 Export to Excel';
        exportExcelBtn.style.padding = '10px 16px';
        exportExcelBtn.style.background = '#10b981';
        exportExcelBtn.style.color = '#fff';
        exportExcelBtn.style.fontWeight = '600';
        exportExcelBtn.style.border = 'none';
        exportExcelBtn.style.borderRadius = '8px';
        exportExcelBtn.style.cursor = 'pointer';
        exportExcelBtn.addEventListener('click', ()=>{
          const wb = XLSX.utils.book_new();
          
          // Summary sheet
          const summaryData = [
            ['Financial Report'],
            [`Period: ${fd.periodType === 'day' ? new Date(fd.date).toLocaleDateString() : fd.periodType === 'month' ? `${getMonthName(parseInt(fd.month))} ${fd.year}` : fd.periodType === 'quarter' ? `Q${fd.quarter} ${fd.year}` : fd.year}`],
            [],
            ['Summary'],
            ['Total Revenue', (report.totalRevenue/100).toFixed(2)],
            [],
            ['Breakdown'],
            ...Object.entries(report.byTableType).map(([name, amt]) => [`${name} Tables`, (amt/100).toFixed(2)]),
            ['Drinks/Bar', (report.drinksTotal/100).toFixed(2)],
            ['Subscriptions', (report.subscriptionsTotal/100).toFixed(2)]
          ];
          const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
          XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
          
          // Time series sheet
          if(report.timeSeries){
            const tsData = [
              ['Period', 'Table Charges', 'Drinks', 'Subscriptions', 'Total'],
              ...report.timeSeries.map(t => [
                t.dayOfWeek ? `${t.label} (${t.dayOfWeek})` : t.label,
                (t.tables/100).toFixed(2),
                (t.drinks/100).toFixed(2),
                (t.subscriptions/100).toFixed(2),
                (t.total/100).toFixed(2)
              ])
            ];
            const ws2 = XLSX.utils.aoa_to_sheet(tsData);
            XLSX.utils.book_append_sheet(wb, ws2, 'Time Series');
          }
          
          // Day of week analysis
          if(report.dayOfWeekAnalysis){
            const dowData = [
              ['Day of Week', 'Total Revenue', 'Number of Days'],
              ...report.dayOfWeekAnalysis.map(d => [d.day, (d.total/100).toFixed(2), d.count])
            ];
            const ws3 = XLSX.utils.aoa_to_sheet(dowData);
            XLSX.utils.book_append_sheet(wb, ws3, 'Day of Week');
          }
          
          XLSX.writeFile(wb, `report-${fd.periodType}-${fd.periodType === 'day' ? fd.date : fd.periodType === 'month' ? `${fd.year}-${fd.month}` : fd.periodType === 'quarter' ? `${fd.year}-Q${fd.quarter}` : fd.year}.xlsx`);
        });
        
        exportSection.appendChild(exportPdfBtn);
        exportSection.appendChild(exportExcelBtn);
        reportCard.appendChild(exportSection);
        
        // Show detailed charges for daily reports
        if(fd.periodType === 'day' && report.details){
          const detailsTitle = document.createElement('h4');
          detailsTitle.textContent = 'Detailed Charges:';
          detailsTitle.style.marginTop = '24px';
          reportCard.appendChild(detailsTitle);
          
          for(const sess of report.details){
            const sessCard = document.createElement('div');
            sessCard.style.padding = '12px';
            sessCard.style.marginTop = '12px';
            sessCard.style.background = 'rgba(255,255,255,0.03)';
            sessCard.style.borderRadius = '8px';
            
            const sessHeader = document.createElement('div');
            sessHeader.style.fontWeight = '600';
            sessHeader.style.marginBottom = '8px';
            sessHeader.textContent = `Session: ${sess.tableType} #${sess.tableNumber}`;
            sessCard.appendChild(sessHeader);
            
            // Table charge
            if(sess.tableCharge > 0){
              const tableRow = document.createElement('div');
              tableRow.style.padding = '4px 0';
              tableRow.style.display = 'flex';
              tableRow.style.justifyContent = 'space-between';
              tableRow.innerHTML = `<span style="opacity:0.8">Table time (${sess.hoursCharged}h):</span> <span>${currency}${(sess.tableCharge/100).toFixed(2)}</span>`;
              sessCard.appendChild(tableRow);
            }
            
            // Items
            for(const item of sess.items){
              const itemRow = document.createElement('div');
              itemRow.style.padding = '4px 0';
              itemRow.style.display = 'flex';
              itemRow.style.justifyContent = 'space-between';
              itemRow.style.alignItems = 'center';
              itemRow.style.gap = '8px';
              
              const itemInfo = document.createElement('span');
              itemInfo.style.opacity = '0.8';
              itemInfo.textContent = `${item.quantity}x ${item.description}:`;
              
              const rightSide = document.createElement('div');
              rightSide.style.display = 'flex';
              rightSide.style.gap = '8px';
              rightSide.style.alignItems = 'center';
              
              const itemPrice = document.createElement('span');
              itemPrice.textContent = `${currency}${(item.totalCents/100).toFixed(2)}`;
              
              const editBtn = document.createElement('button');
              editBtn.textContent = '✏️';
              editBtn.className = 'icon-btn';
              editBtn.title = 'Edit amount';
              editBtn.addEventListener('click', async ()=>{
                const newAmount = prompt('New amount (' + currency + '):', (item.totalCents/100).toFixed(2));
                if(!newAmount) return;
                const newCents = Math.round(parseFloat(newAmount) * 100);
                await fetch('/api/tab-items/' + item.id, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ totalCents: newCents }) });
                form.dispatchEvent(new Event('submit'));
              });
              
              const delBtn = document.createElement('button');
              delBtn.innerHTML = '<span style="font-size:20px;font-weight:bold">×</span>';
              delBtn.className = 'icon-btn';
              delBtn.title = 'Delete';
              delBtn.addEventListener('click', async ()=>{
                if(!confirm('Delete this charge?')) return;
                await fetch('/api/tab-items/' + item.id, { method:'DELETE' });
                form.dispatchEvent(new Event('submit'));
              });
              
              rightSide.appendChild(itemPrice);
              rightSide.appendChild(editBtn);
              rightSide.appendChild(delBtn);
              
              itemRow.appendChild(itemInfo);
              itemRow.appendChild(rightSide);
              sessCard.appendChild(itemRow);
            }
            
            reportCard.appendChild(sessCard);
          }
        }
        
        reportDiv.appendChild(reportCard);
      } catch(err){
        console.error(err);
        reportDiv.innerHTML = '<div style="color:#ef4444">Failed to generate report</div>';
      }
    });
    
    app.appendChild(form);
    app.appendChild(reportDiv);
    
    // Automatically generate current day report on page load
    setTimeout(() => {
      form.dispatchEvent(new Event('submit'));
    }, 100);
    
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Admin';
    backBtn.style.marginTop = '24px';
    backBtn.addEventListener('click', ()=> renderAdminDashboard());
    app.appendChild(backBtn);
    
    function getMonthName(month){
      const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return names[month-1] || '';
    }
  }

  async function renderSubscriptions(){
    app.innerHTML = '';
    const h = document.createElement('h2'); h.textContent = 'Subscriptions'; app.appendChild(h);
    
    const currency = localStorage.getItem('currency') || '$';
    
    const form = document.createElement('form');
    form.innerHTML = `
      <input name="patron_name" placeholder="Patron Name" required />
      <label>Monthly fee: <input name="monthly_fee" placeholder="0.00" type="number" step="0.01" min="0" required style="width:100px" /> ${currency}</label>
      <button type="submit">Add Subscription</button>
    `;
    form.addEventListener('submit', async (e)=>{ e.preventDefault(); const fd = Object.fromEntries(new FormData(form).entries()); const feeCents = Math.round(parseFloat(fd.monthly_fee || 0) * 100); const email = fd.patron_name.toLowerCase().replace(/\s+/g, '.') + '@patron.local'; await fetch('/api/subscriptions', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ patron_name: fd.patron_name, patron_email: email, plan_name: 'Standard', monthly_fee_cents: feeCents }) }); renderSubscriptions(); });
    app.appendChild(form);

    const res = await fetch('/api/subscriptions');
    const list = await res.json();
    const ul = document.createElement('ul'); ul.style.listStyle='none'; ul.style.padding='0';
    const now = new Date();
    for(const s of list){
      const li = document.createElement('li'); li.style.padding='12px'; li.style.marginBottom='8px'; li.style.borderRadius='8px'; li.style.background='rgba(255,255,255,0.03)';
      const activeFrom = new Date(s.active_from);
      const daysSince = Math.floor((now - activeFrom) / (1000*60*60*24));
      const isDue = daysSince >= 30;
      
      if(isDue) { li.style.border='2px solid rgba(220, 38, 38, 0.6)'; li.style.background='rgba(220, 38, 38, 0.1)'; }
      
      const info = document.createElement('div'); info.style.marginBottom='8px';
      info.innerHTML = `<strong style="${isDue?'color:#dc2626':''}">${s.patronName || 'Unknown'}</strong> (${s.patronEmail || 'no email'})<br/>${localStorage.getItem('currency')||'$'}${(s.monthly_fee_cents/100).toFixed(2)}/month<br/><small style="opacity:0.7">Started: ${activeFrom.toLocaleDateString()} (${daysSince} days ago)${isDue?' - <strong style="color:#dc2626">DUE FOR RENEWAL</strong>':''}</small>`;
      li.appendChild(info);
      
      const btnRow = document.createElement('div'); btnRow.style.display='flex'; btnRow.style.gap='8px';
      
      if(isDue){
        const renewBtn = document.createElement('button'); renewBtn.innerHTML = '<span style="font-size:18px">↻</span> Renew'; renewBtn.style.background='#10b981'; renewBtn.style.color='#fff'; renewBtn.style.fontWeight='600';
        renewBtn.addEventListener('click', async ()=>{ if(!confirm('Renew subscription?')) return; await fetch('/api/subscriptions/' + s.id + '/renew', { method: 'POST' }); renderSubscriptions(); });
        btnRow.appendChild(renewBtn);
      }
      
      const del = document.createElement('button'); del.textContent = 'Delete';
      del.addEventListener('click', async ()=>{ if(!confirm('Delete subscription?')) return; await fetch('/api/subscriptions/' + s.id, { method: 'DELETE' }); renderSubscriptions(); });
      btnRow.appendChild(del);
      
      li.appendChild(btnRow);
      ul.appendChild(li);
    }
    app.appendChild(ul);
  }

  // init
  loadLocale(savedLang);

  const savedTheme = localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);
  themeBtn.textContent = savedTheme === 'dark' ? '☼' : '☾';

  // load settings (currency and app name) into localStorage
  (async ()=>{
    try{
      const settingsRes = await fetch('/api/settings');
      const settings = settingsRes.ok ? await settingsRes.json() : {};
      const currency = settings.currency || localStorage.getItem('currency') || '$';
      localStorage.setItem('currency', currency);
      title.textContent = settings.app_name || 'Pool Hall';
    }catch(e){ console.warn('settings load failed', e); if(!localStorage.getItem('currency')) localStorage.setItem('currency','$'); }
  })();

  themeBtn.addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
    themeBtn.textContent = next === 'dark' ? '☼' : '☾';
  });

  // Global click sound for all interactive elements
  document.addEventListener('click', (e)=>{
    const target = e.target;
    // Play click sound for buttons, clickable divs, and elements with click handlers
    if(target.tagName === 'BUTTON' || 
       target.classList.contains('table-tile') || 
       target.classList.contains('admin-tile') ||
       target.classList.contains('tile-action') ||
       target.classList.contains('icon-btn') ||
       target.classList.contains('table-select-item') ||
       target.classList.contains('checkout-option') ||
       target.tagName === 'SELECT' ||
       target.onclick ||
       target.getAttribute('role') === 'button'){
      playClickSound();
    }
  }, true);

  // default view
  console.log('About to call renderDashboard');
  try {
    renderDashboard();
    console.log('renderDashboard called successfully');
  } catch(err) {
    console.error('Error calling renderDashboard:', err);
  }
})()

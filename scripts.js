// scripts.js
// Simple client-side logic using localStorage for records purposes.
// Keys used: 'hs_users', 'hs_appointments', 'hs_doctors', 'hs_currentUser', 'hs_adminAuth'

// Helpers
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function load(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

// Initialize default data (run once)
(function initDefaults(){
  if(!localStorage.getItem('hs_doctors')){
    const defaultDoctors = [
      { id: Date.now()+1, name: "Dr. Aisha Mensah", specialty: "Cardiology" },
      { id: Date.now()+2, name: "Dr. Kwame Boateng", specialty: "Pediatrics" },
      { id: Date.now()+3, name: "Dr. Emelia Osei", specialty: "Neurology" }
    ];
    save('hs_doctors', defaultDoctors);
  }
  if(!localStorage.getItem('hs_adminCreds')){
    // default admin (demo)
    save('hs_adminCreds', { email: 'admin@hospital.com', password: 'admin123' });
  }
  if(!localStorage.getItem('hs_users')) save('hs_users', []);
  if(!localStorage.getItem('hs_appointments')) save('hs_appointments', []);
})();

// -------- Registration (register.html) ----------
function registerInit(){
  const form = $('#registerForm');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const email = $('#regEmail').value.trim();
    const password = $('#regPassword').value;
    if(!email || !password) return alert('Please fill all fields');
    const users = load('hs_users');
    if(users.find(u=>u.email===email)) return alert('Email already registered');
    users.push({ id: Date.now(), email, password, createdAt: new Date().toISOString() });
    save('hs_users', users);
    alert('Registration successful! You can log in now.');
    window.location.href = 'login.html';
  });
}

// -------- Login (login.html) ----------
function loginInit(){
  const form = $('#loginForm');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    const users = load('hs_users');
    const user = users.find(u=>u.email===email && u.password===password);
    if(user){
      save('hs_currentUser', user);
      alert('Login successful!');
      window.location.href = 'portal.html';
    } else {
      alert('Invalid credentials');
    }
  });
}

// -------- Appointment Booking (appointments.html) ----------
function appointmentsInit(){
  // populate doctors dropdown
  const drSelect = $('#apptDoctor');
  if(drSelect){
    const doctors = load('hs_doctors');
    drSelect.innerHTML = doctors.map(d=>`<option value="${d.id}">${d.name} — ${d.specialty}</option>`).join('');
  }
  const form = $('#apptForm');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const name = $('#apptName').value.trim();
    const email = $('#apptEmail').value.trim();
    const doctorId = $('#apptDoctor').value;
    const date = $('#apptDate').value;
    const note = $('#apptNote').value.trim();
    if(!name || !email || !date) return alert('Fill required fields');
    const appointments = load('hs_appointments');
    appointments.push({ id: Date.now(), name, email, doctorId, date, note, status: 'Scheduled' });
    save('hs_appointments', appointments);
    alert('Appointment booked!');
    form.reset();
  });
}

// -------- Patient Portal (portal.html) ----------
function portalInit(){
  const user = load('hs_currentUser', null);
  if(!user){
    alert('Please login first');
    window.location.href = 'login.html'; return;
  }
  $('#portalEmail').textContent = user.email;
  // show user appointments
  const list = $('#portalAppointments');
  const appts = load('hs_appointments').filter(a => a.email === user.email);
  if(appts.length===0) list.innerHTML = '<div class="muted">No appointments found</div>';
  else {
    const doctors = load('hs_doctors');
    list.innerHTML = appts.map(a=>{
      const dr = doctors.find(d=>d.id==a.doctorId);
      return `<li class="list-item list">${a.date} — <strong>${a.name}</strong> with <span class="muted">${dr?dr.name:'Any Doctor'}</span>
        <div><span class="badge green">${a.status}</span></div></li>`;
    }).join('');
  }
  // logout
  $('#logoutBtn')?.addEventListener('click', ()=>{
    localStorage.removeItem('hs_currentUser');
    window.location.href = 'login.html';
  });
}

// -------- Admin (admin.html + doctors.html) ----------
function adminInit(){
  const form = $('#adminLoginForm');
  if(form){
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const email = $('#adminEmail').value.trim();
      const password = $('#adminPassword').value;
      const admin = load('hs_adminCreds');
      if(email===admin.email && password===admin.password){
        save('hs_adminAuth', true);
        window.location.href = 'admin.html';
      } else alert('Invalid admin login');
    });
    return;
  }

  // If on admin.html and logged in
  const auth = load('hs_adminAuth', false);
  if(!auth){
    // redirect to admin login
    const isAdminPage = window.location.pathname.endsWith('admin.html') || window.location.pathname.endsWith('/admin.html');
    if(isAdminPage) window.location.href = 'admin.html';
  }

  // show appointments in admin panel
  const list = $('#adminAppts');
  if(list){
    refreshAdminAppointments();
    $('#adminLogout')?.addEventListener('click', ()=>{
      localStorage.removeItem('hs_adminAuth');
      window.location.href = 'admin-login.html';
    });
  }

  // doctor management UI
  const docList = $('#doctorList');
  if(docList) refreshDoctorList();

  const addDocForm = $('#addDoctorForm');
  if(addDocForm){
    addDocForm.addEventListener('submit', e=>{
      e.preventDefault();
      const name = $('#docName').value.trim();
      const specialty = $('#docSpecialty').value.trim();
      if(!name || !specialty) return alert('Fill fields');
      const doctors = load('hs_doctors');
      doctors.push({ id: Date.now(), name, specialty });
      save('hs_doctors', doctors);
      addDocForm.reset();
      refreshDoctorList();
      alert('Doctor added');
    });
  }
}

function refreshAdminAppointments(){
  const list = $('#adminAppts');
  const appts = load('hs_appointments');
  const doctors = load('hs_doctors');
  if(!list) return;
  if(appts.length===0) list.innerHTML = '<div class="muted">No appointments yet</div>';
  else {
    list.innerHTML = appts.map(a=>{
      const dr = doctors.find(d=>d.id==a.doctorId);
      return `<li class="list">
        <div>
          <div><strong>${a.name}</strong> — ${a.email}</div>
          <div class="muted">${dr?dr.name+' • '+dr.specialty:'Any Doctor'}</div>
        </div>
        <div style="text-align:right">
          <div class="muted">${a.date}</div>
          <div style="margin-top:8px">
            <button class="icon-btn" onclick="adminDelete(${a.id})" title="Delete">❌</button>
          </div>
        </div>
      </li>`;
    }).join('');
  }
}

function adminDelete(id){
  if(!confirm('Delete appointment?')) return;
  let appts = load('hs_appointments');
  appts = appts.filter(a=>a.id!==id);
  save('hs_appointments', appts);
  refreshAdminAppointments();
}

function refreshDoctorList(){
  const docList = $('#doctorList');
  const doctors = load('hs_doctors');
  if(!docList) return;
  if(doctors.length===0) docList.innerHTML = '<div class="muted">No doctors yet</div>';
  else docList.innerHTML = doctors.map(d=>`
    <li class="list">
      <div>
        <div><strong>${d.name}</strong></div>
        <div class="muted">${d.specialty}</div>
      </div>
      <div>
        <button class="icon-btn" onclick="removeDoctor(${d.id})">🗑️</button>
      </div>
    </li>
  `).join('');
}

function removeDoctor(id){
  if(!confirm('Remove doctor?')) return;
  let doctors = load('hs_doctors');
  doctors = doctors.filter(d=>d.id!==id);
  save('hs_doctors', doctors);
  refreshDoctorList();
  refreshAdminAppointments();
  alert('Doctor removed');
}

// Auto-run page-specific initializers
document.addEventListener('DOMContentLoaded', ()=>{
  registerInit();
  loginInit();
  appointmentsInit();
  portalInit();
  adminInit();
});

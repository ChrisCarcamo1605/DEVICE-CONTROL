require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const knex = require('knex')(require('../knexfile').development);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randPrice = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

async function createUser(email, password, fullName, role, branchId) {
  const existing = await knex('profiles').where({ email }).first();
  if (existing) { console.log(`  skip ${email} (ya existe)`); return existing.id; }

  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) { console.error(`  error ${email}:`, error.message); return null; }
  await knex('profiles').insert({ id: data.user.id, full_name: fullName, email, role, branch_id: branchId });
  console.log(`  ✓ ${email}`);
  return data.user.id;
}

async function main() {
  // ── 1. UBICACIONES ────────────────────────────────────────────────────────
  console.log('\n[1] Ubicaciones...');
  const existingLocs = await knex('locations').select('name');
  const existingLocNames = existingLocs.map(l => l.name);

  const newLocs = [
    { name: 'Choloma',    department: 'Cortés',      country: 'Honduras' },
    { name: 'Comayagua',  department: 'Comayagua',   country: 'Honduras' },
  ].filter(l => !existingLocNames.includes(l.name));

  if (newLocs.length) await knex('locations').insert(newLocs);

  const locations = await knex('locations').select('id', 'name');
  const loc = Object.fromEntries(locations.map(l => [l.name, l.id]));
  console.log(`  ubicaciones: ${locations.map(l => l.name).join(', ')}`);

  // ── 2. SUCURSALES ─────────────────────────────────────────────────────────
  console.log('\n[2] Sucursales...');
  const existingBranches = await knex('branches').select('name');
  const existingBranchNames = existingBranches.map(b => b.name);

  const newBranches = [
    { name: 'Sucursal Choloma',   address: 'Col. Miramonte, Soyapango',        location_id: loc['Choloma'],   phone: '+504 2233-0003' },
    { name: 'Sucursal Comayagua', address: 'Av. Independencia, San Miguel',    location_id: loc['Comayagua'], phone: '+504 2233-0004' },
  ].filter(b => !existingBranchNames.includes(b.name));

  if (newBranches.length) await knex('branches').insert(newBranches);

  const branches = await knex('branches').select('id', 'name').orderBy('name');
  console.log(`  sucursales: ${branches.map(b => b.name).join(', ')}`);

  // ── 3. GERENTES ───────────────────────────────────────────────────────────
  console.log('\n[3] Gerentes...');
  const branchMap = Object.fromEntries(branches.map(b => [b.name, b.id]));

  const gerentes = [
    { email: 'gerente.norte@devicecontrol.com',     name: 'Gerente Norte',     branch: 'Sucursal Norte' },
    { email: 'gerente.choloma@devicecontrol.com',   name: 'Gerente Choloma',   branch: 'Sucursal Choloma' },
    { email: 'gerente.comayagua@devicecontrol.com', name: 'Gerente Comayagua', branch: 'Sucursal Comayagua' },
  ];

  const gerenteIds = {};
  // Existing gerente central
  const gerenteCentral = await knex('profiles').where({ email: 'gerente@devicecontrol.com' }).first();
  if (gerenteCentral) gerenteIds['Sucursal Central'] = gerenteCentral.id;

  for (const g of gerentes) {
    const id = await createUser(g.email, 'Gerente2026!', g.name, 'branch_manager', branchMap[g.branch]);
    if (id) gerenteIds[g.branch] = id;
  }

  // IT Manager
  const itManager = await knex('profiles').where({ role: 'it_manager' }).first();
  const itManagerId = itManager.id;

  // ── 4. CATEGORÍAS ─────────────────────────────────────────────────────────
  const categories = await knex('device_categories').select('id', 'name');
  const cat = Object.fromEntries(categories.map(c => [c.name, c.id]));

  // ── 5. DISPOSITIVOS ───────────────────────────────────────────────────────
  console.log('\n[4] Dispositivos (50)...');
  const branchIds = branches.map(b => b.id);

  // Parent devices: Desktop PCs, Servers, Laptops
  const parents = [];

  // 5 Desktop PCs
  for (let i = 1; i <= 5; i++) {
    const branchId = pick(branchIds);
    const [d] = await knex('devices').insert({
      name: `Desktop PC ${String(i).padStart(2,'0')}`,
      serial_number: `DT-${rand(10000,99999)}`,
      category_id: cat['Computadora de escritorio'],
      branch_id: branchId, assigned_by: itManagerId,
      value: randPrice(400, 900), purchase_date: daysAgo(rand(30,730)),
      invoice_number: `FAC-${rand(1000,9999)}`, status: 'active',
    }).returning('*');
    parents.push(d);
    console.log(`  PC ${i}: ${branches.find(b=>b.id===d.branch_id).name}`);
  }

  // 3 Servers
  for (let i = 1; i <= 3; i++) {
    const branchId = branchIds[0]; // servers en sucursal central
    const [d] = await knex('devices').insert({
      name: `Servidor ${String(i).padStart(2,'0')}`,
      serial_number: `SRV-${rand(10000,99999)}`,
      category_id: cat['Computadora de escritorio'],
      branch_id: branchId, assigned_by: itManagerId,
      value: randPrice(1500, 4000), purchase_date: daysAgo(rand(30,730)),
      invoice_number: `FAC-${rand(1000,9999)}`, status: 'active',
    }).returning('*');
    parents.push(d);
    console.log(`  Servidor ${i}: ${branches.find(b=>b.id===d.branch_id).name}`);
  }

  // 4 Laptops (parents)
  for (let i = 1; i <= 4; i++) {
    const branchId = pick(branchIds);
    const [d] = await knex('devices').insert({
      name: `Laptop ${String(i).padStart(2,'0')}`,
      serial_number: `LT-${rand(10000,99999)}`,
      category_id: cat['Laptop'],
      branch_id: branchId, assigned_by: itManagerId,
      value: randPrice(500, 1200), purchase_date: daysAgo(rand(30,730)),
      invoice_number: `FAC-${rand(1000,9999)}`, status: pick(['active','active','in_repair']),
    }).returning('*');
    parents.push(d);
    console.log(`  Laptop ${i}: ${branches.find(b=>b.id===d.branch_id).name}`);
  }

  // ── Componentes hijos (2-3 por cada PC/Server) ──
  let childCount = 0;
  const componentTypes = [
    { name: 'RAM 8GB DDR4',     value: [35,80] },
    { name: 'RAM 16GB DDR4',    value: [70,150] },
    { name: 'HDD 1TB',          value: [40,80] },
    { name: 'SSD 512GB',        value: [55,120] },
    { name: 'Tarjeta de red',   value: [20,60] },
    { name: 'Fuente de poder',  value: [30,90] },
    { name: 'Batería',          value: [25,70] },
  ];

  for (const parent of parents) {
    const numChildren = parent.name.startsWith('Servidor') ? 3 : 2;
    for (let j = 0; j < numChildren; j++) {
      const comp = pick(componentTypes);
      await knex('devices').insert({
        name: `${comp.name} — ${parent.name}`,
        serial_number: `CMP-${rand(10000,99999)}`,
        category_id: cat['Componente'],
        branch_id: parent.branch_id,
        parent_device_id: parent.id,
        assigned_by: itManagerId,
        value: randPrice(comp.value[0], comp.value[1]),
        purchase_date: parent.purchase_date,
        status: 'active',
      });
      childCount++;
    }
  }
  console.log(`  ${parents.length} padres + ${childCount} componentes hijos`);

  // ── Dispositivos standalone ──
  const standalones = [];
  const standaloneSpecs = [
    { prefix: 'Monitor',      cat: 'Monitor',       count: 6, price: [120,400] },
    { prefix: 'Impresora',    cat: 'Impresora',     count: 4, price: [80,300] },
    { prefix: 'Teléfono IP',  cat: 'Teléfono IP',  count: 5, price: [40,120] },
    { prefix: 'Switch',       cat: 'Switch',        count: 4, price: [60,250] },
    { prefix: 'UPS',          cat: 'UPS',           count: 4, price: [90,350] },
  ];

  for (const spec of standaloneSpecs) {
    for (let i = 1; i <= spec.count; i++) {
      const branchId = pick(branchIds);
      const [d] = await knex('devices').insert({
        name: `${spec.prefix} ${String(i).padStart(2,'0')}`,
        serial_number: `${spec.prefix.substring(0,3).toUpperCase()}-${rand(10000,99999)}`,
        category_id: cat[spec.cat] || null,
        branch_id: branchId, assigned_by: itManagerId,
        value: randPrice(spec.price[0], spec.price[1]),
        purchase_date: daysAgo(rand(10,500)),
        invoice_number: `FAC-${rand(1000,9999)}`, status: 'active',
      }).returning('*');
      standalones.push(d);
    }
  }
  console.log(`  ${standalones.length} dispositivos standalone`);

  const totalDevices = await knex('devices').count('id as c').first();
  console.log(`  total en DB: ${totalDevices.c} dispositivos`);

  // ── 6. TICKETS ────────────────────────────────────────────────────────────
  console.log('\n[5] Tickets...');

  // Fetch all devices (non-components) for tickets
  const ticketableDevices = await knex('devices')
    .whereNull('parent_device_id')
    .select('id', 'branch_id');

  const statuses = ['pending','in_diagnosis','waiting_parts','in_repair','finalized','cancelled','delivered'];
  const problems = [
    'El equipo no enciende al presionar el botón de inicio.',
    'La pantalla muestra rayas horizontales y pierde imagen.',
    'El equipo se reinicia solo cada cierto tiempo.',
    'Teclado no responde, varias teclas dejaron de funcionar.',
    'El ventilador hace ruido excesivo y el equipo se calienta.',
    'No conecta a la red, el adaptador de red no es detectado.',
    'La batería no carga, se descarga en minutos.',
    'Impresora no imprime, muestra error de atasco de papel.',
    'El monitor parpadea constantemente al encenderse.',
    'El sistema operativo no carga, queda en pantalla negra.',
    'Se derramó líquido sobre el equipo.',
    'El disco duro hace ruido y el sistema está muy lento.',
    'El equipo fue golpeado y tiene la carcasa dañada.',
    'No detecta dispositivos USB conectados.',
    'La cámara web no funciona en videoconferencias.',
    'El switch dejó de enrutar tráfico en dos puertos.',
    'El UPS no retiene carga, apaga inmediatamente con corte.',
    'El teléfono IP no registra extensión en el servidor.',
  ];

  const ticketsData = [];

  // Crear al menos 2-3 tickets por estado, de diferentes sucursales
  const ticketSpecs = [
    // status,         daysAgo report, collection days, return days
    { status: 'pending',       rep: 2,  col: null, ret: null },
    { status: 'pending',       rep: 1,  col: null, ret: null },
    { status: 'pending',       rep: 3,  col: null, ret: null },
    { status: 'in_diagnosis',  rep: 10, col: 7,    ret: null },
    { status: 'in_diagnosis',  rep: 8,  col: 5,    ret: null },
    { status: 'in_diagnosis',  rep: 6,  col: 4,    ret: null },
    { status: 'waiting_parts', rep: 20, col: 15,   ret: null },
    { status: 'waiting_parts', rep: 18, col: 13,   ret: null },
    { status: 'in_repair',     rep: 25, col: 20,   ret: 5  },
    { status: 'in_repair',     rep: 22, col: 18,   ret: 7  },
    { status: 'in_repair',     rep: 30, col: 25,   ret: 10 },
    { status: 'finalized',     rep: 40, col: 35,   ret: 3  },
    { status: 'finalized',     rep: 45, col: 40,   ret: 5  },
    { status: 'delivered',     rep: 60, col: 55,   ret: 50 },
    { status: 'delivered',     rep: 55, col: 50,   ret: 45 },
    { status: 'delivered',     rep: 70, col: 65,   ret: 60 },
    { status: 'cancelled',     rep: 15, col: null, ret: null },
    { status: 'cancelled',     rep: 12, col: null, ret: null },
  ];

  for (const spec of ticketSpecs) {
    const device = pick(ticketableDevices);
    const branch = branches.find(b => b.id === device.branch_id);
    const reporterId = gerenteIds[branch.name] || Object.values(gerenteIds)[0];

    const itMgr = ['pending'].includes(spec.status) ? null : itManagerId;
    const colDate = spec.col ? daysAgo(spec.col) : null;
    const retDate = spec.ret ? daysAgo(spec.ret) : null;

    const [ticket] = await knex('tickets').insert({
      device_id: device.id,
      branch_id: device.branch_id,
      reported_by: reporterId,
      it_manager_id: itMgr,
      status: spec.status,
      problem_description: pick(problems),
      report_date: daysAgo(spec.rep),
      collection_date: colDate,
      collection_done_at: colDate && spec.rep > 5 ? colDate : null,
      return_date: retDate,
      return_done_at: ['delivered'].includes(spec.status) ? retDate : null,
      resolution_notes: ['finalized','delivered'].includes(spec.status)
        ? pick(['Equipo reparado exitosamente.','Se reemplazó componente dañado.','Problema resuelto, se actualizó firmware.'])
        : null,
    }).returning('*');

    ticketsData.push(ticket);
    console.log(`  ticket ${spec.status} — ${branch.name}`);
  }

  console.log(`\n  total tickets: ${ticketsData.length}`);
  console.log('\n✅ Demo data creado exitosamente.');
  await knex.destroy();
}

main().catch(e => { console.error(e); process.exit(1); });

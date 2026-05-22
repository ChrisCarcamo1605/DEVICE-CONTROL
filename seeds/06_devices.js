exports.seed = async (knex) => {
  const existing = await knex('devices').count('id as c').first();
  if (parseInt(existing.c) > 0) {
    console.log(`  devices: ${existing.c} ya existen, omitiendo`);
    return;
  }

  const branches  = await knex('branches').select('id', 'name');
  const branchMap = Object.fromEntries(branches.map(b => [b.name, b.id]));

  const cats  = await knex('device_categories').select('id', 'name');
  const cat   = Object.fromEntries(cats.map(c => [c.name, c.id]));

  const itMgr = await knex('profiles').where({ role: 'it_manager' }).first();
  if (!itMgr) throw new Error('No hay perfil it_manager — corre el seed 05_users primero.');
  const mgr = itMgr.id;

  const d = (daysAgo) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - daysAgo);
    return dt.toISOString().slice(0, 10);
  };

  const B = (name) => branchMap[name];

  // ── DESKTOP PCs (10 padres) ──────────────────────────────────────────────
  const pcDefs = [
    { name: 'Desktop PC-01', serial: 'DT-20001', branch: 'Sucursal Central',   days: 365, inv: 'FAC-4001', value: 650 },
    { name: 'Desktop PC-02', serial: 'DT-20002', branch: 'Sucursal Central',   days: 300, inv: 'FAC-4002', value: 700 },
    { name: 'Desktop PC-03', serial: 'DT-20003', branch: 'Sucursal Occidente', days: 280, inv: 'FAC-4003', value: 620 },
    { name: 'Desktop PC-04', serial: 'DT-20004', branch: 'Sucursal Occidente', days: 250, inv: 'FAC-4004', value: 680 },
    { name: 'Desktop PC-05', serial: 'DT-20005', branch: 'Sucursal Oriente',   days: 220, inv: 'FAC-4005', value: 590 },
    { name: 'Desktop PC-06', serial: 'DT-20006', branch: 'Sucursal Oriente',   days: 200, inv: 'FAC-4006', value: 640 },
    { name: 'Desktop PC-07', serial: 'DT-20007', branch: 'Sucursal Norte',     days: 180, inv: 'FAC-4007', value: 610 },
    { name: 'Desktop PC-08', serial: 'DT-20008', branch: 'Sucursal Norte',     days: 150, inv: 'FAC-4008', value: 720 },
    { name: 'Desktop PC-09', serial: 'DT-20009', branch: 'Sucursal Central',   days: 120, inv: 'FAC-4009', value: 660 },
    { name: 'Desktop PC-10', serial: 'DT-20010', branch: 'Sucursal Norte',     days: 90,  inv: 'FAC-4010', value: 580 },
  ];

  const pcParents = [];
  for (const p of pcDefs) {
    const [row] = await knex('devices').insert({
      name: p.name, serial_number: p.serial,
      category_id: cat['Computadora de escritorio'],
      branch_id: B(p.branch), assigned_by: mgr,
      value: p.value, purchase_date: d(p.days),
      invoice_number: p.inv, status: 'active',
    }).returning('*');
    pcParents.push(row);
  }

  const pcComponents = [
    { name: 'RAM 8GB DDR4',    value: 45 },
    { name: 'HDD 1TB',         value: 55 },
    { name: 'Tarjeta de red',  value: 25 },
  ];
  for (const parent of pcParents) {
    for (const comp of pcComponents) {
      await knex('devices').insert({
        name: `${comp.name} — ${parent.name}`,
        serial_number: `CMP-${parent.serial_number.slice(-5)}-${pcComponents.indexOf(comp) + 1}`,
        category_id: cat['Componente'],
        branch_id: parent.branch_id,
        parent_device_id: parent.id,
        assigned_by: mgr,
        value: comp.value,
        purchase_date: parent.purchase_date,
        status: 'active',
      });
    }
  }
  console.log(`  10 Desktop PCs + ${10 * 3} componentes`);

  // ── SERVIDORES (3 padres) ────────────────────────────────────────────────
  const srvDefs = [
    { name: 'Servidor SRV-01', serial: 'SRV-30001', branch: 'Sucursal Central', days: 500, inv: 'FAC-5001', value: 2800 },
    { name: 'Servidor SRV-02', serial: 'SRV-30002', branch: 'Sucursal Central', days: 400, inv: 'FAC-5002', value: 3200 },
    { name: 'Servidor SRV-03', serial: 'SRV-30003', branch: 'Sucursal Central', days: 200, inv: 'FAC-5003', value: 3800 },
  ];

  const srvComponents = [
    { name: 'RAM 32GB DDR4',    value: 180 },
    { name: 'SSD 1TB NVMe',     value: 130 },
    { name: 'Tarjeta de red',   value: 60  },
    { name: 'Fuente de poder',  value: 90  },
  ];

  const srvParents = [];
  for (const p of srvDefs) {
    const [row] = await knex('devices').insert({
      name: p.name, serial_number: p.serial,
      category_id: cat['Computadora de escritorio'],
      branch_id: B(p.branch), assigned_by: mgr,
      value: p.value, purchase_date: d(p.days),
      invoice_number: p.inv, status: 'active',
    }).returning('*');
    srvParents.push(row);
  }

  for (const parent of srvParents) {
    for (let i = 0; i < srvComponents.length; i++) {
      const comp = srvComponents[i];
      await knex('devices').insert({
        name: `${comp.name} — ${parent.name}`,
        serial_number: `CMP-${parent.serial_number.slice(-5)}-${i + 1}`,
        category_id: cat['Componente'],
        branch_id: parent.branch_id,
        parent_device_id: parent.id,
        assigned_by: mgr,
        value: comp.value,
        purchase_date: parent.purchase_date,
        status: 'active',
      });
    }
  }
  console.log(`  3 Servidores + ${3 * 4} componentes`);

  // ── LAPTOPS (6 padres) ───────────────────────────────────────────────────
  const ltDefs = [
    { name: 'Laptop LT-01', serial: 'LT-40001', branch: 'Sucursal Central',   days: 400, inv: 'FAC-6001', value: 850, status: 'active' },
    { name: 'Laptop LT-02', serial: 'LT-40002', branch: 'Sucursal Occidente', days: 360, inv: 'FAC-6002', value: 920, status: 'active' },
    { name: 'Laptop LT-03', serial: 'LT-40003', branch: 'Sucursal Oriente',   days: 300, inv: 'FAC-6003', value: 780, status: 'in_repair' },
    { name: 'Laptop LT-04', serial: 'LT-40004', branch: 'Sucursal Norte',     days: 240, inv: 'FAC-6004', value: 870, status: 'active' },
    { name: 'Laptop LT-05', serial: 'LT-40005', branch: 'Sucursal Central',   days: 180, inv: 'FAC-6005', value: 1050, status: 'active' },
    { name: 'Laptop LT-06', serial: 'LT-40006', branch: 'Sucursal Occidente', days: 90,  inv: 'FAC-6006', value: 960, status: 'active' },
  ];

  const ltComponents = [
    { name: 'RAM 16GB DDR4', value: 75 },
    { name: 'Batería',        value: 55 },
  ];

  const ltParents = [];
  for (const p of ltDefs) {
    const [row] = await knex('devices').insert({
      name: p.name, serial_number: p.serial,
      category_id: cat['Laptop'],
      branch_id: B(p.branch), assigned_by: mgr,
      value: p.value, purchase_date: d(p.days),
      invoice_number: p.inv, status: p.status,
    }).returning('*');
    ltParents.push(row);
  }

  for (const parent of ltParents) {
    for (let i = 0; i < ltComponents.length; i++) {
      const comp = ltComponents[i];
      await knex('devices').insert({
        name: `${comp.name} — ${parent.name}`,
        serial_number: `CMP-${parent.serial_number.slice(-5)}-${i + 1}`,
        category_id: cat['Componente'],
        branch_id: parent.branch_id,
        parent_device_id: parent.id,
        assigned_by: mgr,
        value: comp.value,
        purchase_date: parent.purchase_date,
        status: 'active',
      });
    }
  }
  console.log(`  6 Laptops + ${6 * 2} componentes`);

  // ── STANDALONE ───────────────────────────────────────────────────────────
  const standalones = [
    // Monitores
    { name: 'Monitor MON-01', serial: 'MON-50001', cat: 'Monitor',     branch: 'Sucursal Central',   days: 300, inv: 'FAC-7001', value: 220 },
    { name: 'Monitor MON-02', serial: 'MON-50002', cat: 'Monitor',     branch: 'Sucursal Central',   days: 280, inv: 'FAC-7002', value: 195 },
    { name: 'Monitor MON-03', serial: 'MON-50003', cat: 'Monitor',     branch: 'Sucursal Occidente', days: 260, inv: 'FAC-7003', value: 240 },
    { name: 'Monitor MON-04', serial: 'MON-50004', cat: 'Monitor',     branch: 'Sucursal Occidente', days: 240, inv: 'FAC-7004', value: 210 },
    { name: 'Monitor MON-05', serial: 'MON-50005', cat: 'Monitor',     branch: 'Sucursal Oriente',   days: 200, inv: 'FAC-7005', value: 230 },
    { name: 'Monitor MON-06', serial: 'MON-50006', cat: 'Monitor',     branch: 'Sucursal Oriente',   days: 180, inv: 'FAC-7006', value: 215 },
    { name: 'Monitor MON-07', serial: 'MON-50007', cat: 'Monitor',     branch: 'Sucursal Norte',     days: 150, inv: 'FAC-7007', value: 200 },
    { name: 'Monitor MON-08', serial: 'MON-50008', cat: 'Monitor',     branch: 'Sucursal Norte',     days: 120, inv: 'FAC-7008', value: 225 },
    // Impresoras
    { name: 'Impresora IMP-01', serial: 'IMP-60001', cat: 'Impresora', branch: 'Sucursal Central',   days: 350, inv: 'FAC-8001', value: 180 },
    { name: 'Impresora IMP-02', serial: 'IMP-60002', cat: 'Impresora', branch: 'Sucursal Occidente', days: 300, inv: 'FAC-8002', value: 165 },
    { name: 'Impresora IMP-03', serial: 'IMP-60003', cat: 'Impresora', branch: 'Sucursal Oriente',   days: 250, inv: 'FAC-8003', value: 195 },
    { name: 'Impresora IMP-04', serial: 'IMP-60004', cat: 'Impresora', branch: 'Sucursal Norte',     days: 200, inv: 'FAC-8004', value: 170 },
    // Teléfonos IP
    { name: 'Teléfono IP TEL-01', serial: 'TEL-70001', cat: 'Teléfono IP', branch: 'Sucursal Central',   days: 400, inv: 'FAC-9001', value: 85 },
    { name: 'Teléfono IP TEL-02', serial: 'TEL-70002', cat: 'Teléfono IP', branch: 'Sucursal Central',   days: 400, inv: 'FAC-9002', value: 85 },
    { name: 'Teléfono IP TEL-03', serial: 'TEL-70003', cat: 'Teléfono IP', branch: 'Sucursal Occidente', days: 350, inv: 'FAC-9003', value: 90 },
    { name: 'Teléfono IP TEL-04', serial: 'TEL-70004', cat: 'Teléfono IP', branch: 'Sucursal Oriente',   days: 300, inv: 'FAC-9004', value: 80 },
    { name: 'Teléfono IP TEL-05', serial: 'TEL-70005', cat: 'Teléfono IP', branch: 'Sucursal Norte',     days: 250, inv: 'FAC-9005', value: 88 },
    { name: 'Teléfono IP TEL-06', serial: 'TEL-70006', cat: 'Teléfono IP', branch: 'Sucursal Norte',     days: 200, inv: 'FAC-9006', value: 92 },
    // Switches
    { name: 'Switch SW-01', serial: 'SW-80001', cat: 'Switch', branch: 'Sucursal Central',   days: 500, inv: 'FAC-1001', value: 280 },
    { name: 'Switch SW-02', serial: 'SW-80002', cat: 'Switch', branch: 'Sucursal Occidente', days: 450, inv: 'FAC-1002', value: 260 },
    { name: 'Switch SW-03', serial: 'SW-80003', cat: 'Switch', branch: 'Sucursal Oriente',   days: 400, inv: 'FAC-1003', value: 245 },
    { name: 'Switch SW-04', serial: 'SW-80004', cat: 'Switch', branch: 'Sucursal Norte',     days: 350, inv: 'FAC-1004', value: 270 },
    // UPS
    { name: 'UPS UPS-01', serial: 'UPS-90001', cat: 'UPS', branch: 'Sucursal Central',   days: 600, inv: 'FAC-2001', value: 320 },
    { name: 'UPS UPS-02', serial: 'UPS-90002', cat: 'UPS', branch: 'Sucursal Occidente', days: 550, inv: 'FAC-2002', value: 295 },
    { name: 'UPS UPS-03', serial: 'UPS-90003', cat: 'UPS', branch: 'Sucursal Oriente',   days: 500, inv: 'FAC-2003', value: 310 },
    { name: 'UPS UPS-04', serial: 'UPS-90004', cat: 'UPS', branch: 'Sucursal Norte',     days: 450, inv: 'FAC-2004', value: 305 },
  ];

  for (const s of standalones) {
    await knex('devices').insert({
      name: s.name, serial_number: s.serial,
      category_id: cat[s.cat],
      branch_id: B(s.branch), assigned_by: mgr,
      value: s.value, purchase_date: d(s.days),
      invoice_number: s.inv, status: 'active',
    });
  }
  console.log(`  ${standalones.length} dispositivos standalone`);

  const total = await knex('devices').count('id as c').first();
  console.log(`  total dispositivos: ${total.c}`);
};

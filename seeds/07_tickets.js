exports.seed = async (knex) => {
  const existing = await knex('tickets').count('id as c').first();
  if (parseInt(existing.c) > 0) {
    console.log(`  tickets: ${existing.c} ya existen, omitiendo`);
    return;
  }

  const itMgr    = await knex('profiles').where({ role: 'it_manager' }).first();
  const mgr      = itMgr.id;

  const branches = await knex('branches').select('id', 'name');
  const branchMap = Object.fromEntries(branches.map(b => [b.name, b.id]));

  const managers = await knex('profiles').where({ role: 'branch_manager' }).select('id', 'branch_id');
  const mgrByBranch = Object.fromEntries(managers.map(m => [m.branch_id, m.id]));

  // Non-component devices per branch
  const devices = await knex('devices')
    .whereNull('parent_device_id')
    .select('id', 'branch_id', 'name');

  const devicesByBranch = {};
  for (const dev of devices) {
    if (!devicesByBranch[dev.branch_id]) devicesByBranch[dev.branch_id] = [];
    devicesByBranch[dev.branch_id].push(dev);
  }

  const dt = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };

  const problems = [
    'El equipo no enciende al presionar el botón de inicio.',
    'La pantalla muestra rayas horizontales y pierde imagen intermitentemente.',
    'El equipo se reinicia solo cada cierto tiempo sin previo aviso.',
    'Teclado no responde, varias teclas dejaron de funcionar.',
    'El ventilador hace ruido excesivo y el equipo se sobrecalienta.',
    'No conecta a la red, el adaptador de red no es detectado por el sistema.',
    'La batería no carga y se descarga en menos de cinco minutos.',
    'Impresora no imprime y muestra error de atasco de papel.',
    'El monitor parpadea constantemente al encenderse.',
    'El sistema operativo no carga, queda en pantalla negra al inicio.',
    'Se derramó líquido sobre el equipo y dejó de funcionar.',
    'El disco duro hace ruido y el sistema está muy lento.',
    'El switch dejó de enrutar tráfico correctamente en dos puertos.',
    'El UPS no retiene carga y apaga los equipos inmediatamente ante corte.',
    'El teléfono IP no registra la extensión en el servidor PBX.',
    'La cámara web integrada no funciona en videoconferencias.',
    'No detecta dispositivos USB conectados en ningún puerto.',
    'El equipo fue golpeado accidentalmente y tiene la carcasa dañada.',
  ];

  const resolutions = [
    'Equipo reparado exitosamente, se reemplazó el componente dañado.',
    'Se actualizó el firmware y se limpió el sistema de polvo acumulado.',
    'Se sustituyó la fuente de poder y se verificó el funcionamiento completo.',
    'Se restauró el sistema operativo y se realizaron pruebas de estabilidad.',
    'Se reemplazó el disco duro y se recuperó la información del usuario.',
  ];

  const branchNames = ['Sucursal Central', 'Sucursal Occidente', 'Sucursal Oriente', 'Sucursal Norte'];

  let pIdx = 0;
  const nextProblem = () => problems[pIdx++ % problems.length];
  const nextResolution = () => resolutions[pIdx % resolutions.length];

  const getDevice = (branchName) => {
    const bid = branchMap[branchName];
    const list = devicesByBranch[bid] || [];
    return list[pIdx % list.length] || devices[0];
  };

  const specs = [
    // ── PENDING (3) ─────────────────────────────────────────────────────────
    { status: 'pending', branch: 'Sucursal Central',   repDays: 3  },
    { status: 'pending', branch: 'Sucursal Occidente', repDays: 2  },
    { status: 'pending', branch: 'Sucursal Norte',     repDays: 1  },

    // ── IN_DIAGNOSIS (3) ────────────────────────────────────────────────────
    { status: 'in_diagnosis', branch: 'Sucursal Oriente',   repDays: 12, colDays: 8  },
    { status: 'in_diagnosis', branch: 'Sucursal Central',   repDays: 9,  colDays: 6  },
    { status: 'in_diagnosis', branch: 'Sucursal Occidente', repDays: 7,  colDays: 4  },

    // ── WAITING_PARTS (3) ───────────────────────────────────────────────────
    { status: 'waiting_parts', branch: 'Sucursal Norte',     repDays: 22, colDays: 18 },
    { status: 'waiting_parts', branch: 'Sucursal Central',   repDays: 18, colDays: 14 },
    { status: 'waiting_parts', branch: 'Sucursal Oriente',   repDays: 15, colDays: 11 },

    // ── IN_REPAIR (4) ───────────────────────────────────────────────────────
    { status: 'in_repair', branch: 'Sucursal Central',   repDays: 30, colDays: 25, retDays: 5  },
    { status: 'in_repair', branch: 'Sucursal Occidente', repDays: 28, colDays: 22, retDays: 8  },
    { status: 'in_repair', branch: 'Sucursal Oriente',   repDays: 25, colDays: 20, retDays: 6  },
    { status: 'in_repair', branch: 'Sucursal Norte',     repDays: 20, colDays: 15, retDays: 4  },

    // ── FINALIZED (3) ───────────────────────────────────────────────────────
    { status: 'finalized', branch: 'Sucursal Central',   repDays: 45, colDays: 40, retDays: 10 },
    { status: 'finalized', branch: 'Sucursal Occidente', repDays: 40, colDays: 35, retDays: 8  },
    { status: 'finalized', branch: 'Sucursal Norte',     repDays: 38, colDays: 33, retDays: 7  },

    // ── DELIVERED (4) ───────────────────────────────────────────────────────
    { status: 'delivered', branch: 'Sucursal Central',   repDays: 70, colDays: 65, retDays: 60 },
    { status: 'delivered', branch: 'Sucursal Occidente', repDays: 65, colDays: 60, retDays: 55 },
    { status: 'delivered', branch: 'Sucursal Oriente',   repDays: 60, colDays: 55, retDays: 50 },
    { status: 'delivered', branch: 'Sucursal Norte',     repDays: 55, colDays: 50, retDays: 45 },

    // ── CANCELLED (2) ───────────────────────────────────────────────────────
    { status: 'cancelled', branch: 'Sucursal Oriente', repDays: 14 },
    { status: 'cancelled', branch: 'Sucursal Norte',   repDays: 10 },
  ];

  for (const spec of specs) {
    const branchId  = branchMap[spec.branch];
    const device    = getDevice(spec.branch);
    const reporterId = mgrByBranch[branchId];

    const isPending    = spec.status === 'pending';
    const isFinalized  = ['finalized', 'delivered'].includes(spec.status);
    const isDelivered  = spec.status === 'delivered';

    const colDate = spec.colDays ? dt(spec.colDays) : null;
    const retDate = spec.retDays ? dt(spec.retDays) : null;

    await knex('tickets').insert({
      device_id:           device.id,
      branch_id:           branchId,
      reported_by:         reporterId,
      it_manager_id:       isPending ? null : mgr,
      status:              spec.status,
      problem_description: nextProblem(),
      report_date:         dt(spec.repDays),
      collection_date:     colDate,
      collection_done_at:  colDate,
      return_date:         retDate,
      return_done_at:      isDelivered ? retDate : null,
      resolution_notes:    isFinalized ? nextResolution() : null,
    });

    console.log(`  ticket ${spec.status.padEnd(13)} — ${spec.branch}`);
  }

  const total = await knex('tickets').count('id as c').first();
  console.log(`  total tickets: ${total.c}`);
};

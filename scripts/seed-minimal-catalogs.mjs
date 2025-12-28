#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Faltan variables NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const nowIso = () => new Date().toISOString();
const dateOnly = (date) => {
  const copy = new Date(date.getTime());
  const yyyy = copy.getFullYear();
  const mm = String(copy.getMonth() + 1).padStart(2, "0");
  const dd = String(copy.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const addDays = (days) => {
  const base = new Date();
  base.setDate(base.getDate() + days);
  return base;
};

const sampleClientes = [
  {
    nombre: "Logistica Atlas",
    rfc: "LATL900101ABC",
    direccion: "Av. Sendero 102, Parque Industrial, Monterrey, NL",
    telefono: "+52 81 5555 2100",
    email: "contacto@logistica-atlas.mx",
    empresaFacturadora: "Logistica Atlas SA de CV",
    divisaPago: "MXN",
    contactos: [
      {
        nombre: "Ana Torres",
        puesto: "Gerente de Logistica",
        telefono: "+52 81 5555 2101",
        email: "ana.torres@logistica-atlas.mx",
        tipo: "principal",
      },
      {
        nombre: "Marco Ruiz",
        puesto: "Representante Legal",
        telefono: "+52 81 5555 2102",
        email: "marco.ruiz@logistica-atlas.mx",
        tipo: "representante",
      },
    ],
  },
  {
    nombre: "Distribuciones Sierra Norte",
    rfc: "DSIN880305QW1",
    direccion: "Blvd. Insurgentes 3400, Tijuana, BC",
    telefono: "+52 664 555 7800",
    email: "info@distribucionessn.com",
    empresaFacturadora: "Distribuciones Sierra Norte SA",
    divisaPago: "USD",
    contactos: [
      {
        nombre: "Laura Medina",
        puesto: "Coordinadora Comercial",
        telefono: "+52 664 555 7812",
        email: "laura.medina@distribucionessn.com",
        tipo: "principal",
      },
      {
        nombre: "Rogelio Quintero",
        puesto: "Representante Legal",
        telefono: "+52 664 555 7813",
        email: "rog.q@distribucionessn.com",
        tipo: "representante",
      },
    ],
  },
  {
    nombre: "Agroexportaciones del Bajio",
    rfc: "AGBJ9307219L3",
    direccion: "Carr. Salamanca Irapuato Km 18, Irapuato, GTO",
    telefono: "+52 462 555 9900",
    email: "logistica@agro-bajio.mx",
    empresaFacturadora: "Agroexportaciones del Bajio SA",
    divisaPago: "MXN",
    contactos: [
      {
        nombre: "Humberto Salazar",
        puesto: "Director de Operaciones",
        telefono: "+52 462 555 9910",
        email: "humberto.salazar@agro-bajio.mx",
        tipo: "principal",
      },
      {
        nombre: "Patricia Leal",
        puesto: "Representante Legal",
        telefono: "+52 462 555 9912",
        email: "patricia.leal@agro-bajio.mx",
        tipo: "representante",
      },
    ],
  },
];

const sampleCamiones = [
  {
    numero_economico: "TRA-901",
    marca: "Kenworth",
    modelo: "T680",
    año: 2021,
    placas: "RXA-27-19",
    kilometraje: 185000,
    tag_americano: "TAGUS901",
    tag_mexicano: "TAGMX901",
    numero_base: "NB-901",
    numeros_adicionales: [
      { nombre: "Unidad Satelital", numero: "SAT-901", fecha_vencimiento: dateOnly(addDays(210)) },
    ],
    poliza_seguro_mexicano: "POL-MX-901",
    fecha_vencimiento_seguro_mexicano: dateOnly(addDays(320)),
    poliza_seguro_americano: "POL-US-901",
    fecha_vencimiento_seguro_americano: dateOnly(addDays(280)),
    numero_serie: "1XKAD49X0MJ123901",
    comentarios: "Unidad dedicada a rutas fronterizas",
  },
  {
    numero_economico: "TRA-902",
    marca: "Freightliner",
    modelo: "Cascadia",
    año: 2020,
    placas: "SBB-45-87",
    kilometraje: 212500,
    tag_americano: "TAGUS902",
    tag_mexicano: "TAGMX902",
    numero_base: "NB-902",
    numeros_adicionales: [
      { nombre: "Equipo ELD", numero: "ELD-902", fecha_vencimiento: dateOnly(addDays(365)) },
    ],
    poliza_seguro_mexicano: "POL-MX-902",
    fecha_vencimiento_seguro_mexicano: dateOnly(addDays(190)),
    poliza_seguro_americano: "POL-US-902",
    fecha_vencimiento_seguro_americano: dateOnly(addDays(260)),
    numero_serie: "3AKJHHDR0MSLM2902",
    comentarios: "Disponible para operaciones nacionales",
  },
  {
    numero_economico: "TRA-903",
    marca: "Volvo",
    modelo: "VNL 760",
    año: 2022,
    placas: "TCC-68-22",
    kilometraje: 142300,
    tag_americano: "TAGUS903",
    tag_mexicano: "TAGMX903",
    numero_base: "NB-903",
    numeros_adicionales: [
      { nombre: "Telemetria", numero: "TEL-903", fecha_vencimiento: dateOnly(addDays(150)) },
    ],
    poliza_seguro_mexicano: "POL-MX-903",
    fecha_vencimiento_seguro_mexicano: dateOnly(addDays(330)),
    poliza_seguro_americano: "POL-US-903",
    fecha_vencimiento_seguro_americano: dateOnly(addDays(300)),
    numero_serie: "4V4NC9EH4NN891903",
    comentarios: "Asignado a cargas refrigeradas",
  },
];

const sampleRemolques = [
  {
    numero_economico: "REM-601",
    tipo: "Caja seca 53",
    marca: "Utility",
    modelo: "4000D-X",
    año: 2020,
    numero_serie: "1UYVS2530L1234601",
    capacidad: 26.0,
    placas: "35TY-6B1",
    fecha_ultima_inspeccion: dateOnly(addDays(-60)),
    proxima_inspeccion: dateOnly(addDays(305)),
    poliza_seguro: "REM-SEG-601",
    vigencia_seguro: dateOnly(addDays(290)),
    comentarios: "Listo para exportaciones",
  },
  {
    numero_economico: "REM-602",
    tipo: "Refrigerado",
    marca: "Great Dane",
    modelo: "Everest",
    año: 2019,
    numero_serie: "1GRAA7029KC046602",
    capacidad: 24.5,
    placas: "48FG-7C3",
    fecha_ultima_inspeccion: dateOnly(addDays(-45)),
    proxima_inspeccion: dateOnly(addDays(250)),
    poliza_seguro: "REM-SEG-602",
    vigencia_seguro: dateOnly(addDays(270)),
    comentarios: "Incluye sensor de temperatura",
  },
  {
    numero_economico: "REM-603",
    tipo: "Plataforma",
    marca: "Hyundai",
    modelo: "Composite",
    año: 2021,
    numero_serie: "5HYJD4024MW046603",
    capacidad: 28.0,
    placas: "56HK-8D9",
    fecha_ultima_inspeccion: dateOnly(addDays(-30)),
    proxima_inspeccion: dateOnly(addDays(320)),
    poliza_seguro: "REM-SEG-603",
    vigencia_seguro: dateOnly(addDays(340)),
    comentarios: "Uso recomendado para acero",
  },
];

const sampleOperadores = [
  {
    operator_number: "OP-701",
    nombre: "Javier",
    apellidos: "Carrillo Lopez",
    telefono: "+52 81 4000 7010",
    email: "javier.carrillo@monarca-demo.mx",
    licencia: "A-70124568",
    fecha_vencimiento_licencia: dateOnly(addDays(540)),
    numero_apto_medico: "APTO-701-2024",
    fecha_vencimiento_apto_medico: dateOnly(addDays(365)),
    numero_visa: "B1B2-701",
    fecha_vencimiento_visa: dateOnly(addDays(720)),
    numero_fast: "FAST-701",
    fecha_vencimiento_fast: dateOnly(addDays(400)),
    tipo_sangre: "O+",
    direccion: "Col. San Jeronimo, Monterrey, NL",
    fecha_nacimiento: dateOnly(addDays(-14000)),
    curp: "CALJ700101HDFRJV06",
    rfc: "CALJ7001018T3",
    nss: "70124568901",
    telefono_emergencia: "+52 81 4000 7099",
    contactos_emergencia: [
      { nombre: "Laura Carrillo", relacion: "Esposa", telefono: "+52 81 4000 7098" },
    ],
    observaciones: [
      { id: randomUUID(), texto: "Operador certificado para rutas Laredo", fecha: nowIso() },
    ],
  },
  {
    operator_number: "OP-702",
    nombre: "Miguel",
    apellidos: "Ortega Salinas",
    telefono: "+52 55 3600 7020",
    email: "miguel.ortega@monarca-demo.mx",
    licencia: "A-70233412",
    fecha_vencimiento_licencia: dateOnly(addDays(480)),
    numero_apto_medico: "APTO-702-2024",
    fecha_vencimiento_apto_medico: dateOnly(addDays(300)),
    numero_visa: "B1B2-702",
    fecha_vencimiento_visa: dateOnly(addDays(680)),
    numero_fast: "FAST-702",
    fecha_vencimiento_fast: dateOnly(addDays(365)),
    tipo_sangre: "A+",
    direccion: "Col. Del Valle, CDMX",
    fecha_nacimiento: dateOnly(addDays(-13650)),
    curp: "OASM720215HDFRMG08",
    rfc: "OASM7202159J1",
    nss: "70233412901",
    telefono_emergencia: "+52 55 3600 7099",
    contactos_emergencia: [
      { nombre: "Raul Ortega", relacion: "Hermano", telefono: "+52 55 3600 7098" },
    ],
    observaciones: [
      { id: randomUUID(), texto: "Historial limpio, apto doble remolque", fecha: nowIso() },
    ],
  },
  {
    operator_number: "OP-703",
    nombre: "Elena",
    apellidos: "Martinez Duarte",
    telefono: "+52 33 2500 7030",
    email: "elena.martinez@monarca-demo.mx",
    licencia: "A-70399841",
    fecha_vencimiento_licencia: dateOnly(addDays(600)),
    numero_apto_medico: "APTO-703-2024",
    fecha_vencimiento_apto_medico: dateOnly(addDays(420)),
    numero_visa: "B1B2-703",
    fecha_vencimiento_visa: dateOnly(addDays(750)),
    numero_fast: "FAST-703",
    fecha_vencimiento_fast: dateOnly(addDays(390)),
    tipo_sangre: "B+",
    direccion: "Col. Chapalita, Guadalajara, Jal.",
    fecha_nacimiento: dateOnly(addDays(-13000)),
    curp: "MADL740930MJCRLN05",
    rfc: "MADL7409301Q5",
    nss: "70399841901",
    telefono_emergencia: "+52 33 2500 7099",
    contactos_emergencia: [
      { nombre: "Lucia Duarte", relacion: "Madre", telefono: "+52 33 2500 7098" },
    ],
    observaciones: [
      { id: randomUUID(), texto: "Entrenamiento hazmat completado", fecha: nowIso() },
    ],
  },
];

async function upsertCliente(base) {
  const timestamp = nowIso();
  const contactosJson = base.contactos.map((c, index) => ({
    id: randomUUID(),
    nombre: c.nombre,
    telefono: c.telefono,
    email: c.email,
    puesto: c.puesto,
    es_principal: c.tipo === "principal" || index === 0,
    activo: true,
    notas: null,
    tipo_contacto: c.tipo,
    fecha_creacion: timestamp,
    updated_at: timestamp,
  }));

  const { data: existing, error: fetchError } = await supabase
    .from("clientes")
    .select("id")
    .eq("rfc", base.rfc)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Error consultando cliente ${base.rfc}: ${fetchError.message}`);
  }

  if (existing) {
    console.log(`➡️ Cliente ${base.rfc} ya existe, omitiendo inserción`);
    await syncContactos(existing.id, contactosJson);
    return existing.id;
  }

  const insertPayload = {
    nombre: base.nombre,
    rfc: base.rfc,
    direccion: base.direccion,
    telefono: base.telefono,
    email: base.email,
    estado: "activo",
    divisa_pago: base.divisaPago,
    empresa_facturadora: base.empresaFacturadora,
    forma_facturacion: null,
    contactos_json: contactosJson,
    fecha_registro: timestamp,
    updated_at: timestamp,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("clientes")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Error insertando cliente ${base.rfc}: ${insertError.message}`);
  }

  console.log(`✅ Cliente ${base.rfc} creado`);
  await syncContactos(inserted.id, contactosJson);
  return inserted.id;
}

async function syncContactos(clienteId, contactos) {
  const timestamp = nowIso();

  for (const contacto of contactos) {
    const { data: existing, error: contactError } = await supabase
      .from("contactos_clientes")
      .select("id")
      .eq("cliente_id", clienteId)
      .eq("email", contacto.email)
      .maybeSingle();

    if (contactError) {
      throw new Error(`Error verificando contacto ${contacto.email}: ${contactError.message}`);
    }

    const payload = {
      cliente_id: clienteId,
      nombre: contacto.nombre,
      telefono: contacto.telefono,
      email: contacto.email,
      puesto: contacto.puesto,
      tipo_contacto: contacto.tipo_contacto,
      es_principal: Boolean(contacto.es_principal),
      activo: true,
      fecha_creacion: timestamp,
      updated_at: timestamp,
    };

    if (existing) {
      await supabase
        .from("contactos_clientes")
        .update(payload)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("contactos_clientes")
        .insert({ id: randomUUID(), ...payload });
    }
  }
}

async function upsertCamion(base) {
  const { data: existing, error: fetchError } = await supabase
    .from("camiones")
    .select("id")
    .eq("numero_economico", base.numero_economico)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Error consultando camión ${base.numero_economico}: ${fetchError.message}`);
  }

  if (existing) {
    console.log(`➡️ Camión ${base.numero_economico} ya existe, omitiendo inserción`);
    return existing.id;
  }

  const timestamp = nowIso();
  const observaciones = {
    numero_serie: base.numero_serie,
    poliza_seguro_mexicano: base.poliza_seguro_mexicano,
    fecha_vencimiento_seguro_mexicano: base.fecha_vencimiento_seguro_mexicano,
    poliza_seguro_americano: base.poliza_seguro_americano,
    fecha_vencimiento_seguro_americano: base.fecha_vencimiento_seguro_americano,
    ultima_verificacion: dateOnly(addDays(-120)),
    frecuencia_verificacion: dateOnly(addDays(180)),
    proxima_verificacion: dateOnly(addDays(180)),
    tag_americano: base.tag_americano,
    tag_mexicano: base.tag_mexicano,
    numero_base: base.numero_base,
    numeros_adicionales: base.numeros_adicionales,
    comentarios: base.comentarios,
    historial_comentarios: [
      { id: randomUUID(), text: base.comentarios, date: timestamp },
    ],
  };

  const insertPayload = {
    numero_economico: base.numero_economico,
    marca: base.marca,
    modelo: base.modelo,
    año: base.año,
    placas: base.placas,
    kilometraje: base.kilometraje,
    estado: "disponible",
    observaciones,
    tag_americano: base.tag_americano,
    tag_mexicano: base.tag_mexicano,
    numero_base: base.numero_base,
    numeros_adicionales: base.numeros_adicionales,
    poliza_seguro_mexicano: base.poliza_seguro_mexicano,
    fecha_vencimiento_seguro_mexicano: base.fecha_vencimiento_seguro_mexicano,
    poliza_seguro_americano: base.poliza_seguro_americano,
    fecha_vencimiento_seguro_americano: base.fecha_vencimiento_seguro_americano,
    fecha_registro: timestamp,
    updated_at: timestamp,
  };

  const { error: insertError } = await supabase.from("camiones").insert(insertPayload);

  if (insertError) {
    throw new Error(`Error insertando camión ${base.numero_economico}: ${insertError.message}`);
  }

  console.log(`✅ Camión ${base.numero_economico} creado`);
}

async function upsertRemolque(base) {
  const { data: existing, error: fetchError } = await supabase
    .from("remolques")
    .select("id")
    .eq("numero_economico", base.numero_economico)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Error consultando remolque ${base.numero_economico}: ${fetchError.message}`);
  }

  if (existing) {
    console.log(`➡️ Remolque ${base.numero_economico} ya existe, omitiendo inserción`);
    return existing.id;
  }

  const timestamp = nowIso();
  const insertPayload = {
    numero_economico: base.numero_economico,
    tipo: base.tipo,
    marca: base.marca,
    modelo: base.modelo,
    año: base.año,
    numero_serie: base.numero_serie,
    capacidad: base.capacidad,
    placas: base.placas,
    fecha_ultima_inspeccion: base.fecha_ultima_inspeccion,
    proxima_inspeccion: base.proxima_inspeccion,
    poliza_seguro: base.poliza_seguro,
    vigencia_seguro: base.vigencia_seguro,
    estado: "disponible",
    comentarios: base.comentarios,
    activo: true,
    fecha_registro: timestamp,
    updated_at: timestamp,
  };

  const { error: insertError } = await supabase.from("remolques").insert(insertPayload);

  if (insertError) {
    throw new Error(`Error insertando remolque ${base.numero_economico}: ${insertError.message}`);
  }

  console.log(`✅ Remolque ${base.numero_economico} creado`);
}

async function upsertOperador(base) {
  const { data: existing, error: fetchError } = await supabase
    .from("operadores")
    .select("id")
    .eq("operator_number", base.operator_number)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Error consultando operador ${base.operator_number}: ${fetchError.message}`);
  }

  if (existing) {
    console.log(`➡️ Operador ${base.operator_number} ya existe, omitiendo inserción`);
    return existing.id;
  }

  const timestamp = nowIso();
  const insertPayload = {
    operator_number: base.operator_number,
    nombre: base.nombre,
    apellidos: base.apellidos,
    telefono: base.telefono,
    email: base.email,
    licencia: base.licencia,
    fecha_vencimiento_licencia: base.fecha_vencimiento_licencia,
    numero_apto_medico: base.numero_apto_medico,
    fecha_vencimiento_apto_medico: base.fecha_vencimiento_apto_medico,
    numero_visa: base.numero_visa,
    fecha_vencimiento_visa: base.fecha_vencimiento_visa,
    numero_fast: base.numero_fast,
    fecha_vencimiento_fast: base.fecha_vencimiento_fast,
    tipo_sangre: base.tipo_sangre,
    direccion: base.direccion,
    fecha_nacimiento: base.fecha_nacimiento,
    curp: base.curp,
    rfc: base.rfc,
    nss: base.nss,
    telefono_emergencia: base.telefono_emergencia,
    contactos_emergencia: JSON.stringify(base.contactos_emergencia),
    observaciones: JSON.stringify(base.observaciones),
    estado: "activo",
    fecha_registro: timestamp,
    updated_at: timestamp,
  };

  const { error: insertError } = await supabase.from("operadores").insert(insertPayload);

  if (insertError) {
    throw new Error(`Error insertando operador ${base.operator_number}: ${insertError.message}`);
  }

  console.log(`✅ Operador ${base.operator_number} creado`);
}

async function main() {
  try {
    console.log("🚀 Sembrando catálogos base (3 registros por entidad)");

    for (const cliente of sampleClientes) {
      await upsertCliente(cliente);
    }

    for (const camion of sampleCamiones) {
      await upsertCamion(camion);
    }

    for (const remolque of sampleRemolques) {
      await upsertRemolque(remolque);
    }

    for (const operador of sampleOperadores) {
      await upsertOperador(operador);
    }

    console.log("\n✨ Si todo salió bien ya deberías ver 3 clientes, tractocamiones, remolques y operadores nuevos.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error durante la siembra:", error);
    process.exit(1);
  }
}

main();

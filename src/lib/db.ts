import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { formatBrazilDateInput, toBrazilDateTimeIso } from "@/lib/brazil-time";

const defaultDbPath = path.join(process.cwd(), "data", "dommus.db");
const dbPath = process.env.DB_PATH?.trim() || defaultDbPath;
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

export type SiteSetting = {
  id: string;
  site_name: string;
  is_open: number;
  maintenance_message: string;
  checkout_provider?: string | null;
  checkout_handle?: string | null;
  checkout_redirect_url?: string | null;
  checkout_webhook_url?: string | null;
  updated_at: string;
};

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  birth_date?: string | null;
  avatar_path?: string | null;
  password_hash: string;
  role: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  bio?: string | null;
  specialty?: string | null;
  starts_at_hour?: number | null;
  ends_at_hour?: number | null;
  interval_minutes?: number | null;
};

export type ServiceRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_in_cents: number;
  duration_minutes: number;
  image_path: string;
  is_active: number;
};

export type AppointmentRecord = {
  id: string;
  protocol_code: string;
  customer_id?: string | null;
  barber_id: string;
  service_id: string;
  service_summary?: string | null;
  scheduled_at: string;
  end_at: string;
  total_price_in_cents: number;
  deposit_in_cents: number;
  checkout_amount_in_cents?: number;
  paid_amount_in_cents?: number;
  payment_scope?: string;
  status: string;
  deposit_status: string;
  notes?: string | null;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_avatar_path?: string | null;
  manual_customer_name?: string | null;
  manual_customer_phone?: string | null;
  manual_customer_email?: string | null;
  barber_name?: string;
  service_name?: string;
};

export type BlockedSlotRecord = {
  id: string;
  barber_id: string;
  starts_at: string;
  ends_at: string;
  reason?: string | null;
  created_at: string;
  barber_name?: string;
};

export type LeadRecord = {
  id: string;
  user_id?: string | null;
  service_id?: string | null;
  started_at: string;
  last_step: string;
  is_converted: number;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  service_name?: string | null;
};

const defaultAutoBlockedPeriods = [
  {
    key: "midday-break",
    startTime: "12:00:00",
    endTime: "14:00:00",
    reason: "Fechado por padrão até o barbeiro liberar",
  },
  {
    key: "night-close",
    startTime: "21:00:00",
    endTime: "21:59:59",
    reason: "Fechado por padrão até o barbeiro liberar",
  },
] as const;

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.toLowerCase().includes("duplicate column name")) {
        throw error;
      }
    }
  }
}

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      site_name TEXT NOT NULL,
      is_open INTEGER NOT NULL DEFAULT 1,
      maintenance_message TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CUSTOMER',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS barber_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      bio TEXT,
      specialty TEXT,
      starts_at_hour INTEGER NOT NULL DEFAULT 9,
      ends_at_hour INTEGER NOT NULL DEFAULT 19,
      interval_minutes INTEGER NOT NULL DEFAULT 30,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      price_in_cents INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      protocol_code TEXT NOT NULL UNIQUE,
      customer_id TEXT,
      barber_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      total_price_in_cents INTEGER NOT NULL,
      deposit_in_cents INTEGER NOT NULL,
      checkout_amount_in_cents INTEGER NOT NULL DEFAULT 0,
      paid_amount_in_cents INTEGER NOT NULL DEFAULT 0,
      payment_scope TEXT NOT NULL DEFAULT 'DEPOSIT',
      status TEXT NOT NULL,
      deposit_status TEXT NOT NULL,
      notes TEXT,
      manual_customer_name TEXT,
      manual_customer_phone TEXT,
      manual_customer_email TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(customer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(barber_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blocked_slots (
      id TEXT PRIMARY KEY,
      barber_id TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(barber_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS released_default_blocked_days (
      barber_id TEXT NOT NULL,
      date_iso TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (barber_id, date_iso),
      FOREIGN KEY(barber_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS released_default_blocked_periods (
      barber_id TEXT NOT NULL,
      date_iso TEXT NOT NULL,
      period_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (barber_id, date_iso, period_key),
      FOREIGN KEY(barber_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reminder_logs (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL,
      type TEXT NOT NULL,
      sent_at TEXT,
      channel TEXT,
      FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS abandoned_leads (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      service_id TEXT,
      started_at TEXT NOT NULL,
      last_step TEXT NOT NULL,
      is_converted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE SET NULL
    );
  `);

  ensureColumn("users", "avatar_path", "TEXT");
  ensureColumn("users", "birth_date", "TEXT");
  ensureColumn("appointments", "service_summary", "TEXT");
  ensureColumn("appointments", "checkout_amount_in_cents", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("appointments", "paid_amount_in_cents", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("appointments", "payment_scope", "TEXT NOT NULL DEFAULT 'DEPOSIT'");
  ensureColumn("appointments", "manual_customer_name", "TEXT");
  ensureColumn("appointments", "manual_customer_phone", "TEXT");
  ensureColumn("appointments", "manual_customer_email", "TEXT");
  ensureColumn("site_settings", "checkout_provider", "TEXT DEFAULT 'infinitepay'");
  ensureColumn("site_settings", "checkout_handle", "TEXT");
  ensureColumn("site_settings", "checkout_redirect_url", "TEXT");
  ensureColumn("site_settings", "checkout_webhook_url", "TEXT");

  db.prepare(
    "INSERT OR IGNORE INTO site_settings (id, site_name, is_open, maintenance_message, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run("main", "Dommus Barbearia", 1, "Sistema temporariamente indisponÃ­vel. Entre em contato com a Dommus.", nowIso());

  const insertService = db.prepare(`
    INSERT OR IGNORE INTO services (id, name, slug, description, price_in_cents, duration_minutes, image_path, is_active)
    VALUES (@id, @name, @slug, @description, @price_in_cents, @duration_minutes, @image_path, 1)
  `);

  [
    ["service_tesoura", "Cabelo", "cabelo", "Corte e acabamento do cabelo.", 5500, 30, "/services/tesoura.jpg"],
    ["service_maquina", "Sobrancelha", "sombrancelha", "Desenho e alinhamento da sobrancelha.", 4000, 30, "/services/sombrancelha.jpg"],
    ["service_corte_barba", "Cabelo e barba", "cabelo-barba", "Pacote completo de cabelo e barba.", 7500, 60, "/services/corte-barba.jpg"],
    ["service_cabelo_barba_terapia", "Cabelo e Barboterapia", "cabelo-barboterapia", "Pacote completo de cabelo e barboterapia premium.", 11000, 60, "/services/cabelo-barboterapia.jpg"],
    ["service_barba", "Barboterapia", "barboterapia", "Desenho e alinhamento com toalha quente e acabamento premium.", 3000, 30, "/services/barboterapia.jpg"],
    ["service_depilacao", "DepilaÃ§Ã£o com cera", "depilacao-cera", "DepilaÃ§Ã£o rÃ¡pida com acabamento limpo.", 2000, 10, "/services/depilacao-cera.jpg"],
    ["service_acabamento", "Acabamento", "acabamento", "Acabamento rÃ¡pido para deixar tudo alinhado.", 1500, 10, "/services/acabamento.jpg"],
    ["service_alisante", "Alisante", "alisante", "Alisamento rÃ¡pido com acabamento profissional.", 6500, 30, "/services/pintura.jpg"],
    ["service_pintura", "PigmentaÃ§Ã£o", "piguimentacao", "PigmentaÃ§Ã£o com acabamento profissional.", 9500, 60, "/services/piguimentacao.jpg"],
    ["service_progressiva", "Progressiva", "progressiva", "Progressiva completa com duraÃ§Ã£o maior.", 12000, 60, "/services/pintura.jpg"],
  ].forEach(([id, name, slug, description, price_in_cents, duration_minutes, image_path]) => {
    insertService.run({ id, name, slug, description, price_in_cents, duration_minutes, image_path });
  });

  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (!userCount.count) {
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role, is_active, created_at, updated_at)
      VALUES (@id, @name, @email, @phone, @password_hash, @role, 1, @created_at, @updated_at)
    `);
    const createdAt = nowIso();

    insertUser.run({
      id: "user_owner",
      name: "Dono do Sistema",
      email: "owner@dommus.com",
      phone: "(11) 99999-0000",
      password_hash: bcrypt.hashSync("owner123", 10),
      role: "OWNER",
      created_at: createdAt,
      updated_at: createdAt,
    });

    insertUser.run({
      id: "user_barber",
      name: "Gabriel Rodrigues",
      email: "barbeiro@dommus.com",
      phone: "(11) 98888-1111",
      password_hash: bcrypt.hashSync("barber123", 10),
      role: "ADMIN",
      created_at: createdAt,
      updated_at: createdAt,
    });

    insertUser.run({
      id: "user_customer",
      name: "Mateus Cliente",
      email: "cliente@dommus.com",
      phone: "(11) 97777-2222",
      password_hash: bcrypt.hashSync("cliente123", 10),
      role: "CUSTOMER",
      created_at: createdAt,
      updated_at: createdAt,
    });

    db.prepare(`
      INSERT OR IGNORE INTO barber_profiles (id, user_id, bio, specialty, starts_at_hour, ends_at_hour, interval_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "profile_barber",
      "user_barber",
      "Especialista em cortes clÃ¡ssicos e barba desenhada.",
      "Navalha e degradÃª",
      9,
      20,
      30,
    );

    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(15, 0, 0, 0);

    db.prepare(`
      INSERT OR IGNORE INTO appointments (
        id, protocol_code, customer_id, barber_id, service_id, scheduled_at, end_at,
        total_price_in_cents, deposit_in_cents, checkout_amount_in_cents, paid_amount_in_cents, payment_scope,
        status, deposit_status, notes, created_at, service_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "appointment_demo",
      "DOMMUS-0001",
      "user_customer",
      "user_barber",
      "service_corte_barba",
      scheduledAt.toISOString(),
      new Date(scheduledAt.getTime() + 60 * 60000).toISOString(),
      7500,
      3750,
      3750,
      3750,
      "DEPOSIT",
      "CONFIRMED",
      "PAID",
      "Cliente VIP",
      createdAt,
      "Cabelo e barba",
    );

    db.prepare(`
      INSERT OR IGNORE INTO abandoned_leads (id, user_id, service_id, started_at, last_step, is_converted, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "lead_demo",
      "user_customer",
      "service_corte_barba",
      createdAt,
      "Escolheu o serviÃ§o, mas nÃ£o concluiu o pagamento",
      0,
      createdAt,
    );
  }

  db.prepare(`
    UPDATE users
    SET name = 'Gabriel Rodrigues'
    WHERE id = 'user_barber' OR email = 'barbeiro@dommus.com'
  `).run();

  db.prepare(`
    UPDATE blocked_slots
    SET barber_id = 'user_barber'
    WHERE barber_id <> 'user_barber'
  `).run();

  db.prepare(`
    UPDATE appointments
    SET checkout_amount_in_cents = CASE
      WHEN checkout_amount_in_cents IS NULL OR checkout_amount_in_cents = 0 THEN deposit_in_cents
      ELSE checkout_amount_in_cents
    END,
    paid_amount_in_cents = CASE
      WHEN deposit_status = 'PAID' AND (paid_amount_in_cents IS NULL OR paid_amount_in_cents = 0) THEN COALESCE(checkout_amount_in_cents, deposit_in_cents)
      ELSE COALESCE(paid_amount_in_cents, 0)
    END,
    payment_scope = CASE
      WHEN payment_scope IS NULL OR payment_scope = '' THEN 'DEPOSIT'
      ELSE payment_scope
    END
  `).run();

  db.prepare(`
    UPDATE services
    SET image_path = '/services/barboterapia.jpg'
    WHERE id = 'service_barba' OR slug IN ('barba', 'barboterapia')
  `).run();

  db.prepare(`
    UPDATE services
    SET name = CASE
      WHEN id = 'service_tesoura' THEN 'Cabelo'
      WHEN id = 'service_maquina' THEN 'Sobrancelha'
      WHEN id = 'service_corte_barba' THEN 'Cabelo e barba'
      WHEN id = 'service_cabelo_barba_terapia' THEN 'Cabelo e Barboterapia'
      WHEN id = 'service_barba' THEN 'Barboterapia'
      WHEN id = 'service_pintura' THEN 'PigmentaÃ§Ã£o'
      ELSE name
    END,
    slug = CASE
      WHEN id = 'service_tesoura' THEN 'cabelo'
      WHEN id = 'service_maquina' THEN 'sombrancelha'
      WHEN id = 'service_corte_barba' THEN 'cabelo-barba'
      WHEN id = 'service_cabelo_barba_terapia' THEN 'cabelo-barboterapia'
      WHEN id = 'service_barba' THEN 'barboterapia'
      WHEN id = 'service_pintura' THEN 'piguimentacao'
      ELSE slug
    END,
    description = CASE
      WHEN id = 'service_tesoura' THEN 'Corte e acabamento do cabelo.'
      WHEN id = 'service_maquina' THEN 'Desenho e alinhamento da sobrancelha.'
      WHEN id = 'service_corte_barba' THEN 'Pacote completo de cabelo e barba.'
      WHEN id = 'service_cabelo_barba_terapia' THEN 'Pacote completo de cabelo e barboterapia premium.'
      WHEN id = 'service_barba' THEN 'Barboterapia com toalha quente e acabamento premium.'
      WHEN id = 'service_pintura' THEN 'PigmentaÃ§Ã£o com acabamento profissional.'
      ELSE description
    END,
    duration_minutes = CASE
      WHEN id = 'service_tesoura' THEN 30
      WHEN id = 'service_maquina' THEN 30
      WHEN id = 'service_corte_barba' THEN 60
      WHEN id = 'service_cabelo_barba_terapia' THEN 60
      WHEN id = 'service_barba' THEN 30
      WHEN id = 'service_depilacao' THEN 10
      WHEN id = 'service_acabamento' THEN 10
      WHEN id = 'service_alisante' THEN 30
      WHEN id = 'service_pintura' THEN 60
      WHEN id = 'service_progressiva' THEN 60
      ELSE duration_minutes
    END,
    image_path = CASE
      WHEN id = 'service_maquina' OR slug IN ('corte-maquina', 'sombrancelha') THEN '/services/sombrancelha.jpg'
      WHEN id = 'service_tesoura' OR slug = 'corte-tesoura' THEN '/services/tesoura.jpg'
      WHEN id = 'service_corte_barba' OR slug = 'corte-barba' THEN '/services/corte-barba.jpg'
      WHEN id = 'service_cabelo_barba_terapia' OR slug IN ('cabelo-barba-terapia', 'cabelo-barboterapia') THEN '/services/cabelo-barboterapia.jpg'
      WHEN id = 'service_depilacao' THEN '/services/depilacao-cera.jpg'
      WHEN id = 'service_acabamento' THEN '/services/acabamento.jpg'
      WHEN id IN ('service_alisante', 'service_progressiva') THEN '/services/pintura.jpg'
      WHEN id = 'service_pintura' OR slug IN ('pintura-cabelo', 'piguimentacao') THEN '/services/piguimentacao.jpg'
      ELSE image_path
    END
    WHERE id IN ('service_maquina', 'service_tesoura', 'service_corte_barba', 'service_cabelo_barba_terapia', 'service_barba', 'service_depilacao', 'service_acabamento', 'service_alisante', 'service_pintura', 'service_progressiva')
      OR slug IN ('corte-maquina', 'corte-tesoura', 'corte-barba', 'cabelo-barba-terapia', 'cabelo-barboterapia', 'barba', 'barboterapia', 'pintura-cabelo', 'piguimentacao', 'depilacao-cera', 'acabamento', 'alisante', 'progressiva')
  `).run();

  db.prepare(`
    UPDATE services
    SET price_in_cents = 11000, duration_minutes = 60
    WHERE id = 'service_cabelo_barba_terapia' OR slug IN ('cabelo-barba-terapia', 'cabelo-barboterapia')
  `).run();
}

initDb();

export function getSiteSetting() {
  return db.prepare("SELECT * FROM site_settings WHERE id = ?").get("main") as SiteSetting;
}

export function updateSiteSetting(isOpen: boolean, maintenanceMessage: string) {
  db.prepare(`
    UPDATE site_settings
    SET is_open = ?, maintenance_message = ?, updated_at = ?
    WHERE id = 'main'
  `).run(isOpen ? 1 : 0, maintenanceMessage, nowIso());
}

export function updateCheckoutSettings(input: {
  provider: string;
  handle: string;
  redirectUrl: string;
  webhookUrl: string;
}) {
  db.prepare(`
    UPDATE site_settings
    SET checkout_provider = ?, checkout_handle = ?, checkout_redirect_url = ?, checkout_webhook_url = ?, updated_at = ?
    WHERE id = 'main'
  `).run(
    input.provider || "infinitepay",
    input.handle || null,
    input.redirectUrl || null,
    input.webhookUrl || null,
    nowIso(),
  );
}

export function getUserByEmail(email: string) {
  return db.prepare(`
    SELECT u.*, bp.bio, bp.specialty, bp.starts_at_hour, bp.ends_at_hour, bp.interval_minutes
    FROM users u
    LEFT JOIN barber_profiles bp ON bp.user_id = u.id
    WHERE u.email = ?
  `).get(email) as UserRecord | undefined;
}

export function getUserById(id: string) {
  return db.prepare(`
    SELECT u.*, bp.bio, bp.specialty, bp.starts_at_hour, bp.ends_at_hour, bp.interval_minutes
    FROM users u
    LEFT JOIN barber_profiles bp ON bp.user_id = u.id
    WHERE u.id = ?
  `).get(id) as UserRecord | undefined;
}

export function createUser(input: { name: string; email: string; phone: string; passwordHash: string; role?: string; birthDate?: string | null }) {
  const id = createId("user");
  const timestamp = nowIso();

  db.prepare(`
    INSERT INTO users (id, name, email, phone, birth_date, password_hash, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, input.name, input.email, input.phone, input.birthDate ?? null, input.passwordHash, input.role ?? "CUSTOMER", timestamp, timestamp);

  return getUserById(id)!;
}

export function ensureManualCustomer(input: { name: string; phone: string }) {
  const normalizedPhone = normalizePhone(input.phone);
  const customers = db.prepare(`
    SELECT u.*, bp.bio, bp.specialty, bp.starts_at_hour, bp.ends_at_hour, bp.interval_minutes
    FROM users u
    LEFT JOIN barber_profiles bp ON bp.user_id = u.id
    WHERE u.role = 'CUSTOMER'
  `).all() as UserRecord[];

  const existing = customers.find((customer) => normalizePhone(customer.phone) === normalizedPhone);
  if (existing) {
    return existing;
  }

  const emailBase = normalizedPhone ? `manual-${normalizedPhone}` : `manual-${Date.now()}`;
  let email = `${emailBase}@dommus.local`;
  let suffix = 1;

  while (getUserByEmail(email)) {
    email = `${emailBase}-${suffix}@dommus.local`;
    suffix += 1;
  }

  return createUser({
    name: input.name,
    email,
    phone: input.phone,
    passwordHash: bcrypt.hashSync(crypto.randomUUID(), 10),
    role: "CUSTOMER",
  });
}

export function updateUserProfile(input: { userId: string; email: string; phone: string; birthDate?: string | null; avatarPath?: string | null }) {
  db.prepare(`
    UPDATE users
    SET email = ?, phone = ?, birth_date = ?, avatar_path = COALESCE(?, avatar_path), updated_at = ?
    WHERE id = ?
  `).run(input.email, input.phone, input.birthDate ?? null, input.avatarPath ?? null, nowIso(), input.userId);

  return getUserById(input.userId)!;
}

export function updateUserPasswordByEmail(input: { email: string; passwordHash: string }) {
  db.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = ?
    WHERE email = ?
  `).run(input.passwordHash, nowIso(), input.email.toLowerCase());
}

export function listServices() {
  return db.prepare(`
    SELECT *
    FROM services
    WHERE is_active = 1
    ORDER BY CASE id
      WHEN 'service_tesoura' THEN 1
      WHEN 'service_barba' THEN 2
      WHEN 'service_corte_barba' THEN 3
      WHEN 'service_cabelo_barba_terapia' THEN 4
      WHEN 'service_maquina' THEN 5
      WHEN 'service_depilacao' THEN 6
      WHEN 'service_acabamento' THEN 7
      WHEN 'service_alisante' THEN 8
      WHEN 'service_pintura' THEN 9
      WHEN 'service_progressiva' THEN 10
      ELSE 99
    END
  `).all() as ServiceRecord[];
}

export function getServiceById(id: string) {
  return db.prepare("SELECT * FROM services WHERE id = ?").get(id) as ServiceRecord | undefined;
}

export function listAllServices() {
  return db.prepare("SELECT * FROM services ORDER BY name ASC").all() as ServiceRecord[];
}

export function updateServicePrice(input: { serviceId: string; priceInCents: number }) {
  db.prepare(`
    UPDATE services
    SET price_in_cents = ?
    WHERE id = ?
  `).run(input.priceInCents, input.serviceId);
}

export function listBarbers() {
  return db.prepare(`
    SELECT u.*, bp.bio, bp.specialty, bp.starts_at_hour, bp.ends_at_hour, bp.interval_minutes
    FROM users u
    LEFT JOIN barber_profiles bp ON bp.user_id = u.id
    WHERE u.role IN ('ADMIN', 'BARBER') AND u.is_active = 1
    ORDER BY u.name ASC
  `).all() as UserRecord[];
}

export function getPrimaryBarber() {
  return (
    listBarbers().find((barber) => barber.id === "user_barber" || barber.email === "barbeiro@dommus.com") ??
    listBarbers().find((barber) => barber.name.toLowerCase() === "gabriel rodrigues") ??
    listBarbers().find((barber) => barber.name.toLowerCase().includes("gabriel")) ??
    listBarbers()[0]
  );
}

export function listUserAppointments(userId: string) {
  return db.prepare(`
    SELECT a.*, COALESCE(a.service_summary, s.name) as service_name, b.name as barber_name
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    JOIN users b ON b.id = a.barber_id
    WHERE a.customer_id = ?
    ORDER BY a.scheduled_at ASC
  `).all(userId) as AppointmentRecord[];
}

export function listAppointmentsByBarberOnDate(barberId: string, startIso: string, endIso: string) {
  return db.prepare(`
    SELECT *
    FROM appointments
    WHERE barber_id = ?
      AND scheduled_at >= ?
      AND scheduled_at <= ?
      AND status IN ('PENDING_PAYMENT', 'CONFIRMED')
  `).all(barberId, startIso, endIso) as AppointmentRecord[];
}

export function listBlockedSlotsByBarberOnDate(barberId: string, startIso: string, endIso: string) {
  return db.prepare(`
    SELECT *
    FROM blocked_slots
    WHERE barber_id = ?
      AND starts_at <= ?
      AND ends_at >= ?
  `).all(barberId, endIso, startIso) as BlockedSlotRecord[];
}

export function createAppointment(input: {
  protocolCode: string;
  customerId?: string | null;
  barberId: string;
  serviceId: string;
  serviceSummary?: string;
  scheduledAt: string;
  endAt: string;
  totalPriceInCents: number;
  depositInCents: number;
  checkoutAmountInCents?: number;
  paidAmountInCents?: number;
  paymentScope?: "DEPOSIT" | "FULL";
  status?: "PENDING_PAYMENT" | "CONFIRMED";
  depositStatus?: "PENDING" | "PAID";
  manualCustomerName?: string | null;
  manualCustomerPhone?: string | null;
  manualCustomerEmail?: string | null;
  notes: string;
}) {
  const id = createId("appointment");
  db.prepare(`
    INSERT INTO appointments (
      id, protocol_code, customer_id, barber_id, service_id, scheduled_at, end_at,
      total_price_in_cents, deposit_in_cents, checkout_amount_in_cents, paid_amount_in_cents, payment_scope,
      status, deposit_status, notes, created_at, service_summary, manual_customer_name, manual_customer_phone, manual_customer_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.protocolCode,
    input.customerId ?? null,
    input.barberId,
    input.serviceId,
    input.scheduledAt,
    input.endAt,
    input.totalPriceInCents,
    input.depositInCents,
    input.checkoutAmountInCents ?? input.depositInCents,
    input.paidAmountInCents ?? 0,
    input.paymentScope ?? "DEPOSIT",
    input.status ?? "PENDING_PAYMENT",
    input.depositStatus ?? "PENDING",
    input.notes,
    nowIso(),
    input.serviceSummary ?? null,
    input.manualCustomerName ?? null,
    input.manualCustomerPhone ?? null,
    input.manualCustomerEmail ?? null,
  );

  return id;
}

export function getAppointmentById(id: string) {
  return db.prepare("SELECT * FROM appointments WHERE id = ?").get(id) as AppointmentRecord | undefined;
}

export function getAppointmentByProtocolCode(protocolCode: string) {
  return db.prepare("SELECT * FROM appointments WHERE protocol_code = ?").get(protocolCode) as AppointmentRecord | undefined;
}

export function markAppointmentPaid(id: string) {
  const current = getAppointmentById(id);

  if (!current || current.deposit_status === "PAID") {
    return false;
  }

  db.prepare(`
    UPDATE appointments
    SET status = 'CONFIRMED',
        deposit_status = 'PAID',
        paid_amount_in_cents = CASE
          WHEN checkout_amount_in_cents IS NULL OR checkout_amount_in_cents = 0 THEN deposit_in_cents
          ELSE checkout_amount_in_cents
        END
    WHERE id = ?
  `).run(id);

  const insertReminder = db.prepare(`
    INSERT INTO reminder_logs (id, appointment_id, type, sent_at, channel)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertReminder.run(createId("reminder"), id, "DAY_START", null, "WhatsApp/SMS pendente de integração");
  insertReminder.run(createId("reminder"), id, "ONE_HOUR_BEFORE", null, "WhatsApp/SMS pendente de integração");

  return true;
}

export function createLead(input: { userId?: string; serviceId?: string; lastStep: string; isConverted?: boolean }) {
  const timestamp = nowIso();
  db.prepare(`
    INSERT INTO abandoned_leads (id, user_id, service_id, started_at, last_step, is_converted, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(createId("lead"), input.userId ?? null, input.serviceId ?? null, timestamp, input.lastStep, input.isConverted ? 1 : 0, timestamp);
}

export function convertLeadsForUser(userId: string) {
  db.prepare(`
    UPDATE abandoned_leads
    SET is_converted = 1, last_step = 'Convertido em agendamento confirmado'
    WHERE user_id = ? AND is_converted = 0
  `).run(userId);
}

export function listAppointmentsForAdmin(barberIds?: string[]) {
  if (barberIds?.length) {
    const placeholders = barberIds.map(() => "?").join(", ");
    return db.prepare(`
      SELECT a.*,
             COALESCE(c.name, a.manual_customer_name) as customer_name,
             COALESCE(c.email, a.manual_customer_email) as customer_email,
             COALESCE(c.phone, a.manual_customer_phone) as customer_phone,
             c.avatar_path as customer_avatar_path,
             b.name as barber_name,
             COALESCE(a.service_summary, s.name) as service_name
      FROM appointments a
      LEFT JOIN users c ON c.id = a.customer_id
      JOIN users b ON b.id = a.barber_id
      JOIN services s ON s.id = a.service_id
      WHERE a.barber_id IN (${placeholders})
      ORDER BY a.scheduled_at ASC
    `).all(...barberIds) as AppointmentRecord[];
  }

  return db.prepare(`
    SELECT a.*,
           COALESCE(c.name, a.manual_customer_name) as customer_name,
           COALESCE(c.email, a.manual_customer_email) as customer_email,
           COALESCE(c.phone, a.manual_customer_phone) as customer_phone,
           c.avatar_path as customer_avatar_path,
           b.name as barber_name,
           COALESCE(a.service_summary, s.name) as service_name
    FROM appointments a
    LEFT JOIN users c ON c.id = a.customer_id
    JOIN users b ON b.id = a.barber_id
    JOIN services s ON s.id = a.service_id
    ORDER BY a.scheduled_at ASC
  `).all() as AppointmentRecord[];
}

export function listBlockedSlots(barberIds?: string[]) {
  if (barberIds?.length) {
    const placeholders = barberIds.map(() => "?").join(", ");
    return db.prepare(`
      SELECT bs.*, u.name as barber_name
      FROM blocked_slots bs
      JOIN users u ON u.id = bs.barber_id
      WHERE bs.barber_id IN (${placeholders})
      ORDER BY bs.starts_at ASC
    `).all(...barberIds) as BlockedSlotRecord[];
  }

  return db.prepare(`
    SELECT bs.*, u.name as barber_name
    FROM blocked_slots bs
    JOIN users u ON u.id = bs.barber_id
    ORDER BY bs.starts_at ASC
  `).all() as BlockedSlotRecord[];
}

export function createBlockedSlot(input: { barberId: string; startsAt: string; endsAt: string; reason: string }) {
  db.prepare(`
    INSERT INTO blocked_slots (id, barber_id, starts_at, ends_at, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(createId("block"), input.barberId, input.startsAt, input.endsAt, input.reason, nowIso());
}

function isDefaultAutoBlockedDay(slot: Pick<BlockedSlotRecord, "starts_at" | "ends_at" | "reason">) {
  const startsAt = new Date(slot.starts_at);
  const endsAt = new Date(slot.ends_at);

  return (
    slot.reason?.includes("Fechado por padrao ate o barbeiro liberar") &&
    startsAt.getUTCHours() === 3 &&
    startsAt.getUTCMinutes() === 0 &&
    endsAt.getUTCHours() === 2 &&
    endsAt.getUTCMinutes() === 59
  );
}

function getDefaultBlockedPeriodKey(slot: Pick<BlockedSlotRecord, "starts_at" | "ends_at" | "reason">) {
  if (!slot.reason?.includes("Fechado por padrão até o barbeiro liberar")) {
    return null;
  }

  const startsAt = new Date(slot.starts_at);
  const endsAt = new Date(slot.ends_at);
  const startTime = `${String(startsAt.getUTCHours()).padStart(2, "0")}:${String(startsAt.getUTCMinutes()).padStart(2, "0")}:${String(startsAt.getUTCSeconds()).padStart(2, "0")}`;
  const endTime = `${String(endsAt.getUTCHours()).padStart(2, "0")}:${String(endsAt.getUTCMinutes()).padStart(2, "0")}:${String(endsAt.getUTCSeconds()).padStart(2, "0")}`;

  const match = defaultAutoBlockedPeriods.find((period) => {
    const expectedStart = new Date(toBrazilDateTimeIso(formatBrazilDateInput(slot.starts_at), period.startTime));
    const expectedEnd = new Date(toBrazilDateTimeIso(formatBrazilDateInput(slot.starts_at), period.endTime));
    const expectedStartTime = `${String(expectedStart.getUTCHours()).padStart(2, "0")}:${String(expectedStart.getUTCMinutes()).padStart(2, "0")}:${String(expectedStart.getUTCSeconds()).padStart(2, "0")}`;
    const expectedEndTime = `${String(expectedEnd.getUTCHours()).padStart(2, "0")}:${String(expectedEnd.getUTCMinutes()).padStart(2, "0")}:${String(expectedEnd.getUTCSeconds()).padStart(2, "0")}`;
    return expectedStartTime === startTime && expectedEndTime === endTime;
  });

  return match?.key ?? null;
}

function markDefaultBlockedDayReleased(barberId: string, dateIso: string) {
  db.prepare(`
    INSERT OR REPLACE INTO released_default_blocked_days (barber_id, date_iso, created_at)
    VALUES (?, ?, ?)
  `).run(barberId, dateIso, nowIso());
}

function markDefaultBlockedPeriodReleased(barberId: string, dateIso: string, periodKey: string) {
  db.prepare(`
    INSERT OR REPLACE INTO released_default_blocked_periods (barber_id, date_iso, period_key, created_at)
    VALUES (?, ?, ?, ?)
  `).run(barberId, dateIso, periodKey, nowIso());
}

export function clearDefaultBlockedDayReleased(barberId: string, dateIso: string) {
  db.prepare(`
    DELETE FROM released_default_blocked_days
    WHERE barber_id = ? AND date_iso = ?
  `).run(barberId, dateIso);
}

export function clearDefaultBlockedPeriodReleased(barberId: string, dateIso: string, periodKey: string) {
  db.prepare(`
    DELETE FROM released_default_blocked_periods
    WHERE barber_id = ? AND date_iso = ? AND period_key = ?
  `).run(barberId, dateIso, periodKey);
}

export function deleteBlockedSlotById(id: string) {
  const slot = db.prepare(`
    SELECT id, barber_id, starts_at, ends_at, reason
    FROM blocked_slots
    WHERE id = ?
    LIMIT 1
  `).get(id) as BlockedSlotRecord | undefined;

  db.prepare(`
    DELETE FROM blocked_slots
    WHERE id = ?
  `).run(id);

  if (slot && isDefaultAutoBlockedDay(slot)) {
    markDefaultBlockedDayReleased(slot.barber_id, formatBrazilDateInput(slot.starts_at));
  }

  if (slot) {
    const defaultPeriodKey = getDefaultBlockedPeriodKey(slot);
    if (defaultPeriodKey) {
      markDefaultBlockedPeriodReleased(slot.barber_id, formatBrazilDateInput(slot.starts_at), defaultPeriodKey);
    }
  }
}

export function ensureBlockedDay(barberId: string, dateIso: string, reason: string) {
  const wasReleased = db.prepare(`
    SELECT 1
    FROM released_default_blocked_days
    WHERE barber_id = ? AND date_iso = ?
    LIMIT 1
  `).get(barberId, dateIso);

  if (wasReleased) {
    return null;
  }

  const startsAt = toBrazilDateTimeIso(dateIso, "00:00:00");
  const endsAt = toBrazilDateTimeIso(dateIso, "23:59:59");

  const existing = db.prepare(`
    SELECT id
    FROM blocked_slots
    WHERE barber_id = ?
      AND starts_at = ?
      AND ends_at = ?
    LIMIT 1
  `).get(barberId, startsAt, endsAt) as { id: string } | undefined;

  if (existing) {
    return existing.id;
  }

  createBlockedSlot({
    barberId,
    startsAt,
    endsAt,
    reason,
  });

  return null;
}

export function ensureDefaultBlockedPeriodsForDate(barberId: string, dateIso: string) {
  defaultAutoBlockedPeriods.forEach((period) => {
    const wasReleased = db.prepare(`
      SELECT 1
      FROM released_default_blocked_periods
      WHERE barber_id = ? AND date_iso = ? AND period_key = ?
      LIMIT 1
    `).get(barberId, dateIso, period.key);

    if (wasReleased) {
      return;
    }

    const startsAt = toBrazilDateTimeIso(dateIso, period.startTime);
    const endsAt = toBrazilDateTimeIso(dateIso, period.endTime);

    const existing = db.prepare(`
      SELECT id
      FROM blocked_slots
      WHERE barber_id = ?
        AND starts_at = ?
        AND ends_at = ?
      LIMIT 1
    `).get(barberId, startsAt, endsAt) as { id: string } | undefined;

    if (existing) {
      return;
    }

    createBlockedSlot({
      barberId,
      startsAt,
      endsAt,
      reason: period.reason,
    });
  });
}

export function listCustomers(search?: string) {
  if (search) {
    const like = `%${search}%`;
    return db.prepare(`
      SELECT *
      FROM users
      WHERE role = 'CUSTOMER' AND (name LIKE ? OR phone LIKE ?)
      ORDER BY created_at DESC
    `).all(like, like) as UserRecord[];
  }

  return db.prepare(`
    SELECT *
    FROM users
    WHERE role = 'CUSTOMER'
    ORDER BY created_at DESC
  `).all() as UserRecord[];
}

export function listBirthdayCustomersOnDate(dateIso: string) {
  const match = dateIso.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!match) return [] as UserRecord[];

  const [, month, day] = match;
  return db.prepare(`
    SELECT *
    FROM users
    WHERE role = 'CUSTOMER'
      AND birth_date IS NOT NULL
      AND substr(birth_date, 6, 2) = ?
      AND substr(birth_date, 9, 2) = ?
    ORDER BY name ASC
  `).all(month, day) as UserRecord[];
}

export function countPendingAppointments(barberIds?: string[]) {
  if (barberIds?.length) {
    const placeholders = barberIds.map(() => "?").join(", ");
    return (db.prepare(`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE status = 'PENDING_PAYMENT' AND barber_id IN (${placeholders})
    `).get(...barberIds) as { count: number }).count;
  }

  return (db.prepare(`
    SELECT COUNT(*) as count
    FROM appointments
    WHERE status = 'PENDING_PAYMENT'
  `).get() as { count: number }).count;
}

export function listAllUsers() {
  return db.prepare("SELECT * FROM users ORDER BY created_at DESC").all() as UserRecord[];
}

export function updateUserRoleAndStatus(input: { userId: string; role: string; isActive: boolean }) {
  db.prepare(`
    UPDATE users
    SET role = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(input.role, input.isActive ? 1 : 0, nowIso(), input.userId);
}

export function listPendingAppointmentsForOwner() {
  return db.prepare(`
    SELECT a.*,
           COALESCE(c.name, a.manual_customer_name) as customer_name,
           COALESCE(c.email, a.manual_customer_email) as customer_email,
           COALESCE(c.phone, a.manual_customer_phone) as customer_phone,
           b.name as barber_name,
           COALESCE(a.service_summary, s.name) as service_name
    FROM appointments a
    LEFT JOIN users c ON c.id = a.customer_id
    JOIN users b ON b.id = a.barber_id
    JOIN services s ON s.id = a.service_id
    WHERE a.deposit_status = 'PENDING'
    ORDER BY a.created_at DESC
  `).all() as AppointmentRecord[];
}

export function updateAppointmentCheckoutScope(input: {
  appointmentId: string;
  customerId: string;
  paymentScope: "DEPOSIT" | "FULL";
}) {
  const appointment = db.prepare(`
    SELECT *
    FROM appointments
    WHERE id = ? AND customer_id = ?
  `).get(input.appointmentId, input.customerId) as AppointmentRecord | undefined;

  if (!appointment) {
    return null;
  }

  const checkoutAmountInCents =
    input.paymentScope === "FULL" ? appointment.total_price_in_cents : appointment.deposit_in_cents;

  db.prepare(`
    UPDATE appointments
    SET payment_scope = ?, checkout_amount_in_cents = ?
    WHERE id = ?
  `).run(input.paymentScope, checkoutAmountInCents, input.appointmentId);

  return getAppointmentById(input.appointmentId);
}

export function listLeads() {
  return db.prepare(`
    SELECT l.*, u.name as user_name, u.email as user_email, u.phone as user_phone, s.name as service_name
    FROM abandoned_leads l
    LEFT JOIN users u ON u.id = l.user_id
    LEFT JOIN services s ON s.id = l.service_id
    ORDER BY l.created_at DESC
  `).all() as LeadRecord[];
}

export function cancelAppointmentById(id: string) {
  db.prepare(`
    UPDATE appointments
    SET status = 'CANCELED'
    WHERE id = ?
  `).run(id);
}

export function deleteAppointmentById(id: string) {
  db.prepare(`
    DELETE FROM reminder_logs
    WHERE appointment_id = ?
  `).run(id);

  db.prepare(`
    DELETE FROM appointments
    WHERE id = ?
  `).run(id);
}

export function deleteLeadById(id: string) {
  db.prepare(`
    DELETE FROM abandoned_leads
    WHERE id = ?
  `).run(id);
}








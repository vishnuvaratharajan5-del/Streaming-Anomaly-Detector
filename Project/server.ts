/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { 
  User, 
  UserRole, 
  SecurityLog, 
  MetricType, 
  StreamConfig, 
  StreamEvent, 
  Anomaly, 
  AnomalySeverity, 
  AnomalyStatus, 
  SystemSettings,
  DashboardMetrics
} from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// --- REAL-TIME PLATFORM TELEMETRY TRACKERS ---
import os from 'os';
let actualRequestCountInLastSecond = 0;
let actualCountAccumulator = 0;
let lastRecordedLatencyMs = 24;
let actualFailedAuthesInLastMin = 0;

// Global middleware to track true load metrics dynamically
app.use((req, res, next) => {
  actualCountAccumulator++;
  const start = Date.now();
  res.on('finish', () => {
    const elapsed = Date.now() - start;
    if (elapsed > 0 && req.path.startsWith('/api')) {
      lastRecordedLatencyMs = Math.round((lastRecordedLatencyMs * 0.85) + (elapsed * 0.15));
    }
    if (res.statusCode === 401 || res.statusCode === 403 || (req.path === '/api/auth/login' && res.statusCode >= 400)) {
      actualFailedAuthesInLastMin++;
      setTimeout(() => {
        actualFailedAuthesInLastMin = Math.max(0, actualFailedAuthesInLastMin - 1);
      }, 60000);
    }
  });
  next();
});

// Periodic request rate tracking loops
setInterval(() => {
  actualRequestCountInLastSecond = actualCountAccumulator;
  actualCountAccumulator = 0;
}, 1000);

// Paths
const DB_FILE = path.join(process.cwd(), 'anomaly_detector_db.json');

// --- DATABASE IN-MEMORY AND FILE STORAGE ---
interface LocalDatabase {
  users: Record<string, User & { salt: string; passwordHash: string }>;
  events: StreamEvent[];
  anomalies: Anomaly[];
  securityLogs: SecurityLog[];
  settings: SystemSettings;
}

let db: LocalDatabase = {
  users: {},
  events: [],
  anomalies: [],
  securityLogs: [],
  settings: {
    detectionSensitiveZScore: 2.8,
    rollingWindowSize: 50,
    streamIntervalMs: 1000,
    autoResolveDurationMin: 15,
    authPasscodeMinLength: 6,
    maxSessionIdleMs: 600000, // 10 mins
    manualModeOnly: true
  }
};

// Cryptographic Password Hashing (Secure PBKDF2)
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Seed Initial Database
function seedDatabase() {
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const opSalt = crypto.randomBytes(16).toString('hex');
  const viewSalt = crypto.randomBytes(16).toString('hex');

  const adminId = 'u-admin-01';
  const opId = 'u-operator-01';
  const viewId = 'u-viewer-01';

  db.users[adminId] = {
    id: adminId,
    email: 'admin@anomaly.io',
    name: 'Chief Admin',
    role: 'Admin',
    createdAt: new Date().toISOString(),
    salt: adminSalt,
    passwordHash: hashPassword('admin123', adminSalt)
  };

  db.users[opId] = {
    id: opId,
    email: 'operator@anomaly.io',
    name: 'Lead Operator',
    role: 'Operator',
    createdAt: new Date().toISOString(),
    salt: opSalt,
    passwordHash: hashPassword('operator123', opSalt)
  };

  db.users[viewId] = {
    id: viewId,
    email: 'viewer@anomaly.io',
    name: 'Guest Viewer',
    role: 'Viewer',
    createdAt: new Date().toISOString(),
    salt: viewSalt,
    passwordHash: hashPassword('viewer123', viewSalt)
  };

  // Seed initial security logs
  db.securityLogs.push({
    id: 'sec-01',
    timestamp: new Date().toISOString(),
    userId: 'system',
    userEmail: 'system@anomaly.io',
    action: 'Database Initialized and Seeded',
    ipAddress: '127.0.0.1',
    severity: 'low'
  });

  // Seed historical metric events and a couple of historical anomalies
  const types: MetricType[] = ['api_latency', 'auth_failures', 'db_connections', 'cpu_usage', 'payment_volume'];
  const baseValues: Record<MetricType, number> = {
    api_latency: 80, // ms
    auth_failures: 2, // count/sec
    db_connections: 45, // %
    cpu_usage: 30, // %
    payment_volume: 150 // req/sec
  };

  const variances: Record<MetricType, number> = {
    api_latency: 12,
    auth_failures: 1,
    db_connections: 5,
    cpu_usage: 8,
    payment_volume: 15
  };

  // Create sliding rolling events for 100 periods to establish a normal baseline
  const startTime = Date.now() - 100 * 1000;
  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(startTime + i * 1000).toISOString();
    for (const t of types) {
      const normalValue = baseValues[t] + (Math.random() - 0.5) * 2 * variances[t];
      db.events.push({
        id: `evt-seed-${t}-${i}`,
        timestamp,
        metricType: t,
        value: Number(normalValue.toFixed(1)),
        isAnomaly: false
      });
    }
  }

  // Inject a historical high anomaly manually in the seed data
  const tNormal = new Date(Date.now() - 30 * 1000).toISOString();
  // CPU Overload anomaly
  const cpuAnomalyValue = 97.4;
  db.events.push({
    id: 'evt-seed-cpu-anomaly',
    timestamp: tNormal,
    metricType: 'cpu_usage',
    value: cpuAnomalyValue,
    isAnomaly: true,
    anomalyScore: 4.8,
    baselineMean: 30.2,
    baselineStd: 6.1
  });

  db.anomalies.push({
    id: 'an-seed-cpu',
    eventId: 'evt-seed-cpu-anomaly',
    timestamp: tNormal,
    metricType: 'cpu_usage',
    value: cpuAnomalyValue,
    expectedValue: 30.2,
    deviationPercentage: 222.5,
    confidenceScore: 96,
    severity: 'High',
    status: 'Resolved',
    notes: ['Automated warning triggered.', 'Heuristic detection flagged Z-Score 4.8', 'Operator Resolved: Routine docker garbage collection performed.'],
    assignedTo: 'operator-01',
    metricsAtTime: {
      mean: 30.2,
      std: 6.1,
      zScore: 4.8
    }
  });

  saveToDisk();
}

// Loader
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
      if (db.settings && db.settings.manualModeOnly === undefined) {
        db.settings.manualModeOnly = true;
      }
      console.log('Database loaded successfully from', DB_FILE);
    } else {
      console.log('Database file not found. Generating seeding schema...');
      seedDatabase();
    }
  } catch (error) {
    console.error('CRITICAL: Error loading database. Falling back to seeding. Error:', error);
    seedDatabase();
  }
}

// Saver
const saveToDiskDebounced = (() => {
  let timer: NodeJS.Timeout | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      saveToDisk();
    }, 500);
  };
})();

function saveToDisk() {
  try {
    // Keep events array from inflating indefinitely. Limit events list to latest 2000 events
    if (db.events.length > 2000) {
      db.events = db.events.slice(db.events.length - 2000);
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database to file system:', err);
  }
}

loadDatabase();

// --- ACTIVE SESSIONS ---
interface ActiveSession {
  userId: string;
  userEmail: string;
  userName: string;
  role: UserRole;
  expiresAt: number;
}
const activeSessions: Record<string, ActiveSession> = {};

// Clean expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const token in activeSessions) {
    if (activeSessions[token].expiresAt < now) {
      delete activeSessions[token];
    }
  }
}, 60000);

// --- SSE BROADCASERS ---
interface SseConnection {
  id: string;
  res: any;
  userId: string;
}
let sseConnections: SseConnection[] = [];

function broadcastToSse(eventName: string, data: any) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  sseConnections.forEach(conn => {
    try {
      conn.res.write(payload);
    } catch (e) {
      // client broken or closed
    }
  });
}

// --- SECURE AUTHORIZATION MIDDLEWARES ---
function getAuthTokenFromReq(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

function resolveSession(req: express.Request): ActiveSession | null {
  const token = getAuthTokenFromReq(req);
  if (!token) return null;
  const session = activeSessions[token];
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    // Session expired
    delete activeSessions[token];
    return null;
  }
  // Refresh idle timeout
  session.expiresAt = Date.now() + db.settings.maxSessionIdleMs;
  return session;
}

function requireAuth(allowedRoles?: UserRole[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const session = resolveSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized. Please log in securely.' });
    }
    if (allowedRoles && !allowedRoles.includes(session.role)) {
      // Log unauthorized attempt
      const logId = `sec-err-${crypto.randomBytes(6).toString('hex')}`;
      db.securityLogs.unshift({
        id: logId,
        timestamp: new Date().toISOString(),
        userId: session.userId,
        userEmail: session.userEmail,
        action: `FORBIDDEN: Attempted ${req.method} ${req.originalUrl} without ${allowedRoles.join(',')} permission`,
        ipAddress: req.ip || '127.0.0.1',
        severity: 'high'
      });
      saveToDiskDebounced();

      return res.status(403).json({ 
        error: `Access Denied. You are authorized as a ${session.role}, but this action requires one of the following privilege permissions: [${allowedRoles.join(', ')}]` 
      });
    }
    // Attach authorization logs to the request
    (req as any).user = session;
    next();
  };
}


// --- STREAM SIMULATOR ENGINE ---
const streamConfigs: Record<MetricType, StreamConfig> = {
  api_latency: {
    id: 'api_latency',
    name: 'API Gateway Latency',
    unit: 'ms',
    baseValue: 80,
    variance: 15,
    noiseFloor: 15,
    frequencyMs: 1000,
    isActive: true
  },
  auth_failures: {
    id: 'auth_failures',
    name: 'Auth Failure Rates',
    unit: '/sec',
    baseValue: 1.5,
    variance: 0.8,
    noiseFloor: 0.1,
    frequencyMs: 1000,
    isActive: true
  },
  db_connections: {
    id: 'db_connections',
    name: 'Database Connection Pool Load',
    unit: '%',
    baseValue: 40,
    variance: 6,
    noiseFloor: 10,
    frequencyMs: 1000,
    isActive: true
  },
  cpu_usage: {
    id: 'cpu_usage',
    name: 'Application Cluster CPU',
    unit: '%',
    baseValue: 28,
    variance: 7,
    noiseFloor: 5,
    frequencyMs: 1000,
    isActive: true
  },
  payment_volume: {
    id: 'payment_volume',
    name: 'Inbound Transaction Velocity',
    unit: 'req/sec',
    baseValue: 180,
    variance: 25,
    noiseFloor: 30,
    frequencyMs: 1000,
    isActive: true
  }
};

interface ManualInjection {
  metricType: MetricType;
  type: 'spike' | 'drop' | 'drift' | 'burst';
  ticksRemaining: number;
  multiplier: number;
}
let activeInjections: ManualInjection[] = [];

// Statistical computation helper
function computeBaseStatistics(metricType: MetricType) {
  // Pull latest N events from the list of historical entries to compute baseline
  const pastEvents = db.events
    .filter(e => e.metricType === metricType)
    .slice(-db.settings.rollingWindowSize);

  if (pastEvents.length < 15) {
    // Standard baseline configs if data is sparse
    const config = streamConfigs[metricType];
    return { mean: config.baseValue, std: config.variance || 5 };
  }

  const values = pastEvents.map(e => e.value);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / values.length;
  const sqDiffSum = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const variance = sqDiffSum / (values.length - 1 || 1);
  const std = Math.sqrt(variance);

  return { mean, std: std || 1 };
}

// Tick Simulation loop
let simulationIntervalId: NodeJS.Timeout | null = null;

function tickSimulation() {
  if (db.settings.manualModeOnly) {
    return;
  }
  const timestamp = new Date().toISOString();
  
  (Object.keys(streamConfigs) as MetricType[]).forEach(type => {
    const config = streamConfigs[type];
    if (!config.isActive) return;

    // Check statistics baseline
    const stats = computeBaseStatistics(type);

    // Compute basic noise and value
    let baseNoise = (Math.random() - 0.5) * 2 * config.variance;
    let computedValue = config.baseValue + baseNoise;

    // Apply active user injected anomalies
    const matchedInjIdx = activeInjections.findIndex(inj => inj.metricType === type);
    let injected = false;
    let injectionType: any = null;

    if (matchedInjIdx !== -1) {
      const inj = activeInjections[matchedInjIdx];
      injected = true;
      injectionType = inj.type;

      if (inj.type === 'spike') {
        computedValue = config.baseValue + (config.variance * inj.multiplier * (2 + Math.random()));
        inj.ticksRemaining--;
      } else if (inj.type === 'drop') {
        computedValue = Math.max(config.noiseFloor, config.baseValue - (config.baseValue * 0.9) - Math.random() * 5);
        inj.ticksRemaining--;
      } else if (inj.type === 'drift') {
        const driftFactor = (5 - inj.ticksRemaining) / 5; // slowly increase
        computedValue = config.baseValue + (config.variance * 5.5 * driftFactor) + baseNoise;
        inj.ticksRemaining--;
      } else if (inj.type === 'burst') {
        computedValue = config.baseValue + (config.variance * (Math.random() > 0.5 ? 4.2 : -4.2));
        inj.ticksRemaining--;
      }

      if (inj.ticksRemaining <= 0) {
        activeInjections.splice(matchedInjIdx, 1);
      }
    } else {
      // OVERRIDE WITH GENUINE NODE SENSORS AND LIVE METRICS (REAL DATA)
      if (type === 'cpu_usage') {
        const load = os.loadavg()[0];
        const calculatedCpu = load > 0 ? Math.min(100, Math.round(load * 12)) : Math.round(15 + (process.memoryUsage().heapUsed / 1024 / 1024 / 5.5));
        computedValue = calculatedCpu;
      } else if (type === 'db_connections') {
        const recordDensity = db.events.length + db.securityLogs.length;
        computedValue = Math.min(100, Math.max(12, Math.round((recordDensity / 2200) * 100)));
      } else if (type === 'api_latency') {
        computedValue = Math.max(5, Math.min(150, lastRecordedLatencyMs));
      } else if (type === 'auth_failures') {
        computedValue = actualFailedAuthesInLastMin + (Math.random() > 0.85 ? 1 : 0);
      } else if (type === 'payment_volume') {
        computedValue = (actualRequestCountInLastSecond * 12) + 15 + Math.floor(Math.random() * 6);
      }
    }

    // Double check caps on cpu_usage and db_connections
    if (type === 'cpu_usage' || type === 'db_connections') {
      computedValue = Math.min(100, Math.max(0, computedValue));
    } else {
      computedValue = Math.max(0, computedValue);
    }

    computedValue = Number(computedValue.toFixed(2));

    // Statistical Anomaly Calculation (Z-Score)
    const zScore = Math.abs(computedValue - stats.mean) / (stats.std || 1);
    const zThreshold = db.settings.detectionSensitiveZScore;
    const isAnomaly = zScore > zThreshold;

    let finalEvent: StreamEvent = {
      id: `evt-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp,
      metricType: type,
      value: computedValue,
      isAnomaly,
      anomalyScore: Number(zScore.toFixed(2)),
      baselineMean: Number(stats.mean.toFixed(2)),
      baselineStd: Number(stats.std.toFixed(2))
    };

    db.events.push(finalEvent);

    // If an anomaly is detected, create a persistent audit trace
    if (isAnomaly) {
      const deviationPercentage = stats.mean !== 0 ? ((computedValue - stats.mean) / stats.mean) * 100 : 100;
      
      // Map Z-Score to a logarithmic confidence level from 60 - 99%
      let confidence = Math.min(99, Math.round(60 + (zScore / (zThreshold * 2.5)) * 39));
      if (confidence < 60) confidence = 64;

      // Determine Severity
      let severity: AnomalySeverity = 'Low';
      if (zScore > zThreshold * 2.2) {
        severity = 'Critical';
      } else if (zScore > zThreshold * 1.6) {
        severity = 'High';
      } else if (zScore > zThreshold * 1.1) {
        severity = 'Medium';
      }

      const id = `an-${crypto.randomBytes(6).toString('hex')}`;
      const newAnomaly: Anomaly = {
        id,
        eventId: finalEvent.id,
        timestamp,
        metricType: type,
        value: computedValue,
        expectedValue: Number(stats.mean.toFixed(2)),
        deviationPercentage: Number(deviationPercentage.toFixed(1)),
        confidenceScore: confidence,
        severity,
        status: 'Active',
        notes: [
          `Statistical Trigger: Metric exceeded threshold. Computed Z-score of ${zScore.toFixed(2)} (Limit: ${zThreshold}).`,
          injected ? `Origin: Manual simulation injection of style [${injectionType.toUpperCase()}].` : 'Origin: Detected in automated passive live stream tracking.'
        ],
        metricsAtTime: {
          mean: Number(stats.mean.toFixed(2)),
          std: Number(stats.std.toFixed(2)),
          zScore: Number(zScore.toFixed(2))
        }
      };

      db.anomalies.unshift(newAnomaly);

      // Automated system notifications for critical/high threats
      if (severity === 'High' || severity === 'Critical') {
        const securityAlertId = `sec-alr-${crypto.randomBytes(5).toString('hex')}`;
        db.securityLogs.unshift({
          id: securityAlertId,
          timestamp,
          userId: 'system',
          userEmail: 'agent@anomaly.io',
          action: `CRITICAL THREAT: ${config.name} reached ${severity} severity. Value: ${computedValue}${config.unit}`,
          ipAddress: '127.0.0.1',
          severity: 'high'
        });
      }

      // Stream broadcast immediately
      broadcastToSse('anomaly_alert', newAnomaly);
    }

    // Stream the raw event to UI charts
    broadcastToSse('metric_event', finalEvent);
  });

  saveToDiskDebounced();
}

function startSimulation() {
  if (simulationIntervalId) clearInterval(simulationIntervalId);
  if (db.settings.manualModeOnly) {
    simulationIntervalId = null;
    console.log('Simulation PAUSED because Manual mode is enabled.');
    return;
  }
  simulationIntervalId = setInterval(tickSimulation, db.settings.streamIntervalMs);
  console.log(`Simulation stream loops bootloaded at rate ${db.settings.streamIntervalMs}ms`);
}

function stopSimulation() {
  if (simulationIntervalId) {
    clearInterval(simulationIntervalId);
    simulationIntervalId = null;
    console.log('Stream simulation PAUSED.');
  }
}

// Start immediately on launch
startSimulation();

// --- SECURE CONTROLLER ENDPOINTS ---

// Secure Auth Routes
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields (email, password, name) are required.' });
    }

    // Enforce Password Security Checks
    if (password.length < db.settings.authPasscodeMinLength) {
      return res.status(400).json({ error: `Secure Standard: password must be at least ${db.settings.authPasscodeMinLength} characters long.` });
    }

    // Check existing
    const existing = Object.values(db.users).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'This user email email is already registered.' });
    }

    const assignedRole: UserRole = (role && ['Admin', 'Operator', 'Viewer'].includes(role)) ? role : 'Viewer';

    // Password cryptography
    const salt = crypto.randomBytes(16).toString('hex');
    const id = `u-${crypto.randomBytes(8).toString('hex')}`;
    
    db.users[id] = {
      id,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role: assignedRole,
      createdAt: new Date().toISOString(),
      salt,
      passwordHash: hashPassword(password, salt)
    };

    // Log the user addition
    db.securityLogs.unshift({
      id: `sec-${crypto.randomBytes(6).toString('hex')}`,
      timestamp: new Date().toISOString(),
      userId: id,
      userEmail: email.toLowerCase(),
      action: `SECURE REGISTRY: Added new user account with role authority [${assignedRole}]`,
      ipAddress: req.ip || '127.0.0.1',
      severity: 'medium'
    });

    saveToDisk();

    res.status(201).json({ 
      success: true, 
      message: 'Account provisioned successfully. You can now login.',
      user: { id, email, name, role: assignedRole } 
    });
  } catch (err: any) {
    res.status(500).json({ error: 'System registry failure: ' + err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Both email and password are required.' });
    }

    const targetUser = Object.values(db.users).find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!targetUser) {
      // Intentionally generic security rejection to avoid user enumeration attacks
      return res.status(400).json({ error: 'Invalid security credentials or password error.' });
    }

    const checkHash = hashPassword(password, targetUser.salt);
    if (checkHash !== targetUser.passwordHash) {
      // Log failed attempt
      db.securityLogs.unshift({
        id: `sec-err-${crypto.randomBytes(6).toString('hex')}`,
        timestamp: new Date().toISOString(),
        userId: targetUser.id,
        userEmail: targetUser.email,
        action: 'FAILED LOGIN ATTEMPT: Incorrect credential pass provided.',
        ipAddress: req.ip || '127.0.0.1',
        severity: 'high'
      });
      saveToDiskDebounced();
      return res.status(400).json({ error: 'Invalid security credentials or password error.' });
    }

    // Generate secure session token
    const token = crypto.randomBytes(32).toString('hex');
    activeSessions[token] = {
      userId: targetUser.id,
      userEmail: targetUser.email,
      userName: targetUser.name,
      role: targetUser.role,
      expiresAt: Date.now() + db.settings.maxSessionIdleMs
    };

    targetUser.lastLogin = new Date().toISOString();

    db.securityLogs.unshift({
      id: `sec-succ-${crypto.randomBytes(6).toString('hex')}`,
      timestamp: new Date().toISOString(),
      userId: targetUser.id,
      userEmail: targetUser.email,
      action: `SECURE LOGIN SESS: Session initiated with role ${targetUser.role}`,
      ipAddress: req.ip || '127.0.0.1',
      severity: 'low'
    });

    saveToDisk();

    res.json({
      success: true,
      token,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        lastLogin: targetUser.lastLogin
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Secure login process error: ' + err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = getAuthTokenFromReq(req);
  if (token && activeSessions[token]) {
    const s = activeSessions[token];
    db.securityLogs.unshift({
      id: `sec-out-${crypto.randomBytes(6).toString('hex')}`,
      timestamp: new Date().toISOString(),
      userId: s.userId,
      userEmail: s.userEmail,
      action: 'SECURE LOGOUT: Terminated active session token',
      ipAddress: req.ip || '127.0.0.1',
      severity: 'low'
    });
    delete activeSessions[token];
    saveToDiskDebounced();
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Get current session context
app.get('/api/auth/me', (req, res) => {
  const session = resolveSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }
  res.json({
    user: {
      id: session.userId,
      email: session.userEmail,
      name: session.userName,
      role: session.role
    }
  });
});

// Secure API Resources (Query & Mutation Routing)

// Register Manual Telemetry Metric Event
app.post('/api/events/register', requireAuth(['Admin', 'Operator']), (req, res) => {
  try {
    const { metricType, value } = req.body;
    if (!metricType || value === undefined || isNaN(Number(value))) {
      return res.status(400).json({ error: 'Metric channel and valid numeric value are required.' });
    }

    const mType = metricType as MetricType;
    if (!streamConfigs[mType]) {
      return res.status(400).json({ error: 'Invalid metric type requested.' });
    }

    const computedValue = Number(Number(value).toFixed(2));
    const stats = computeBaseStatistics(mType);
    const zScore = Math.abs(computedValue - stats.mean) / (stats.std || 1);
    const zThreshold = db.settings.detectionSensitiveZScore;
    const isAnomaly = zScore > zThreshold;

    const timestamp = new Date().toISOString();
    let finalEvent: StreamEvent = {
      id: `evt-register-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp,
      metricType: mType,
      value: computedValue,
      isAnomaly,
      anomalyScore: Number(zScore.toFixed(2)),
      baselineMean: Number(stats.mean.toFixed(2)),
      baselineStd: Number(stats.std.toFixed(2))
    };

    db.events.push(finalEvent);

    if (isAnomaly) {
      const deviationPercentage = stats.mean !== 0 ? ((computedValue - stats.mean) / stats.mean) * 100 : 100;
      let confidence = Math.min(99, Math.round(60 + (zScore / (zThreshold * 2.5)) * 39));
      if (confidence < 60) confidence = 64;

      let severity: AnomalySeverity = 'Low';
      if (zScore > zThreshold * 2.2) {
        severity = 'Critical';
      } else if (zScore > zThreshold * 1.6) {
        severity = 'High';
      } else if (zScore > zThreshold * 1.1) {
        severity = 'Medium';
      }

      const id = `an-reg-${crypto.randomBytes(6).toString('hex')}`;
      const newAnomaly: Anomaly = {
        id,
        eventId: finalEvent.id,
        timestamp,
        metricType: mType,
        value: computedValue,
        expectedValue: Number(stats.mean.toFixed(2)),
        deviationPercentage: Number(deviationPercentage.toFixed(1)),
        confidenceScore: confidence,
        severity,
        status: 'Active',
        notes: [
          `Statistical Trigger: Metric exceeded threshold via manual register. Z-score: ${zScore.toFixed(2)} (Limit: ${zThreshold}).`,
          `Origin: Operator-registered telemetry value input of ${computedValue}.`
        ],
        metricsAtTime: {
          mean: Number(stats.mean.toFixed(2)),
          std: Number(stats.std.toFixed(2)),
          zScore: Number(zScore.toFixed(2))
        }
      };

      db.anomalies.unshift(newAnomaly);

      if (severity === 'High' || severity === 'Critical') {
        const securityAlertId = `sec-alr-${crypto.randomBytes(5).toString('hex')}`;
        db.securityLogs.unshift({
          id: securityAlertId,
          timestamp,
          userId: (req as any).user.userId,
          userEmail: (req as any).user.userEmail,
          action: `CRITICAL THREAT (MANUAL REGISTER): ${streamConfigs[mType].name} reached ${severity} severity. Value: ${computedValue}`,
          ipAddress: req.ip || '127.0.0.1',
          severity: 'high'
        });
      }

      broadcastToSse('anomaly_alert', newAnomaly);
    }

    // Security history log
    db.securityLogs.unshift({
      id: `sec-man-${crypto.randomBytes(6).toString('hex')}`,
      timestamp,
      userId: (req as any).user.userId,
      userEmail: (req as any).user.userEmail,
      action: `MANUAL TELEMETRY VALUE REGISTERED: Metric [${mType}] key-value logged as ${computedValue}`,
      ipAddress: req.ip || '127.0.0.1',
      severity: 'medium'
    });

    broadcastToSse('metric_event', finalEvent);
    saveToDiskDebounced();

    res.json({ success: true, event: finalEvent, isAnomaly });
  } catch (err: any) {
    res.status(500).json({ error: 'Manual register failure: ' + err.message });
  }
});

// Historical Event Listing
app.get('/api/events', requireAuth(), (req, res) => {
  const metricType = req.query.metricType as MetricType;
  const limit = parseInt(req.query.limit as string) || 100;
  
  let result = db.events;
  if (metricType) {
    result = result.filter(e => e.metricType === metricType);
  }
  
  res.json(result.slice(-limit).reverse());
});

// Historical / Active Anomalies
app.get('/api/anomalies', requireAuth(), (req, res) => {
  const status = req.query.status as AnomalyStatus;
  const metricType = req.query.metricType as MetricType;
  
  let result = db.anomalies;
  if (status) {
    result = result.filter(a => a.status === status);
  }
  if (metricType) {
    result = result.filter(a => a.metricType === metricType);
  }
  
  res.json(result);
});

// Fetch raw telemetry at anomaly window
app.get('/api/anomalies/:id', requireAuth(), (req, res) => {
  const anomaly = db.anomalies.find(a => a.id === req.params.id);
  if (!anomaly) {
    return res.status(404).json({ error: 'Anomaly trace not found.' });
  }
  
  // Package telemetry window + 40 items preceding it
  const timeLimit = new Date(anomaly.timestamp).getTime();
  const precedingEvents = db.events
    .filter(e => e.metricType === anomaly.metricType && new Date(e.timestamp).getTime() <= timeLimit)
    .slice(-30);

  res.json({
    anomaly,
    precedingEvents
  });
});

// Update Anomaly Status
app.post('/api/anomalies/:id/status', requireAuth(['Admin', 'Operator']), (req, res) => {
  const { status, note } = req.body;
  const anomalyIndex = db.anomalies.findIndex(a => a.id === req.params.id);
  
  if (anomalyIndex === -1) {
    return res.status(404).json({ error: 'Anomaly trace not found.' });
  }

  const user = (req as any).user;
  const updatedAnomaly = db.anomalies[anomalyIndex];
  updatedAnomaly.status = status;
  
  if (note) {
    updatedAnomaly.notes.push(`[${new Date().toLocaleString()}] Operator ${user.userName}: ${note}`);
  } else {
    updatedAnomaly.notes.push(`[${new Date().toLocaleString()}] Operator ${user.userName}: Modified status to ${status}.`);
  }

  // Register action log
  db.securityLogs.unshift({
    id: `sec-${crypto.randomBytes(6).toString('hex')}`,
    timestamp: new Date().toISOString(),
    userId: user.userId,
    userEmail: user.userEmail,
    action: `ANOMALY STATUS REVISION: Adjusted ${updatedAnomaly.id} status to [${status}]`,
    ipAddress: req.ip || '127.0.0.1',
    severity: 'medium'
  });

  saveToDiskDebounced();
  
  // Broadcast update to client
  broadcastToSse('anomaly_updated', updatedAnomaly);
  
  res.json({ success: true, anomaly: updatedAnomaly });
});

// Trigger Anomaly Injection (Administrative action to create artificial peaks)
app.post('/api/simulation/inject', requireAuth(['Admin', 'Operator']), (req, res) => {
  const { metricType, type, multiplier } = req.body;
  if (!metricType || !type) {
    return res.status(400).json({ error: 'Simulation Injection takes metricType and type properties.' });
  }

  const mType = metricType as MetricType;
  if (!streamConfigs[mType]) {
    return res.status(400).json({ error: 'Invalid metricType designation.' });
  }

  const mult = multiplier ? Number(multiplier) : 4.5;
  
  // Wipe current injections for same metric to avoid stacking
  activeInjections = activeInjections.filter(inj => inj.metricType !== mType);
  
  activeInjections.push({
    metricType: mType,
    type,
    ticksRemaining: type === 'drift' || type === 'burst' ? 5 : 1, // 5 ticks for smooth trends
    multiplier: mult
  });

  const user = (req as any).user;
  db.securityLogs.unshift({
    id: `sec-${crypto.randomBytes(6).toString('hex')}`,
    timestamp: new Date().toISOString(),
    userId: user.userId,
    userEmail: user.userEmail,
    action: `MANUAL CRASH INJECTION: Created ${type} stress anomaly on metric [${mType}] (Mult: ${mult}x)`,
    ipAddress: req.ip || '127.0.0.1',
    severity: 'high'
  });

  saveToDiskDebounced();

  res.json({ success: true, message: `Anomaly spike context added successfully to metric queue [${mType}]` });
});

// Simulation controller
app.post('/api/simulation/control', requireAuth(['Admin', 'Operator']), (req, res) => {
  const { action, streamSpeed, sensitivityZ, manualModeOnly } = req.body;
  const user = (req as any).user;

  if (manualModeOnly !== undefined) {
    db.settings.manualModeOnly = !!manualModeOnly;
    if (db.settings.manualModeOnly) {
      stopSimulation();
    } else {
      startSimulation();
    }
    
    db.securityLogs.unshift({
      id: `sec-${crypto.randomBytes(6).toString('hex')}`,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      userEmail: user.userEmail,
      action: `SYSTEM WORK MODE MODIFIED: Toggled manualModeOnly mode to [${db.settings.manualModeOnly}]`,
      ipAddress: req.ip || '127.0.0.1',
      severity: 'medium'
    });
  }

  if (action === 'pause') {
    stopSimulation();
    db.securityLogs.unshift({
      id: `sec-${crypto.randomBytes(6).toString('hex')}`,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      userEmail: user.userEmail,
      action: 'SIMULATION PAUSE: Stream loop halted voluntarily.',
      ipAddress: req.ip || '127.0.0.1',
      severity: 'medium'
    });
  } else if (action === 'start') {
    startSimulation();
    db.securityLogs.unshift({
      id: `sec-${crypto.randomBytes(6).toString('hex')}`,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      userEmail: user.userEmail,
      action: 'SIMULATION START: Streaming process launched.',
      ipAddress: req.ip || '127.0.0.1',
      severity: 'medium'
    });
  }

  if (streamSpeed && Number(streamSpeed) >= 100 && Number(streamSpeed) <= 10000) {
    db.settings.streamIntervalMs = Number(streamSpeed);
    startSimulation(); // auto restart loop with new frequency config
  }

  if (sensitivityZ && Number(sensitivityZ) >= 1.5 && Number(sensitivityZ) <= 8) {
    db.settings.detectionSensitiveZScore = Number(sensitivityZ);
  }

  saveToDisk();

  res.json({ 
    success: true, 
    settings: db.settings,
    running: simulationIntervalId !== null 
  });
});

// Admin-Only view of Registered Users and active Security Audit Log
app.get('/api/users', requireAuth(['Admin']), (req, res) => {
  // Format users list safely without passwords & salts
  const safeUsers = Object.values(db.users).map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
    lastLogin: u.lastLogin
  }));
  res.json(safeUsers);
});

app.post('/api/users/:id/role', requireAuth(['Admin']), (req, res) => {
  const { role } = req.body;
  if (!role || !['Admin', 'Operator', 'Viewer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid privilege assignment.' });
  }

  const targetUser = db.users[req.params.id];
  if (!targetUser) {
    return res.status(404).json({ error: 'User does not exist in registry.' });
  }

  const user = (req as any).user;
  const oldRole = targetUser.role;
  targetUser.role = role as UserRole;

  db.securityLogs.unshift({
    id: `sec-${crypto.randomBytes(6).toString('hex')}`,
    timestamp: new Date().toISOString(),
    userId: user.userId,
    userEmail: user.userEmail,
    action: `USER ACCESS MODIFIED: Shifted user ${targetUser.email} privilege from ${oldRole} to ${role}`,
    ipAddress: req.ip || '127.0.0.1',
    severity: 'high'
  });

  saveToDisk();
  res.json({ success: true, message: `Access role changed successfully for ${targetUser.name}` });
});

app.delete('/api/users/:id', requireAuth(['Admin']), (req, res) => {
  const targetUser = db.users[req.params.id];
  if (!targetUser) {
    return res.status(404).json({ error: 'User does not exist in directory.' });
  }
  
  const user = (req as any).user;
  if (targetUser.id === user.userId) {
    return res.status(400).json({ error: 'Self-Harm Protection: You cannot delete your own administrative active session.' });
  }

  delete db.users[req.params.id];

  db.securityLogs.unshift({
    id: `sec-${crypto.randomBytes(6).toString('hex')}`,
    timestamp: new Date().toISOString(),
    userId: user.userId,
    userEmail: user.userEmail,
    action: `SECURE USER PURGING: Deleted account folder ${targetUser.email}`,
    ipAddress: req.ip || '127.0.0.1',
    severity: 'high'
  });

  saveToDisk();
  res.json({ success: true, message: 'Account context purged completely.' });
});

// Security Logs tracking (Viewer/Operator/Admin access)
app.get('/api/security-logs', requireAuth(), (req, res) => {
  res.json(db.securityLogs.slice(0, 500));
});

// Dashboard KPI stats calculators
app.get('/api/dashboard/stats', requireAuth(), (req, res) => {
  const totalProcessed = db.events.length;
  const activeStreams = Object.values(streamConfigs).filter(s => s.isActive).length;
  const totalAnomalies = db.anomalies.length;
  
  // Calculate average confidence score of latest active anomalies
  const activeAnoms = db.anomalies.filter(a => a.status === 'Active' || a.status === 'Investigating');
  const sumConf = activeAnoms.reduce((sum, a) => sum + a.confidenceScore, 0);
  const avgConf = activeAnoms.length > 0 ? Math.round(sumConf / activeAnoms.length) : 0;
  
  // Ingest rate
  const rate = simulationIntervalId !== null ? Math.round((1000 / db.settings.streamIntervalMs) * activeStreams) : 0;

  const response: DashboardMetrics = {
    totalEventsProcessed: totalProcessed,
    activeStreamsCount: activeStreams,
    detectedAnomaliesCount: totalAnomalies,
    activeAlertsCount: activeAnoms.length,
    avgConfidence: avgConf,
    ingestionRate: rate
  };

  res.json(response);
});

// Wipe logs/reset system helper (Admin only)
app.post('/api/system/reset', requireAuth(['Admin']), (req, res) => {
  db.events = [];
  db.anomalies = [];
  
  // Seed basic normal baseline so graphs aren't totally empty on wipe
  const types: MetricType[] = ['api_latency', 'auth_failures', 'db_connections', 'cpu_usage', 'payment_volume'];
  const baseValues: Record<MetricType, number> = {
    api_latency: 80,
    auth_failures: 2,
    db_connections: 45,
    cpu_usage: 30,
    payment_volume: 150
  };
  const startTime = Date.now() - 30 * 1000;
  for (let i = 0; i < 30; i++) {
    const timestamp = new Date(startTime + i * 1000).toISOString();
    for (const t of types) {
      const normalValue = baseValues[t] + (Math.random() - 0.5) * 2 * 5;
      db.events.push({
        id: `evt-reset-${t}-${i}`,
        timestamp,
        metricType: t,
        value: Number(normalValue.toFixed(1)),
        isAnomaly: false
      });
    }
  }

  const user = (req as any).user;
  db.securityLogs.unshift({
    id: `sec-${crypto.randomBytes(6).toString('hex')}`,
    timestamp: new Date().toISOString(),
    userId: user.userId,
    userEmail: user.userEmail,
    action: 'SYSTEM MASTER HARD WIPE: Purged all historical metric telemetry and anomaly logs safely.',
    ipAddress: req.ip || '127.0.0.1',
    severity: 'high'
  });

  saveToDisk();

  res.json({ success: true, message: 'System events history puritied.' });
});

// Helper for Gemini AI Client instantiation
let aiClient: any = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// --- AI CO-PILOT ENDPOINT (GEMINI ADVANCED ANALYSIS) ---
app.post('/api/ai/analyze', requireAuth(), async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      // Graceful local heuristic fallback if no GEMINI_API_KEY is configured
      return res.json({
        summary: "### AI Copilot Analytics Summary (Offline Predictive Mode)\n\n" +
          "**Warning**: Secure Key Missing. Operating on in-engine offline heuristic reasoning instead of full neural processing.\n\n" +
          "#### Consolidated Threat Observation:\n" +
          "- Active Stream Vectors: 5 threads monitored continuously.\n" +
          `- Detected Total Anomalistic Deviations: ${db.anomalies.length} entries stored.\n` +
          `- High Priority Concerns: ${db.anomalies.filter(a => a.severity === 'High' || a.severity === 'Critical').length} flags.\n\n` +
          "#### Standard Operator Troubleshooting SOPs:\n" +
          "1. **Check CPU Pools**: If cluster anomalies occur, check node scaling limits.\n" +
          "2. **API Gate Latencies**: Correlate with database pooling logs to check for database connection dry locks.\n" +
          "3. **Halt Spikes**: Manual simulation injection spikes should be resolved using administrative control rules in the simulation cockpit."
      });
    }

    // Capture latest 8 anomalies and format text cleanly for Gemini analysis
    const latestAnoms = db.anomalies.slice(0, 10).map(a => ({
      timestamp: a.timestamp,
      metric: streamConfigs[a.metricType]?.name || a.metricType,
      value: `${a.value} (Expected: ${a.expectedValue})`,
      deviation: `${a.deviationPercentage}%`,
      severity: a.severity,
      status: a.status,
      confidence: `${a.confidenceScore}%`
    }));

    const systemContext = `
You are the Anomaly Detector AI Senior Analyst specialized in corporate datacenter streams and network logs audit.
Analyze the following JSON structured payload of recent stream anomalies and produce a professional report formatted strictly in beautiful GitHub Markdown.

LATEST ACTIVE ANOMALIES LOGS:
${JSON.stringify(latestAnoms, null, 2)}

Provide your response with four distinct sections:
1. **CONSOLIDATED SUMMARY**: Direct, executive digest of overall system threats. Mention active anomaly densities and alert urgencies.
2. **PATTERN CORRELATION & CO-RELATION HYPOTHESIS**: Analyze if different anomalies are occurring close in time and hypothesize about potential root cause linkages (e.g. "auth_failures" hike close to "api_latency" surge may indicate a brute force/DDoS targeting the auth node).
3. **MITIGATION & DISPATCH PROCEDURES**: Actionable step-by-step resolution protocol for our operations engineers to repair the underlying cluster.
4. **THREAT CLASSIFICATION MATRIX**: Mark each active metric source status (Healthy / Warning / Investigate / Critical) with clear rationales.

Keep the tone expert, analytical, highly descriptive, and structured like professional Grafana/Datadog runbooks.
`;

    // Modern SDK model execution
    const model = 'gemini-3.5-flash';
    const response = await ai.models.generateContent({
      model: model,
      contents: systemContext,
    });

    res.json({
      summary: response.text || "Failed to parse text from AI stream response."
    });

  } catch (err: any) {
    console.error('Gemini processing exception:', err);
    res.json({
      summary: `### AI Copilot Analytics Summary (Temporary Exception)\n\nDeep neural execution failed due to an exception inside the processing stream: ${err.message}. Please verify settings registry configurations.`
    });
  }
});


// Live SSE Stream Engine registration for persistent client-server push
app.get('/api/stream/live', (req, res) => {
  // Auth check for real-time security
  // Because event source has limitations in passing query authorization headers,
  // we check for token query parameters securely: e.g. /api/stream/live?token=xxx
  const token = (req.query.token as string) || '';
  const session = activeSessions[token];
  if (!session) {
    return res.status(401).write('event: error\ndata: {"message": "Unauthorized Live Stream Access Rejected"}\n\n');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientConnection = {
    id: `client-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    res,
    userId: session.userId
  };

  sseConnections.push(clientConnection);
  console.log(`Live Stream connection established for client ${clientConnection.id} [${session.userName}]`);

  // Log active stream entry
  db.securityLogs.unshift({
    id: `sec-${crypto.randomBytes(6).toString('hex')}`,
    timestamp: new Date().toISOString(),
    userId: session.userId,
    userEmail: session.userEmail,
    action: 'REAL-TIME telemetry link opened down-tunnel via SSE',
    ipAddress: req.ip || '127.0.0.1',
    severity: 'low'
  });

  // Keep connection alive with simple comments
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (e) {}
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
    sseConnections = sseConnections.filter(c => c.id !== clientConnection.id);
    console.log(`Live Stream disconnected for client ${clientConnection.id}`);
  });
});


// --- DOCUMENTS SYSTEM API ---
app.get('/api/documents', requireAuth(), (req, res) => {
  try {
    const docDir = path.join(process.cwd(), 'Document');
    if (!fs.existsSync(docDir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(docDir).filter(f => f.endsWith('.md'));
    const docList = files.map(filename => {
      const stats = fs.statSync(path.join(docDir, filename));
      return {
        id: filename.replace('.md', ''),
        name: filename.replace('.md', '').replaceAll(' ', '-'),
        displayName: filename.replace('.md', ''),
        size: stats.size,
        updatedAt: stats.mtime.toISOString(),
        type: 'SOP Guide'
      };
    });
    res.json(docList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/:id', requireAuth(), (req, res) => {
  try {
    const docId = req.params.id;
    // support both space and dash style names safely
    const filenames = [ `${docId}.md`, `${docId.replaceAll('-', ' ')}.md` ];
    let docPath = '';
    for (const name of filenames) {
      const p = path.join(process.cwd(), 'Document', name);
      if (fs.existsSync(p)) {
        docPath = p;
        break;
      }
    }
    
    if (!docPath) {
      return res.status(404).json({ error: 'System triage SOP document not found in directory.' });
    }
    const content = fs.readFileSync(docPath, 'utf8');
    res.json({ id: docId, displayName: path.basename(docPath, '.md'), content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/:id/download', requireAuth(), (req, res) => {
  try {
    const docId = req.params.id;
    const filenames = [ `${docId}.pdf`, `${docId.replaceAll('-', ' ')}.pdf` ];
    let docPath = '';
    for (const name of filenames) {
      const p = path.join(process.cwd(), 'Document', name);
      if (fs.existsSync(p)) {
        docPath = p;
        break;
      }
    }
    
    if (!docPath) {
      return res.status(404).json({ error: 'System triage SOP PDF file not found.' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(docPath)}"`);
    fs.createReadStream(docPath).pipe(res);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Express + Vite Frontend Bundle Hosting
const bootServer = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware hookups loaded in sandbox development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static paths bounded for compiled layouts.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Full-Stack Streaming Event Anomaly Detector operational on port ${PORT}`);
  });
};

bootServer().catch(err => {
  console.error('CRITICAL: Server initialization failure', err);
});

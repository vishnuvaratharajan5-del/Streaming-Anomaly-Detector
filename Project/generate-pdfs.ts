import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'Document');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// -----------------------------------------------------
// Document 1: AI Notes Ticket Triage System.pdf
// -----------------------------------------------------
function generateTriageSystemPDF() {
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(path.join(outDir, 'AI Notes Ticket Triage System.pdf'));
  doc.pipe(stream);

  // Title block
  doc.fillColor('#dc2626').fontSize(22).font('Helvetica-Bold').text('AI Notes Ticket Triage System', { align: 'center' });
  doc.fillColor('#475569').fontSize(11).font('Helvetica-BoldOblique').text('Operational Specifications, System Architecture & SLA Runbook', { align: 'center' });
  doc.moveDown(1.5);

  // Divider
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(1.5);

  // Document Control
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('1. Document Control');
  doc.moveDown(0.5);
  doc.fillColor('#334155').fontSize(10).font('Helvetica');
  doc.text('• Document ID: SOP-AITTS-2026-V1');
  doc.text('• Classification: Restricted - Operation Core');
  doc.text('• Owner: Chief AI Systems Administrator');
  doc.text('• Last Modified: Tuesday, June 9, 2026');
  doc.moveDown(1.5);

  // System Overview
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('2. System Overview');
  doc.moveDown(0.5);
  doc.fillColor('#334155').fontSize(10).font('Helvetica');
  doc.text(
    'The AI Notes Ticket Triage System is a real-time, zero-trust telemetry ingestion and anomaly classification ' +
    'middleware pipeline. It monitors continuous streams of server performance metrics, computes mathematical ' +
    'deviation metrics on a sliding window frame, and utilizes Gemini Neural Copilots to triage and compile context-rich ' +
    'remediation protocols ("Tickets").\n\nThis system prevents service disruption by classifying minor drifts before they become site outages.',
    { align: 'justify', width: 512 }
  );
  doc.moveDown(1.5);

  // Core Pipeline Architecture
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('3. Core Architecture & Pipeline Ingest');
  doc.moveDown(0.5);
  doc.fillColor('#334155').fontSize(10).font('Helvetica');
  doc.text('• Ingestion Layer: Standardized TCP/HTTP channels pushing real-time microsecond server-state markers.');
  doc.text('• Heuristic Triaging: Calculates dynamic Moving Average and Standard Deviation. Flagged automatically when event value violates standard deviation.');
  doc.text('• LLM Engine: Multi-turn Gemini 3.5 Flash server proxy. Triggered for dynamic root-cause compilation, correlation analysis, and mitigation SOP generation.');
  doc.moveDown(1.5);

  // Role Privilege Matrix
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('4. Privilege Matrix & Enforcement');
  doc.moveDown(0.5);

  // Table header
  const yStart = doc.y;
  doc.fillColor('#f8fafc');
  doc.rect(50, yStart, 512, 18).fill();
  doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold');
  doc.text('Role', 60, yStart + 4);
  doc.text('Dashboard', 150, yStart + 4);
  doc.text('Stream Control', 250, yStart + 4);
  doc.text('Admin Actions', 390, yStart + 4);

  // Table Row 1
  let yRow = yStart + 18;
  doc.fillColor('#cbd5e1').rect(50, yRow - 1, 512, 1).fill(); // Border line
  doc.fillColor('#334155').fontSize(9).font('Helvetica');
  doc.text('Viewer', 60, yRow + 4);
  doc.text('Enabled (Read-only)', 150, yRow + 4);
  doc.text('Locked', 250, yRow + 4);
  doc.text('Locked', 390, yRow + 4);

  // Table Row 2
  yRow += 18;
  doc.fillColor('#cbd5e1').rect(50, yRow - 1, 512, 1).fill(); // Border line
  doc.text('Operator', 60, yRow + 4);
  doc.text('Enabled (Full access)', 150, yRow + 4);
  doc.text('Enabled (Modified State)', 250, yRow + 4);
  doc.text('Locked', 390, yRow + 4);

  // Table Row 3
  yRow += 18;
  doc.fillColor('#cbd5e1').rect(50, yRow - 1, 512, 1).fill(); // Border line
  doc.text('Admin', 60, yRow + 4);
  doc.text('Enabled (Full access)', 150, yRow + 4);
  doc.text('Enabled (Full access)', 250, yRow + 4);
  doc.text('Enabled (Purge/Config)', 390, yRow + 4);

  doc.moveDown(4);

  // Standard Operating Procedures (SOP)
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('5. Standard Operating Procedures (SOP)');
  doc.moveDown(0.5);
  doc.fillColor('#334155').fontSize(10).font('Helvetica');
  doc.text('1. Lock Outflow: Transition stream settings to dynamic pause state if cascading errors occur.');
  doc.text('2. Consult Gemini: Execute "COMPILE SYSTEM AI REPORT" inside the AI Analytics hub.');
  doc.text('3. Quarantine Tenant: Revoke suspicious operator credentials in the Identity Access panel.');
  doc.text('4. Post Audit: Purge historical metrics caches only after securing logs offsite.');

  // Footer
  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Oblique').text('Confidential - Under Strict Threat Containment Protocols', 50, 720, { align: 'center' });

  doc.end();
}

// -----------------------------------------------------
// Document 2: Sample Data Tickets.pdf
// -----------------------------------------------------
function generateSampleDataTicketsPDF() {
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(path.join(outDir, 'Sample Data Tickets.pdf'));
  doc.pipe(stream);

  // Title block
  doc.fillColor('#dc2626').fontSize(22).font('Helvetica-Bold').text('Sample Data Tickets', { align: 'center' });
  doc.fillColor('#475569').fontSize(11).font('Helvetica-BoldOblique').text('Telemetry Payloads, Anomaly Signatures & System Alarms Directory', { align: 'center' });
  doc.moveDown(1.5);

  // Divider
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(1.5);

  // Doc intro
  doc.fillColor('#334155').fontSize(10).font('Helvetica').text(
    'This reference document catalogs typical telemetry JSON payloads that represent structured anomalies, ' +
    'along with their corresponding threat profiles and ticket states. These samples are used for testing pipeline ' +
    'parsing robustness and modeling ML baseline thresholds.',
    { align: 'justify', width: 512 }
  );
  doc.moveDown(1.5);

  // Ticket 1
  doc.fillColor('#dc2626').fontSize(12).font('Helvetica-Bold').text('Ticket 001 - API Latency Spike (Critical Severity)');
  doc.moveDown(0.5);
  doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold');
  doc.text('• Status: Active | Metric Source: api_latency | Z-Score: 5.21');
  doc.moveDown(0.3);
  doc.fillColor('#475569').fontSize(9).font('Courier');
  const payload1 = JSON.stringify({
    ticket_id: "TKT-LATENCY-99812",
    anomaly_score: 0.985,
    metric_type: "api_latency",
    current_value: 4850.2,
    baseline_average: 220.5,
    unit: "ms",
    affected_nodes: ["apigw-east-01", "apigw-east-02"]
  }, null, 2);
  doc.text(payload1, { indent: 20 });
  doc.moveDown(1.5);

  // Ticket 2
  doc.fillColor('#dc2626').fontSize(12).font('Helvetica-Bold').text('Ticket 002 - DB Connections Saturation (High Severity)');
  doc.moveDown(0.5);
  doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold');
  doc.text('• Status: Investigating | Metric Source: db_connections | Z-Score: 4.12');
  doc.moveDown(0.3);
  doc.fillColor('#475569').fontSize(9).font('Courier');
  const payload2 = JSON.stringify({
    ticket_id: "TKT-DBCONN-88124",
    anomaly_score: 0.892,
    metric_type: "db_connections",
    current_value: 492,
    baseline_average: 85,
    unit: "connections",
    affected_nodes: ["postgres-primary-repl01"]
  }, null, 2);
  doc.text(payload2, { indent: 20 });
  doc.moveDown(1.5);

  // Ticket 3
  doc.fillColor('#dc2626').fontSize(12).font('Helvetica-Bold').text('Ticket 003 - Authentication Failures Spike (Medium Severity)');
  doc.moveDown(0.5);
  doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold');
  doc.text('• Status: Resolved | Metric Source: auth_failures | Z-Score: 3.15');
  doc.moveDown(0.3);
  doc.fillColor('#475569').fontSize(9).font('Courier');
  const payload3 = JSON.stringify({
    ticket_id: "TKT-AUTHFAIL-10029",
    anomaly_score: 0.714,
    metric_type: "auth_failures",
    current_value: 142.0,
    baseline_average: 15.0,
    unit: "failures/min"
  }, null, 2);
  doc.text(payload3, { indent: 20 });

  // Footer
  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Oblique').text('Confidential - System Performance Directory Logs', 50, 720, { align: 'center' });

  doc.end();
}

// -----------------------------------------------------
// Document 3: Test Cases.pdf
// -----------------------------------------------------
function generateTestCasesPDF() {
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(path.join(outDir, 'Test Cases.pdf'));
  doc.pipe(stream);

  // Title block
  doc.fillColor('#dc2626').fontSize(22).font('Helvetica-Bold').text('Verification Test Cases', { align: 'center' });
  doc.fillColor('#475569').fontSize(11).font('Helvetica-BoldOblique').text('Regression Testing Matrix & Validation SOPs for Real-Time Detection', { align: 'center' });
  doc.moveDown(1.5);

  // Divider
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(1.5);

  // TC 1
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('TC-001: Autonomic Sliding Z-Score Validation');
  doc.moveDown(0.5);
  doc.fillColor('#334155').fontSize(10).font('Helvetica');
  doc.text('• Preconditions: Dynamic metric stream is LIVE. Ingestion interval set to 1000ms.');
  doc.text('• Actions: Navigate to Injections panel. Request "SPIKE" injection with 15x multiplier.');
  doc.text('• Expected Result: Anomaly score breaks standard deviation limit. Alarm is signaled immediately. Unified alert center registers active alert.');
  doc.moveDown(1.5);

  // TC 2
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('TC-002: Role Privilege Boundary Integrity');
  doc.moveDown(0.5);
  doc.fillColor('#334155').fontSize(10).font('Helvetica');
  doc.text('• Preconditions: Authenticated under email viewer@anomaly.io (Viewer role).');
  doc.text('• Actions: Navigate to the Settings panel and attempt to shift threshold slider.');
  doc.text('• Expected Result: Threshold slider is disabled. Action triggers block with role security error.');
  doc.moveDown(1.5);

  // TC 3
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('TC-003: Gemini Diagnosis Report Synthesis');
  doc.moveDown(0.5);
  doc.fillColor('#334155').fontSize(10).font('Helvetica');
  doc.text('• Preconditions: System contains active anomalies. Gemini AI key configured on server.');
  doc.text('• Actions: Navigate to AI Analytics view. Click "COMPILE SYSTEM AI REPORT".');
  doc.text('• Expected Result: System formats dynamic metadata and calls Gemini model safely. Renders full Markdown diagnostic block.');

  // Footer
  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Oblique').text('Confidential - Operations Quality Assurance Unit', 50, 720, { align: 'center' });

  doc.end();
}

try {
  generateTriageSystemPDF();
  generateSampleDataTicketsPDF();
  generateTestCasesPDF();
  console.log('Successfully compiled all 3 PDF documents inside /Document!');
} catch (e) {
  console.error('Error compiling PDFs:', e);
  process.exit(1);
}

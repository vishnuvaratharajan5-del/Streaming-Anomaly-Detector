# Streaming Event Anomaly Detector

A high-performance full-stack dashboard for real-time stream monitoring, statistical anomaly detection, secure role-based access control (RBAC), and Gemini-powered alert analysis.

---

## 🚀 Key Features

*   **Real-Time Data Streaming Simulation**: Simulates dynamic event streams with customizable frequency, noise, and seasonal spikes.
*   **Statistical Anomaly Detection**: Employs real-time threshold-based and statistical variance models (Z-score, running standard deviations) to flag stream spikes and drops immediately.
*   **Gemini-Powered Alert Analysis**: Integrates the state-of-the-art `@google/genai` SDK to examine logs, diagnose root causes, and recommend mitigation steps for active alerts.
*   **Role-Based Access Control (RBAC)**: Secure multi-user login with granular permissions (Admin, Operator, Analyst) managing stream toggling, user directories, and system thresholds.
*   **Interactive Analytics Dashboard**: Interactive graphs and real-time visualization widgets demonstrating stream rates, error margins, latencies, and anomaly frequencies.
*   **Interactive Stream Explorer**: Deep dive into historic metrics, filters, search tools, and log export interfaces.
*   **PDF Analytical Resource Generator**: On-the-fly PDF creation via `pdfkit` for generating comprehensive performance audits, operational summaries, and incident reports.

---

## 🛠️ Technology Stack

*   **Frontend**: React (v19), TypeScript, Tailwind CSS, Lucide Icons, Framer Motion (for polished transition animations)
*   **Backend**: Node.js, Express (v4), ESBuild (optimized bundler for production server hosting)
*   **AI Engine**: `@google/genai` Google GenAI SDK (Server-Side)
*   **Document Generation**: `pdfkit` PDF engine

---

## 📂 Project Structure

```text
├── src/
│   ├── components/            # View-specific dashboards and widgets
│   │   ├── AlertsCenter.tsx   # AI-powered alerts log and deep analysis center
│   │   ├── AnalyticsView.tsx  # Metrics graphs and statistical visualizations
│   │   ├── DashboardView.tsx  # Primary real-time stream operational console
│   │   ├── DocumentsView.tsx  # PDF report generators & audit export console
│   │   ├── ExplorerView.tsx   # Historical query filters and log analytics 
│   │   ├── LoginView.tsx      # Secure custom multi-role authentication gate
│   │   ├── MonitorView.tsx    # Live metrics, latency gauges, and active logs
│   │   ├── SettingsView.tsx   # Access control thresholds & stream tuning
│   │   ├── Sidebar.tsx        # Responsive navigation and system statistics
│   │   └── UserManagement.tsx # Admin control panel for team accounts
│   ├── utils/
│   │   └── api.ts             # Server proxy routes, state synchronizers
│   ├── App.tsx                # Main state controller and router
│   ├── index.css              # Global styling via Tailwind CSS directives
│   ├── main.tsx               # Frontend client entry-point
│   └── types.ts               # Shared models, types, and interfaces
├── server.ts                  # Production full-stack Express & local JSON engine
├── anomaly_detector_db.json   # Flat-file database for local persistence
├── generate-pdfs.ts           # PDFKit report generation functions
├── metadata.json              # Applet permission and capabilities configuration
└── package.json               # Manifest dependencies & run scripts
```

---

## ⚙️ Environment Variables

To leverage the server-side AI root-cause analysis, configure the following environment variable by creating a `.env` file at your project's root:

```env
# Google Gemini API Key (Secret Key - stays on server)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🏃 Getting Started

### 1. Installation
Install all dependencies for both development and production environments:
```bash
npm install
```

### 2. Run the Development Server
Fires up the hot-reloading development server powered by `tsx` (TypeScript Executor) and Vite:
```bash
npm run dev
```
Open your browser to `http://localhost:3000` to interact with the application.

### 3. Production Compilation & Optimization
Bundles the frontend using Vite and bundles the Node.js backend using ESBuild into a highly-performant production artifact inside `dist/`:
```bash
npm run build
```

### 4. Running Production Server
Starts the built, self-contained CommonJS backend routing client requests and hosting assets perfectly:
```bash
npm run start
```

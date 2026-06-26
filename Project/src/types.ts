/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Admin' | 'Operator' | 'Viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  ipAddress: string;
  severity: 'low' | 'medium' | 'high';
}

export type MetricType = 'api_latency' | 'auth_failures' | 'db_connections' | 'cpu_usage' | 'payment_volume';

export interface StreamConfig {
  id: MetricType;
  name: string;
  unit: string;
  baseValue: number;
  variance: number;
  noiseFloor: number;
  frequencyMs: number;
  isActive: boolean;
}

export interface StreamEvent {
  id: string;
  timestamp: string;
  metricType: MetricType;
  value: number;
  isAnomaly: boolean;
  anomalyScore?: number; // Calculated confidence / Z-score
  baselineMean?: number;
  baselineStd?: number;
}

export type AnomalySeverity = 'Info' | 'Low' | 'Medium' | 'High' | 'Critical';
export type AnomalyStatus = 'Active' | 'Investigating' | 'Resolved' | 'False Positive';

export interface Anomaly {
  id: string;
  eventId: string;
  timestamp: string;
  metricType: MetricType;
  value: number;
  expectedValue: number;
  deviationPercentage: number;
  confidenceScore: number; // 0 to 100
  severity: AnomalySeverity;
  status: AnomalyStatus;
  notes: string[];
  assignedTo?: string; // User ID
  metricsAtTime: {
    mean: number;
    std: number;
    zScore: number;
  };
}

export interface SystemSettings {
  detectionSensitiveZScore: number; // e.g. 2.5 or 3.0
  rollingWindowSize: number; // e.g. 50 events
  streamIntervalMs: number; // default 1000ms
  autoResolveDurationMin: number; // automatically resolve after some mins
  authPasscodeMinLength: number;
  maxSessionIdleMs: number;
  manualModeOnly?: boolean;
}

export interface DashboardMetrics {
  totalEventsProcessed: number;
  activeStreamsCount: number;
  detectedAnomaliesCount: number;
  activeAlertsCount: number;
  avgConfidence: number;
  ingestionRate: number; // events per second
}

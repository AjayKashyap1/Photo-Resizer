import { ImageProcessingConfig, BarcodeType } from '../types';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';
export type LogCategory = 'resizer' | 'upscale' | 'border' | 'crop' | 'barcode' | 'overlay' | 'export' | 'system';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  title: string;
  message: string;
  details?: Record<string, any>;
  durationMs?: number;
}

export type HistoryActionType =
  | 'image_resize'
  | 'image_upscale'
  | 'border_frame'
  | 'barcode_single'
  | 'barcode_batch'
  | 'zip_export'
  | 'barcode_stamp';

export interface HistoryRecord {
  id: string;
  timestamp: number;
  actionType: HistoryActionType;
  title: string;
  summary: string;
  itemCount: number;
  originalTotalSize?: number; // in bytes
  processedTotalSize?: number; // in bytes
  savedBytes?: number; // in bytes
  previewUrls?: string[]; // thumbnail dataUrls or icons
  metadata?: {
    filenames?: string[];
    dimensions?: string;
    targetFormat?: string;
    appliedConfig?: Partial<ImageProcessingConfig>;
    barcodeType?: BarcodeType;
    barcodeCount?: number;
    exportFilename?: string;
    savedPercentage?: number;
  };
}

const LOGS_STORAGE_KEY = 'pixelcraft_system_logs_v1';
const HISTORY_STORAGE_KEY = 'pixelcraft_processing_history_v1';

const MAX_LOGS = 250;
const MAX_HISTORY = 80;

type Listener<T> = (items: T[]) => void;

class HistoryLoggerService {
  private logs: LogEntry[] = [];
  private history: HistoryRecord[] = [];
  private logListeners: Set<Listener<LogEntry>> = new Set();
  private historyListeners: Set<Listener<HistoryRecord>> = new Set();

  constructor() {
    this.loadFromStorage();
    if (this.logs.length === 0) {
      this.log('info', 'system', 'Engine Initialized', 'PixelCraft & Barcode Studio processing engine initialized successfully.');
    }
  }

  private loadFromStorage() {
    try {
      const savedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch {
      this.logs = [];
    }

    try {
      const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        this.history = JSON.parse(savedHistory);
      }
    } catch {
      this.history = [];
    }
  }

  private saveLogsToStorage() {
    try {
      // Keep only recent logs
      const trimmed = this.logs.slice(0, MAX_LOGS);
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Could not save logs to localStorage', e);
    }
  }

  private saveHistoryToStorage() {
    try {
      // Keep only recent history records
      const trimmed = this.history.slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      // If storage quota exceeded, trim previews and retry
      try {
        const minimal = this.history.slice(0, 30).map((h) => ({
          ...h,
          previewUrls: h.previewUrls ? h.previewUrls.slice(0, 1) : undefined,
        }));
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(minimal));
      } catch (err) {
        console.warn('Could not save history to localStorage', err);
      }
    }
  }

  public subscribeLogs(callback: Listener<LogEntry>): () => void {
    this.logListeners.add(callback);
    callback(this.logs);
    return () => this.logListeners.delete(callback);
  }

  public subscribeHistory(callback: Listener<HistoryRecord>): () => void {
    this.historyListeners.add(callback);
    callback(this.history);
    return () => this.historyListeners.delete(callback);
  }

  private notifyLogs() {
    const list = [...this.logs];
    this.logListeners.forEach((fn) => fn(list));
    this.saveLogsToStorage();
  }

  private notifyHistory() {
    const list = [...this.history];
    this.historyListeners.forEach((fn) => fn(list));
    this.saveHistoryToStorage();
  }

  /**
   * Log an event into the live system log stream
   */
  public log(
    level: LogLevel,
    category: LogCategory,
    title: string,
    message: string,
    details?: Record<string, any>,
    durationMs?: number
  ): LogEntry {
    const entry: LogEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(),
      level,
      category,
      title,
      message,
      details,
      durationMs,
    };

    this.logs.unshift(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    this.notifyLogs();
    return entry;
  }

  /**
   * Add a recorded action to session history
   */
  public addHistory(record: Omit<HistoryRecord, 'id' | 'timestamp'>): HistoryRecord {
    const newRecord: HistoryRecord = {
      ...record,
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      timestamp: Date.now(),
    };

    this.history.unshift(newRecord);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(0, MAX_HISTORY);
    }

    this.notifyHistory();
    return newRecord;
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public getHistory(): HistoryRecord[] {
    return [...this.history];
  }

  public clearLogs() {
    this.logs = [];
    this.notifyLogs();
    this.log('info', 'system', 'Logs Cleared', 'All activity logs were reset.');
  }

  public clearHistory() {
    this.history = [];
    this.notifyHistory();
    this.log('info', 'system', 'History Cleared', 'All processing history records were cleared.');
  }

  public deleteHistoryItem(id: string) {
    this.history = this.history.filter((h) => h.id !== id);
    this.notifyHistory();
  }

  /**
   * Compute aggregated statistics from history
   */
  public getStats() {
    let totalImages = 0;
    let totalBarcodes = 0;
    let totalSavedBytes = 0;
    let totalExports = 0;

    for (const h of this.history) {
      if (
        h.actionType === 'image_resize' ||
        h.actionType === 'image_upscale' ||
        h.actionType === 'border_frame'
      ) {
        totalImages += h.itemCount;
        if (h.savedBytes && h.savedBytes > 0) {
          totalSavedBytes += h.savedBytes;
        }
      } else if (
        h.actionType === 'barcode_single' ||
        h.actionType === 'barcode_batch'
      ) {
        totalBarcodes += h.itemCount;
      } else if (h.actionType === 'zip_export') {
        totalExports += 1;
      }
    }

    return {
      totalRecords: this.history.length,
      totalImages,
      totalBarcodes,
      totalSavedBytes,
      totalExports,
    };
  }

  /**
   * Export logs as a downloadable file
   */
  public exportLogs(format: 'json' | 'txt' = 'json') {
    let content = '';
    let mimeType = 'text/plain';
    const filename = `pixelcraft-logs-${new Date().toISOString().slice(0, 10)}.${format}`;

    if (format === 'json') {
      content = JSON.stringify(this.logs, null, 2);
      mimeType = 'application/json';
    } else {
      content = this.logs
        .map(
          (l) =>
            `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] [${l.category}] ${l.title} - ${l.message} ${
              l.durationMs ? `(${l.durationMs}ms)` : ''
            }`
        )
        .join('\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export history as JSON
   */
  public exportHistory(format: 'json' | 'csv' = 'json') {
    const filename = `pixelcraft-history-${new Date().toISOString().slice(0, 10)}.${format}`;
    let content = '';
    let mimeType = 'application/json';

    if (format === 'json') {
      content = JSON.stringify(this.history, null, 2);
    } else {
      mimeType = 'text/csv';
      const headers = ['ID', 'Timestamp', 'Date', 'Type', 'Title', 'Items', 'OriginalSize', 'ProcessedSize', 'SavedBytes'];
      const rows = this.history.map((h) => [
        h.id,
        h.timestamp,
        new Date(h.timestamp).toISOString(),
        h.actionType,
        `"${h.title.replace(/"/g, '""')}"`,
        h.itemCount,
        h.originalTotalSize || 0,
        h.processedTotalSize || 0,
        h.savedBytes || 0,
      ]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const historyLogger = new HistoryLoggerService();

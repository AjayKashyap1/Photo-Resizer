import React, { useState, useEffect } from 'react';
import {
  historyLogger,
  HistoryRecord,
  LogEntry,
  LogLevel,
  LogCategory,
} from '../../utils/historyLogger';
import {
  History,
  Terminal,
  Trash2,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  HardDrive,
  FileImage,
  Barcode,
  Layers,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  FileText,
  FileArchive,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  ArrowRight,
  Sliders,
  Frame,
} from 'lucide-react';

interface HistoryAndLogsViewProps {
  lang: 'en' | 'hi';
  onNavigateToTab?: (tab: 'resizer' | 'barcode' | 'overlay') => void;
}

export const HistoryAndLogsView: React.FC<HistoryAndLogsViewProps> = ({
  lang,
  onNavigateToTab,
}) => {
  const [subTab, setSubTab] = useState<'history' | 'logs'>('history');
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [logList, setLogList] = useState<LogEntry[]>([]);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // History filtering & search
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

  // Log filtering & search
  const [logSearch, setLogSearch] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<string>('all');
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  // Subscribe to real-time events
  useEffect(() => {
    const unsubHistory = historyLogger.subscribeHistory((items) => {
      setHistoryList(items);
    });
    const unsubLogs = historyLogger.subscribeLogs((items) => {
      setLogList(items);
    });

    return () => {
      unsubHistory();
      unsubLogs();
    };
  }, []);

  const stats = historyLogger.getStats();

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (timestamp: number): string => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'image_resize':
        return <FileImage className="h-4 w-4 text-blue-600" />;
      case 'image_upscale':
        return <Sparkles className="h-4 w-4 text-amber-500" />;
      case 'border_frame':
        return <Frame className="h-4 w-4 text-purple-600" />;
      case 'barcode_single':
      case 'barcode_batch':
        return <Barcode className="h-4 w-4 text-emerald-600" />;
      case 'barcode_stamp':
        return <Layers className="h-4 w-4 text-indigo-600" />;
      case 'zip_export':
        return <FileArchive className="h-4 w-4 text-orange-600" />;
      default:
        return <History className="h-4 w-4 text-slate-600" />;
    }
  };

  const getLogLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            SUCCESS
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 border border-red-200/60">
            <AlertCircle className="h-3 w-3 text-red-600" />
            ERROR
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200/60">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            WARN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/60">
            <Info className="h-3 w-3 text-blue-600" />
            INFO
          </span>
        );
    }
  };

  const handleCopyLog = (log: LogEntry) => {
    const text = `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level.toUpperCase()}] [${log.category}] ${log.title} - ${log.message}${
      log.details ? '\n' + JSON.stringify(log.details, null, 2) : ''
    }`;
    navigator.clipboard.writeText(text);
    setCopiedLogId(log.id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  // Filtered lists
  const filteredHistory = historyList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.summary.toLowerCase().includes(historySearch.toLowerCase()) ||
      (item.metadata?.filenames &&
        item.metadata.filenames.some((f) =>
          f.toLowerCase().includes(historySearch.toLowerCase())
        ));

    if (!matchesSearch) return false;
    if (historyFilter === 'all') return true;
    if (historyFilter === 'resize' && (item.actionType === 'image_resize' || item.actionType === 'image_upscale' || item.actionType === 'border_frame')) return true;
    if (historyFilter === 'barcode' && (item.actionType === 'barcode_single' || item.actionType === 'barcode_batch')) return true;
    if (historyFilter === 'export' && item.actionType === 'zip_export') return true;
    return item.actionType === historyFilter;
  });

  const filteredLogs = logList.filter((log) => {
    const matchesSearch =
      log.title.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(logSearch.toLowerCase()));

    if (!matchesSearch) return false;
    if (logLevelFilter !== 'all' && log.level !== logLevelFilter) return false;
    if (logCategoryFilter !== 'all' && log.category !== logCategoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Stat Metric Tiles */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {lang === 'hi' ? 'कार्य इतिहास व लाइव सिस्टम लॉग्स' : 'Processing History & Live System Logs'}
                </h2>
                <p className="text-xs text-slate-500">
                  {lang === 'hi'
                    ? 'सभी पिछली फोटो रिसाइज़िंग, बारकोड जनरेशन और सिस्टम ऑपरेशन्स का विवरण'
                    : 'Audit trail, batch session history, storage savings, and real-time execution logs'}
                </p>
              </div>
            </div>
          </div>

          {/* Sub Tab Switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              id="subtab-history-btn"
              type="button"
              onClick={() => setSubTab('history')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                subTab === 'history'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="h-4 w-4" />
              <span>{lang === 'hi' ? 'कार्य इतिहास (History)' : 'Action History'}</span>
              <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-extrabold text-blue-700">
                {historyList.length}
              </span>
            </button>

            <button
              id="subtab-logs-btn"
              type="button"
              onClick={() => setSubTab('logs')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                subTab === 'logs'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="h-4 w-4" />
              <span>{lang === 'hi' ? 'सिस्टम लॉग्स (Live Logs)' : 'Live Event Logs'}</span>
              <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-extrabold text-slate-700">
                {logList.length}
              </span>
            </button>
          </div>
        </div>

        {/* Aggregate Stats Summary Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-slate-100">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-[11px] font-semibold text-slate-500 block">
              {lang === 'hi' ? 'कुल प्रोसेस की गई तस्वीरें' : 'Total Photos Processed'}
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900">{stats.totalImages}</span>
              <span className="text-xs text-slate-500 font-medium">{lang === 'hi' ? 'फाइलें' : 'files'}</span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <span className="text-[11px] font-semibold text-emerald-700 block">
              {lang === 'hi' ? 'कुल बचाया गया स्पेस' : 'Total Storage Optimized'}
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-emerald-800">
                {formatBytes(stats.totalSavedBytes)}
              </span>
              <span className="text-xs text-emerald-600 font-bold">Saved</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-[11px] font-semibold text-slate-500 block">
              {lang === 'hi' ? 'जनरेटेड बारकोड व QR' : 'Barcodes & QRs Created'}
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900">{stats.totalBarcodes}</span>
              <span className="text-xs text-slate-500 font-medium">{lang === 'hi' ? 'कोड' : 'codes'}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-[11px] font-semibold text-slate-500 block">
              {lang === 'hi' ? 'ZIP डाउनलोड्स / एक्सपोर्ट्स' : 'Export Packages / ZIP'}
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900">{stats.totalExports}</span>
              <span className="text-xs text-slate-500 font-medium">{lang === 'hi' ? 'पैकेज' : 'batches'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: ACTION HISTORY                                                    */}
      {/* ========================================================================= */}
      {subTab === 'history' && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Filters & Export/Clear */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-white p-3.5 border border-slate-200">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="history-search-input"
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder={lang === 'hi' ? 'इतिहास में खोजें (नाम, ऑपरेशन, विवरण)...' : 'Search history by title, filename, or details...'}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch('')}
                  className="absolute right-2.5 top-2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: lang === 'hi' ? 'सभी' : 'All' },
                { id: 'resize', label: lang === 'hi' ? 'फोटो रिसाइज़' : 'Photo Resizer' },
                { id: 'barcode', label: lang === 'hi' ? 'बारकोड' : 'Barcode & QR' },
                { id: 'export', label: lang === 'hi' ? 'ZIP एक्सपोर्ट' : 'ZIP Export' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setHistoryFilter(f.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    historyFilter === f.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Actions: Export & Clear */}
            <div className="flex items-center gap-2">
              <button
                id="history-export-btn"
                type="button"
                onClick={() => historyLogger.exportHistory('json')}
                disabled={historyList.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                title="Export history records as JSON"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>{lang === 'hi' ? 'JSON एक्सपोर्ट' : 'Export JSON'}</span>
              </button>

              <button
                id="history-clear-btn"
                type="button"
                onClick={() => {
                  if (window.confirm(lang === 'hi' ? 'क्या आप पूरा इतिहास साफ़ करना चाहते हैं?' : 'Are you sure you want to clear all processing history?')) {
                    historyLogger.clearHistory();
                  }
                }}
                disabled={historyList.length === 0}
                className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer disabled:opacity-50"
                title="Clear History"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{lang === 'hi' ? 'इतिहास साफ़ करें' : 'Clear All'}</span>
              </button>
            </div>
          </div>

          {/* History List */}
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-14 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                <History className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {lang === 'hi' ? 'कोई इतिहास रिकॉर्ड नहीं मिला' : 'No History Records Found'}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {lang === 'hi'
                  ? 'जब आप फोटो रीसाइज़ करेंगे, बॉर्डर्स लगाएंगे या बारकोड जनरेट करेंगे, तो वे सब यहाँ अपने आप दर्ज होते जाएंगे।'
                  : 'Whenever you resize photos, apply borders, upscales, or generate barcodes, each action will be permanently tracked here.'}
              </p>
              {onNavigateToTab && (
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('resizer')}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-xs cursor-pointer"
                  >
                    <FileImage className="h-3.5 w-3.5" />
                    <span>{lang === 'hi' ? 'फोटो एडिटर पर जाएं' : 'Open Photo Resizer'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('barcode')}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Barcode className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{lang === 'hi' ? 'बारकोड जनरेटर' : 'Open Barcodes'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-2xs"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200/80">
                      {getActionIcon(item.actionType)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {item.title}
                        </h4>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.itemCount} {item.itemCount === 1 ? 'item' : 'items'}
                        </span>
                        {item.savedBytes && item.savedBytes > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                            <TrendingDown className="h-2.5 w-2.5" />
                            {formatBytes(item.savedBytes)} saved
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                        {item.summary}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.timestamp)}
                        </span>

                        {item.metadata?.dimensions && (
                          <span className="rounded bg-slate-50 px-1.5 py-0.5 font-mono text-slate-600">
                            {item.metadata.dimensions}
                          </span>
                        )}

                        {item.originalTotalSize && item.processedTotalSize && (
                          <span className="flex items-center gap-1 font-semibold text-slate-600">
                            <span>{formatBytes(item.originalTotalSize)}</span>
                            <span>→</span>
                            <span className="text-blue-600">{formatBytes(item.processedTotalSize)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions on Item */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(item)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      {lang === 'hi' ? 'विवरण' : 'Details'}
                    </button>

                    <button
                      type="button"
                      onClick={() => historyLogger.deleteHistoryItem(item.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: LIVE SYSTEM & EVENT LOGS                                          */}
      {/* ========================================================================= */}
      {subTab === 'logs' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl bg-white p-3.5 border border-slate-200">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="log-search-input"
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder={lang === 'hi' ? 'लॉग्स में खोजें (मैसेज, कैटेगरी, कोड)...' : 'Search logs by title, message or payload...'}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
              {logSearch && (
                <button
                  type="button"
                  onClick={() => setLogSearch('')}
                  className="absolute right-2.5 top-2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Level Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 mr-1">{lang === 'hi' ? 'लेवल:' : 'Level:'}</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'success', label: 'Success' },
                { id: 'info', label: 'Info' },
                { id: 'warning', label: 'Warning' },
                { id: 'error', label: 'Error' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setLogLevelFilter(lvl.id)}
                  className={`rounded-lg px-2 py-1 text-xs font-semibold transition cursor-pointer ${
                    logLevelFilter === lvl.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <select
              value={logCategoryFilter}
              onChange={(e) => setLogCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">{lang === 'hi' ? 'सभी श्रेणियां (Categories)' : 'All Categories'}</option>
              <option value="resizer">Image Resizer</option>
              <option value="upscale">AI Upscaling</option>
              <option value="border">Border & Frame</option>
              <option value="barcode">Barcode & QR</option>
              <option value="overlay">Barcode Stamp</option>
              <option value="export">ZIP Export</option>
              <option value="system">Engine System</option>
            </select>

            {/* Log Actions: Copy, Export, Clear */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => historyLogger.exportLogs('txt')}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                title="Download plain text log file"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>.TXT</span>
              </button>

              <button
                type="button"
                onClick={() => historyLogger.exportLogs('json')}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                title="Download JSON log file"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>.JSON</span>
              </button>

              <button
                type="button"
                onClick={() => historyLogger.clearLogs()}
                className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer"
                title="Clear Logs Console"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{lang === 'hi' ? 'लॉग्स साफ़ करें' : 'Clear Logs'}</span>
              </button>
            </div>
          </div>

          {/* Real-time Log Stream Console */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 font-mono shadow-md text-xs text-slate-200">
            {/* Terminal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
                </div>
                <span className="text-[11px] font-bold text-slate-400 ml-2">
                  studio-engine://events.log
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  LIVE ENGINE STREAM
                </span>

                <span className="text-[10px] text-slate-400">
                  {filteredLogs.length} events
                </span>
              </div>
            </div>

            {/* Log Stream Body */}
            <div className="max-h-[500px] overflow-y-auto p-3 space-y-1.5 divide-y divide-slate-900">
              {filteredLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Terminal className="mx-auto h-8 w-8 text-slate-600 mb-2 opacity-50" />
                  <p className="font-sans text-xs font-semibold">
                    {lang === 'hi' ? 'कोई लॉग इवेंट नहीं मिला' : 'No Log Events in Current Stream'}
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isCopied = copiedLogId === log.id;
                  return (
                    <div
                      key={log.id}
                      className="group pt-1.5 flex items-start justify-between gap-3 font-mono hover:bg-slate-900/60 p-1.5 rounded transition"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {/* Timestamp */}
                        <span className="text-slate-500 shrink-0 text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>

                        {/* Level indicator */}
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                            log.level === 'success'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : log.level === 'error'
                              ? 'bg-red-950 text-red-300 border border-red-800/60'
                              : log.level === 'warning'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                              : 'bg-blue-950 text-blue-300 border border-blue-800/60'
                          }`}
                        >
                          {log.level}
                        </span>

                        {/* Category */}
                        <span className="text-slate-400 shrink-0 text-[11px] font-semibold">
                          [{log.category}]
                        </span>

                        {/* Title & Message */}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-100 mr-2">
                            {log.title}:
                          </span>
                          <span className="text-slate-300 text-[11px]">
                            {log.message}
                          </span>

                          {/* Optional details payload */}
                          {log.details && (
                            <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-1.5 text-[10px] text-slate-400 font-mono">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>

                      {/* Right side: Duration + Copy Button */}
                      <div className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100">
                        {log.durationMs && (
                          <span className="text-[10px] font-bold text-slate-400">
                            {log.durationMs}ms
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCopyLog(log)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                          title="Copy Log Row"
                        >
                          {isCopied ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SINGLE RECORD DETAIL VIEW                                          */}
      {/* ========================================================================= */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  {getActionIcon(selectedRecord.actionType)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedRecord.title}</h3>
                  <p className="text-[11px] text-slate-500">{formatDate(selectedRecord.timestamp)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">
                  {lang === 'hi' ? 'कार्य सारांश (Summary)' : 'Operation Summary'}
                </span>
                <p className="text-slate-600 leading-relaxed">{selectedRecord.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-200 p-2.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {lang === 'hi' ? 'आइटम्स संख्या' : 'Item Count'}
                  </span>
                  <span className="text-sm font-bold text-slate-800">{selectedRecord.itemCount}</span>
                </div>

                <div className="rounded-lg border border-slate-200 p-2.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {lang === 'hi' ? 'बचाया गया स्पेस' : 'Storage Saved'}
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    {formatBytes(selectedRecord.savedBytes || 0)}
                  </span>
                </div>
              </div>

              {selectedRecord.metadata && (
                <div className="space-y-1.5 pt-1">
                  <span className="font-bold text-slate-700 block">
                    {lang === 'hi' ? 'अतिरिक्त तकनीकी मेटाडेटा' : 'Technical Metadata'}
                  </span>
                  <pre className="max-h-40 overflow-y-auto rounded-xl bg-slate-900 p-3 text-[11px] font-mono text-emerald-400">
                    {JSON.stringify(selectedRecord.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                {lang === 'hi' ? 'बंद करें' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

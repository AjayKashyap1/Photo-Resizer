import React, { useEffect, useState } from 'react';
import {
  SlidersHorizontal,
  Barcode,
  Layers,
  Download,
  Trash2,
  Sparkles,
  Zap,
  History,
  Film,
} from 'lucide-react';
import { historyLogger } from '../utils/historyLogger';

interface HeaderProps {
  activeTab: 'resizer' | 'video' | 'barcode' | 'overlay' | 'history';
  setActiveTab: (tab: 'resizer' | 'video' | 'barcode' | 'overlay' | 'history') => void;
  imageCount: number;
  hasVideo: boolean;
  barcodeCount: number;
  onDownloadAllZip: () => void;
  onClearAll: () => void;
  onLoadSamples: () => void;
  lang: 'en' | 'hi';
  setLang: (lang: 'en' | 'hi') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  imageCount,
  hasVideo,
  barcodeCount,
  onDownloadAllZip,
  onClearAll,
  onLoadSamples,
  lang,
  setLang,
}) => {
  const [historyCount, setHistoryCount] = useState<number>(0);

  useEffect(() => {
    const unsub = historyLogger.subscribeHistory((items) => {
      setHistoryCount(items.length);
    });
    return () => unsub();
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('resizer')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  PixelCraft <span className="text-blue-600 font-semibold">& Barcode</span>
                </span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60">
                  Studio Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {lang === 'hi'
                  ? 'फोटो पिक्सेल रिसाइज़र, क्वालिटी ऑप्टिमाइज़र और बारकोड जनरेटर'
                  : 'Bulk Photo Pixel Resizer, Quality Optimizer & Barcode Studio'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200 overflow-x-auto">
            <button
              id="nav-tab-resizer"
              onClick={() => setActiveTab('resizer')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'resizer'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
              <span>{lang === 'hi' ? 'फोटो पिक्सेल' : 'Photo Resizer'}</span>
              {imageCount > 0 && (
                <span className="font-mono tabular-nums text-[10px] font-bold text-blue-700">
                  ({imageCount})
                </span>
              )}
            </button>

            <button
              id="nav-tab-video"
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Film className="h-3.5 w-3.5 text-indigo-600" />
              <span>{lang === 'hi' ? 'वीडियो एडिटर' : 'Video Editor'}</span>
              {hasVideo && (
                <span className="font-mono tabular-nums text-[10px] font-bold text-indigo-700">
                  (1)
                </span>
              )}
            </button>

            <button
              id="nav-tab-barcode"
              onClick={() => setActiveTab('barcode')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'barcode'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Barcode className="h-3.5 w-3.5 text-emerald-600" />
              <span>{lang === 'hi' ? 'बारकोड व QR' : 'Barcode & QR'}</span>
              {barcodeCount > 0 && (
                <span className="font-mono tabular-nums text-[10px] font-bold text-emerald-700">
                  ({barcodeCount})
                </span>
              )}
            </button>

            <button
              id="nav-tab-overlay"
              onClick={() => setActiveTab('overlay')}
              className={`hidden xl:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'overlay'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-purple-600" />
              <span>{lang === 'hi' ? 'बारकोड स्टैम्प' : 'Stamp Barcode'}</span>
            </button>

            <button
              id="nav-tab-history"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <History className="h-3.5 w-3.5 text-amber-500" />
              <span>{lang === 'hi' ? 'इतिहास' : 'History'}</span>
              {historyCount > 0 && (
                <span className="font-mono tabular-nums text-[10px] font-bold text-amber-700">
                  ({historyCount})
                </span>
              )}
            </button>
          </nav>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <button
              id="toggle-lang-btn"
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              title="Toggle English / Hindi Hinglish"
            >
              {lang === 'en' ? '🇮🇳 हिन्दी' : '🇬🇧 English'}
            </button>

            {/* Load Samples */}
            <button
              id="header-load-samples-btn"
              onClick={onLoadSamples}
              className="hidden lg:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{lang === 'hi' ? 'डेमो लोड करें' : 'Demo Samples'}</span>
            </button>

            {/* Clear All */}
            {(imageCount > 0 || barcodeCount > 0) && (
              <button
                id="header-clear-btn"
                onClick={onClearAll}
                className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/70 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition"
                title="Clear all uploaded images and barcodes"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{lang === 'hi' ? 'हटाएं' : 'Clear'}</span>
              </button>
            )}

            {/* Download ZIP */}
            <button
              id="header-download-zip-btn"
              onClick={onDownloadAllZip}
              disabled={imageCount === 0 && barcodeCount === 0}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition ${
                imageCount > 0 || barcodeCount > 0
                  ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer shadow-blue-500/20'
                  : 'bg-slate-300 cursor-not-allowed text-slate-500'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>{lang === 'hi' ? 'ZIP डाउनलोड' : 'Download ZIP'}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

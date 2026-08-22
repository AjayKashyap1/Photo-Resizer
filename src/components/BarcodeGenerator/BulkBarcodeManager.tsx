import React, { useState } from 'react';
import { BarcodeType, BulkBarcodeItem } from '../../types';
import {
  BARCODE_TYPES,
  DEFAULT_BARCODE_CONFIG,
  generateBarcodeCanvas,
  generateBarcodeSVG,
} from '../../utils/barcodeGenerator';
import { downloadBlob, exportBarcodesAsZip } from '../../utils/zipExporter';
import { SAMPLE_BARCODES } from '../../utils/sampleData';
import {
  Layers,
  Sparkles,
  Download,
  Trash2,
  Play,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  Printer,
  FileArchive,
} from 'lucide-react';

interface BulkBarcodeManagerProps {
  barcodes: BulkBarcodeItem[];
  setBarcodes: React.Dispatch<React.SetStateAction<BulkBarcodeItem[]>>;
  onOpenPrintSheet: () => void;
  lang: 'en' | 'hi';
}

export const BulkBarcodeManager: React.FC<BulkBarcodeManagerProps> = ({
  barcodes,
  setBarcodes,
  onOpenPrintSheet,
  lang,
}) => {
  const [inputText, setInputText] = useState(
    '8901030384355, Amul Butter 500g, ₹275.00\n8901491101837, Tata Tea Gold 1kg, ₹480.00\n012345678905, Premium Roast Coffee, $14.99\nSHIP-IND-9948210, Priority Parcel, Express\nhttps://ais.studio/build, AI Studio Web, Scan Me'
  );
  const [selectedType, setSelectedType] = useState<BarcodeType>('ean13');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');

  const handleGenerateBulk = async () => {
    if (!inputText.trim()) return;
    setIsGenerating(true);
    setProgressText('Parsing lines...');

    const lines = inputText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const newItems: BulkBarcodeItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Format can be CSV: "code, labelTitle, labelPrice" or just "code"
      const parts = line.split(',').map((p) => p.trim());
      const rawText = parts[0];
      const title = parts[1] || '';
      const price = parts[2] || '';

      // Infer type if URL or generic string vs digits
      let typeToUse = selectedType;
      if (rawText.startsWith('http') && selectedType !== 'qrcode') {
        typeToUse = 'qrcode';
      }

      setProgressText(`Generating barcode ${i + 1}/${lines.length}...`);

      try {
        const canvas = await generateBarcodeCanvas({
          ...DEFAULT_BARCODE_CONFIG,
          type: typeToUse,
          text: rawText,
          labelTitle: title,
          labelPrice: price,
        });

        const dataUrl = canvas.toDataURL('image/png');
        const svg = generateBarcodeSVG({
          ...DEFAULT_BARCODE_CONFIG,
          type: typeToUse,
          text: rawText,
          labelTitle: title,
          labelPrice: price,
        });

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png')
        );

        newItems.push({
          id: 'bc_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 4),
          type: typeToUse,
          text: rawText,
          labelTitle: title,
          labelPrice: price,
          dataUrl,
          svgString: svg,
          blob: blob || undefined,
        });
      } catch (err: any) {
        newItems.push({
          id: 'bc_err_' + Date.now() + '_' + i,
          type: typeToUse,
          text: rawText,
          labelTitle: title,
          labelPrice: price,
          error: err.message || 'Generation failed',
        });
      }
    }

    setBarcodes((prev) => [...prev, ...newItems]);
    setIsGenerating(false);
    setProgressText('');
  };

  const handleDownloadSingle = (item: BulkBarcodeItem) => {
    if (item.blob) {
      const fname = `${item.type}_${item.text.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      downloadBlob(item.blob, fname);
    }
  };

  const handleDownloadAllZip = async () => {
    if (barcodes.length === 0) return;
    const blob = await exportBarcodesAsZip(barcodes);
    downloadBlob(blob, 'barcodes_batch.zip');
  };

  const handleLoadSamples = () => {
    const formatted = SAMPLE_BARCODES.map(
      (s) => `${s.text}, ${s.labelTitle}, ${s.labelPrice}`
    ).join('\n');
    setInputText(formatted);
  };

  return (
    <div className="space-y-6">
      
      {/* Input Box Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>{lang === 'hi' ? 'बल्क बारकोड जनरेटर (CSV / लिस्ट)' : 'Bulk Barcode Generator (List / CSV)'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'hi'
                ? 'प्रत्येक लाइन पर एक कोड डालें। फॉर्मेट: Code, Product Title, Price'
                : 'Paste a list of codes (one per line). Format: Code, Product Title, Price'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSamples}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{lang === 'hi' ? 'सैंपल डेटा भरें' : 'Load Sample List'}</span>
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div>
          <textarea
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="8901030384355, Product Name, ₹199.00"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 font-mono text-xs font-medium text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Default Symbology:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as BarcodeType)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
            >
              {BARCODE_TYPES.map((bt) => (
                <option key={bt.type} value={bt.type}>
                  {bt.type.toUpperCase()} - {bt.name.split('(')[0]}
                </option>
              ))}
            </select>
          </div>

          <button
            id="generate-bulk-barcodes-btn"
            type="button"
            onClick={handleGenerateBulk}
            disabled={isGenerating || !inputText.trim()}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition shadow-sm ${
              isGenerating || !inputText.trim()
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-500/20 cursor-pointer'
            }`}
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
            <span>{isGenerating ? progressText : lang === 'hi' ? 'सभी बारकोड जनरेट करें' : 'Generate All Barcodes'}</span>
          </button>
        </div>
      </div>

      {/* Generated Batch Table / Gallery */}
      {barcodes.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'hi' ? 'जनरेट किए गए बारकोड' : 'Generated Barcodes Queue'}
              </h3>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                {barcodes.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenPrintSheet}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <Printer className="h-3.5 w-3.5 text-slate-500" />
                <span>{lang === 'hi' ? 'प्रिंट शीट (A4)' : 'Print Sheet'}</span>
              </button>

              <button
                id="download-all-barcodes-zip-btn"
                type="button"
                onClick={handleDownloadAllZip}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition shadow-sm cursor-pointer"
              >
                <FileArchive className="h-3.5 w-3.5" />
                <span>{lang === 'hi' ? 'बारकोड ZIP डाउनलोड' : 'Download Barcodes (ZIP)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setBarcodes([])}
                className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                title="Clear barcode batch"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Grid Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {barcodes.map((item, idx) => (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-slate-300 transition"
              >
                <div className="flex min-h-[120px] items-center justify-center rounded-lg bg-slate-50 p-2 border border-slate-100">
                  {item.dataUrl ? (
                    <img
                      src={item.dataUrl}
                      alt={item.text}
                      className="max-h-24 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-red-500 font-semibold">{item.error || 'Error'}</span>
                  )}
                </div>

                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-800 truncate" title={item.text}>
                      {item.text}
                    </span>
                    <span className="rounded bg-slate-100 px-1 py-0.2 text-[10px] uppercase font-bold text-slate-500">
                      {item.type}
                    </span>
                  </div>

                  {item.labelTitle && (
                    <p className="truncate text-xs font-semibold text-slate-600">{item.labelTitle}</p>
                  )}
                  {item.labelPrice && (
                    <p className="text-xs font-bold text-emerald-700">{item.labelPrice}</p>
                  )}

                  <div className="mt-2 flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDownloadSingle(item)}
                      disabled={!item.blob}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                    >
                      <Download className="h-3 w-3" />
                      <span>PNG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarcodes((prev) => prev.filter((b) => b.id !== item.id))}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

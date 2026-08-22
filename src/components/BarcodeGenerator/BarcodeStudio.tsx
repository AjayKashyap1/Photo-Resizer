import React, { useEffect, useRef, useState } from 'react';
import {
  BarcodeConfig,
  BarcodeType,
  BulkBarcodeItem,
} from '../../types';
import {
  BARCODE_TYPES,
  DEFAULT_BARCODE_CONFIG,
  generateBarcodeCanvas,
  generateBarcodeSVG,
  formatUPIPaymentString,
  formatWifiString,
  formatVCardString,
  sanitizeBarcodeText,
} from '../../utils/barcodeGenerator';
import { downloadBlob } from '../../utils/zipExporter';
import { historyLogger } from '../../utils/historyLogger';
import {
  Barcode,
  QrCode,
  Download,
  Copy,
  Plus,
  Layers,
  Sparkles,
  Settings2,
  Tag,
  Wifi,
  CreditCard,
  User,
  Link,
  Type,
  Check,
  Printer,
} from 'lucide-react';

interface BarcodeStudioProps {
  onAddBarcodeToBatch: (item: BulkBarcodeItem) => void;
  lang: 'en' | 'hi';
  onOpenPrintSheet?: () => void;
}

export const BarcodeStudio: React.FC<BarcodeStudioProps> = ({
  onAddBarcodeToBatch,
  lang,
  onOpenPrintSheet,
}) => {
  const [config, setConfig] = useState<BarcodeConfig>(DEFAULT_BARCODE_CONFIG);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [svgString, setSvgString] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // QR Payload Sub-form states
  const [qrUrl, setQrUrl] = useState('https://ais.studio/build');
  const [upiVpa, setUpiVpa] = useState('merchant@upi');
  const [upiName, setUpiName] = useState('Store Name');
  const [upiAmount, setUpiAmount] = useState('500');
  const [wifiSsid, setWifiSsid] = useState('Office_WiFi_5G');
  const [wifiPass, setWifiPass] = useState('SuperSecretPass');
  const [contactName, setContactName] = useState('Rahul Sharma');
  const [contactPhone, setContactPhone] = useState('+91 98765 43210');
  const [contactEmail, setContactEmail] = useState('rahul@example.com');

  const selectedTypeMeta =
    BARCODE_TYPES.find((b) => b.type === config.type) || BARCODE_TYPES[0];

  // Live generation effect
  useEffect(() => {
    let isCancelled = false;

    const render = async () => {
      setError(null);
      try {
        const canvas = await generateBarcodeCanvas(config);
        if (isCancelled) return;
        const dataUrl = canvas.toDataURL('image/png');
        setPreviewDataUrl(dataUrl);

        canvas.toBlob((blob) => {
          if (!isCancelled && blob) {
            setPreviewBlob(blob);
          }
        }, 'image/png');

        // Generate SVG string as well
        try {
          const svg = generateBarcodeSVG(config);
          if (!isCancelled) setSvgString(svg);
        } catch {
          // fallback
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to render barcode');
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [config]);

  // QR Template Switcher
  const handleQrTypeChange = (type: 'text' | 'url' | 'wifi' | 'upi' | 'vcard') => {
    let payload = config.text;
    if (type === 'url') payload = qrUrl;
    if (type === 'upi') payload = formatUPIPaymentString(upiVpa, upiName, upiAmount);
    if (type === 'wifi') payload = formatWifiString(wifiSsid, wifiPass);
    if (type === 'vcard')
      payload = formatVCardString({
        name: contactName,
        phone: contactPhone,
        email: contactEmail,
      });

    setConfig({
      ...config,
      qrContentType: type,
      text: payload,
    });
  };

  const handleBarcodeTypeSelect = (type: BarcodeType) => {
    const meta = BARCODE_TYPES.find((b) => b.type === type);
    setConfig({
      ...config,
      type,
      text: meta ? meta.defaultText : '12345678',
    });
  };

  const handleDownloadPNG = () => {
    if (!previewBlob) return;
    const filename = `${config.type}_${config.text.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    downloadBlob(previewBlob, filename);

    historyLogger.log(
      'success',
      'barcode',
      'Barcode Downloaded',
      `Saved barcode ${config.type.toUpperCase()}: "${config.text}" as PNG.`
    );

    historyLogger.addHistory({
      actionType: 'barcode_single',
      title: `Generated Barcode: ${config.type.toUpperCase()}`,
      summary: `Created ${config.type.toUpperCase()} barcode for "${config.text}"`,
      itemCount: 1,
      previewUrls: [previewDataUrl],
      metadata: {
        barcodeType: config.type,
      },
    });
  };

  const handleDownloadSVG = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const filename = `${config.type}_${config.text.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`;
    downloadBlob(blob, filename);

    historyLogger.log(
      'success',
      'barcode',
      'Barcode Vector SVG Downloaded',
      `Saved vector SVG ${config.type.toUpperCase()}: "${config.text}".`
    );
  };

  const handleAddToBatch = () => {
    if (!previewBlob) return;
    onAddBarcodeToBatch({
      id: 'bc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: config.type,
      text: config.text,
      labelTitle: config.labelTitle,
      labelPrice: config.labelPrice,
      dataUrl: previewDataUrl,
      svgString: svgString,
      blob: previewBlob,
    });

    historyLogger.log(
      'info',
      'barcode',
      'Barcode Added to Batch Queue',
      `Queued ${config.type.toUpperCase()} "${config.text}" into batch manager.`
    );

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      
      {/* Left Form: Format & Payload Configuration (7 Cols) */}
      <div className="space-y-6 lg:col-span-7">
        
        {/* 1. Barcode Symbology Selection */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Barcode className="h-4 w-4 text-emerald-600" />
                <span>{lang === 'hi' ? '1. बारकोड और क्यूआर फॉर्मेट चुनें' : '1. Select Barcode / 2D Format'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'hi' ? 'EAN-13, UPC, QR कोड, Code 128, ITF-14 और अन्य' : 'EAN-13, EAN-8, UPC-A, UPC-E, QR Code, Code 128 & More'}
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
              {selectedTypeMeta.category}
            </span>
          </div>

          {/* Barcode Types Grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {BARCODE_TYPES.map((bt) => {
              const isSelected = config.type === bt.type;
              return (
                <button
                  key={bt.type}
                  id={`select-barcode-type-${bt.type}`}
                  type="button"
                  onClick={() => handleBarcodeTypeSelect(bt.type)}
                  className={`flex flex-col items-start rounded-xl p-2.5 text-left border transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {bt.type === 'qrcode' || bt.type === 'datamatrix' || bt.type === 'azteccode' ? (
                      <QrCode className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`} />
                    ) : (
                      <Barcode className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`} />
                    )}
                    <span className={isSelected ? 'text-emerald-950 font-bold' : 'text-slate-800'}>
                      {bt.type.toUpperCase()}
                    </span>
                  </div>
                  <span className="mt-1 line-clamp-1 text-[10px] text-slate-500">
                    {bt.name.split('(')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-200/70">
            <span className="font-semibold text-slate-800">{selectedTypeMeta.name}: </span>
            <span>{selectedTypeMeta.description}</span>
          </div>
        </div>

        {/* 2. Payload / Data Input */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Type className="h-4 w-4 text-blue-600" />
              <span>{lang === 'hi' ? '2. डेटा / कोड वैल्यू भरें' : '2. Code Data & Content Payload'}</span>
            </h3>
            <p className="text-xs text-slate-500">{selectedTypeMeta.patternHelp}</p>
          </div>

          {/* QR Special Templates (if QR Code is chosen) */}
          {config.type === 'qrcode' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
                {[
                  { id: 'url', label: 'Website URL', icon: Link },
                  { id: 'upi', label: 'UPI Payment (INR)', icon: CreditCard },
                  { id: 'wifi', label: 'WiFi Access', icon: Wifi },
                  { id: 'vcard', label: 'Contact Card', icon: User },
                  { id: 'text', label: 'Plain Text', icon: Type },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = (config.qrContentType || 'url') === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleQrTypeChange(t.id as any)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                        active
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* UPI Subform */}
              {config.qrContentType === 'upi' && (
                <div className="grid grid-cols-1 gap-2.5 rounded-xl bg-emerald-50/50 p-3.5 border border-emerald-200/60 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-0.5">UPI ID (VPA)</label>
                    <input
                      type="text"
                      value={upiVpa}
                      onChange={(e) => {
                        setUpiVpa(e.target.value);
                        setConfig({
                          ...config,
                          text: formatUPIPaymentString(e.target.value, upiName, upiAmount),
                        });
                      }}
                      placeholder="merchant@okhdfcbank"
                      className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-0.5">Payee Name</label>
                    <input
                      type="text"
                      value={upiName}
                      onChange={(e) => {
                        setUpiName(e.target.value);
                        setConfig({
                          ...config,
                          text: formatUPIPaymentString(upiVpa, e.target.value, upiAmount),
                        });
                      }}
                      placeholder="Ajay Enterprises"
                      className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-0.5">Amount (₹ INR)</label>
                    <input
                      type="number"
                      value={upiAmount}
                      onChange={(e) => {
                        setUpiAmount(e.target.value);
                        setConfig({
                          ...config,
                          text: formatUPIPaymentString(upiVpa, upiName, e.target.value),
                        });
                      }}
                      placeholder="500"
                      className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {/* WiFi Subform */}
              {config.qrContentType === 'wifi' && (
                <div className="grid grid-cols-1 gap-2.5 rounded-xl bg-blue-50/50 p-3.5 border border-blue-200/60 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-900 mb-0.5">Network Name (SSID)</label>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => {
                        setWifiSsid(e.target.value);
                        setConfig({
                          ...config,
                          text: formatWifiString(e.target.value, wifiPass),
                        });
                      }}
                      className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-900 mb-0.5">WiFi Password</label>
                    <input
                      type="text"
                      value={wifiPass}
                      onChange={(e) => {
                        setWifiPass(e.target.value);
                        setConfig({
                          ...config,
                          text: formatWifiString(wifiSsid, e.target.value),
                        });
                      }}
                      className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Standard Text / Value Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                {lang === 'hi' ? 'बारकोड वैल्यू / स्ट्रिंग' : 'Barcode / QR Payload String'}
              </label>
              <button
                type="button"
                onClick={() => setConfig({ ...config, text: selectedTypeMeta.example })}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                Use Example ({selectedTypeMeta.example})
              </button>
            </div>
            <input
              id="input-barcode-data"
              type="text"
              value={config.text}
              onChange={(e) => setConfig({ ...config, text: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* 3. Product Label & Pricing Badge Extras */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tag className="h-4 w-4 text-purple-600" />
              <span>{lang === 'hi' ? '3. प्रोडक्ट स्टिकर और प्राइस लेबल (वैकल्पिक)' : '3. Product Sticker & Price Tag Layout'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'hi' ? 'दुकान या पैकेजिंग के लिए प्रोडक्ट नाम और कीमत प्रिंट करें।' : 'Add optional product title, subtitle, and MRP/Price on sticker.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product Title</label>
              <input
                type="text"
                value={config.labelTitle || ''}
                placeholder="e.g. Pure Honey 500g"
                onChange={(e) => setConfig({ ...config, labelTitle: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Subtitle / SKU</label>
              <input
                type="text"
                value={config.labelSubtitle || ''}
                placeholder="e.g. SKU: HN-500-A"
                onChange={(e) => setConfig({ ...config, labelSubtitle: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Price Badge (MRP / Price)</label>
              <input
                type="text"
                value={config.labelPrice || ''}
                placeholder="e.g. ₹350.00 / $9.99"
                onChange={(e) => setConfig({ ...config, labelPrice: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700"
              />
            </div>
          </div>
        </div>

        {/* 4. Visual Styling & Colors */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-slate-700" />
              <span>{lang === 'hi' ? '4. स्टाइल और रंग' : '4. Colors & Sizing'}</span>
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Foreground */}
            <div>
              <span className="block text-[11px] font-medium text-slate-600 mb-1">Bar Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.foregroundColor}
                  onChange={(e) => setConfig({ ...config, foregroundColor: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-300"
                />
                <span className="text-xs font-mono font-semibold">{config.foregroundColor}</span>
              </div>
            </div>

            {/* Background */}
            <div>
              <span className="block text-[11px] font-medium text-slate-600 mb-1">Background</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.backgroundColor === 'transparent' ? '#ffffff' : config.backgroundColor}
                  onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value, transparentBackground: false })}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-300"
                />
                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.transparentBackground}
                    onChange={(e) => setConfig({ ...config, transparentBackground: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>Alpha</span>
                </label>
              </div>
            </div>

            {/* Scale */}
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                <span>Scale</span>
                <span className="font-bold">{config.scale}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                value={config.scale}
                onChange={(e) => setConfig({ ...config, scale: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer accent-emerald-600"
              />
            </div>

            {/* Include text toggle */}
            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeText}
                  onChange={(e) => setConfig({ ...config, includeText: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Show Text Digits</span>
              </label>
            </div>
          </div>
        </div>

      </div>

      {/* Right Column: Live Interactive Preview & Export (5 Cols) */}
      <div className="space-y-6 lg:col-span-5">
        <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              {lang === 'hi' ? 'लाइव बारकोड प्रीव्यू' : 'Live Barcode Preview'}
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-700">
              {config.type.toUpperCase()}
            </span>
          </div>

          {/* Barcode Canvas Card */}
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl bg-slate-50 p-6 border border-slate-200/80 shadow-inner">
            {error ? (
              <div className="rounded-xl bg-red-50 p-4 text-center text-xs text-red-700 border border-red-200">
                <p className="font-bold mb-1">Rendering Error</p>
                <p>{error}</p>
                <p className="mt-2 text-[11px] text-red-500">
                  Tip: Check digits format (e.g. EAN13 needs 12 or 13 digits).
                </p>
              </div>
            ) : previewDataUrl ? (
              <div className="flex flex-col items-center justify-center max-w-full overflow-hidden p-2 rounded-lg bg-white shadow-xs border border-slate-200">
                <img
                  src={previewDataUrl}
                  alt="Generated Barcode"
                  className="max-h-56 max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="text-xs text-slate-400">Rendering preview...</div>
            )}
          </div>

          {/* Download & Batch Actions */}
          <div className="space-y-3">
            {/* Add to Batch Queue */}
            <button
              id="add-barcode-to-batch-btn"
              type="button"
              onClick={handleAddToBatch}
              disabled={Boolean(error) || !previewBlob}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white transition shadow-sm ${
                copied
                  ? 'bg-emerald-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-emerald-600/20 cursor-pointer'
              }`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>
                {copied
                  ? lang === 'hi'
                    ? 'बैच लिस्ट में जोड़ा गया!'
                    : 'Added to Batch Collection!'
                  : lang === 'hi'
                  ? 'बैच लिस्ट में जोड़ें (बल्क ZIP के लिए)'
                  : 'Add to Batch Queue for ZIP Export'}
              </span>
            </button>

            {/* PNG & SVG Downloads */}
            <div className="grid grid-cols-2 gap-2">
              <button
                id="download-barcode-png-btn"
                type="button"
                onClick={handleDownloadPNG}
                disabled={Boolean(error) || !previewBlob}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition shadow-2xs"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Download PNG</span>
              </button>

              <button
                id="download-barcode-svg-btn"
                type="button"
                onClick={handleDownloadSVG}
                disabled={Boolean(error) || !svgString}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition shadow-2xs"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Download SVG</span>
              </button>
            </div>

            {/* Print Sticker Sheet Button */}
            {onOpenPrintSheet && (
              <button
                type="button"
                onClick={onOpenPrintSheet}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{lang === 'hi' ? 'स्टिकर शीट प्रिंट प्रीव्यू (A4/Letter)' : 'Print Label Sticker Sheet'}</span>
              </button>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};

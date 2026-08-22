import React, { useState } from 'react';
import { BulkBarcodeItem } from '../../types';
import { X, Printer, Settings, Sliders } from 'lucide-react';

interface PrintableSheetModalProps {
  barcodes: BulkBarcodeItem[];
  onClose: () => void;
  lang: 'en' | 'hi';
}

export const PrintableSheetModal: React.FC<PrintableSheetModalProps> = ({
  barcodes,
  onClose,
  lang,
}) => {
  const [columns, setColumns] = useState<2 | 3 | 4>(3);
  const [repeatCount, setRepeatCount] = useState(1);
  const [showBorder, setShowBorder] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  // Build grid items (can repeat items if user wants multiple stickers per code)
  const displayItems: BulkBarcodeItem[] = [];
  barcodes.forEach((bc) => {
    for (let r = 0; r < repeatCount; r++) {
      displayItems.push(bc);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-[95vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 print:hidden">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Printer className="h-4 w-4 text-emerald-600" />
              <span>{lang === 'hi' ? 'स्टिकर शीट प्रिंट प्रीव्यू (A4 पेपर)' : 'Printable Barcode Sticker Sheet (A4)'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'hi' ? 'लेबल और स्टिकर पेपर पर डायरेक्ट प्रिंट करें।' : 'Ready to print on adhesive label sticker sheets.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Column Selector */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs">
              <span className="px-2 font-semibold text-slate-500">Columns:</span>
              {[2, 3, 4].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColumns(c as any)}
                  className={`rounded px-2 py-0.5 font-bold transition ${
                    columns === c ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Repeat copies per barcode */}
            <div className="flex items-center gap-1 text-xs">
              <span className="font-semibold text-slate-500">Copies:</span>
              <input
                type="number"
                min="1"
                max="50"
                value={repeatCount}
                onChange={(e) => setRepeatCount(Math.max(1, Number(e.target.value)))}
                className="w-14 rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-900"
              />
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition shadow-sm cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{lang === 'hi' ? 'प्रिंट करें (Ctrl+P)' : 'Print Sheet'}</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sheet Preview Container */}
        <div className="flex-1 overflow-auto bg-slate-100 p-8 print:p-0 print:bg-white flex justify-center">
          
          {/* Printable A4 Paper simulation */}
          <div
            id="printable-sticker-sheet"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 shadow-lg print:shadow-none print:p-4 print:max-w-none"
          >
            <div
              className={`grid gap-4`}
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {displayItems.map((item, idx) => (
                <div
                  key={`${item.id}_${idx}`}
                  className={`flex flex-col items-center justify-between rounded-lg p-3 text-center bg-white ${
                    showBorder ? 'border border-dashed border-slate-300 print:border-slate-400' : ''
                  }`}
                >
                  {item.labelTitle && (
                    <p className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">
                      {item.labelTitle}
                    </p>
                  )}

                  {item.dataUrl && (
                    <img
                      src={item.dataUrl}
                      alt={item.text}
                      className="max-h-20 max-w-full object-contain my-1"
                    />
                  )}

                  <div className="w-full mt-1 flex items-center justify-between text-[10px] text-slate-600 border-t border-slate-100 pt-1">
                    <span className="font-mono">{item.text}</span>
                    {item.labelPrice && (
                      <span className="font-bold text-emerald-800">{item.labelPrice}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

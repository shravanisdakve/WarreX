import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Upload, Save, Loader, Sparkles, FileText, X, AlertTriangle, ShieldCheck, ShieldAlert, FileWarning } from 'lucide-react';
import { addMonths, format, parse, isValid } from 'date-fns';

const BRANDS = ["Samsung", "LG", "Sony", "Apple", "HP", "Dell", "Lenovo", "Whirlpool", "Bosch", "OnePlus", "Xiaomi", "Realme", "Panasonic", "Godrej", "Voltas", "Haier", "Asus", "Acer"];
const CATEGORIES = ["Electronics", "Appliances", "Furniture", "Vehicle", "Accessories", "Other"];

// --- Robust OCR parsing helpers ---

/** Try to parse dates in many formats including "28 Feb 2026", "28/02/2026", "2026-02-28" etc. */
function parseFlexibleDate(dateStr: string): Date | null {
  const cleaned = dateStr.trim();

  // Formats to try
  const formats = [
    'yyyy-MM-dd',
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'dd-MM-yyyy',
    'MM-dd-yyyy',
    'dd MMM yyyy',     // 28 Feb 2026
    'dd MMMM yyyy',    // 28 February 2026
    'MMM dd, yyyy',    // Feb 28, 2026
    'MMMM dd, yyyy',   // February 28, 2026
    'dd.MM.yyyy',
    'yyyy/MM/dd',
  ];

  for (const fmt of formats) {
    try {
      const result = parse(cleaned, fmt, new Date());
      if (isValid(result) && result.getFullYear() > 1990 && result.getFullYear() < 2040) {
        return result;
      }
    } catch {
      // Try next format
    }
  }

  // Fallback: native Date constructor
  try {
    const d = new Date(cleaned);
    if (isValid(d) && d.getFullYear() > 1990 && d.getFullYear() < 2040) return d;
  } catch { /* skip */ }

  return null;
}

/** Extract product name heuristics from OCR text */
function extractProductName(text: string, detectedBrand: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);

  // Look for lines with "Model" or "Product"
  const modelRegex = /(?:Model|Product|Item|Description)\s*[:.\-]?\s*(.+)/i;
  for (const line of lines) {
    const match = line.match(modelRegex);
    if (match && match[1] && match[1].length > 2 && match[1].length < 80) {
      return match[1].trim();
    }
  }

  // Look for lines containing the brand followed by model info
  if (detectedBrand) {
    for (const line of lines) {
      if (line.toLowerCase().includes(detectedBrand.toLowerCase())) {
        // If line has brand + something like a model number
        const afterBrand = line.substring(line.toLowerCase().indexOf(detectedBrand.toLowerCase()) + detectedBrand.length).trim();
        if (afterBrand.length > 2 && afterBrand.length < 60) {
          // Check if it looks like a model
          if (/[A-Z0-9]/.test(afterBrand)) {
            return `${detectedBrand} ${afterBrand}`.trim();
          }
        }
      }
    }
  }

  return '';
}

export default function AddProduct() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    productName: '',
    brand: '',
    category: 'Electronics',
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    warrantyMonths: 12,
    invoiceNumber: '',
    purchasePrice: '',
    notes: ''
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [invoiceText, setInvoiceText] = useState('');
  const [ocrHighlights, setOcrHighlights] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [docQuality, setDocQuality] = useState<any>(null);
  const [analyzingDoc, setAnalyzingDoc] = useState(false);

  useEffect(() => {
    const inv = formData.invoiceNumber?.trim() || '';
    if (inv.length > 2) {
      const checkDupe = async () => {
        try {
          console.log(`[DEBUG] Firing API check for: ${inv}`);
          const res = await axios.get(`/api/products/check-invoice?invoiceNumber=${encodeURIComponent(inv)}`);
          console.log('[DEBUG] API Response:', res.data);
          if (res.data.exists) {
            setDuplicateWarning(`Warning: Already registered for "${res.data.productName}".`);
          } else {
            setDuplicateWarning(null);
          }
        } catch (e) {
          console.error('[DEBUG] API Error:', e);
        }
      };
      const timer = setTimeout(checkDupe, 600);
      return () => clearTimeout(timer);
    } else {
      setDuplicateWarning(null);
    }
  }, [formData.invoiceNumber]);

  console.log(`[RENDER] Invoice: "${formData.invoiceNumber}", Warning: ${!!duplicateWarning}`);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
      if (!allowedTypes.includes(file.type)) {
        if (file.type === 'application/pdf') {
          alert('Invalid file format. Please upload an image format (JPEG/PNG) to enable AI detection.');
        } else {
          alert('Invalid file format. Please upload an image.');
        }
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be under 5 MB.');
        return;
      }

      setInvoiceFile(file);
      setDocQuality(null);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }

      // Only run OCR on images
      if (file.type.startsWith('image/')) {
        processOCR(file);
        analyzeDocumentQuality(file);
      }
    }
  };

  const removeFile = () => {
    setInvoiceFile(null);
    setPreviewUrl(null);
    setInvoiceText('');
    setOcrHighlights([]);
    setDocQuality(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const analyzeDocumentQuality = async (file: File) => {
    setAnalyzingDoc(true);
    try {
      const formData = new FormData();
      formData.append('invoice', file);
      const res = await axios.post('/api/analyze/document-quality', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDocQuality(res.data);
    } catch (error) {
      console.error('Document quality analysis failed:', error);
    } finally {
      setAnalyzingDoc(false);
    }
  };

  const processOCR = async (file: File) => {
    setOcrProcessing(true);
    setOcrProgress(0);
    setOcrHighlights([]);
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const result = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      const text = result.data.text;
      setInvoiceText(text);
      parseOCRText(text);
    } catch (error) {
      console.error('OCR Error:', error);
      alert('Failed to process invoice image. You can still fill in the details manually.');
    } finally {
      setOcrProcessing(false);
    }
  };

  const parseOCRText = (text: string) => {
    const highlights: string[] = [];
    let detectedBrand = '';
    let detectedDate = '';
    let detectedInvoiceNo = '';
    let detectedProductName = '';
    let detectedPrice = '';

    // Detect Brand
    for (const brand of BRANDS) {
      if (text.toLowerCase().includes(brand.toLowerCase())) {
        detectedBrand = brand;
        highlights.push(`🏷️ Brand detected: ${brand}`);
        break;
      }
    }

    // Detect Date – comprehensive regex patterns
    // Pattern 1: DD MMM YYYY or DD MMMM YYYY (e.g., "28 Feb 2026", "28 February 2026")
    const datePatterns = [
      /(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/i,
      /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})/i,
      /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
      /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const parsed = parseFlexibleDate(match[0]);
        if (parsed) {
          detectedDate = format(parsed, 'yyyy-MM-dd');
          highlights.push(`📅 Date detected: ${match[0]}`);
          break;
        }
      }
    }

    // Detect Invoice Number
    const invoicePatterns = [
      /Invoice\s*(?:No|Number|#|ID)?\.?\s*[:.\-]?\s*([A-Z0-9][\w\-\/]{2,20})/i,
      /Bill\s*(?:No|Number|#)?\.?\s*[:.\-]?\s*([A-Z0-9][\w\-\/]{2,20})/i,
      /Receipt\s*(?:No|Number|#)?\.?\s*[:.\-]?\s*([A-Z0-9][\w\-\/]{2,20})/i,
      /Order\s*(?:No|Number|#|ID)?\.?\s*[:.\-]?\s*([A-Z0-9][\w\-\/]{2,20})/i,
    ];

    for (const pattern of invoicePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        detectedInvoiceNo = match[1].trim();
        highlights.push(`🔢 Invoice # detected: ${detectedInvoiceNo}`);
        break;
      }
    }

    // Detect Product Name
    detectedProductName = extractProductName(text, detectedBrand);
    if (detectedProductName) {
      highlights.push(`📦 Product detected: ${detectedProductName}`);
    }

    // Detect Price (e.g., "Total: 12,000", "Amount: 2500", "₹ 45000", "Price: 500")
    const pricePatterns = [
      /(?:Total|Amount|Price|Paid|Value)\s*(?:[:.\-]?|Amt\.?|Sum)?\s*(?:Rs\.?|INR|₹)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:Rs\.?|INR|₹)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/
    ];
    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        detectedPrice = match[1].replace(/,/g, '');
        highlights.push(`💰 Price detected: ₹${detectedPrice}`);
        break;
      }
    }

    setOcrHighlights(highlights);

    setFormData(prev => ({
      ...prev,
      productName: detectedProductName || prev.productName,
      brand: detectedBrand || prev.brand,
      purchaseDate: detectedDate || prev.purchaseDate,
      invoiceNumber: detectedInvoiceNo || prev.invoiceNumber,
      purchasePrice: detectedPrice || prev.purchasePrice
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let invoiceFileUrl = '';
      if (invoiceFile) {
        const uploadData = new FormData();
        uploadData.append('invoice', invoiceFile);
        const uploadRes = await axios.post('/api/upload/invoice', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        invoiceFileUrl = uploadRes.data.url;
      }

      const expiryDate = format(addMonths(new Date(formData.purchaseDate), formData.warrantyMonths), 'yyyy-MM-dd');

      await axios.post('/api/products', {
        ...formData,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : 0,
        expiryDate,
        invoiceFileUrl,
        invoiceText
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Failed to save product', error);
      alert(error.response?.data?.error || 'Failed to save product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-[#151c2e]/80 backdrop-blur-xl p-8 rounded-2xl shadow-lg border border-indigo-500/10 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 card-interactive">
        <h1 className="text-2xl font-bold mb-6 text-slate-100">{t('add_product')}</h1>

        {/* Upload Area */}
        <div className="mb-8 p-6 border-2 border-dashed border-indigo-500/20 rounded-xl text-center bg-gradient-to-b from-indigo-500/5 to-transparent transition-colors hover:border-indigo-500/40">
          <Upload className="mx-auto h-10 w-10 text-indigo-500" />
          <div className="mt-4 flex flex-col items-center">
            <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold shadow-md hover:from-indigo-500 hover:to-purple-500 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all btn-tactile">
              <Sparkles className="w-4 h-4" />
              <span>{t('upload_invoice')}</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
            </label>
            <p className="mt-2 text-xs text-slate-500">Supported: JPEG, PNG, WebP (Max 5MB) • AI-powered text extraction</p>
          </div>

          {/* Preview */}
          {invoiceFile && !ocrProcessing && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">{invoiceFile.name}</span>
              <button onClick={removeFile} className="ml-2 p-1 rounded-full hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {previewUrl && (
            <div className={`mt-4 relative inline-block rounded-lg shadow-sm border overflow-hidden ${ocrProcessing ? 'border-green-400' : 'border-gray-200'}`}>
              <img src={previewUrl} alt="Invoice preview" className="max-h-32 mx-auto" />
              {ocrProcessing && (
                <>
                  <div className="absolute inset-0 bg-green-500/10 backdrop-blur-[1px]"></div>
                  <motion.div
                    className="absolute left-0 right-0 h-[2px] bg-green-400 shadow-[0_0_8px_3px_rgba(74,222,128,0.8)]"
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  />
                </>
              )}
            </div>
          )}

          {/* OCR Progress */}
          {ocrProcessing && (
            <div className="mt-4">
              <div className="flex items-center justify-center text-sm text-indigo-400 mb-2">
                <Loader className="animate-spin w-4 h-4 mr-2" />
                {t('ocr_processing')} {ocrProgress}%
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
              </div>
            </div>
          )}

          {/* OCR Results */}
          {ocrHighlights.length > 0 && (
            <div className="mt-4 text-left bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-400 mb-1">✨ Auto-detected from invoice:</p>
              {ocrHighlights.map((h, i) => (
                <p key={i} className="text-xs text-emerald-300">{h}</p>
              ))}
            </div>
          )}

          {/* Document Quality Classifier Badge */}
          {analyzingDoc && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-indigo-400">
              <Loader className="animate-spin w-4 h-4" />
              <span>Analyzing document quality...</span>
            </div>
          )}
          {docQuality && !analyzingDoc && (
            <div className={`mt-4 text-left rounded-xl p-4 border-2 ${{
              'valid_invoice': 'bg-emerald-500/10 border-emerald-500/30',
              'good_quality': 'bg-blue-500/10 border-blue-500/30',
              'faded_receipt': 'bg-amber-500/10 border-amber-500/30',
              'poor_quality': 'bg-red-500/10 border-red-500/30',
            }[docQuality.classification as string] || 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-2 mb-2">
                {docQuality.classification === 'valid_invoice' && <ShieldCheck className="w-5 h-5 text-emerald-600" />}
                {docQuality.classification === 'good_quality' && <ShieldCheck className="w-5 h-5 text-blue-600" />}
                {docQuality.classification === 'faded_receipt' && <ShieldAlert className="w-5 h-5 text-amber-600" />}
                {docQuality.classification === 'poor_quality' && <FileWarning className="w-5 h-5 text-red-600" />}
                <span className={`text-sm font-bold uppercase tracking-wide ${{
                  'valid_invoice': 'text-emerald-400',
                  'good_quality': 'text-blue-400',
                  'faded_receipt': 'text-amber-400',
                  'poor_quality': 'text-red-400',
                }[docQuality.classification as string]}`}>
                  {docQuality.classification === 'valid_invoice' ? '✅ Valid Invoice' :
                    docQuality.classification === 'good_quality' ? '📄 Good Quality' :
                      docQuality.classification === 'faded_receipt' ? '⚠️ Faded Receipt Detected' :
                        '❌ Poor Quality'}
                </span>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${{
                  'valid_invoice': 'bg-emerald-500/20 text-emerald-400',
                  'good_quality': 'bg-blue-500/20 text-blue-400',
                  'faded_receipt': 'bg-amber-500/20 text-amber-400',
                  'poor_quality': 'bg-red-500/20 text-red-400',
                }[docQuality.classification as string]}`}>
                  {docQuality.qualityScore}% Quality
                </span>
              </div>
              {docQuality.isThermalReceipt && (
                <p className="text-xs text-amber-400 font-medium mb-1">🧾 Thermal receipt detected — these fade within 3-6 months!</p>
              )}
              <p className="text-xs text-slate-300 font-medium leading-relaxed">{docQuality.consumerJusticeMessage}</p>
              {docQuality.suggestions?.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {docQuality.suggestions.map((s: string, i: number) => (
                    <p key={i} className="text-[11px] text-slate-400">{s}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-y-5 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="productName" className="block text-sm font-medium text-slate-400 mb-1">Product Name *</label>
              <input
                id="productName"
                name="productName"
                type="text"
                required
                placeholder="e.g., Samsung Galaxy S24 Ultra"
                className="block w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm text-slate-200 placeholder-slate-600 transition-all hover:border-white/20"
                value={formData.productName}
                onChange={e => setFormData({ ...formData, productName: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-slate-400 mb-1">Brand</label>
              <input
                id="brand"
                name="brand"
                type="text"
                list="brands"
                placeholder="Select or type brand"
                className="block w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm text-slate-200 placeholder-slate-600 transition-all hover:border-white/20"
                value={formData.brand}
                onChange={e => setFormData({ ...formData, brand: e.target.value })}
              />
              <datalist id="brands">
                {BRANDS.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-slate-400 mb-1">Category *</label>
              <select
                id="category"
                name="category"
                className="block w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm text-slate-200 transition-all hover:border-white/20"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#151c2e]">{c}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="purchaseDate" className="block text-sm font-medium text-slate-400 mb-1">Purchase Date *</label>
              <input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                required
                className="block w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm text-slate-200 transition-all hover:border-white/20"
                value={formData.purchaseDate}
                onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="warrantyMonths" className="block text-sm font-medium text-slate-400 mb-1">Warranty Period *</label>
              <select
                id="warrantyMonths"
                name="warrantyMonths"
                className="block w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm text-slate-200 transition-all hover:border-white/20"
                value={formData.warrantyMonths}
                onChange={e => setFormData({ ...formData, warrantyMonths: parseInt(e.target.value) })}
              >
                {[3, 6, 12, 18, 24, 36, 48, 60].map(m => <option key={m} value={m} className="bg-[#151c2e]">{m} Months</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="invoiceNumber" className="block text-sm font-medium text-slate-400 mb-1">Invoice Number</label>
              <input
                id="invoiceNumber"
                name="invoiceNumber"
                type="text"
                placeholder="e.g., INV-2026-001234"
                className={`block w-full border rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 text-sm text-slate-200 placeholder-slate-600 transition-all ${duplicateWarning
                  ? 'border-red-500/50 bg-red-500/10 focus:ring-red-500/50 focus:border-red-500/50'
                  : 'bg-white/5 border-white/10 focus:ring-indigo-500/50 focus:border-indigo-500/50 hover:border-white/20'
                  }`}
                value={formData.invoiceNumber}
                onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
              />
              {duplicateWarning && (
                <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-pulse flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 font-bold leading-tight">
                    {duplicateWarning}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="purchasePrice" className="block text-sm font-medium text-slate-400 mb-1">Purchase Price (₹)</label>
              <input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                placeholder="e.g., 25000"
                className="block w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm text-slate-200 placeholder-slate-600 transition-all hover:border-white/20"
                value={formData.purchasePrice}
                onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-slate-400 mb-1">Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Any additional details about the product..."
                className="block w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm text-slate-200 placeholder-slate-600 transition-all hover:border-white/20"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mr-3 px-5 py-2.5 border border-white/10 rounded-xl text-sm font-semibold text-slate-400 bg-white/5 hover:bg-white/10 hover:text-slate-200 active:scale-95 transition-all btn-tactile"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2.5 border border-transparent shadow-lg shadow-indigo-500/20 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none btn-tactile"
            >
              {saving ? (
                <Loader className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {t('save_product')}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

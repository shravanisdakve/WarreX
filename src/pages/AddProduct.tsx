import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Tesseract from 'tesseract.js';
import { useTranslation } from 'react-i18next';
import { Upload, Save, Loader, Sparkles, FileText, X, AlertTriangle } from 'lucide-react';
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
          alert('PDF support is coming in the next update! For now, please use an image format (JPEG/PNG) to enable AI detection.');
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

      // Create preview for images
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }

      // Only run OCR on images
      if (file.type.startsWith('image/')) {
        processOCR(file);
      }
    }
  };

  const removeFile = () => {
    setInvoiceFile(null);
    setPreviewUrl(null);
    setInvoiceText('');
    setOcrHighlights([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processOCR = async (file: File) => {
    setOcrProcessing(true);
    setOcrProgress(0);
    setOcrHighlights([]);
    try {
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
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">{t('add_product')}</h1>

        {/* Upload Area */}
        <div className="mb-8 p-6 border-2 border-dashed border-indigo-200 rounded-xl text-center bg-gradient-to-b from-indigo-50/50 to-white transition-colors hover:border-indigo-300">
          <Upload className="mx-auto h-10 w-10 text-indigo-400" />
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              <Sparkles className="w-4 h-4" />
              <span>{t('upload_invoice')}</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
            </label>
            <p className="mt-2 text-xs text-gray-500">Supported: JPEG, PNG, WebP (Max 5MB) • AI-powered text extraction</p>
          </div>

          {/* Preview */}
          {invoiceFile && !ocrProcessing && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <FileText className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">{invoiceFile.name}</span>
              <button onClick={removeFile} className="ml-2 p-1 rounded-full hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {previewUrl && (
            <div className="mt-4">
              <img src={previewUrl} alt="Invoice preview" className="max-h-32 mx-auto rounded-lg shadow-sm border" />
            </div>
          )}

          {/* OCR Progress */}
          {ocrProcessing && (
            <div className="mt-4">
              <div className="flex items-center justify-center text-sm text-indigo-600 mb-2">
                <Loader className="animate-spin w-4 h-4 mr-2" />
                {t('ocr_processing')} {ocrProgress}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
              </div>
            </div>
          )}

          {/* OCR Results */}
          {ocrHighlights.length > 0 && (
            <div className="mt-4 text-left bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-800 mb-1">✨ Auto-detected from invoice:</p>
              {ocrHighlights.map((h, i) => (
                <p key={i} className="text-xs text-green-700">{h}</p>
              ))}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-y-5 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input
                id="productName"
                name="productName"
                type="text"
                required
                placeholder="e.g., Samsung Galaxy S24 Ultra"
                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                value={formData.productName}
                onChange={e => setFormData({ ...formData, productName: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input
                id="brand"
                name="brand"
                type="text"
                list="brands"
                placeholder="Select or type brand"
                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                value={formData.brand}
                onChange={e => setFormData({ ...formData, brand: e.target.value })}
              />
              <datalist id="brands">
                {BRANDS.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                id="category"
                name="category"
                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-1">Purchase Date *</label>
              <input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                required
                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                value={formData.purchaseDate}
                onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="warrantyMonths" className="block text-sm font-medium text-gray-700 mb-1">Warranty Period *</label>
              <select
                id="warrantyMonths"
                name="warrantyMonths"
                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                value={formData.warrantyMonths}
                onChange={e => setFormData({ ...formData, warrantyMonths: parseInt(e.target.value) })}
              >
                {[3, 6, 12, 18, 24, 36, 48, 60].map(m => <option key={m} value={m}>{m} Months</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
              <input
                id="invoiceNumber"
                name="invoiceNumber"
                type="text"
                placeholder="e.g., INV-2026-001234"
                className={`block w-full border rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 text-sm transition-all ${duplicateWarning
                  ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                value={formData.invoiceNumber}
                onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
              />
              {duplicateWarning && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-pulse flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-bold leading-tight">
                    {duplicateWarning}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">Purchase Price (₹)</label>
              <input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                placeholder="e.g., 25000"
                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                value={formData.purchasePrice}
                onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Any additional details about the product..."
                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-shadow"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mr-3 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    </div>
  );
}

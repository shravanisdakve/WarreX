import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Calendar, FileText, Phone, Mail, Globe, Bell, Trash2, Edit2, Save, X, ShieldCheck, ShieldAlert, ShieldX, ArrowLeft, Wand2, Sparkles, AlertTriangle, Activity, Clock, CheckCircle } from 'lucide-react';
import { format, parseISO, differenceInDays, addMonths } from 'date-fns';

interface Product {
  id: number;
  product_name: string;
  brand: string;
  category: string;
  purchase_date: string;
  warranty_months: number;
  expiry_date: string;
  invoice_file_url: string;
  invoice_number: string;
  notes: string;
}

interface ServiceInfo {
  phone: string;
  email: string;
  website: string;
}

const CATEGORIES = ["Electronics", "Appliances", "Furniture", "Vehicle", "Accessories", "Other"];

const getRiskScore = (product: Product) => {
  const days = differenceInDays(parseISO(product.expiry_date), new Date());
  if (days < 0) return null; // No risk score for expired products

  const isHighValueCategory = ["Electronics", "Appliances", "Vehicle"].includes(product.category);

  if (isHighValueCategory) {
    if (days <= 15) {
      return { text: "Claim Now, High Value", color: "text-purple-700 bg-purple-50 border-purple-200", icon: Sparkles };
    }
    if (days <= 30) {
      return { text: "High Risk of Failure", color: "text-red-700 bg-red-50 border-red-200", icon: AlertTriangle };
    }
    if (days <= 90) {
      return { text: "Moderate Risk", color: "text-amber-700 bg-amber-50 border-amber-200", icon: Activity };
    }
  } else {
    if (days <= 30) {
      return { text: "Expiring Soon", color: "text-amber-700 bg-amber-50 border-amber-200", icon: Clock };
    }
  }

  return { text: "Low Risk", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle };
};

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [product, setProduct] = useState<Product | null>(null);
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [claimDraft, setClaimDraft] = useState<string | null>(null);
  const [generatingClaim, setGeneratingClaim] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`/api/products/${id}`);
      setProduct(res.data);
      setEditData(res.data);
      if (res.data.brand) {
        fetchServiceInfo(res.data.brand);
      }
    } catch (error) {
      console.error('Failed to fetch product', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceInfo = async (brand: string) => {
    try {
      const res = await axios.get(`/api/service/${brand}`);
      setServiceInfo(res.data);
    } catch (error) {
      console.log('Service info not found for brand');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        await axios.delete(`/api/products/${id}`);
        navigate('/dashboard');
      } catch (error) {
        alert('Failed to delete product');
      }
    }
  };

  const handleTestReminder = async () => {
    try {
      await axios.post('/api/notifications/test', { productId: id });
      alert('Test reminder sent! Check your email (or console logs in demo mode).');
    } catch (error) {
      alert('Failed to send reminder');
    }
  };

  const handleGenerateClaim = async () => {
    setGeneratingClaim(true);
    try {
      const res = await axios.post('/api/assistant', {
        message: `Draft a professional complaint email to claim warranty for my ${product!.product_name}. Please do not output any markdown code blocks, just plain text. Provide the subject and the body clearly.`
      });
      setClaimDraft(res.data.response);
    } catch (error) {
      alert('Failed to generate claim draft');
    } finally {
      setGeneratingClaim(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const expiryDate = format(
        addMonths(new Date(editData.purchase_date || product!.purchase_date), editData.warranty_months || product!.warranty_months),
        'yyyy-MM-dd'
      );

      const res = await axios.put(`/api/products/${id}`, {
        productName: editData.product_name,
        brand: editData.brand,
        category: editData.category,
        purchaseDate: editData.purchase_date,
        warrantyMonths: editData.warranty_months,
        expiryDate,
        invoiceNumber: editData.invoice_number,
        notes: editData.notes,
      });

      setProduct(res.data);
      setEditData(res.data);
      setEditing(false);
    } catch (error) {
      alert('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!product) return (
    <div className="text-center py-20">
      <ShieldX className="w-12 h-12 mx-auto text-gray-300 mb-3" />
      <p className="text-gray-500">Product not found</p>
      <button onClick={() => navigate('/dashboard')} className="mt-3 text-indigo-600 hover:underline text-sm">
        Back to Dashboard
      </button>
    </div>
  );

  const daysLeft = differenceInDays(parseISO(product.expiry_date), new Date());
  const isExpired = daysLeft < 0;
  const isExpiringSoon = !isExpired && daysLeft <= 30;

  const StatusIcon = isExpired ? ShieldX : isExpiringSoon ? ShieldAlert : ShieldCheck;
  const statusColor = isExpired ? 'text-red-700 bg-red-50 border-red-200' : isExpiringSoon ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
  const statusText = isExpired ? `Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} Days Left`;

  // Warranty progress bar
  const totalDays = differenceInDays(parseISO(product.expiry_date), parseISO(product.purchase_date));
  const usedDays = differenceInDays(new Date(), parseISO(product.purchase_date));
  const progress = Math.min(Math.max((usedDays / totalDays) * 100, 0), 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </button>

      {/* Header Card */}
      <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            {editing ? (
              <input
                id="productName"
                name="productName"
                type="text"
                aria-label="Product Name"
                value={editData.product_name || ''}
                onChange={e => setEditData({ ...editData, product_name: e.target.value })}
                className="text-lg font-semibold text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 w-full"
              />
            ) : (
              <h3 className="text-xl font-bold text-gray-900">{product.product_name}</h3>
            )}
            <p className="mt-1 text-sm text-gray-500">{product.category} • {product.brand}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            {getRiskScore(product) && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${getRiskScore(product)!.color}`}>
                {React.createElement(getRiskScore(product)!.icon, { className: "w-4 h-4" })}
                <span className="text-sm font-semibold">{getRiskScore(product)!.text}</span>
              </div>
            )}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${statusColor}`}>
              <StatusIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">{statusText}</span>
            </div>
          </div>
        </div>

        {/* Warranty Progress */}
        <div className="px-6 pb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Purchase: {format(parseISO(product.purchase_date), 'MMM d, yyyy')}</span>
            <span>Expiry: {format(parseISO(product.expiry_date), 'MMM d, yyyy')}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${isExpired ? 'bg-red-500' : isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">{product.warranty_months} months warranty</p>
        </div>

        {/* Details */}
        <div className="border-t border-gray-100">
          <dl className="divide-y divide-gray-100">
            {editing ? (
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand" className="block text-xs font-medium text-gray-500 mb-1">Brand</label>
                    <input
                      id="brand"
                      name="brand"
                      type="text"
                      value={editData.brand || ''}
                      onChange={e => setEditData({ ...editData, brand: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                    <select
                      id="category"
                      name="category"
                      value={editData.category || ''}
                      onChange={e => setEditData({ ...editData, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="purchaseDate" className="block text-xs font-medium text-gray-500 mb-1">Purchase Date</label>
                    <input
                      id="purchaseDate"
                      name="purchaseDate"
                      type="date"
                      value={editData.purchase_date || ''}
                      onChange={e => setEditData({ ...editData, purchase_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="warrantyMonths" className="block text-xs font-medium text-gray-500 mb-1">Warranty (Months)</label>
                    <select
                      id="warrantyMonths"
                      name="warrantyMonths"
                      value={editData.warranty_months || 12}
                      onChange={e => setEditData({ ...editData, warranty_months: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      {[3, 6, 12, 18, 24, 36, 48, 60].map(m => <option key={m} value={m}>{m} Months</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="invoiceNumber" className="block text-xs font-medium text-gray-500 mb-1">Invoice Number</label>
                  <input
                    id="invoiceNumber"
                    name="invoiceNumber"
                    type="text"
                    value={editData.invoice_number || ''}
                    onChange={e => setEditData({ ...editData, invoice_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={editData.notes || ''}
                    onChange={e => setEditData({ ...editData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <>
                <DetailRow label="Purchase Date" value={format(parseISO(product.purchase_date), 'PPP')} />
                <DetailRow label="Warranty Period" value={`${product.warranty_months} Months`} />
                <DetailRow label="Expiry Date" value={format(parseISO(product.expiry_date), 'PPP')} />
                {product.invoice_number && (
                  <DetailRow label="Invoice Number" value={product.invoice_number} />
                )}
                {product.invoice_file_url && (
                  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 px-6">
                    <dt className="text-sm font-medium text-gray-500">Invoice File</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <a href={product.invoice_file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors">
                        <FileText className="w-4 h-4" /> View Invoice
                      </a>
                    </dd>
                  </div>
                )}
                {product.notes && (
                  <DetailRow label="Notes" value={product.notes} />
                )}
              </>
            )}
          </dl>
        </div>

        {/* Actions */}
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex flex-wrap gap-3">
            {serviceInfo && (
              <>
                {serviceInfo.phone && (
                  <ActionButton href={`tel:${serviceInfo.phone}`} icon={<Phone className="w-4 h-4 text-emerald-600" />} label="Call Support" />
                )}
                {serviceInfo.email && (
                  <ActionButton href={`mailto:${serviceInfo.email}`} icon={<Mail className="w-4 h-4 text-blue-600" />} label="Email Support" />
                )}
                {serviceInfo.website && (
                  <ActionButton href={serviceInfo.website} icon={<Globe className="w-4 h-4 text-indigo-600" />} label="Service Website" isExternal />
                )}
              </>
            )}

            <button onClick={handleTestReminder} className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <Bell className="w-4 h-4 mr-2 text-amber-500" /> Test Reminder
            </button>

            <button onClick={handleGenerateClaim} disabled={generatingClaim} className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50">
              <Wand2 className="w-4 h-4 mr-2" /> {generatingClaim ? 'Generating...' : 'Generate Claim Email'}
            </button>

            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => { setEditing(false); setEditData(product); }} className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                  <X className="w-4 h-4 mr-2" /> Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                <Edit2 className="w-4 h-4 mr-2 text-indigo-500" /> Edit
              </button>
            )}

            <button onClick={handleDelete} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 ml-auto transition-colors">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </button>
          </div>
        </div>
        {claimDraft && (
          <div className="px-6 py-5 border-t border-gray-100 bg-indigo-50/30">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-600" /> AI Generated Claim Draft
              </h4>
              <button onClick={() => setClaimDraft(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-white border text-sm text-gray-800 border-gray-200 rounded-xl p-4 whitespace-pre-wrap max-h-96 overflow-y-auto font-medium">
              {claimDraft}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(claimDraft);
                  alert('Copied to clipboard!');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Copy to Clipboard
              </button>
              {serviceInfo?.email && (
                <ActionButton href={`mailto:${serviceInfo.email}?subject=Warranty Claim - ${product.product_name}&body=${encodeURIComponent(claimDraft)}`} icon={<Mail className="w-4 h-4 text-blue-600" />} label="Send Email" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 px-6">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value}</dd>
    </div>
  );
}

function ActionButton({ href, icon, label, isExternal }: { href: string; icon: React.ReactNode; label: string; isExternal?: boolean }) {
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
    >
      {icon}
      <span className="ml-2">{label}</span>
    </a>
  );
}

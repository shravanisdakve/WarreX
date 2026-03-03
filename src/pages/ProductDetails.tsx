import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Mail, Globe, Bell, Trash2, Edit2, Save, X, ShieldCheck, ShieldAlert, ShieldX, ArrowLeft, Wand2, Sparkles, AlertTriangle, Activity, Clock, CheckCircle, Send, Brain, TrendingUp, IndianRupee, Loader, MapPin, Phone, FileText } from 'lucide-react';
import { format, parseISO, differenceInDays, addMonths } from 'date-fns';
import { motion } from 'motion/react';
import { CATEGORIES, BRAND_LOGOS, CLAIM_STATUSES, WARRANTY_MONTH_OPTIONS } from '../constants/productCatalog';

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
  purchase_price: number;
  claim_status: string | null;
  invoice_text: string | null;
}

interface ServiceInfo {
  phone: string;
  email: string;
  website: string;
  centers?: string[];
}

interface RiskAssessment {
  failureProbability: number;
  commonIssues: string[];
  estimatedRepairCost: number;
  recommendation: string;
  resaleValue: { withWarranty: number; withoutWarranty: number };
  daysLeft: number;
  usedPercent: number;
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [product, setProduct] = useState<Product | null>(null);
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [claimDraft, setClaimDraft] = useState<string | null>(null);
  const [generatingClaim, setGeneratingClaim] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [showIssuePrompt, setShowIssuePrompt] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [claimStatus, setClaimStatus] = useState('');

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      // Single combined API call — product + risk + service in one round-trip
      const res = await axios.get(`/api/products/${id}/full`);
      const { product: productData, riskAssessment: riskData, serviceInfo: serviceData } = res.data;

      setProduct(productData);
      setEditData(productData);
      setClaimStatus(productData.claim_status || '');

      if (riskData) setRiskAssessment(riskData);
      if (serviceData) setServiceInfo(serviceData);
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

  const fetchRiskAssessment = async () => {
    setLoadingRisk(true);
    try {
      const res = await axios.get(`/api/products/${id}/risk-assessment`);
      setRiskAssessment(res.data);
    } catch (error) {
      console.error('Failed to fetch risk assessment');
    } finally {
      setLoadingRisk(false);
    }
  };

  const fNum = (num: number | string) => {
    if (i18n.language === 'en') return num.toString();
    const digits: Record<string, string> = { '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९' };
    return num.toString().replace(/\d/g, d => digits[d]);
  };

  const handleDelete = async () => {
    if (confirm(t('delete_confirm'))) {
      try {
        await axios.delete(`/api/products/${id}`);
        navigate('/dashboard');
      } catch (error) {
        alert('Failed to delete product');
      }
    }
  };


  const handleGenerateClaim = async () => {
    if (!issueDescription.trim()) {
      setShowIssuePrompt(true);
      return;
    }
    setShowIssuePrompt(false);
    setGeneratingClaim(true);
    try {
      const res = await axios.post('/api/assistant', {
        message: `draft_email: Draft a professional warranty complaint email for my ${product!.product_name}. Brand: ${product!.brand}, Invoice: ${product!.invoice_number || 'N/A'}, Bought: ${product!.purchase_date}, Expiry: ${product!.expiry_date}. Issue facing: ${issueDescription}`
      });
      setClaimDraft(res.data.response);
    } catch (error) {
      alert('Failed to generate claim draft');
    } finally {
      setGeneratingClaim(false);
    }
  };

  const handleSendClaimEmail = async () => {
    if (!claimDraft) return;
    setSendingEmail(true);
    try {
      const res = await axios.post('/api/products/send-claim-email', {
        productId: id,
        emailBody: claimDraft,
        recipientEmail: serviceInfo?.email || undefined
      });
      alert(res.data.message || 'Claim email sent!');

      // Update local state to show PENDING status immediately
      setClaimStatus('PENDING');
      setProduct(prev => prev ? { ...prev, claim_status: 'PENDING' } : null);
      setClaimDraft(null); // Close the draft view
    } catch (error) {
      alert('Failed to send email. Check email configuration.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleClaimStatusUpdate = async (newStatus: string) => {
    try {
      await axios.put(`/api/products/${id}`, { claimStatus: newStatus || null });
      setClaimStatus(newStatus);
      setProduct(prev => prev ? { ...prev, claim_status: newStatus || null } : null);
    } catch (error) {
      alert('Failed to update claim status');
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
        invoiceText: editData.invoice_text,
        notes: editData.notes,
        purchasePrice: editData.purchase_price,
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

  if (loading) return null;

  if (!product) return (
    <div className="text-center py-20">
      <ShieldX className="w-12 h-12 mx-auto text-slate-700 mb-3" />
      <p className="text-slate-500">{t('product_not_found')}</p>
      <button onClick={() => navigate('/dashboard')} className="mt-3 text-indigo-400 hover:underline text-sm">
        {t('back_to_dashboard')}
      </button>
    </div>
  );

  const daysLeft = differenceInDays(parseISO(product.expiry_date), new Date());
  const isExpired = daysLeft < 0;
  const isExpiringSoon = !isExpired && daysLeft <= 30;

  const StatusIcon = isExpired ? ShieldX : isExpiringSoon ? ShieldAlert : ShieldCheck;
  const statusColor = isExpired ? 'text-red-400 bg-red-500/10 border-red-500/20' : isExpiringSoon ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  const statusText = isExpired ? `${t('expired')} ${fNum(Math.abs(daysLeft))} ${t('days_ago')}` : `${fNum(daysLeft)} ${t('days_left')}`;

  const totalDays = differenceInDays(parseISO(product.expiry_date), parseISO(product.purchase_date));
  const usedDays = differenceInDays(new Date(), parseISO(product.purchase_date));
  const progress = Math.min(Math.max((usedDays / totalDays) * 100, 0), 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-400 transition-all hover:-translate-x-1 btn-tactile"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> {t('back_to_dashboard')}
      </button>

      {/* Header Card */}
      <div className="bg-[#151c2e]/80 backdrop-blur-xl shadow-md rounded-2xl border border-indigo-500/10 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 card-interactive">
        <div className="px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
              {BRAND_LOGOS[product.brand] || '📦'}
            </div>
            <div>
              {editing ? (
                <input
                  id="productName" name="productName" type="text" aria-label="Product Name"
                  value={editData.product_name || ''}
                  onChange={e => setEditData({ ...editData, product_name: e.target.value })}
                  className="text-lg font-semibold text-slate-200 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500/50 w-full"
                />
              ) : (
                <h3 className="text-xl font-bold text-slate-100">{product.product_name}</h3>
              )}
              <p className="mt-1 text-sm text-slate-500">
                {product.category} • {product.brand}
                {product.purchase_price > 0 && <span className="text-indigo-500 ml-1">• ₹{fNum(product.purchase_price.toLocaleString('en-IN'))}</span>}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${statusColor}`}>
              <StatusIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">{statusText}</span>
            </div>
          </div>
        </div>

        {/* Warranty Progress */}
        <div className="px-6 pb-5">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{t('purchased')}: {fNum(format(parseISO(product.purchase_date), 'MMM d, yyyy'))}</span>
            <span>{t('expires')}: {fNum(format(parseISO(product.expiry_date), 'MMM d, yyyy'))}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2.5 relative">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${isExpired ? 'bg-red-500' : isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-1 text-center">
            {fNum(product.warranty_months)} {t('months')} {t('warranty_status', 'warranty')} • <span className="font-semibold">{fNum(Math.round(progress))}% {t('elapsed')}</span>
          </p>
        </div>

        {/* Claim Status Tracker */}
        <div className="px-6 pb-4 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('claim_status_label')}</label>
            <select
              value={claimStatus}
              onChange={(e) => handleClaimStatusUpdate(e.target.value)}
              className={`border rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${claimStatus === 'SUCCESSFUL' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                claimStatus === 'REJECTED' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                  claimStatus === 'PENDING' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                    'border-white/10 bg-white/5 text-slate-400'
                }`}
            >
              {CLAIM_STATUSES.map(s => <option key={s.value} value={s.value} className="bg-[#151c2e]">{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Details */}
        <div className="border-t border-white/5">
          <dl className="divide-y divide-white/5">
            {editing ? (
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand" className="block text-xs font-medium text-slate-500 mb-1">{t('brand_label')}</label>
                    <input id="brand" name="brand" type="text" value={editData.brand || ''} onChange={e => setEditData({ ...editData, brand: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-all hover:border-white/20" />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-xs font-medium text-slate-500 mb-1">{t('category_label')}</label>
                    <select id="category" name="category" value={editData.category || ''} onChange={e => setEditData({ ...editData, category: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-all hover:border-white/20">
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#151c2e]">{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="purchaseDate" className="block text-xs font-medium text-slate-500 mb-1">{t('purchase_date_label')}</label>
                    <input id="purchaseDate" name="purchaseDate" type="date" value={editData.purchase_date || ''} onChange={e => setEditData({ ...editData, purchase_date: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-all hover:border-white/20" />
                  </div>
                  <div>
                    <label htmlFor="warrantyMonths" className="block text-xs font-medium text-slate-500 mb-1">{t('warranty_period_label')} ({t('months')})</label>
                    <select id="warrantyMonths" name="warrantyMonths" value={editData.warranty_months || 12} onChange={e => setEditData({ ...editData, warranty_months: parseInt(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-all hover:border-white/20">
                      {WARRANTY_MONTH_OPTIONS.map(m => <option key={m} value={m} className="bg-[#151c2e]">{fNum(m)} {t('months')}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="purchasePrice" className="block text-xs font-medium text-slate-500 mb-1">{t('purchase_price_label')} (₹)</label>
                  <input id="purchasePrice" name="purchasePrice" type="number" value={editData.purchase_price || ''} onChange={e => setEditData({ ...editData, purchase_price: parseFloat(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-all hover:border-white/20" placeholder="e.g., 25000" />
                </div>
                <div>
                  <label htmlFor="invoiceNumber" className="block text-xs font-medium text-slate-500 mb-1">{t('invoice_number_label')}</label>
                  <input id="invoiceNumber" name="invoiceNumber" type="text" value={editData.invoice_number || ''} onChange={e => setEditData({ ...editData, invoice_number: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-all hover:border-white/20" />
                </div>
                <div>
                  <label htmlFor="notes" className="block text-xs font-medium text-slate-500 mb-1">{t('notes_label')}</label>
                  <textarea id="notes" name="notes" rows={3} value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-all hover:border-white/20" />
                </div>
                {product.invoice_text !== undefined && (
                  <div>
                    <label htmlFor="invoiceText" className="block text-xs font-medium text-slate-500 mb-1">{t('extracted_ocr_label')}</label>
                    <textarea id="invoiceText" name="invoiceText" rows={5} value={editData.invoice_text || ''} onChange={e => setEditData({ ...editData, invoice_text: e.target.value })} className="w-full bg-white/5 border border-emerald-500/20 rounded-lg py-2 px-3 text-xs text-emerald-400 focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono" />
                  </div>
                )}
              </div>
            ) : (
              <>
                <DetailRow label={t('purchase_date_label')} value={fNum(format(parseISO(product.purchase_date), 'PPP'))} />
                <DetailRow label={t('warranty_period_label')} value={`${fNum(product.warranty_months)} ${t('months')}`} />
                <DetailRow label={t('expires')} value={fNum(format(parseISO(product.expiry_date), 'PPP'))} />
                {product.purchase_price > 0 && (
                  <DetailRow label={t('purchase_price_label')} value={`₹${fNum(product.purchase_price.toLocaleString('en-IN'))}`} />
                )}
                {product.invoice_number && (
                  <DetailRow label={t('invoice_number_label')} value={fNum(product.invoice_number)} />
                )}
                {product.invoice_file_url && (
                  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 px-6">
                    <dt className="text-sm font-medium text-slate-500">{t('view_invoice')}</dt>
                    <dd className="mt-1 text-sm text-slate-200 sm:mt-0 sm:col-span-2">
                      <a href={product.invoice_file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors">
                        <FileText className="w-4 h-4" /> {t('view_invoice')}
                      </a>
                    </dd>
                  </div>
                )}
                {product.notes && (
                  <DetailRow label={t('notes_label')} value={product.notes} />
                )}
              </>
            )}
          </dl>
        </div>

        {/* Actions */}
        <div className="px-6 py-5 border-t border-white/5 bg-white/[0.02]">
          <div className="flex flex-wrap gap-3">
            {serviceInfo && (
              <>
                {serviceInfo.phone && (
                  <ActionButton href={`tel:${serviceInfo.phone}`} icon={<Phone className="w-4 h-4 text-emerald-600" />} label={t('call_support')} />
                )}
                {serviceInfo.email && (
                  <ActionButton href={`mailto:${serviceInfo.email}`} icon={<Mail className="w-4 h-4 text-blue-600" />} label={t('email_support')} />
                )}
                {serviceInfo.website && (
                  <ActionButton href={serviceInfo.website} icon={<Globe className="w-4 h-4 text-indigo-600" />} label={t('service_website')} isExternal />
                )}
              </>
            )}


            <button onClick={() => { setShowIssuePrompt(true); }} disabled={generatingClaim} className="inline-flex items-center px-4 py-2 border border-indigo-500/20 shadow-sm text-sm font-semibold rounded-xl text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 hover:shadow-md active:scale-95 transition-all disabled:opacity-50 btn-tactile">
              <Wand2 className="w-4 h-4 mr-2" /> {generatingClaim ? t('generating') : t('generate_claim_email')}
            </button>

            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-md active:scale-95 transition-all disabled:opacity-50 btn-tactile">
                  <Save className="w-4 h-4 mr-2" /> {saving ? t('saving', 'Saving...') : t('save_changes')}
                </button>
                <button onClick={() => { setEditing(false); setEditData(product); }} className="inline-flex items-center px-4 py-2 border border-white/10 shadow-sm text-sm font-semibold rounded-xl text-slate-300 bg-white/5 hover:bg-white/10 hover:shadow-md active:scale-95 transition-all btn-tactile">
                  <X className="w-4 h-4 mr-2" /> {t('cancel')}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="inline-flex items-center px-4 py-2 border border-white/10 shadow-sm text-sm font-semibold rounded-xl text-slate-300 bg-white/5 hover:bg-white/10 hover:shadow-md active:scale-95 transition-all btn-tactile">
                <Edit2 className="w-4 h-4 mr-2 text-indigo-500" /> {t('edit')}
              </button>
            )}

            <button onClick={handleDelete} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-xl text-white bg-red-600 hover:bg-red-700 hover:shadow-md active:scale-95 ml-auto transition-all">
              <Trash2 className="w-4 h-4 mr-2" /> {t('delete')}
            </button>
          </div>
        </div>

        {/* Issue Prompt Modal */}
        {showIssuePrompt && (
          <div className="px-6 py-5 border-t border-white/5 bg-amber-500/5">
            <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> {t('issue_prompt_title')}
            </h4>
            <textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder={t('issue_placeholder')}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 mb-3 transition-all hover:border-white/20"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={handleGenerateClaim}
                disabled={!issueDescription.trim() || generatingClaim}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all btn-tactile"
              >
                {generatingClaim ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                {t('generate_email_btn')}
              </button>
              <button
                onClick={() => setShowIssuePrompt(false)}
                className="px-4 py-2 border border-white/10 text-sm font-medium rounded-lg text-slate-400 bg-white/5 hover:bg-white/10 transition-all btn-tactile"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Claim Draft */}
        {claimDraft && (
          <div className="px-6 py-5 border-t border-white/5 bg-indigo-500/5">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-400" /> {t('ai_claim_draft_title')}
              </h4>
              <button onClick={() => setClaimDraft(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-[#0a0e1a] border text-sm text-slate-300 border-indigo-500/10 rounded-xl p-4 whitespace-pre-wrap max-h-96 overflow-y-auto font-medium">
              {claimDraft}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(claimDraft);
                  alert('Copied to clipboard!');
                }}
                className="inline-flex items-center px-4 py-2 border border-white/10 shadow-sm text-sm font-medium rounded-lg text-slate-300 bg-white/5 hover:bg-white/10 transition-all btn-tactile"
              >
                {t('copy_clipboard')}
              </button>
              <button
                onClick={handleSendClaimEmail}
                disabled={sendingEmail}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 btn-tactile"
              >
                {sendingEmail ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {t('send_email_btn')}
              </button>
              {serviceInfo?.email && (
                <ActionButton href={`mailto:${serviceInfo.email}?subject=Warranty Claim - ${product.product_name}&body=${encodeURIComponent(claimDraft)}`} icon={<Mail className="w-4 h-4 text-blue-600" />} label={t('open_mail_app')} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Risk Assessment */}
      <div className="bg-[#151c2e]/80 backdrop-blur-xl shadow-md rounded-2xl border border-indigo-500/10 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 card-interactive">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" /> {t('risk_assessment_title')}
          </h4>
          <span className="text-xs text-slate-500">Powered by Claim Intelligence Engine</span>
        </div>

        {loadingRisk ? (
          <div className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-slate-800 rounded w-1/2" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-20 bg-slate-800/50 rounded-xl" />
                <div className="h-20 bg-slate-800/50 rounded-xl" />
                <div className="h-20 bg-slate-800/50 rounded-xl" />
              </div>
            </div>
          </div>
        ) : riskAssessment ? (
          <div className="p-6 space-y-5">
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                <p className={`text-3xl font-black ${riskAssessment.failureProbability >= 60 ? 'text-red-600' : riskAssessment.failureProbability >= 35 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {fNum(riskAssessment.failureProbability)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">{t('failure_probability')}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                <p className="text-3xl font-black text-slate-100">
                  ₹{fNum(riskAssessment.estimatedRepairCost.toLocaleString('en-IN'))}
                </p>
                <p className="text-xs text-slate-500 mt-1">{t('est_repair_cost')}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
                <p className="text-3xl font-black text-indigo-400">{fNum(riskAssessment.usedPercent)}%</p>
                <p className="text-xs text-slate-500 mt-1">{t('warranty_used')}</p>
              </div>
            </div>

            {/* Recommendation */}
            <div className={`rounded-xl p-4 border ${riskAssessment.daysLeft <= 15 ? 'bg-red-500/10 border-red-500/20' : riskAssessment.daysLeft <= 30 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
              <p className="text-sm font-medium text-slate-200 flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-400" /> {t('rec_action')}
              </p>
              <p className="text-sm text-slate-400">{riskAssessment.recommendation}</p>
            </div>

            {/* Common Issues */}
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{t('common_issues')}</p>
              <div className="flex flex-wrap gap-2">
                {riskAssessment.commonIssues.map((issue, i) => (
                  <span key={i} className="px-3 py-1.5 bg-white/5 text-slate-300 text-xs font-medium rounded-lg border border-white/10">
                    {issue}
                  </span>
                ))}
              </div>
            </div>

            {/* Resale Value */}
            {riskAssessment.resaleValue.withWarranty > 0 && (
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-indigo-500/20">
                <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider flex items-center gap-1 mb-3">
                  <TrendingUp className="w-3.5 h-3.5" /> {t('resale_estimator')}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-lg font-bold text-indigo-400">₹{fNum(riskAssessment.resaleValue.withWarranty.toLocaleString('en-IN'))}</p>
                    <p className="text-xs text-slate-500">{t('with_warranty')}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-500">₹{fNum(riskAssessment.resaleValue.withoutWarranty.toLocaleString('en-IN'))}</p>
                    <p className="text-xs text-slate-500">{t('without_warranty')}</p>
                  </div>
                </div>
                <p className="text-xs text-indigo-500 mt-2 font-medium">
                  {t('resale_impact', { amount: `₹${fNum((riskAssessment.resaleValue.withWarranty - riskAssessment.resaleValue.withoutWarranty).toLocaleString('en-IN'))}` })}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500 text-sm">
            Unable to load risk assessment
          </div>
        )}
      </div>

      {/* Service Centers */}
      {serviceInfo?.centers && serviceInfo.centers.length > 0 && (
        <div className="bg-[#151c2e]/80 backdrop-blur-xl shadow-md rounded-2xl border border-indigo-500/10 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 card-interactive">
          <div className="px-6 py-4 border-b border-white/5">
            <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" /> {t('service_centers_title')}
            </h4>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {serviceInfo.centers.map((center, i) => (
                <a
                  key={i}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(center + ' ' + (product.brand || ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all group"
                >
                  <MapPin className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 flex-shrink-0 transition-colors" />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{center}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 px-6">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-200 sm:mt-0 sm:col-span-2">{value}</dd>
    </div>
  );
}

function ActionButton({ href, icon, label, isExternal }: { href: string; icon: React.ReactNode; label: string; isExternal?: boolean }) {
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="inline-flex items-center px-4 py-2 border border-white/10 shadow-sm text-sm font-semibold rounded-xl text-slate-300 bg-white/5 hover:bg-white/10 hover:shadow-md active:scale-95 transition-all btn-tactile"
    >
      {icon}
      <span className="ml-2">{label}</span>
    </a>
  );
}

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Use strict UTF-8 encoded strings for Indian languages to prevent garbling.
const resources = {
  en: {
    translation: {
      "welcome": "Welcome to Warrify",
      "dashboard": "Dashboard",
      "add_product": "Add Product",
      "assistant": "AI Advisor",
      "logout": "Logout",
      "login": "Login",
      "signup": "Signup",
      "warranty_status": "Warranty Status",
      "days_left": "Days Left",
      "expired": "Expired",
      "active": "Active",
      "total_products": "Total Products",
      "stats_active": "Active",
      "expiring_soon": "Expiring Soon",
      "search_placeholder": "Search products, brands, or invoices...",
      "upload_invoice": "Upload Invoice",
      "ocr_processing": "Scanning Invoice...",
      "save_product": "Save Product",
      "assistant_intro": "Hello! I'm your Warrify AI Assistant. I can help you check warranties, find service centers, or draft complaint emails.",
      "ask_placeholder": "Ask a question...",
      "language": "Language",
      "notifications": "Notifications",
      "risk_low": "LOW RISK",
      "risk_moderate": "MODERATE RISK",
      "risk_high": "HIGH RISK OF FAILURE",
      "risk_claim_now": "CLAIM NOW, HIGH VALUE",
      "social_impact": "Social Impact Score",
      "e_waste": "E-Waste Avoided",
      "co2_reduced": "CO₂ Reduced",
      "impact_subtitle": "Leading the way in sustainable ownership",
      "impact_health_index": "Excellent Progress",
      "impact_level_rising": "Rising Level",
      "impact_level_master": "Master Level",
      "impact_status_excellent": "Excellent Status",
      "impact_status_steady": "Steady Progress",
      "impact_e_waste_footer": "Avoided via active tracking",
      "impact_co2_footer": "Net lifecycle carbon saving"
    }
  },
  hi: {
    translation: {
      "welcome": "वारिफाई में आपका स्वागत है",
      "dashboard": "डैशबोर्ड",
      "add_product": "उत्पाद जोड़ें",
      "assistant": "AI सलाहकार",
      "logout": "लॉग आउट",
      "login": "लॉग इन",
      "signup": "साइन अप",
      "warranty_status": "वारंटी स्थिति",
      "days_left": "दिन शेष",
      "expired": "समाप्त",
      "active": "सक्रिय",
      "total_products": "कुल उत्पाद",
      "stats_active": "सक्रिय",
      "expiring_soon": "जल्द समाप्त",
      "search_placeholder": "उत्पाद, ब्रांड या चालान खोजें...",
      "upload_invoice": "चालान अपलोड करें",
      "ocr_processing": "चालान स्कैन हो रहा है...",
      "save_product": "उत्पाद सहेजें",
      "assistant_intro": "नमस्ते! मैं आपका वारिफाई एआई सहायक हूँ। मैं वारंटी जांचने, सेवा केंद्र खोजने या शिकायत ईमेल का मसौदा तैयार करने में आपकी मदद कर सकता हूँ।",
      "ask_placeholder": "एक प्रश्न पूछें...",
      "language": "भाषा",
      "notifications": "सूचनाएं",
      "risk_low": "कम जोखिम",
      "risk_moderate": "मध्यम जोखिम",
      "risk_high": "विफलता का उच्च जोखिम",
      "risk_claim_now": "अभी दावा करें, उच्च मूल्य",
      "social_impact": "सामाजिक प्रभाव स्कोर",
      "e_waste": "ई-कचरा बचा",
      "co2_reduced": "CO₂ की कमी",
      "impact_subtitle": "स्थायी स्वामित्व में अग्रणी",
      "impact_health_index": "उत्कृष्ट प्रगति",
      "impact_level_rising": "बढ़ता स्तर",
      "impact_level_master": "मास्टर स्तर",
      "impact_status_excellent": "उत्कृष्ट स्थिति",
      "impact_status_steady": "निरंतर प्रगति",
      "impact_e_waste_footer": "सक्रिय ट्रैकिंग के माध्यम से बचा",
      "impact_co2_footer": "नेट लाइफसाइकल कार्बन की बचत"
    }
  },
  mr: {
    translation: {
      "welcome": "वॅरिफाय मध्ये आपले स्वागत आहे",
      "dashboard": "डॅशबोर्ड",
      "add_product": "उत्पादन जोडा",
      "assistant": "AI सल्लागार",
      "logout": "लॉग आउट",
      "login": "लॉग इन",
      "signup": "साइन अप",
      "warranty_status": "वारंटी स्थिती",
      "days_left": "दिवस बाकी",
      "expired": "कालबाह्य",
      "active": "सक्रिय",
      "total_products": "एकूण उत्पादने",
      "stats_active": "सक्रिय",
      "expiring_soon": "लवकरच संपणारे",
      "search_placeholder": "उत्पादने, ब्रँड किंवा इनव्हॉइस शोधा...",
      "upload_invoice": "इनव्हॉइस अपलोड करा",
      "ocr_processing": "इनव्हॉइस स्कॅन होत आहे...",
      "save_product": "उत्पादन जतन करा",
      "assistant_intro": "नमस्कार! मी तुमचा वॅरिफाय एआय सहाय्यक आहे. मी तुम्हाला वारंटी तपासण्यात, सेवा केंद्रे शोधण्यात किंवा तक्रार ईमेल लिहिण्यात मदत करू शकतो.",
      "ask_placeholder": "एक प्रश्न विचारा...",
      "language": "भाषा",
      "notifications": "सूचना",
      "risk_low": "कमी जोखीम",
      "risk_moderate": "मध्यम जोखीम",
      "risk_high": "अपयशाचा उच्च धोका",
      "risk_claim_now": "आत्ताच दावा करा, उच्च मूल्य",
      "social_impact": "सामाजिक प्रभाव स्कोअर",
      "e_waste": "ई-कचरा टाळला",
      "co2_reduced": "CO₂ घट",
      "impact_subtitle": "शाश्वत मालकीमध्ये आघाडीवर",
      "impact_health_index": "उत्कृष्ट प्रगती",
      "impact_level_rising": "वाढती पातळी",
      "impact_level_master": "मास्टर पातळी",
      "impact_status_excellent": "उत्कृष्ट स्थिती",
      "impact_status_steady": "शाश्वत प्रगती",
      "impact_e_waste_footer": "सक्रिय ट्रॅकिंगद्वारे टाळले",
      "impact_co2_footer": "नेट लाइफसायकल कार्बन बचत"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

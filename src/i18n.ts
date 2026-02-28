import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Use strict UTF-8 encoded strings for Indian languages to prevent garbling.
const resources = {
  en: {
    translation: {
      "welcome": "Welcome to Warrify",
      "dashboard": "Dashboard",
      "add_product": "Add Product",
      "assistant": "Assistant",
      "logout": "Logout",
      "login": "Login",
      "signup": "Signup",
      "warranty_status": "Warranty Status",
      "days_left": "Days Left",
      "expired": "Expired",
      "active": "Active",
      "search_placeholder": "Search products, brands, or invoices...",
      "upload_invoice": "Upload Invoice",
      "ocr_processing": "Scanning Invoice...",
      "save_product": "Save Product",
      "assistant_intro": "Hello! I'm your Warrify AI Assistant. I can help you check warranties, find service centers, or draft complaint emails.",
      "ask_placeholder": "Ask a question...",
      "language": "Language",
      "notifications": "Notifications"
    }
  },
  hi: {
    translation: {
      "welcome": "वारिफाई में आपका स्वागत है",
      "dashboard": "डैशबोर्ड",
      "add_product": "उत्पाद जोड़ें",
      "assistant": "सहायक",
      "logout": "लॉग आउट",
      "login": "लॉग इन",
      "signup": "साइन अप",
      "warranty_status": "वारंटी स्थिति",
      "days_left": "दिन शेष",
      "expired": "समाप्त",
      "active": "सक्रिय",
      "search_placeholder": "उत्पाद, ब्रांड या चालान खोजें...",
      "upload_invoice": "चालान अपलोड करें",
      "ocr_processing": "चालान स्कैन हो रहा है...",
      "save_product": "उत्पाद सहेजें",
      "assistant_intro": "नमस्ते! मैं आपका वारिफाई एआई सहायक हूँ। मैं वारंटी जांचने, सेवा केंद्र खोजने या शिकायत ईमेल का मसौदा तैयार करने में आपकी मदद कर सकता हूँ।",
      "ask_placeholder": "एक प्रश्न पूछें...",
      "language": "भाषा",
      "notifications": "सूचनाएं"
    }
  },
  mr: {
    translation: {
      "welcome": "वॅरिफाय मध्ये आपले स्वागत आहे",
      "dashboard": "डॅशबोर्ड",
      "add_product": "उत्पादन जोडा",
      "assistant": "सहायक",
      "logout": "लॉग आउट",
      "login": "लॉग इन",
      "signup": "साइन अप",
      "warranty_status": "वारंटी स्थिती",
      "days_left": "दिवस बाकी",
      "expired": "कालबाह्य",
      "active": "सक्रिय",
      "search_placeholder": "उत्पादने, ब्रँड किंवा इनव्हॉइस शोधा...",
      "upload_invoice": "इनव्हॉइस अपलोड करा",
      "ocr_processing": "इनव्हॉइस स्कॅन होत आहे...",
      "save_product": "उत्पादन जतन करा",
      "assistant_intro": "नमस्कार! मी तुमचा वॅरिफाय एआय सहाय्यक आहे. मी तुम्हाला वारंटी तपासण्यात, सेवा केंद्रे शोधण्यात किंवा तक्रार ईमेल लिहिण्यात मदत करू शकतो.",
      "ask_placeholder": "एक प्रश्न विचारा...",
      "language": "भाषा",
      "notifications": "सूचना"
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

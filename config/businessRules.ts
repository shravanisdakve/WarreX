export const serviceDirectory: Record<string, any> = process.env.SERVICE_DIRECTORY
    ? JSON.parse(process.env.SERVICE_DIRECTORY)
    : {
        "Samsung": {
            "phone": "1800-407-267864",
            "email": "support.india@samsung.com",
            "website": "https://www.samsung.com/in/support/",
            "centers": ["Samsung Plaza, Worli, Mumbai", "Service HQ, Bandra Kurla Complex, Mumbai", "Electronics City, Phase 1, Bengaluru", "Sector 18, Noida, NCR"]
        },
        "LG": {
            "phone": "1800-315-9999",
            "email": "serviceindia@lge.com",
            "website": "https://www.lg.com/in/support",
            "centers": ["LG Care Tower, Andheri East, Mumbai", "Regional Hub, Okhla Phase 3, Delhi", "Tech Support Center, Guindy, Chennai"]
        },
        "Sony": {
            "phone": "1800-103-7799",
            "email": "sonyindia.care@ap.sony.com",
            "website": "https://www.sony.co.in/electronics/support",
            "centers": ["Sony Center, Kemps Corner, Mumbai", "Authorized Hub, Connaught Place, Delhi", "Sony Service Point, Anna Nagar, Chennai"]
        },
        "Apple": {
            "phone": "000800-100-9009",
            "email": "contactus.in@apple.com",
            "website": "https://support.apple.com/en-in",
            "centers": ["Apple BKC, Mumbai", "Apple Saket, Delhi", "Maple Authorized Service, Vashi, Navi Mumbai"]
        },
        "HP": {
            "phone": "1800-258-7170",
            "email": "hpcare_india@hp.com",
            "website": "https://support.hp.com/in-en",
            "centers": ["HP World, Lamington Road, Mumbai", "Laptop Repair Hub, Nehru Place, Delhi", "HP Service Plus, Indiranagar, Bengaluru"]
        },
        "Dell": {
            "phone": "1800-425-4002",
            "email": "india_support@dell.com",
            "website": "https://www.dell.com/support/home/en-in",
            "centers": ["Dell Exclusive Store, Fort, Mumbai", "Dell Service Center, Janakpuri, Delhi", "Technical Hub, Domlur, Bengaluru"]
        },
        "Whirlpool": {
            "phone": "1800-208-1800",
            "email": "helpdeskindia@whirlpool.com",
            "website": "https://www.whirlpoolindia.com/service-support",
            "centers": ["Whirlpool Solutions, Goregaon East, Mumbai", "Regional Service Center, Gurgaon, NCR"]
        },
        "Voltas": {
            "phone": "1860-599-4555",
            "email": "vcare@voltas.com",
            "website": "https://www.voltas.com/pages/customer-care",
            "centers": ["Voltas House, Chinchpokli, Mumbai", "Aircon Hub, Sector 63, Noida"]
        },
        "OnePlus": {
            "phone": "1800-102-8411",
            "email": "support.in@oneplus.com",
            "website": "https://www.oneplus.in/support",
            "centers": ["OnePlus Boulevard, Lower Parel, Mumbai", "Exclusive Service Center, Brigade Road, Bengaluru"]
        },
        "Lenovo": {
            "phone": "1800-4199-733",
            "email": "consumercare@lenovo.com",
            "website": "https://support.lenovo.com/in/en/",
            "centers": ["Lenovo Support, Lamington Road, Mumbai", "Technical Center, Nehru Place, Delhi"]
        },
        "Xiaomi": {
            "phone": "1800-103-6286",
            "email": "service.in@xiaomi.com",
            "website": "https://www.mi.com/in/service/repair/",
            "centers": ["Mi Home, Phoenix Marketcity, Mumbai", "Xiaomi Service Hub, Karol Bagh, Delhi"]
        },
        "Realme": {
            "phone": "1800-102-2777",
            "email": "service.in@realme.com",
            "website": "https://www.realme.com/in/support",
            "centers": ["Realme Service, Vashi, Navi Mumbai", "Direct Center, Tilak Nagar, Delhi"]
        },
        "Panasonic": {
            "phone": "1800-103-1333",
            "email": "helpline@in.panasonic.com",
            "website": "https://www.panasonic.com/in/support.html",
            "centers": ["Panasonic Hub, Santacruz, Mumbai", "Service Center, Gurgaon Sector 14"]
        },
        "Godrej": {
            "phone": "1800-209-5511",
            "email": "smartcare@godrej.com",
            "website": "https://www.godrej.com/service-and-support",
            "centers": ["Godrej Pirojshanagar, Vikhroli, Mumbai", "Regional Hub, Okhla, Delhi"]
        },
        "Haier": {
            "phone": "1800-102-9999",
            "email": "customercare@haierindia.com",
            "website": "https://www.haier.com/in/support/",
            "centers": ["Haier Service, Kanjurmarg, Mumbai", "Regional Center, Noida Phase 2"]
        },
        "Asus": {
            "phone": "1800-209-0365",
            "email": "rc_india@asus.com",
            "website": "https://www.asus.com/in/support/",
            "centers": ["Asus ROG Hub, Andheri, Mumbai", "Service Point, Nehru Place, Delhi"]
        },
        "Acer": {
            "phone": "1800-11-6677",
            "email": "ail.easycare@acer.com",
            "website": "https://www.acer.com/in-en/support",
            "centers": ["Acer Care, Borivali, Mumbai", "Technical Point, Janakpuri, Delhi"]
        },
        "Bosch": {
            "phone": "1800-266-1880",
            "email": "service.in@bosch.com",
            "website": "https://www.bosch-home.in/service/get-support",
            "centers": ["Bosch Home, Worli, Mumbai", "Regional Service Center, Gurgaon"]
        }
    };

// Common failure data for Claim Intelligence Engine
export const commonFailures: Record<string, Record<string, string[]>> = process.env.COMMON_FAILURES
    ? JSON.parse(process.env.COMMON_FAILURES)
    : {
        "default": {
            "default": ["General wear and tear"]
        }
    };

// Risk Assessment Constants
export const RISK_THRESHOLDS = process.env.RISK_THRESHOLDS
    ? JSON.parse(process.env.RISK_THRESHOLDS)
    : [
        { defaultProbability: 10 }
    ];

export const RECOMMENDATIONS = {
    GOOD_SHAPE: "Your product is in good shape. Continue regular use.",
    EXPIRED: "Warranty has expired. Consider extended warranty or replacement plans.",
    URGENT: (days: number, failures: string[]) => `URGENT: File a preventive claim NOW. Common issues at this age: ${failures.slice(0, 2).join(', ')}. Warranty expires in ${days} days.`,
    NEAR_EXPIRY: (days: number, failures: string[]) => `Schedule a thorough inspection before warranty expires. Watch for: ${failures.slice(0, 2).join(', ')}.`,
    MONITOR: (failures: string[]) => `Monitor for early signs of ${failures[0]}. Consider filing any pending issues.`
};

export const RISK_CATEGORIES = process.env.RISK_CATEGORIES ? JSON.parse(process.env.RISK_CATEGORIES) : [];

export const REPAIR_COST_FACTORS = process.env.REPAIR_COST_FACTORS
    ? JSON.parse(process.env.REPAIR_COST_FACTORS)
    : {
        BASE_PERCENTAGE: 0.3,
        DEFAULT_BASE_COST: 5000
    };

export const RESALE_VALUE_CONSTANTS = process.env.RESALE_VALUE_CONSTANTS
    ? JSON.parse(process.env.RESALE_VALUE_CONSTANTS)
    : {
        MIN_AGE_DEPRECIATION: 0.3,
        MAX_AGE_DEPRECIATION_FACTOR: 0.5,
        WITHOUT_WARRANTY_FACTOR: 0.65,
        WARRANTY_PREMIUM_PER_YEAR_FACTOR: 0.08
    };

/* ------------------------------------------------------------------ */
/*  Helper: getCommonFailures                                          */
/* ------------------------------------------------------------------ */
export function getCommonFailures(category: string, productName: string): string[] {
    const catData = commonFailures[category] || commonFailures["default"];
    const nameLower = productName.toLowerCase();

    for (const [key, failures] of Object.entries(catData)) {
        if (key !== "default" && nameLower.includes(key)) {
            return failures;
        }
    }
    return catData["default"] || ["General component wear"];
}

/* ------------------------------------------------------------------ */
/*  AI System Prompt Builder                                           */
/* ------------------------------------------------------------------ */
export function buildSystemPrompt(opts: {
    userName: string;
    userEmail: string;
    productContext: string;
    availableBrands: string[];
}): string {
    return `You are Warrify AI Advisor – a proactive, intelligent warranty management advisor. 
Current user: ${opts.userName} (${opts.userEmail})
Today's date: ${new Date().toISOString().split('T')[0]}

User's registered products:
${opts.productContext || 'No products registered yet.'}

Available service center brands: ${opts.availableBrands.join(', ')}

Instructions:
- Be concise, actionable and helpful. Use bullet points and formatting.
- When asked about warranty status, provide detailed analysis with days remaining.
- When asked about service centers, provide the contact info AND nearby service center locations.
- When asked to draft a claim email, write a HIGHLY PROFESSIONAL email with subject line, formal greeting, and specific product details (Invoice#, Date).
- If the user asks in Hindi or Marathi, respond in that language.
- Proactively suggest actions (e.g. "Warranty expires in 15 days, check for common issues").`;
}

/* ------------------------------------------------------------------ */
/*  Rule-based Fallback Response Generator                             */
/*  (used when all AI API calls fail)                                  */
/* ------------------------------------------------------------------ */
export function generateFallbackResponse(query: string, products: any[], userName: string): string {
    const q = query.toLowerCase();

    // 1. Complaint email (TOP PRIORITY)
    if (q.includes('draft_email') || q.includes('complaint') || q.includes('claim') || q.includes('email')) {
        let product = products.find(p => p.invoice_number && q.includes(p.invoice_number.toLowerCase()));
        if (!product) product = products.find(p => q.includes(p.product_name.toLowerCase()));
        if (!product) product = products.find(p => p.brand && q.includes(p.brand.toLowerCase()));
        if (!product) product = products[0];

        let issueDescription = 'a technical issue requiring immediate attention';
        const issuePatterns = [
            /issue[:\s]+(.+?)(?:\.|$)/i,
            /problem[:\s]+(.+?)(?:\.|$)/i,
            /facing[:\s]+(.+?)(?:\.|$)/i,
            /experiencing[:\s]+(.+?)(?:\.|$)/i,
        ];
        for (const pattern of issuePatterns) {
            const match = query.match(pattern);
            if (match && match[1]) {
                issueDescription = match[1].trim();
                break;
            }
        }

        if (product) {
            const failures = getCommonFailures(product.category, product.product_name);
            return `**Subject:** Warranty Service Request – ${product.product_name}${product.invoice_number ? ' (Inv: ' + product.invoice_number + ')' : ''}

Dear ${product.brand || 'Customer'} Support Team,

I am writing to formally request a warranty claim for my ${product.product_name}, which I purchased on ${product.purchase_date}. 

The product is currently ${new Date(product.expiry_date) > new Date() ? 'under warranty (expiring on ' + product.expiry_date + ')' : 'recently out of warranty (expired on ' + product.expiry_date + ')'} and has developed ${issueDescription}.

**Product Details:**
- Product: ${product.product_name}
- Brand: ${product.brand || 'N/A'}
- Purchase Date: ${product.purchase_date}
- Warranty Expiry: ${product.expiry_date}
${product.invoice_number ? '- Invoice Number: ' + product.invoice_number : ''}
${product.purchase_price ? '- Purchase Price: ₹' + product.purchase_price : ''}

**Common issues reported for this product type include:** ${failures.join(', ')}.

I would appreciate your guidance on the next steps for repair or replacement under the warranty terms. I have the original invoice ready for verification.

Looking forward to your prompt response.

Best regards,
${userName}`;
        }
        return 'Please mention the product name so I can draft a specific complaint email for you.';
    }

    // 2. Warranty status check
    if (q.includes('warranty') || q.includes('expir') || q.includes('status') || q.includes('which') || q.includes('month')) {
        const product = products.find(p => q.includes(p.product_name.toLowerCase()) || q.includes(p.brand?.toLowerCase()));
        if (product) {
            const daysLeft = Math.ceil((new Date(product.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysLeft < 0) {
                return `⚠️ The warranty for **${product.product_name}** expired ${Math.abs(daysLeft)} days ago (on ${product.expiry_date}). You may have missed a claim opportunity.`;
            }
            const failures = getCommonFailures(product.category, product.product_name);
            return `✅ **${product.product_name}** warranty is active. It expires on ${product.expiry_date} (${daysLeft} days remaining).\n\n💡 **Proactive tip:** Common issues at this product age include: ${failures.slice(0, 2).join(', ')}. Consider a checkup before warranty ends.`;
        }
        if (products.length > 0) {
            const summary = products.map(p => {
                const dl = Math.ceil((new Date(p.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const status = dl < 0 ? '🔴 Expired' : dl <= 30 ? '🟡 Expiring Soon' : '🟢 Active';
                return `• **${p.product_name}** – ${status} (${dl > 0 ? dl + ' days left' : 'expired ' + Math.abs(dl) + ' days ago'})`;
            }).join('\n');
            return `Here's your warranty overview:\n\n${summary}`;
        }
        return 'You have no products registered yet. Add a product to start tracking warranties!';
    }

    // 3. Invoice query
    if (q.includes('invoice') || q.includes('bill') || q.includes('receipt')) {
        const product = products.find(p => q.includes(p.product_name.toLowerCase()));
        if (product?.invoice_file_url) {
            return `📄 Invoice for **${product.product_name}**: [View Invoice](${product.invoice_file_url})${product.invoice_number ? '\nInvoice #: ' + product.invoice_number : ''}`;
        }
        return 'Please specify the product name, and make sure an invoice was uploaded when adding the product.';
    }

    // 4. Service center
    if (q.includes('service') || q.includes('support') || q.includes('contact') || q.includes('help') || q.includes('care') || q.includes('center') || q.includes('centre')) {
        const brands = Object.keys(serviceDirectory);
        const brand = brands.find(b => q.includes(b.toLowerCase()));
        if (brand) {
            const info = serviceDirectory[brand];
            let response = `📞 **${brand} Service Center:**\n`;
            if (info.phone) response += `• Phone: ${info.phone}\n`;
            if (info.email) response += `• Email: ${info.email}\n`;
            if (info.website) response += `• Website: ${info.website}\n`;
            if (info.centers && info.centers.length > 0) {
                response += `\n📍 **Nearby Service Centers:**\n`;
                info.centers.forEach((c: string) => {
                    response += `• ${c}\n`;
                });
            }
            return response;
        }
        return `I can help with service center info for: ${brands.join(', ')}. Which brand do you need?`;
    }

    // 5. General greeting
    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
        return `Hello, ${userName}! 👋 I'm your Warrify AI Advisor. I can help you with:\n• 📋 **Warranty status** – Check any product's warranty\n• 📄 **Invoice lookup** – Find your uploaded invoices\n• 📞 **Service centers** – Get brand contact info & nearby locations\n• 📧 **Complaint emails** – Draft professional warranty claim emails\n• 🔮 **Risk assessment** – Predict product failure probability\n• 💰 **Resale value** – Estimate product value with/without warranty\n\nJust ask away!`;
    }

    return `I can help with warranty checks, invoice lookup, service center info, risk assessments, and drafting complaint emails. Try asking:\n• "What's the warranty status of my products?"\n• "Show invoice for [product name]"\n• "Service center contact for [brand]"\n• "Draft complaint for [product name]"\n• "Which products expire this month?"`;
}

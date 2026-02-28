import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.join(__dirname, '..', 'demo-invoices');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Ensure the demo generation uses native HTML5 canvas or similar if available,
// but for a Node script, it's easier to just write basic HTML/CSS or pre-rendered text 
// to an SVG format, which OCR and browsers can read perfectly.

function generateSVGInvoice(brand: string, product: string, date: string, invoiceNo: string, price: string): string {
    return `<?xml version="1.0" encoding="UTF-8" ?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" style="background-color: white; font-family: monospace;">
  <rect width="100%" height="100%" fill="#ffffff" />
  
  <text x="50" y="80" font-size="36" font-weight="bold" fill="#333">${brand} Store</text>
  <text x="50" y="120" font-size="20" fill="#666">123 Tech Avenue, Silicon Valley</text>
  <text x="50" y="150" font-size="20" fill="#666">Phone: 1800-555-0199</text>
  
  <line x1="50" y1="180" x2="750" y2="180" stroke="#ccc" stroke-width="2" />
  
  <text x="50" y="240" font-size="28" font-weight="bold">TAX INVOICE</text>
  
  <text x="50" y="300" font-size="22">Date: ${date}</text>
  <text x="50" y="340" font-size="22">Invoice No: ${invoiceNo}</text>
  <text x="50" y="380" font-size="22">Customer: Demo User</text>
  
  <rect x="50" y="420" width="700" height="50" fill="#f5f5f5" />
  <text x="70" y="455" font-size="20" font-weight="bold">Item Description</text>
  <text x="600" y="455" font-size="20" font-weight="bold">Amount</text>
  
  <text x="70" y="520" font-size="20">1x ${brand} ${product}</text>
  <text x="600" y="520" font-size="20">${price}</text>
  
  <line x1="50" y1="560" x2="750" y2="560" stroke="#ccc" stroke-width="1" />
  
  <text x="450" y="610" font-size="20">Subtotal:</text>
  <text x="600" y="610" font-size="20">${price}</text>
  
  <text x="450" y="650" font-size="20">Tax (18%):</text>
  <text x="600" y="650" font-size="20">Included</text>
  
  <line x1="450" y1="670" x2="750" y2="670" stroke="#333" stroke-width="2" />
  
  <text x="450" y="710" font-size="24" font-weight="bold">Total:</text>
  <text x="600" y="710" font-size="24" font-weight="bold">${price}</text>
  
  <text x="50" y="850" font-size="18" fill="#888">Thank you for shopping with ${brand}!</text>
  <text x="50" y="880" font-size="16" fill="#888">This is a computer generated invoice and does not require a signature.</text>
  <text x="50" y="910" font-size="16" fill="#888">Valid for warranty claims.</text>
</svg>`;
}

const invoices = [
    {
        filename: 'samsung_galaxy_s24.svg',
        brand: 'Samsung',
        product: 'Galaxy S24 Ultra',
        date: '15 Jan 2025',
        invoiceNo: 'SAM-2025-001452',
        price: '$1199.00'
    },
    {
        filename: 'lg_washing_machine.svg',
        brand: 'LG',
        product: 'Washing Machine 8kg Front Load',
        date: '10 Mar 2023',
        invoiceNo: 'LG-IN-98765432',
        price: '$599.00'
    }
];

invoices.forEach(inv => {
    const content = generateSVGInvoice(inv.brand, inv.product, inv.date, inv.invoiceNo, inv.price);
    fs.writeFileSync(path.join(outDir, inv.filename), content);
    console.log(`Generated demo invoice: ${inv.filename}`);
});

console.log('Demo invoices generated successfully in /demo-invoices/');

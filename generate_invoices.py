import os
import random
import subprocess
import sys
from datetime import datetime, timedelta

# Try importing PIL, install if missing
try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_invoice(filename, store_name, item_name, price, date_str, invoice_num, tax_rate=0.1):
    # Set up image dimensions
    width, height = 800, 1000
    
    # Create white background with slight off-white color to simulate paper
    bg_color = (250, 250, 245)
    image = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(image)
    
    # Load fonts (fallback to default if arial is missing)
    try:
        if os.name == 'nt':
            font_path = "arial"
            font_huge = ImageFont.truetype(f"{font_path}bd.ttf", 48)
            font_title = ImageFont.truetype(f"{font_path}bd.ttf", 36)
            font_header = ImageFont.truetype(f"{font_path}.ttf", 26)
            font_normal = ImageFont.truetype(f"{font_path}.ttf", 22)
            font_small = ImageFont.truetype(f"{font_path}.ttf", 18)
            font_bold = ImageFont.truetype(f"{font_path}bd.ttf", 22)
        else:
            font_huge = ImageFont.load_default()
            font_title = ImageFont.load_default()
            font_header = ImageFont.load_default()
            font_normal = ImageFont.load_default()
            font_small = ImageFont.load_default()
            font_bold = ImageFont.load_default()
    except IOError:
        font_huge = ImageFont.load_default()
        font_title = ImageFont.load_default()
        font_header = ImageFont.load_default()
        font_normal = ImageFont.load_default()
        font_small = ImageFont.load_default()
        font_bold = ImageFont.load_default()

    # Layout constants
    margin_left = 60
    margin_right = width - 60
    current_y = 60
    
    # Store Header
    draw.text((width/2, current_y), store_name, fill=(0, 0, 0), font=font_huge, anchor="mt")
    current_y += 60
    
    # Store Sub-header / Address
    address_lines = ["123 Main Street, Tech Park", "City, State, 12345", "Phone: (555) 123-4567"]
    for line in address_lines:
        draw.text((width/2, current_y), line, fill=(80, 80, 80), font=font_small, anchor="mt")
        current_y += 20
    current_y += 20
    
    # Invoice Title
    draw.text((width/2, current_y), "TAX INVOICE / RECEIPT", fill=(0, 0, 0), font=font_title, anchor="mt")
    current_y += 50
    
    # Separator Line
    draw.line([(margin_left, current_y), (margin_right, current_y)], fill=(0, 0, 0), width=2)
    current_y += 20
    
    # Invoice Details
    draw.text((margin_left, current_y), f"Invoice No: {invoice_num}", fill=(0, 0, 0), font=font_normal)
    draw.text((margin_right, current_y), f"Date: {date_str}", fill=(0, 0, 0), font=font_normal, anchor="ra")
    current_y += 30
    
    cashier = f"Cashier: Employee {random.randint(100, 999)}"
    draw.text((margin_left, current_y), cashier, fill=(0, 0, 0), font=font_normal)
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    hour = random.randint(10, 19)
    minute = random.randint(10, 59)
    draw.text((margin_right, current_y), f"Time: {hour:02d}:{minute:02d}", fill=(0, 0, 0), font=font_normal, anchor="ra")
    current_y += 40
    
    # Separator Line
    draw.line([(margin_left, current_y), (margin_right, current_y)], fill=(150, 150, 150), width=1)
    current_y += 10
    
    # Table Header
    draw.text((margin_left, current_y), "ITEM DESCRIPTION", fill=(0, 0, 0), font=font_bold)
    draw.text((margin_right, current_y), "AMOUNT", fill=(0, 0, 0), font=font_bold, anchor="ra")
    current_y += 35
    
    draw.line([(margin_left, current_y), (margin_right, current_y)], fill=(0, 0, 0), width=1)
    current_y += 20
    
    # Product Item
    draw.text((margin_left, current_y), item_name, fill=(0, 0, 0), font=font_normal)
    draw.text((margin_right, current_y), f"${price:.2f}", fill=(0, 0, 0), font=font_normal, anchor="ra")
    current_y += 35
    
    # Warranty Info
    draw.text((margin_left + 20, current_y), "Included: 1 Year Manufacturer Warranty", fill=(100, 100, 100), font=font_small)
    current_y += 40
    
    # Add random smaller item just for realism
    accessories = ["Extended Cable 2m", "Screen Protector Standard", "Setup & Installation Service", "Recycling Fee"]
    acc = random.choice(accessories)
    acc_price = random.uniform(5.0, 35.0)
    draw.text((margin_left, current_y), acc, fill=(0, 0, 0), font=font_normal)
    draw.text((margin_right, current_y), f"${acc_price:.2f}", fill=(0, 0, 0), font=font_normal, anchor="ra")
    current_y += 50
    
    total_price = price + acc_price
    
    # Separator Line
    draw.line([(margin_left, current_y), (margin_right, current_y)], fill=(0, 0, 0), width=2)
    current_y += 20
    
    # Totals
    subtotal = total_price / (1 + tax_rate)
    tax = total_price - subtotal
    
    # Right-aligned totals table
    table_left = margin_right - 250
    draw.text((table_left, current_y), "Subtotal:", fill=(0, 0, 0), font=font_normal)
    draw.text((margin_right, current_y), f"${subtotal:.2f}", fill=(0, 0, 0), font=font_normal, anchor="ra")
    current_y += 30
    
    draw.text((table_left, current_y), f"Tax ({(tax_rate*100):.1f}%):", fill=(0, 0, 0), font=font_normal)
    draw.text((margin_right, current_y), f"${tax:.2f}", fill=(0, 0, 0), font=font_normal, anchor="ra")
    current_y += 30
    
    # Total
    draw.text((table_left, current_y), "TOTAL:", fill=(0, 0, 0), font=font_title)
    draw.text((margin_right, current_y), f"${total_price:.2f}", fill=(0, 0, 0), font=font_title, anchor="ra")
    current_y += 50
    
    draw.text((table_left, current_y), "Paid by: Visa xxxx-1234", fill=(50, 50, 50), font=font_normal)
    current_y += 25
    draw.text((table_left, current_y), f"Auth Code: {random.randint(100000, 999999)}B", fill=(50, 50, 50), font=font_normal)
    current_y += 60
    
    # Barcode mock (just drawing lines)
    barcode_y = current_y
    for i in range(150):
        if random.random() > 0.4:
            draw.line([(margin_left + i*4, barcode_y), (margin_left + i*4, barcode_y + 40)], fill=(0,0,0), width=random.randint(1, 3))
    
    current_y += 60
    
    # Footer
    footer_lines = ["Thank you for shopping with us!", "Returns accepted within 15 days with receipt.", "Register your warranty online."]
    for line in footer_lines:
        draw.text((width/2, current_y), line, fill=(80, 80, 80), font=font_small, anchor="mt")
        current_y += 20
    
    # Add a bit of noise directly or slight blur to simulate scan/photo
    # Slight crop/rotation
    image = image.rotate(random.uniform(-0.5, 0.5), expand=1, fillcolor=bg_color)
    image = image.filter(ImageFilter.GaussianBlur(0.3))
    
    # Save to public/demo-invoices as asked by user but also demo-invoices in root
    out_dir_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'demo-invoices')
    os.makedirs(out_dir_root, exist_ok=True)
    out_path_root = os.path.join(out_dir_root, filename)
    
    # Save as JPEG for realistic artifacting
    image = image.convert('RGB')
    image.save(out_path_root, 'JPEG', quality=85)
    print(f"Generated {out_path_root}")

if __name__ == '__main__':
    create_invoice(
        "samsung_galaxy_math.jpg", 
        "ElectroWorld Superstore", 
        "Samsung Galaxy Math S24 Ultra", 
        1299.99, 
        datetime.now().strftime("%Y-%m-%d"), 
        "INV-2024-001"
    )
    
    create_invoice(
        "lg_washing_machine.jpg", 
        "Home Appliance Hub", 
        "LG 9kg Front Load Washing Machine", 
        849.00, 
        (datetime.now() - timedelta(days=15)).strftime("%Y-%m-%d"), 
        "HAH-992384"
    )

    create_invoice(
        "sony_headphones.jpg",
        "AudioTech Center",
        "Sony WH-1000XM5 Wireless Headphones",
        348.50,
        (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
        "AUD-83726"
    )

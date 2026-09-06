import os
import sys
import argparse
import re
import csv
import pandas as pd
import win32com.client
import pythoncom

# Category mapping
CATEGORY_MAP = {
    '261328': '/Sports Mem, Cards & Fan Shop/Sports Trading Cards/Trading Card Singles',
    '183050': '/Collectibles/Non-Sport Trading Cards/Trading Card Singles',
}

# Grader mapping to exact eBay condition descriptor dropdowns
GRADER_MAP = {
    'PSA': 'Professional Sports Authenticator (PSA) - (ID: 275010)',
    'PROFESSIONAL SPORTS AUTHENTICATOR (PSA)': 'Professional Sports Authenticator (PSA) - (ID: 275010)',
    'BCCG': 'Beckett Collectors Club Grading (BCCG) - (ID: 275011)',
    'BVG': 'Beckett Vintage Grading (BVG) - (ID: 275012)',
    'BGS': 'Beckett Grading Services (BGS) - (ID: 275013)',
    'BECKETT': 'Beckett Grading Services (BGS) - (ID: 275013)',
    'CSG': 'Certified Sports Guaranty (CSG) - (ID: 275014)',
    'CGC': 'Certified Guaranty Company (CGC) - (ID: 275015)',
    'SGC': 'Sportscard Guaranty Corporation (SGC) - (ID: 275016)',
    'ISA': 'Instructional Sports Authentication (ISA) - (ID: 275017)',
    'GMA': 'GMA Grading (GMA) - (ID: 275018)',
    'HGA': 'Hybrid Grading Approach (HGA) - (ID: 275019)',
    'TAG': 'Technical Authentication & Grading (TAG) - (ID: 2750120)',
}

# Grade mapping to exact eBay condition descriptor dropdowns
GRADE_MAP = {
    '10': '10 - (ID: 275020)',
    '9.5': '9.5 - (ID: 275021)',
    '9': '9 - (ID: 275022)',
    '8.5': '8.5 - (ID: 275023)',
    '8': '8 - (ID: 275024)',
    '7.5': '7.5 - (ID: 275025)',
    '7': '7 - (ID: 275026)',
    '6.5': '6.5 - (ID: 275027)',
    '6': '6 - (ID: 275028)',
    '5.5': '5.5 - (ID: 275029)',
    '5': '5 - (ID: 2750210)',
    'AUTHENTIC': 'Authentic - (ID: 2750219)',
}

DEFAULT_CARD_CONDITION_UNGRADED = 'Near mint or better - (ID: 400010)'


def clean_price(val):
    if pd.isna(val) or val is None or str(val).strip() == '':
        return None
    s = str(val).replace('$', '').replace(',', '').strip()
    try:
        return float(s)
    except ValueError:
        return s


def build_template_with_excel_com(csv_file="ebay_upload.csv",
                                  template_file="eBay-category-listing-template.xlsx",
                                  output_xlsx="eBay_Bulk_Upload_Completed.xlsx",
                                  output_csv="eBay_Bulk_Upload_Completed.csv",
                                  default_shipping="Flat: USPSParcel $5.00, 2 business days (255602283020) - (ID: 255602283020)",
                                  default_returns="Returns - (ID: 255419358020)",
                                  default_payments="Payment Policy - (ID: 255419355020)",
                                  location="Bethlehem PA",
                                  default_photo="",
                                  image_dir=None,
                                  image_base_url=None):
    abs_csv = os.path.abspath(csv_file)
    abs_template = os.path.abspath(template_file)
    abs_output_xlsx = os.path.abspath(output_xlsx)
    abs_output_csv = os.path.abspath(output_csv)

    print(f"Reading input CSV: {csv_file}")
    csv_df = pd.read_csv(abs_csv, dtype=str)
    total_items = len(csv_df)
    print(f"Loaded {total_items} items.")

    print(f"Starting Microsoft Excel COM automation...")
    pythoncom.CoInitialize()
    excel = win32com.client.Dispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False

    try:
        print(f"Opening template: {abs_template}")
        wb = excel.Workbooks.Open(abs_template)
        ws = wb.Sheets("Listings")
        ws.Activate()

        header_row_idx = 4

        # Read headers from row 4
        col_count = ws.UsedRange.Columns.Count
        header_map = {}
        for c in range(1, col_count + 1):
            val = ws.Cells(header_row_idx, c).Value
            if val:
                raw_str = str(val).strip()
                header_map[raw_str.lower()] = c
                # Also store prefix-stripped version
                clean_str = re.sub(r'^(c|cd|cda|p):', '', raw_str.lower())
                clean_str = re.sub(r'\s*-\s*\(id:.*\)', '', clean_str).strip()
                if clean_str not in header_map:
                    header_map[clean_str] = c

        # Ensure C:Print Run header exists
        print_run_col = header_map.get('c:print run')
        if not print_run_col:
            print_run_col = col_count + 1
            ws.Cells(header_row_idx, print_run_col).Value = 'C:Print Run'
            header_map['c:print run'] = print_run_col
            col_count = print_run_col

        def find_col(*names):
            for n in names:
                n_lower = n.lower()
                if n_lower in header_map:
                    return header_map[n_lower]
                for k, idx in header_map.items():
                    if n_lower in k:
                        return idx
            return None

        c_action = find_col('*action', 'action')
        c_sku = find_col('custom label (sku)', 'sku')
        c_cat_id = find_col('category id')
        c_cat_name = find_col('category name')
        c_title = find_col('title')
        c_start_price = find_col('start price')
        c_bin_price = find_col('buy it now price')
        c_qty = find_col('quantity')
        c_photo = find_col('item photo url', 'picurl', 'photo url', 'image url')
        c_format = find_col('format')
        c_duration = find_col('duration')
        c_cond_id = find_col('condition id')
        c_grader = find_col('cd:professional grader', 'professional grader')
        c_grade = find_col('cd:grade', 'grade')
        c_cert = find_col('cda:certification number', 'certification number')
        c_card_cond = find_col('cd:card condition', 'card condition')
        c_desc = find_col('description')
        c_best_offer = find_col('best offer enabled')
        c_auto_accept = find_col('best offer auto accept price')
        c_min_offer = find_col('minimum best offer price')
        c_loc = find_col('location')
        c_ship_profile = find_col('shipping profile name')
        c_ret_profile = find_col('return profile name')
        c_pay_profile = find_col('payment profile name')

        c_franchise = find_col('c:franchise')
        c_sport = find_col('c:sport')
        c_mfg = find_col('c:manufacturer')
        c_auto = find_col('c:autographed')
        c_auto_auth = find_col('c:autograph authentication')
        c_set = find_col('c:set')
        c_char = find_col('c:character')
        c_feat = find_col('c:features')
        c_parallel = find_col('c:parallel/variety')
        c_person = find_col('c:featured person/artist')
        c_type = find_col('c:type')
        c_card_num = find_col('c:card number')
        c_card_name = find_col('c:card name')
        c_player = find_col('c:player/athlete')
        c_season = find_col('c:season')
        c_team = find_col('c:team')

        print("Populating listings...")
        start_row = 5
        end_data_row = start_row + total_items - 1

        for i, (_, row) in enumerate(csv_df.iterrows()):
            curr_r = start_row + i
            sku = str(row.get('Custom label (SKU)', '')).strip()
            title = str(row.get('Title', '')).strip()
            cat_id = str(row.get('Category ID', '261328')).strip()
            sport = str(row.get('Sport', '')).strip()
            is_non_sport = (sport.lower() == 'non-sport')

            if is_non_sport:
                cat_id = '183050'
                cat_name = CATEGORY_MAP['183050']
            else:
                cat_id = '261328'
                cat_name = CATEGORY_MAP['261328']

            cond_id_raw = str(row.get('Condition ID', '2750')).strip()
            graded = str(row.get('Graded', '')).strip().lower() in ['yes', 'true', '1']

            if cond_id_raw.startswith('2750') or graded:
                cond_id_val = '2750-Graded'
                grader_raw = str(row.get('Professional Grader', '')).strip()
                grade_raw = str(row.get('Grade', '')).strip()
                cert_num = str(row.get('Certification Number', '')).strip()

                grader_val = GRADER_MAP.get(grader_raw.upper(), grader_raw)
                grade_val = GRADE_MAP.get(grade_raw, grade_raw)
                card_cond_val = None
            else:
                cond_id_val = '4000-Ungraded'
                grader_val = None
                grade_val = None
                cert_num = None
                card_cond_val = DEFAULT_CARD_CONDITION_UNGRADED

            # Core
            if c_action: ws.Cells(curr_r, c_action).Value = str(row.get('Action', 'Add')).strip() or 'Add'
            if c_sku: ws.Cells(curr_r, c_sku).Value = sku
            if c_cat_id: ws.Cells(curr_r, c_cat_id).Value = int(cat_id) if cat_id.isdigit() else cat_id
            if c_cat_name: ws.Cells(curr_r, c_cat_name).Value = cat_name
            if c_title: ws.Cells(curr_r, c_title).Value = title
            if c_format: ws.Cells(curr_r, c_format).Value = str(row.get('Format', 'FixedPrice')).strip() or 'FixedPrice'
            if c_duration: ws.Cells(curr_r, c_duration).Value = str(row.get('Duration', 'GTC')).strip() or 'GTC'
            if c_qty:
                qty_raw = str(row.get('Quantity', '1')).strip()
                ws.Cells(curr_r, c_qty).Value = int(qty_raw) if qty_raw.isdigit() else 1

            # Photo URL
            photo_url = str(row.get('Item photo URL', row.get('PicURL', row.get('Photo URL', row.get('Image URL', row.get('Photo', ''))))) or '').strip()
            if not photo_url and image_dir and image_base_url and os.path.isdir(image_dir):
                files = os.listdir(image_dir)
                matched = sorted([f for f in files if f.startswith(sku)])
                front_photos = [f for f in matched if 'FRONT' in f.upper()]
                back_photos = [f for f in matched if 'BACK' in f.upper()]
                other_photos = [f for f in matched if f not in front_photos and f not in back_photos]
                ordered = front_photos + back_photos + other_photos if (front_photos or back_photos) else matched
                if ordered:
                    photo_url = '|'.join([f"{image_base_url.rstrip('/')}/{f}" for f in ordered])
            if not photo_url and default_photo:
                photo_url = default_photo
            if c_photo and photo_url:
                ws.Cells(curr_r, c_photo).Value = photo_url

            # Prices
            # For eBay FixedPrice listings, the sale price MUST be in 'Start price'.
            # 'Buy It Now price' is only for Auctions with a BIN option; entering it for FixedPrice triggers Error 307.
            bin_p = clean_price(row.get('Buy It Now price'))
            format_clean = str(row.get('Format', 'FixedPrice')).strip() or 'FixedPrice'

            if format_clean.lower() == 'fixedprice':
                if c_start_price and bin_p is not None:
                    ws.Cells(curr_r, c_start_price).Value = bin_p
                if c_bin_price:
                    ws.Cells(curr_r, c_bin_price).Value = None
            else:
                start_p = clean_price(row.get('Start price'))
                if c_start_price and start_p is not None:
                    ws.Cells(curr_r, c_start_price).Value = start_p
                if c_bin_price and bin_p is not None:
                    ws.Cells(curr_r, c_bin_price).Value = bin_p

            auto_p = clean_price(row.get('Best Offer Auto Accept Price'))
            if c_auto_accept and auto_p is not None: ws.Cells(curr_r, c_auto_accept).Value = auto_p

            min_p = clean_price(row.get('Minimum Best Offer Price'))
            if c_min_offer and min_p is not None: ws.Cells(curr_r, c_min_offer).Value = min_p

            if c_best_offer: ws.Cells(curr_r, c_best_offer).Value = 'TRUE'

            if c_desc: ws.Cells(curr_r, c_desc).Value = row.get('Description', '')

            # Condition
            if c_cond_id: ws.Cells(curr_r, c_cond_id).Value = cond_id_val
            if c_grader and grader_val: ws.Cells(curr_r, c_grader).Value = grader_val
            if c_grade and grade_val: ws.Cells(curr_r, c_grade).Value = grade_val
            if c_cert and cert_num: ws.Cells(curr_r, c_cert).Value = cert_num
            if c_card_cond and card_cond_val: ws.Cells(curr_r, c_card_cond).Value = card_cond_val

            # Business Policies
            if c_ship_profile and default_shipping: ws.Cells(curr_r, c_ship_profile).Value = default_shipping
            if c_ret_profile and default_returns: ws.Cells(curr_r, c_ret_profile).Value = default_returns
            if c_pay_profile and default_payments: ws.Cells(curr_r, c_pay_profile).Value = default_payments
            if c_loc and location: ws.Cells(curr_r, c_loc).Value = location

            # Item Specifics
            if is_non_sport:
                if c_type: ws.Cells(curr_r, c_type).Value = 'Non-Sport Trading Card'
                team_val = str(row.get('Team', '')).strip()
                player_val = str(row.get('Player/Athlete', '')).strip()
                if c_franchise and team_val: ws.Cells(curr_r, c_franchise).Value = team_val
                if c_char and player_val: ws.Cells(curr_r, c_char).Value = player_val
                if c_person and '(' in player_val:
                    actor = player_val.split('(')[0].strip()
                    ws.Cells(curr_r, c_person).Value = actor
            else:
                if c_type: ws.Cells(curr_r, c_type).Value = 'Sports Trading Card'
                if c_sport and sport: ws.Cells(curr_r, c_sport).Value = sport
                if c_player and row.get('Player/Athlete'): ws.Cells(curr_r, c_player).Value = str(row.get('Player/Athlete')).strip()
                if c_team and row.get('Team'): ws.Cells(curr_r, c_team).Value = str(row.get('Team')).strip()
                if c_season and row.get('Season'): ws.Cells(curr_r, c_season).Value = str(row.get('Season')).strip()

            if c_mfg and row.get('Manufacturer'): ws.Cells(curr_r, c_mfg).Value = str(row.get('Manufacturer')).strip()
            if c_set and row.get('Set'): ws.Cells(curr_r, c_set).Value = str(row.get('Set')).strip()
            if c_card_num and row.get('Card Number'): ws.Cells(curr_r, c_card_num).Value = str(row.get('Card Number')).strip()
            if c_card_name and row.get('Card Name'): ws.Cells(curr_r, c_card_name).Value = str(row.get('Card Name')).strip()
            if c_parallel and row.get('Parallel/Variety'): ws.Cells(curr_r, c_parallel).Value = str(row.get('Parallel/Variety')).strip()
            if c_feat and row.get('Features'): ws.Cells(curr_r, c_feat).Value = str(row.get('Features')).strip()

            if c_auto:
                auto_val = str(row.get('Autographed', 'No')).strip().capitalize()
                ws.Cells(curr_r, c_auto).Value = auto_val
                if auto_val == 'Yes' and c_auto_auth:
                    mfg_name = str(row.get('Manufacturer', '')).strip()
                    if mfg_name in ['Topps', 'Panini', 'Leaf', 'Upper Deck', 'Donruss', 'Bowman']:
                        auth = f"{mfg_name} Authentic" if mfg_name == 'Panini' else mfg_name
                        ws.Cells(curr_r, c_auto_auth).Value = auth

            print_run_val = str(row.get('Print Run', '')).strip()
            if print_run_col and print_run_val:
                ws.Cells(curr_r, print_run_col).Value = print_run_val

        # Clear unused formula rows from end_data_row + 1 to the end of the sheet
        clear_start_row = end_data_row + 1
        print(f"Clearing unused template formula rows (from row {clear_start_row} downwards)...")
        ws.Range(ws.Cells(clear_start_row, 1), ws.Cells(ws.Rows.Count, 100)).Clear()

        # Save XLSX
        print(f"Saving pristine Microsoft Excel XLSX to: {abs_output_xlsx}")
        if os.path.exists(abs_output_xlsx):
            os.remove(abs_output_xlsx)
        # 51 = xlOpenXMLWorkbook (.xlsx)
        wb.SaveAs(abs_output_xlsx, 51)
        print("XLSX saved successfully.")

        wb.Close(False)
        excel.Quit()
        print("Excel COM closed.")

        # Also generate CSV directly from the listings
        print(f"Exporting clean upload CSV to: {abs_output_csv}")
        export_csv(abs_output_xlsx, abs_output_csv)
        print(f"CSV exported successfully: {abs_output_csv}")

    except Exception as e:
        print(f"Error during Excel COM processing: {e}")
        try:
            excel.Quit()
        except:
            pass
        raise e
    finally:
        pythoncom.CoUninitialize()


def export_csv(xlsx_path, csv_path):
    """
    Extracts the Listings worksheet from the freshly generated Excel file
    and writes out a perfectly clean eBay CSV file (row 4 headers + data rows).
    """
    import openpyxl
    openpyxl.styles.fonts.Font.family.max = 100
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb['Listings']

    header_row_idx = 4
    max_c = ws.max_column

    # Read headers
    headers = [ws.cell(header_row_idx, c).value for c in range(1, max_c + 1)]
    # Trim trailing empty headers
    while headers and headers[-1] is None:
        headers.pop()
    actual_col_count = len(headers)

    # Collect data rows
    data_rows = []
    for r in range(header_row_idx + 1, ws.max_row + 1):
        action_val = ws.cell(r, 1).value
        sku_val = ws.cell(r, 2).value
        if action_val or sku_val:
            row_vals = [ws.cell(r, c).value for c in range(1, actual_col_count + 1)]
            data_rows.append(row_vals)

    # Write CSV with utf-8-sig (standard for Excel/eBay CSV with international accents)
    with open(csv_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for row in data_rows:
            # Clean string conversions
            clean_row = ["" if v is None else v for v in row]
            writer.writerow(clean_row)

    print(f"Wrote {len(data_rows)} listing rows to {csv_path}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Convert eBay listing CSV to official Category Listing Template XLSX & CSV.")
    parser.add_argument('--csv', default='ebay_upload.csv', help='Source eBay upload CSV file')
    parser.add_argument('--template', default='eBay-category-listing-template.xlsx', help='eBay category listing template XLSX file')
    parser.add_argument('--output-xlsx', default='eBay_Bulk_Upload_Completed.xlsx', help='Output completed XLSX file')
    parser.add_argument('--output-csv', default='eBay_Bulk_Upload_Completed.csv', help='Output completed CSV file')
    parser.add_argument('--shipping', default='Flat: USPSParcel $5.00, 2 business days (255602283020) - (ID: 255602283020)', help='Shipping Policy Name')
    parser.add_argument('--returns', default='Returns - (ID: 255419358020)', help='Return Policy Name')
    parser.add_argument('--payments', default='Payment Policy - (ID: 255419355020)', help='Payment Policy Name')
    parser.add_argument('--location', default='Bethlehem PA', help='Item Location')
    parser.add_argument('--photo-url', default='', help='Default or placeholder photo URL (must start with https:// and end with .jpg/.png)')
    parser.add_argument('--image-dir', default=r'assets\9_6_28_upload', help='Directory containing listing images named by SKU')
    parser.add_argument('--image-base-url', default='https://raw.githubusercontent.com/YinzBreaks/ebay-card-assets/main/assets/9_6_28_upload', help='Public base URL where images are hosted')

    args = parser.parse_args()

    build_template_with_excel_com(
        csv_file=args.csv,
        template_file=args.template,
        output_xlsx=args.output_xlsx,
        output_csv=args.output_csv,
        default_shipping=args.shipping,
        default_returns=args.returns,
        default_payments=args.payments,
        location=args.location,
        default_photo=args.photo_url,
        image_dir=args.image_dir,
        image_base_url=args.image_base_url
    )
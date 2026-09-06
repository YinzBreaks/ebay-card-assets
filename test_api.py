import requests
import os

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("=== Testing CardFlow API Endpoints ===")

    # 1. Test GET /api/cards
    r = requests.get(f"{BASE_URL}/api/cards")
    assert r.status_code == 200, f"GET /api/cards failed: {r.text}"
    cards = r.json()["cards"]
    print(f"1. GET /api/cards: OK -> Loaded {len(cards)} cards.")

    # 2. Test POST /api/challenge
    sample_sku = cards[0]["sku"]
    payload = {
        "sku": sample_sku,
        "feedback": "Rare /25 Pink parallel. High demand rookie.",
        "manual_list_price": 525.00
    }
    r = requests.post(f"{BASE_URL}/api/challenge", json=payload)
    assert r.status_code == 200, f"POST /api/challenge failed: {r.text}"
    updated_card = r.json()["card"]
    assert updated_card["list_price"] == 525.00
    assert updated_card["auto_accept"] == round(525.0 * 0.85, 2)
    assert updated_card["min_offer"] == round(525.0 * 0.75, 2)
    print(f"2. POST /api/challenge: OK -> {sample_sku} updated to ${updated_card['list_price']}, AutoAccept: ${updated_card['auto_accept']}, MinFloor: ${updated_card['min_offer']}.")

    # 3. Test POST /api/approve
    r = requests.post(f"{BASE_URL}/api/approve", json={"skus": [c["sku"] for c in cards]})
    assert r.status_code == 200
    print(f"3. POST /api/approve: OK -> {r.json()['approved_count']} cards approved.")

    # 4. Test POST /api/upload with sample image
    sample_img = os.path.join("assets", "9_6_28_upload", "MUN-GARNACHO-199-PSA10.jpg")
    if os.path.exists(sample_img):
        with open(sample_img, "rb") as f:
            files = {"file": ("dual_sample.jpg", f, "image/jpeg")}
            data = {
                "grader": "PSA",
                "grade": "10",
                "card_title": "2024-25 Panini Select Lamine Yamal Mojo RC",
                "base_price": "350.00"
            }
            r = requests.post(f"{BASE_URL}/api/upload", files=files, data=data)
            assert r.status_code == 200, f"POST /api/upload failed: {r.text}"
            new_card = r.json()["card"]
            print(f"4. POST /api/upload: OK -> Ingested new card: SKU {new_card['sku']}, Cert #{new_card['cert_number']}, BIN: ${new_card['list_price']}.")

    # 5. Test POST /api/export
    r = requests.post(f"{BASE_URL}/api/export", json={})
    assert r.status_code == 200, f"POST /api/export failed: {r.text}"
    export_data = r.json()
    print(f"5. POST /api/export: OK -> Generated eBay template for {export_data['exported_count']} cards, total value: ${export_data['total_value']}.")
    
    csv_file = "eBay_Bulk_Upload_Completed.csv"
    xlsx_file = "eBay_Bulk_Upload_Completed.xlsx"
    assert os.path.exists(csv_file), "CSV not generated"
    assert os.path.exists(xlsx_file), "XLSX not generated"
    print(f"   -> Verified {csv_file} ({os.path.getsize(csv_file)} bytes) & {xlsx_file} ({os.path.getsize(xlsx_file)} bytes).")

    print("\nALL BACKEND API TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    run_tests()

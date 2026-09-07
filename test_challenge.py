import requests

base = 'http://127.0.0.1:8000'

# Test 1: +15% Serial Numbered chip
r1 = requests.post(f'{base}/api/challenge', json={
    'sku': 'DIS-MIGUEL-171-PSA10',
    'feedback': '+15% Serial Numbered / Low Print',
    'base_comp': 100.0
})
c1 = r1.json()['card']
print('Test 1 (+15%):', 'Base:', c1['base_comp'], 'List:', c1['list_price'], 'Auto:', c1['auto_accept'], 'Floor:', c1['min_offer'])
assert c1['base_comp'] == 115.0, f"Expected 115.0, got {c1['base_comp']}"
assert c1['list_price'] == 132.25, f"Expected 132.25, got {c1['list_price']}"

# Test 2: Dollar comp 'comp is $150'
r2 = requests.post(f'{base}/api/challenge', json={
    'sku': 'DIS-MIGUEL-171-PSA10',
    'feedback': 'comp is $150 recent goldin sale'
})
c2 = r2.json()['card']
print('Test 2 ($150 comp):', 'Base:', c2['base_comp'], 'List:', c2['list_price'], 'Auto:', c2['auto_accept'], 'Floor:', c2['min_offer'])
assert c2['base_comp'] == 150.0, f"Expected 150.0, got {c2['base_comp']}"
assert c2['list_price'] == 172.5, f"Expected 172.5, got {c2['list_price']}"

# Test 3: Raw to PSA 10 premium
r3 = requests.post(f'{base}/api/challenge', json={
    'sku': 'DIS-MIGUEL-171-PSA10',
    'feedback': 'Comp was raw, card is PSA 10',
    'base_comp': 100.0
})
c3 = r3.json()['card']
print('Test 3 (Raw to PSA 10):', 'Base:', c3['base_comp'], 'List:', c3['list_price'])
assert c3['base_comp'] == 140.0, f"Expected 140.0, got {c3['base_comp']}"
assert c3['list_price'] == 161.0, f"Expected 161.0, got {c3['list_price']}"

# Test 4: Compound chips +15% and +10%
r4 = requests.post(f'{base}/api/challenge', json={
    'sku': 'DIS-MIGUEL-171-PSA10',
    'feedback': '+15% Serial Numbered • +10% High Demand Star',
    'base_comp': 100.0
})
c4 = r4.json()['card']
print('Test 4 (Compound +25%):', 'Base:', c4['base_comp'], 'List:', c4['list_price'])
assert c4['base_comp'] == 125.0, f"Expected 125.0, got {c4['base_comp']}"
assert c4['list_price'] == 143.75, f"Expected 143.75, got {c4['list_price']}"

# Test 5: Manual Base Comp override
r5 = requests.post(f'{base}/api/challenge', json={
    'sku': 'DIS-MIGUEL-171-PSA10',
    'base_comp': 80.0
})
c5 = r5.json()['card']
print('Test 5 (Manual Base 80):', 'Base:', c5['base_comp'], 'List:', c5['list_price'])
assert c5['base_comp'] == 80.0, f"Expected 80.0, got {c5['base_comp']}"
assert c5['list_price'] == 92.0, f"Expected 92.0, got {c5['list_price']}"

# Test 6: Manual List Price override
r6 = requests.post(f'{base}/api/challenge', json={
    'sku': 'DIS-MIGUEL-171-PSA10',
    'manual_list_price': 200.0
})
c6 = r6.json()['card']
print('Test 6 (Manual List 200):', 'Base:', c6['base_comp'], 'List:', c6['list_price'], 'Auto:', c6['auto_accept'], 'Floor:', c6['min_offer'])
assert c6['list_price'] == 200.0, f"Expected 200.0, got {c6['list_price']}"
assert c6['auto_accept'] == 170.0, f"Expected 170.0, got {c6['auto_accept']}"
assert c6['min_offer'] == 150.0, f"Expected 150.0, got {c6['min_offer']}"

print('ALL CALIBRATION ENGINE TESTS PASSED PERFECTLY!')

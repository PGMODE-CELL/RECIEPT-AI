"""Test PII field-level encryption end-to-end."""
import sys
sys.path.insert(0, '.')
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Register + login
r = client.post('/api/auth/register', json={'email':'enc2@test.com','password':'test1234','full_name':'Enc Test'})
if r.status_code == 400:
    # already registered, login instead
    r = client.post('/api/auth/login', json={'email':'enc2@test.com','password':'test1234'})
token = r.json()['token']
headers = {'Authorization': f'Bearer {token}'}

# Create org
r = client.post('/api/setup/create', json={'name':'EncryptCo','country':'US','tax_id':'12-3456789'}, headers=headers)
assert r.status_code == 200, r.text
org_id = r.json()['org_id']
print(f'Org created: {org_id}')

# Create contact with PII
r = client.post(f'/api/contacts/{org_id}',
    data={'name':'Alice','email':'alice@example.com','phone':'555-1234','type':'customer'},
    headers=headers)
print(f'Create contact: {r.status_code} email={r.json().get("email")} phone={r.json().get("phone")}')

# Verify DB has encrypted values
from app.database import SessionLocal
from app.models.contact import Contact
db = SessionLocal()
c = db.query(Contact).filter(Contact.name == 'Alice').first()
print(f'  DB raw email: {c.email!r}')
print(f'  DB raw phone: {c.phone!r}')
assert c.email != 'alice@example.com', 'email is not encrypted!'
assert c.phone != '555-1234', 'phone is not encrypted!'
print('  PASS: Fields are encrypted in DB')

# Verify API returns decrypted values
r = client.get(f'/api/contacts/{org_id}', headers=headers)
items = r.json()['items']
email = items[0]['email']
phone = items[0]['phone']
print(f'  Decrypted email: {email} phone: {phone}')
assert email == 'alice@example.com', f'email not decrypted: {email}'
assert phone == '555-1234', f'phone not decrypted: {phone}'
print('  PASS: Fields are decrypted on read')

# Test employee PII encryption
r = client.post(f'/api/payroll/{org_id}/employees',
    data={'name':'Bob','email':'bob@co.com','phone':'999-8888','pan':'ABCDE1234F',
          'bank_account':'123456789','ifsc':'HDFC0001234','department':'Eng','designation':'Dev'},
    headers=headers)
print(f'Create employee: {r.status_code} {r.json()}')

from app.models.payroll import Employee
e = db.query(Employee).filter(Employee.name == 'Bob').first()
print(f'  DB raw email: {e.email!r}')
print(f'  DB raw pan: {e.pan!r}')
assert e.email != 'bob@co.com', 'employee email not encrypted'
assert e.pan != 'ABCDE1234F', 'pan not encrypted'
print('  PASS: Employee fields encrypted in DB')

r = client.get(f'/api/payroll/{org_id}/employees', headers=headers)
emp = r.json()[0]
print(f'  Decrypted email: {emp["email"]} pan: {emp["pan"]}')
assert emp['email'] == 'bob@co.com', 'employee email not decrypted'
assert emp['pan'] == 'ABCDE1234F', 'pan not decrypted'

db.close()
print('\nALL PASSED')

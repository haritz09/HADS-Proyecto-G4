import requests

BASE_URL = "http://localhost:8000/api/auth"

# Datos de prueba
username = "testuser123"
email = "testuser123@example.com"
password = "testpassword123"

print("1. Registrando usuario...")
resp = requests.post(f"{BASE_URL}/register", json={
    "username": username,
    "email": email,
    "password": password
})
print("Status:", resp.status_code)
print("Response:", resp.json())

print("\n2. Login...")
resp = requests.post(f"{BASE_URL}/login", data={
    "username": username,
    "password": password
})
print("Status:", resp.status_code)
print("Response:", resp.json())
token = resp.json().get("access_token")

headers = {"Authorization": f"Bearer {token}"}

print("\n3. Obtener perfil...")
resp = requests.get(f"{BASE_URL}/profile", headers=headers)
print("Status:", resp.status_code)
print("Response:", resp.json())

print("\n4. Actualizar email...")
new_email = "testuser123_updated@example.com"
resp = requests.put(f"{BASE_URL}/profile", json={"email": new_email}, headers=headers)
print("Status:", resp.status_code)
print("Response:", resp.json())

# Opcional: restaurar email original
def cleanup():
    requests.put(f"{BASE_URL}/profile", json={"email": email}, headers=headers)

# cleanup()  # Descomenta si quieres restaurar el email original

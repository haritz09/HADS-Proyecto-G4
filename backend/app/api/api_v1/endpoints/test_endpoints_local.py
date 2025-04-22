from backend.app.db.crud import create_user, get_user, update_user, get_user_by_username, get_user_by_email
from backend.app.db.mongodb import connect_to_mongo, disconnect_from_mongo
from backend.app.api.api_v1.endpoints.auth import get_password_hash, verify_password, create_access_token
from datetime import datetime

if __name__ == "__main__":
    try:
        connect_to_mongo()
        print("Conexión exitosa a la base de datos.")
    except Exception as e:
        print(f"Error al conectar a la base de datos: {e}")
        exit(1)

    try:
        print("\n--- Test de endpoints de usuario (sin Docker, solo Python) ---")
        username = "testuser_local"
        email = "testuser_local@example.com"
        password = "testpassword_local"

        # Registro
        print("1. Registro de usuario...")
        if get_user_by_username(username) or get_user_by_email(email):
            print("Usuario de prueba ya existe, se usará el existente.")
            user = get_user_by_username(username)
        else:
            hashed_password = get_password_hash(password)
            user_data = {
                "username": username,
                "email": email,
                "password_hash": hashed_password,
                "created_at": datetime.utcnow(),
                "last_login": None
            }
            user_id = create_user(user_data)
            user = get_user(user_id)
            print(f"Usuario creado: {user}")

        # Login
        print("\n2. Login...")
        user_login = get_user_by_username(username)
        if user_login and verify_password(password, user_login["password_hash"]):
            print("Login correcto.")
            access_token = create_access_token({"sub": str(user_login["_id"])})
            print(f"Token: {access_token}")
        else:
            print("Login fallido.")
            exit(1)

        # Obtener perfil
        print("\n3. Obtener perfil...")
        user_profile = get_user(user_login["_id"])
        print(f"Perfil: {user_profile}")

        # Actualizar perfil
        print("\n4. Actualizar email...")
        new_email = "testuser_local_updated@example.com"
        update_user(str(user_login["_id"]), {"email": new_email})
        updated_user = get_user(user_login["_id"])
        print(f"Perfil actualizado: {updated_user}")

        # Restaurar email original (opcional)
        update_user(str(user_login["_id"]), {"email": email})

        print("\nTest de endpoints completado correctamente.")
    except Exception as e:
        print(f"Error durante el test: {e}")
    finally:
        disconnect_from_mongo()
        print("Desconexión de la base de datos completada.")

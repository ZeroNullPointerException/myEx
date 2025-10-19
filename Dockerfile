# Utiliser une image de base Python légère
FROM python:3.10-slim

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les dépendances et les installer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code source de l'application et du template
COPY server.py .
COPY templates templates/
COPY static static/
# Exposer le port sur lequel Gunicorn va tourner
EXPOSE 5000

# Commande de lancement avec Gunicorn.
# Le serveur.py attend BASE_DIR en argument, que nous passerons via Docker Compose.
# Ici, nous utilisons le répertoire /data du conteneur pour stocker les fichiers gérés.
# Le module de l'application est 'serveur:app'.
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "serveur:app", "/data"]

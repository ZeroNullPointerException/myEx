import os
import sys
import shutil
import mimetypes
import json # Ajout pour l'affichage des fichiers JSON
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, render_template, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from markupsafe import escape # Utile pour échapper le contenu HTML

# --- CONFIGURATION ---

app = Flask(__name__, template_folder='templates')

# Configuration du répertoire de base
BASE_DIR = os.environ.get('FLASK_BASE_DIR', '/data')

# Assurez-vous d'utiliser le chemin absolu final
BASE_DIR = os.path.abspath(BASE_DIR)

# Vérifier que le répertoire existe (gardez cette vérification)
if not os.path.exists(BASE_DIR):
    print(f"ATTENTION: Le répertoire '{BASE_DIR}' n'existe pas. Il devrait être créé par Docker.")

if not os.path.isdir(BASE_DIR):
    print(f"ERREUR: '{BASE_DIR}' n'est pas un répertoire!")
    sys.exit(1)

# Activer CORS pour le frontend (si nécessaire, mais moins critique en développement local)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Extensions de fichiers autorisées pour le téléversement
ALLOWED_EXTENSIONS = {
    'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp',
    'zip', 'rar', '7z', 'tar', 'gz',
    'mp4', 'mov', 'avi', 'mkv',
    'mp3', 'wav', 'flac',
    'html', 'css', 'js', 'py', 'json', 'xml', 'log' # Ajout de .log
}

def secure_path_join(*paths):
    """
    Joint les chemins de manière sécurisée et vérifie qu'ils restent
    dans le répertoire de base (BASE_DIR).
    Retourne le chemin complet ou None si la vérification échoue.
    """
    # Créer le chemin absolu
    full_path = os.path.abspath(os.path.join(*paths))
    
    # Normaliser BASE_DIR pour une comparaison stricte
    normalized_base_dir = os.path.normpath(BASE_DIR)
    normalized_full_path = os.path.normpath(full_path)

    # Vérification anti-traversée de répertoire
    if not normalized_full_path.startswith(normalized_base_dir):
        return None
    
    return full_path

# --- ROUTES PRINCIPALES ---

@app.route('/')
def index():
    """Route pour servir la page HTML principale."""
    return render_template('index.html')

# --- API DE GESTION DE FICHIERS ---

@app.route('/api/list', methods=['GET'])
def api_list():
    """Liste les fichiers et dossiers du chemin spécifié."""
    # Le chemin vient du paramètre de requête 'path' et est toujours absolu (commence par /)
    client_path = request.args.get('path', '/')

    # Le chemin relatif pour l'OS (vide si c'est la racine '/')
    relative_path = client_path.strip('/')

    target_dir = secure_path_join(BASE_DIR, relative_path)

    if target_dir is None:
        return jsonify({"error": "Chemin d'accès invalide ou non autorisé."}), 400

    if not os.path.isdir(target_dir):
        return jsonify({"error": "Le chemin spécifié n'est pas un répertoire."}), 404

    try:
        files = []
        for name in os.listdir(target_dir):
            if name.startswith('.'):
                continue # Ignorer les fichiers cachés

            full_path = os.path.join(target_dir, name)
            stat = os.stat(full_path)

            is_folder = os.path.isdir(full_path)

            # Déterminer le MIME type pour les fichiers
            mime_type = mimetypes.guess_type(full_path)[0] or 'application/octet-stream'

            # Le chemin relatif complet doit être correctement construit et normalisé pour le frontend
            full_relative_path = os.path.join(relative_path, name).replace('\\', '/') if relative_path else name

            files.append({
                "name": name,
                "is_folder": is_folder,
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "mime_type": mime_type,
                "full_relative_path": full_relative_path # Chemin relatif complet pour les actions futures
            })

        # Trier: dossiers en premier, puis par nom
        files.sort(key=lambda f: (not f['is_folder'], f['name'].lower()))

        return jsonify({
            "current_path": client_path,
            "files": files,
            "is_search_result": False # Ajout d'un indicateur pour le frontend
        })

    except Exception as e:
        print(f"Erreur lors de la liste des fichiers: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['GET'])
def api_search():
    """Effectue une recherche récursive de fichiers et dossiers par nom."""
    query = request.args.get('query', '').strip()
    
    if not query:
        return jsonify({"files": [], "current_path": "/", "is_search_result": True}), 200

    results = []
    
    # Parcourir récursivement le BASE_DIR
    for root, dirs, files in os.walk(BASE_DIR):
        # Créer le chemin relatif du répertoire courant (root) par rapport à BASE_DIR
        relative_root = os.path.relpath(root, BASE_DIR).replace('\\', '/')
        if relative_root == '.':
            relative_root = '' # La racine a un chemin relatif vide

        # Recherche dans les noms de dossiers
        for dir_name in dirs:
            if query.lower() in dir_name.lower():
                full_path = os.path.join(root, dir_name)
                stat = os.stat(full_path)
                
                # Le chemin relatif complet est la combinaison du chemin relatif et du nom du dossier
                full_relative_path = os.path.join(relative_root, dir_name).replace('\\', '/')
                
                results.append({
                    "name": dir_name,
                    "is_folder": True,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "mime_type": "folder",
                    "full_relative_path": full_relative_path
                })
        
        # Recherche dans les noms de fichiers
        for file_name in files:
            if query.lower() in file_name.lower():
                full_path = os.path.join(root, file_name)
                stat = os.stat(full_path)
                is_folder = os.path.isdir(full_path)
                mime_type = mimetypes.guess_type(full_path)[0] or 'application/octet-stream'
                
                # Le chemin relatif complet est la combinaison du chemin relatif et du nom du fichier
                full_relative_path = os.path.join(relative_root, file_name).replace('\\', '/')
                
                results.append({
                    "name": file_name,
                    "is_folder": is_folder,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "mime_type": mime_type,
                    "full_relative_path": full_relative_path
                })
                
    # Trier les résultats: dossiers en premier, puis par chemin complet
    results.sort(key=lambda f: (not f['is_folder'], f['full_relative_path'].lower()))

    return jsonify({
        "current_path": f"Recherche: '{query}'",
        "files": results,
        "is_search_result": True # Indicateur de résultat de recherche
    })


@app.route('/api/create_folder', methods=['POST'])
def api_create_folder():
    """Crée un nouveau dossier."""
    data = request.json
    parent_path = data.get('parent_path', '/')
    folder_name = data.get('folder_name')

    if not folder_name:
        return jsonify({"error": "Nom de dossier manquant."}), 400

    # Créer le chemin complet à partir du chemin parent (relatif) et du nouveau nom
    relative_parent_path = parent_path.strip('/')
    new_folder_relative = os.path.join(relative_parent_path, secure_filename(folder_name))

    target_dir = secure_path_join(BASE_DIR, new_folder_relative)

    if target_dir is None:
        return jsonify({"error": "Chemin de création en dehors du répertoire géré."}), 400

    try:
        # Tenter la création, fail si le dossier existe déjà (exist_ok=False)
        os.makedirs(target_dir, exist_ok=False)
        return jsonify({"message": f"Dossier '{folder_name}' créé avec succès."}), 201
    except FileExistsError:
        return jsonify({"error": f"Le dossier '{folder_name}' existe déjà."}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/upload', methods=['POST'])
def api_upload():
    """Gère le téléversement de fichiers."""
    if 'file' not in request.files:
        return jsonify({"error": "Aucun fichier dans la requête."}), 400

    file = request.files['file']
    destination_path = request.form.get('path', '/') # Le chemin d'upload est relatif au BASE_DIR

    if file.filename == '':
        return jsonify({"error": "Aucun fichier sélectionné."}), 400

    filename = secure_filename(file.filename)
    if not '.' in filename or filename.rsplit('.', 1)[1].lower() not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "Type de fichier non autorisé."}), 400

    # Créer le chemin de destination
    relative_path = destination_path.strip('/')
    target_dir = secure_path_join(BASE_DIR, relative_path)

    if target_dir is None:
        return jsonify({"error": "Chemin de téléversement en dehors du répertoire géré."}), 400

    try:
        if not os.path.exists(target_dir):
            os.makedirs(target_dir) # Créer le dossier s'il n'existe pas

        save_path = os.path.join(target_dir, filename)
        file.save(save_path)

        return jsonify({"message": f"Fichier '{filename}' téléversé avec succès dans /{relative_path}."}), 201
    except Exception as e:
        print(f"Erreur lors du téléversement: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/delete', methods=['DELETE'])
def api_delete():
    """Supprime un fichier ou un dossier."""
    data = request.json
    # 'path' est le chemin RELATIF à BASE_DIR, sans slash initial (e.g. 'dossier/fichier.txt')
    relative_path = data.get('path')

    if not relative_path:
        return jsonify({"error": "Chemin de suppression manquant."}), 400

    # Le chemin complet à supprimer doit passer par la vérification de sécurité
    full_path_to_delete = secure_path_join(BASE_DIR, relative_path)

    if full_path_to_delete is None:
        return jsonify({"error": "Chemin de suppression en dehors du répertoire géré."}), 400

    try:
        if not os.path.exists(full_path_to_delete):
            return jsonify({"error": "Fichier ou dossier non trouvé."}), 404

        if os.path.isdir(full_path_to_delete):
            # Suppression récursive pour les dossiers
            shutil.rmtree(full_path_to_delete)
            item_type = "Dossier"
        else:
            # Suppression simple pour les fichiers
            os.remove(full_path_to_delete)
            item_type = "Fichier"
            
        return jsonify({"message": f"{item_type} '{relative_path}' supprimé avec succès."}), 200
    except OSError as e:
        print(f"Erreur d'OS lors de la suppression: {e}")
        return jsonify({"error": f"Erreur de permission ou de système: {e}"}), 500
    except Exception as e:
        print(f"Erreur lors de la suppression: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/download', methods=['GET'])
def api_download():
    """Sert un fichier pour téléchargement."""
    # Le chemin est le chemin relatif complet à partir de BASE_DIR (e.g. 'dossier/fichier.txt')
    relative_path = request.args.get('path')

    if not relative_path or relative_path.endswith('/'):
        return jsonify({"error": "Requête de téléchargement invalide (le chemin doit être un fichier). "}), 400

    # Utiliser os.path.split pour séparer le répertoire et le nom de fichier
    directory = os.path.dirname(relative_path)
    filename = os.path.basename(relative_path)

    # Répertoire complet pour send_from_directory, sécurisé
    full_directory = secure_path_join(BASE_DIR, directory)

    if full_directory is None:
        return jsonify({"error": "Chemin de téléchargement en dehors du répertoire géré."}), 400

    try:
        # send_from_directory est idéal pour les téléchargements, as_attachment=True force le téléchargement
        return send_from_directory(full_directory, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "Fichier non trouvé."}), 404
    except Exception as e:
        print(f"Erreur lors du téléchargement: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/view', methods=['GET'])
def api_view():
    """Renvoie un fichier pour qu'il soit visualisé directement dans le navigateur (pour image/texte/flux vidéo)."""
    # Le chemin est le chemin relatif complet à partir de BASE_DIR (e.g. 'dossier/fichier.txt')
    relative_path = request.args.get('path')

    if not relative_path or relative_path.endswith('/'):
        return jsonify({"error": "Requête de visualisation invalide (le chemin doit être un fichier). "}), 400

    # Chemin absolu complet du fichier
    full_path_to_file = secure_path_join(BASE_DIR, relative_path)

    if full_path_to_file is None:
        return jsonify({"error": "Chemin de visualisation en dehors du répertoire géré."}), 400

    if not os.path.exists(full_path_to_file) or os.path.isdir(full_path_to_file):
        return jsonify({"error": "Fichier non trouvé."}), 404

    try:
        # Tenter de deviner le type MIME pour le streaming
        mime_type = mimetypes.guess_type(full_path_to_file)[0] or 'application/octet-stream'

        if mime_type.startswith('text/') or mime_type == 'application/json' or relative_path.endswith(('.py', '.js', '.html', '.css', '.log', '.xml')):
            # Pour les fichiers texte/code/json, utiliser la route text_viewer
            # C'est géré par l'appel Flask à la route text_viewer ou player
            return app.send_static_file('viewer_redirect.html')
        elif mime_type.startswith(('image/', 'video/', 'audio/')):
            # Pour les fichiers multimédias, renvoyer directement le fichier
            # as_attachment=False permet au navigateur d'afficher le contenu
            return send_file(full_path_to_file, mimetype=mime_type, as_attachment=False)
        else:
            # Pour tous les autres types (PDF, Office, etc.), cela revient à un téléchargement (ce qui est géré par le JS)
            # Pour le serveur, on renvoie une réponse par défaut (ou un téléchargement forcé si le front n'a pas basculé)
            return send_file(full_path_to_file, mimetype=mime_type, as_attachment=False)

    except Exception as e:
        print(f"Erreur lors de la visualisation: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/text_viewer', methods=['GET'])
def text_viewer():
    """Affiche un fichier texte ou code dans une page HTML formatée."""
    relative_path = request.args.get('path')
    if not relative_path:
        return "Chemin de fichier manquant.", 400

    full_path_to_file = secure_path_join(BASE_DIR, relative_path)

    if full_path_to_file is None or not os.path.exists(full_path_to_file):
        return "Fichier non trouvé.", 404

    try:
        with open(full_path_to_file, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        filename = os.path.basename(relative_path)
        html_content = format_code_html(filename, content)
        return html_content, 200
    except Exception as e:
        return f"Erreur de lecture du fichier: {e}", 500

@app.route('/api/player', methods=['GET'])
def media_player():
    """Affiche un lecteur pour les fichiers vidéo/audio."""
    relative_path = request.args.get('path')
    if not relative_path:
        return "Chemin de fichier manquant.", 400

    # Nous faisons confiance au front pour n'appeler ceci que pour les médias
    mime_type = mimetypes.guess_type(relative_path)[0] or 'application/octet-stream'
    
    if not mime_type.startswith(('video/', 'audio/')):
        return "Type de média non supporté par ce lecteur.", 400

    tag = 'video' if mime_type.startswith('video/') else 'audio'
    
    # L'URL utilisée dans la balise <source> sera la route /api/view pour le streaming
    media_url = f"/api/view?path={relative_path}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lecteur Média: {os.path.basename(relative_path)}</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-900 min-h-screen flex flex-col items-center justify-center p-4">
        <h1 class="text-xl font-bold text-white mb-6 text-center">{os.path.basename(relative_path)}</h1>
        <{tag} controls class="w-full max-w-4xl shadow-2xl rounded-lg overflow-hidden" {"autoplay" if tag == 'video' else ""}>
            <source src="{media_url}" type="{mime_type}">
            Votre navigateur ne supporte pas la balise {tag}.
        </{tag}>
        <a href="/api/download?path={relative_path}" class="mt-6 text-blue-400 hover:text-blue-200 transition duration-150">
            Télécharger le fichier
        </a>
    </body>
    </html>
    """
    return html_content

def format_code_html(filename, content):
    """
    Formate le contenu texte/code avec numérotation des lignes pour l'affichage.
    """
    # Échapper le contenu HTML du fichier
    safe_content = escape(content)
    
    # Diviser par ligne et ajouter les numéros de ligne
    lines = safe_content.split('\n')
    formatted_lines = ""
    for i, line in enumerate(lines, 1):
        formatted_lines += f"""
            <div class="code-line">
                <span class="line-number">{i}</span>
                <span class="line-content">{line}</span>
            </div>
        """

    # Retirer les espaces et sauts de ligne inutiles
    formatted_content = formatted_lines.strip()

    html_content = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Visualiseur de Texte: {filename}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body {{
                margin: 0;
                padding: 0;
                background-color: #f8fafc; /* bg-slate-50 */
            }}
            h1 {{
                padding: 20px;
                background-color: #ffffff;
                border-bottom: 1px solid #e2e8f0;
                font-size: 1.5rem;
                color: #1e293b;
            }}
            .code-container {{
                padding: 20px;
                margin: 20px;
                background-color: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
                overflow-x: auto;
            }}
            .code-content {{
                white-space: pre; /* Maintient les espaces et les sauts de ligne */
                font-family: 'Consolas', 'Courier New', monospace;
                font-size: 0.9em;
            }}
            .code-line {{
                display: flex;
                line-height: 1.5;
            }}
            .line-number {{
                color: #94a3b8; /* Gris pour les numéros */
                padding-right: 15px;
                user-select: none; /* Empêche la sélection des numéros de ligne */
                text-align: right;
                flex-shrink: 0; /* Empêche la compression des numéros de ligne */
            }}
            .code-line:nth-child(even) {{ background-color: #f1f5f9; }} /* Alternance de couleur pour la lecture */
        </style>
    </head>
    <body>
        <h1>{filename}</h1>
        <div class="code-container">
            <div class="code-content">
                {formatted_content}
            </div>
        </div>
    </body>
    </html>
    """
    return html_content

if __name__ == '__main__':
    print("\n" + "="*60)
    print("        SERVEUR DE GESTION DE FICHIERS")
    print("="*60)
    print(f"📁 Répertoire géré (BASE_DIR): {BASE_DIR}")
    print(f"🌐 Lancement de l'application Flask...")
    # Le mode debug doit être désactivé en production
    app.run(host='0.0.0.0', port=5000, debug=True)

import os
import sys
import shutil
import mimetypes
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, render_template, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from markupsafe import escape

# --- CONFIGURATION ---

app = Flask(__name__, template_folder='templates')

BASE_DIR = os.environ.get('FLASK_BASE_DIR', '/data')
BASE_DIR = os.path.abspath(BASE_DIR)

if not os.path.exists(BASE_DIR):
    print(f"ATTENTION: Le répertoire '{BASE_DIR}' n'existe pas. Il devrait être créé par Docker.")

if not os.path.isdir(BASE_DIR):
    print(f"ERREUR: '{BASE_DIR}' n'est pas un répertoire!")
    sys.exit(1)

CORS(app, resources={r"/api/*": {"origins": "*"}})

# Pas de restriction sur les extensions de fichiers
ALLOWED_EXTENSIONS = None  # Toutes les extensions sont autorisées

def secure_path_join(*paths):
    """Joint les chemins de manière sécurisée et vérifie qu'ils restent dans BASE_DIR."""
    full_path = os.path.abspath(os.path.join(*paths))
    normalized_base_dir = os.path.normpath(BASE_DIR)
    normalized_full_path = os.path.normpath(full_path)

    if not normalized_full_path.startswith(normalized_base_dir):
        return None
    
    return full_path
@app.route('/test')
def test():
    """Page de test des modules JavaScript"""
    return render_template('test.html')
# --- ROUTES PRINCIPALES ---

@app.route('/')
def index():
    """Route pour servir la page HTML principale."""
    return render_template('index.html')

# --- API DE GESTION DE FICHIERS ---

@app.route('/api/list', methods=['GET'])
def api_list():
    """Liste les fichiers et dossiers du chemin spécifié."""
    client_path = request.args.get('path', '/')
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
                continue

            full_path = os.path.join(target_dir, name)
            stat = os.stat(full_path)

            is_folder = os.path.isdir(full_path)
            mime_type = mimetypes.guess_type(full_path)[0] or 'application/octet-stream'
            full_relative_path = os.path.join(relative_path, name).replace('\\', '/') if relative_path else name

            files.append({
                "name": name,
                "is_folder": is_folder,
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "mime_type": mime_type,
                "full_relative_path": full_relative_path
            })

        files.sort(key=lambda f: (not f['is_folder'], f['name'].lower()))

        return jsonify({
            "current_path": client_path,
            "files": files,
            "is_search_result": False
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
    
    for root, dirs, files in os.walk(BASE_DIR):
        relative_root = os.path.relpath(root, BASE_DIR).replace('\\', '/')
        if relative_root == '.':
            relative_root = ''

        for dir_name in dirs:
            if query.lower() in dir_name.lower():
                full_path = os.path.join(root, dir_name)
                stat = os.stat(full_path)
                full_relative_path = os.path.join(relative_root, dir_name).replace('\\', '/')
                
                results.append({
                    "name": dir_name,
                    "is_folder": True,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "mime_type": "folder",
                    "full_relative_path": full_relative_path
                })
        
        for file_name in files:
            if query.lower() in file_name.lower():
                full_path = os.path.join(root, file_name)
                stat = os.stat(full_path)
                is_folder = os.path.isdir(full_path)
                mime_type = mimetypes.guess_type(full_path)[0] or 'application/octet-stream'
                full_relative_path = os.path.join(relative_root, file_name).replace('\\', '/')
                
                results.append({
                    "name": file_name,
                    "is_folder": is_folder,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "mime_type": mime_type,
                    "full_relative_path": full_relative_path
                })
                
    results.sort(key=lambda f: (not f['is_folder'], f['full_relative_path'].lower()))

    return jsonify({
        "current_path": f"Recherche: '{query}'",
        "files": results,
        "is_search_result": True
    })

@app.route('/api/create_folder', methods=['POST'])
def api_create_folder():
    """Crée un nouveau dossier."""
    data = request.json
    parent_path = data.get('parent_path', '/')
    folder_name = data.get('folder_name')

    if not folder_name:
        return jsonify({"error": "Nom de dossier manquant."}), 400

    relative_parent_path = parent_path.strip('/')
    new_folder_relative = os.path.join(relative_parent_path, secure_filename(folder_name))

    target_dir = secure_path_join(BASE_DIR, new_folder_relative)

    if target_dir is None:
        return jsonify({"error": "Chemin de création en dehors du répertoire géré."}), 400

    try:
        os.makedirs(target_dir, exist_ok=False)
        return jsonify({"message": f"Dossier '{folder_name}' créé avec succès."}), 201
    except FileExistsError:
        return jsonify({"error": f"Le dossier '{folder_name}' existe déjà."}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def api_upload():
    """Gère le téléversement de fichiers et de dossiers complets."""
    if 'files' not in request.files:
        return jsonify({"error": "Aucun fichier dans la requête."}), 400

    files = request.files.getlist('files')
    paths = request.form.getlist('paths')  # Chemins relatifs pour la structure de dossiers
    destination_path = request.form.get('path', '/')

    if not files:
        return jsonify({"error": "Aucun fichier sélectionné."}), 400

    relative_path = destination_path.strip('/')
    target_dir = secure_path_join(BASE_DIR, relative_path)

    if target_dir is None:
        return jsonify({"error": "Chemin de téléversement en dehors du répertoire géré."}), 400

    uploaded_count = 0
    errors = []

    try:
        for i, file in enumerate(files):
            if file.filename == '':
                continue

            # Vérifier si on a un chemin relatif (upload de dossier)
            if paths and i < len(paths) and paths[i]:
                # Mode dossier : préserver la structure
                relative_file_path = paths[i]
                file_dir = os.path.dirname(relative_file_path)
                filename = os.path.basename(relative_file_path)
                
                # Créer la structure de dossiers
                full_dir = secure_path_join(target_dir, file_dir)
                
                if full_dir is None:
                    errors.append(f"Chemin invalide pour {relative_file_path}")
                    continue
                
                if not os.path.exists(full_dir):
                    os.makedirs(full_dir)
                
                save_path = os.path.join(full_dir, secure_filename(filename))
            else:
                # Mode fichiers simples : tout dans le même dossier
                filename = secure_filename(file.filename)
                
                # Accepter tous les types de fichiers (pas de vérification d'extension)
                
                if not os.path.exists(target_dir):
                    os.makedirs(target_dir)
                
                save_path = os.path.join(target_dir, filename)
            
            # Sauvegarder le fichier
            try:
                file.save(save_path)
                uploaded_count += 1
            except Exception as e:
                errors.append(f"Erreur avec {filename}: {str(e)}")

        # Préparer le message de réponse
        if uploaded_count > 0:
            message = f"{uploaded_count} fichier(s) téléversé(s) avec succès"
            if errors:
                message += f" ({len(errors)} erreur(s))"
            return jsonify({"message": message, "errors": errors if errors else None}), 201
        else:
            return jsonify({"error": "Aucun fichier n'a pu être téléversé.", "errors": errors}), 400

    except Exception as e:
        print(f"Erreur lors du téléversement: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/delete', methods=['DELETE'])
def api_delete():
    """Supprime un fichier ou un dossier."""
    data = request.json
    relative_path = data.get('path')

    if not relative_path:
        return jsonify({"error": "Chemin de suppression manquant."}), 400

    full_path_to_delete = secure_path_join(BASE_DIR, relative_path)

    if full_path_to_delete is None:
        return jsonify({"error": "Chemin de suppression en dehors du répertoire géré."}), 400

    try:
        if not os.path.exists(full_path_to_delete):
            return jsonify({"error": "Fichier ou dossier non trouvé."}), 404

        if os.path.isdir(full_path_to_delete):
            shutil.rmtree(full_path_to_delete)
            item_type = "Dossier"
        else:
            os.remove(full_path_to_delete)
            item_type = "Fichier"
            
        return jsonify({"message": f"{item_type} '{relative_path}' supprimé avec succès."}), 200
    except OSError as e:
        print(f"Erreur d'OS lors de la suppression: {e}")
        return jsonify({"error": f"Erreur de permission ou de système: {e}"}), 500
    except Exception as e:
        print(f"Erreur lors de la suppression: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/rename', methods=['POST'])
def api_rename():
    """Renomme un fichier ou un dossier."""
    data = request.json
    old_path = data.get('old_path')
    new_name = data.get('new_name')

    if not old_path or not new_name:
        return jsonify({"error": "Chemin ou nouveau nom manquant."}), 400

    new_name = secure_filename(new_name)
    if not new_name:
        return jsonify({"error": "Nouveau nom invalide."}), 400

    full_old_path = secure_path_join(BASE_DIR, old_path)
    
    if full_old_path is None:
        return jsonify({"error": "Chemin source en dehors du répertoire géré."}), 400

    parent_dir = os.path.dirname(full_old_path)
    full_new_path = os.path.join(parent_dir, new_name)

    if not full_new_path.startswith(os.path.normpath(BASE_DIR)):
        return jsonify({"error": "Nouveau chemin en dehors du répertoire géré."}), 400

    try:
        if not os.path.exists(full_old_path):
            return jsonify({"error": "Fichier ou dossier non trouvé."}), 404

        if os.path.exists(full_new_path):
            return jsonify({"error": f"Un fichier ou dossier nommé '{new_name}' existe déjà."}), 409

        os.rename(full_old_path, full_new_path)
        
        item_type = "Dossier" if os.path.isdir(full_new_path) else "Fichier"
        return jsonify({"message": f"{item_type} renommé en '{new_name}' avec succès."}), 200
        
    except OSError as e:
        print(f"Erreur d'OS lors du renommage: {e}")
        return jsonify({"error": f"Erreur de permission ou de système: {e}"}), 500
    except Exception as e:
        print(f"Erreur lors du renommage: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/download', methods=['GET'])
def api_download():
    """Sert un fichier pour téléchargement."""
    relative_path = request.args.get('path')

    if not relative_path or relative_path.endswith('/'):
        return jsonify({"error": "Requête de téléchargement invalide (le chemin doit être un fichier)."}), 400

    directory = os.path.dirname(relative_path)
    filename = os.path.basename(relative_path)

    full_directory = secure_path_join(BASE_DIR, directory)

    if full_directory is None:
        return jsonify({"error": "Chemin de téléchargement en dehors du répertoire géré."}), 400

    try:
        return send_from_directory(full_directory, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "Fichier non trouvé."}), 404
    except Exception as e:
        print(f"Erreur lors du téléchargement: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/view', methods=['GET'])
def api_view():
    """Renvoie un fichier pour qu'il soit visualisé directement dans le navigateur."""
    relative_path = request.args.get('path')

    if not relative_path or relative_path.endswith('/'):
        return jsonify({"error": "Requête de visualisation invalide (le chemin doit être un fichier)."}), 400

    full_path_to_file = secure_path_join(BASE_DIR, relative_path)

    if full_path_to_file is None:
        return jsonify({"error": "Chemin de visualisation en dehors du répertoire géré."}), 400

    if not os.path.exists(full_path_to_file) or os.path.isdir(full_path_to_file):
        return jsonify({"error": "Fichier non trouvé."}), 404

    try:
        mime_type = mimetypes.guess_type(full_path_to_file)[0] or 'application/octet-stream'
        
        if mime_type.startswith('text/') or mime_type == 'application/json' or relative_path.endswith(('.py', '.js', '.html', '.css', '.log', '.xml', '.md', '.yml', '.yaml', '.sh', '.bat')):
            mime_type = 'text/plain; charset=utf-8'
        
        return send_file(full_path_to_file, mimetype=mime_type, as_attachment=False)

    except Exception as e:
        print(f"Erreur lors de la visualisation: {e}")
        return jsonify({"error": str(e)}), 500
        

@app.route('/api/move', methods=['POST'])
def api_move():
    """Déplace un fichier ou un dossier vers un nouveau dossier."""
    data = request.json
    source_path = data.get('source_path')
    destination_folder = data.get('destination_folder')

    if not source_path or destination_folder is None:
        return jsonify({"error": "Chemin source ou dossier de destination manquant."}), 400

    # Vérification des chemins
    full_source_path = secure_path_join(BASE_DIR, source_path)
    full_destination_folder = secure_path_join(BASE_DIR, destination_folder.strip('/'))
    
    if full_source_path is None or full_destination_folder is None:
        return jsonify({"error": "Chemin source ou destination en dehors du répertoire géré."}), 400

    # Vérifier que la source existe
    if not os.path.exists(full_source_path):
        return jsonify({"error": "Fichier ou dossier source non trouvé."}), 404

    # Vérifier que la destination est un dossier
    if not os.path.isdir(full_destination_folder):
        return jsonify({"error": "La destination doit être un dossier existant."}), 400

    # Construire le chemin de destination complet
    item_name = os.path.basename(full_source_path)
    full_destination_path = os.path.join(full_destination_folder, item_name)

    # Vérifier qu'on ne déplace pas dans le même dossier
    if os.path.dirname(full_source_path) == full_destination_folder:
        return jsonify({"error": "Le fichier est déjà dans ce dossier."}), 400

    # Vérifier qu'on ne déplace pas un dossier dans lui-même
    if os.path.isdir(full_source_path) and full_destination_folder.startswith(full_source_path):
        return jsonify({"error": "Impossible de déplacer un dossier dans lui-même."}), 400

    # Vérifier si un élément avec le même nom existe déjà
    if os.path.exists(full_destination_path):
        return jsonify({"error": f"Un élément nommé '{item_name}' existe déjà dans le dossier de destination."}), 409

    try:
        shutil.move(full_source_path, full_destination_path)
        
        item_type = "Dossier" if os.path.isdir(full_destination_path) else "Fichier"
        return jsonify({"message": f"{item_type} déplacé avec succès."}), 200
        
    except OSError as e:
        print(f"Erreur d'OS lors du déplacement: {e}")
        return jsonify({"error": f"Erreur de permission ou de système: {e}"}), 500
    except Exception as e:
        print(f"Erreur lors du déplacement: {e}")
        return jsonify({"error": str(e)}), 500
        
@app.route('/api/download_folder', methods=['GET'])
def api_download_folder():
    """Crée une archive ZIP d'un dossier et l'envoie en téléchargement."""
    relative_path = request.args.get('path')

    if not relative_path:
        return jsonify({"error": "Chemin de dossier manquant."}), 400

    full_path = secure_path_join(BASE_DIR, relative_path.strip('/'))

    if full_path is None:
        return jsonify({"error": "Chemin en dehors du répertoire géré."}), 400

    if not os.path.exists(full_path):
        return jsonify({"error": "Dossier non trouvé."}), 404

    if not os.path.isdir(full_path):
        return jsonify({"error": "Le chemin spécifié n'est pas un dossier."}), 400

    try:
        import tempfile
        import zipfile
        
        # Créer un fichier temporaire pour l'archive
        temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        temp_zip.close()
        
        folder_name = os.path.basename(full_path) or 'root'
        
        # Créer l'archive ZIP
        with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(full_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, os.path.dirname(full_path))
                    zipf.write(file_path, arcname)
        
        # Envoyer le fichier et le supprimer après
        response = send_file(
            temp_zip.name,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'{folder_name}.zip'
        )
        
        # Supprimer le fichier temporaire après l'envoi
        @response.call_on_close
        def cleanup():
            try:
                os.unlink(temp_zip.name)
            except Exception as e:
                print(f"Erreur lors de la suppression du fichier temporaire: {e}")
        
        return response
        
    except Exception as e:
        print(f"Erreur lors de la création de l'archive: {e}")
        return jsonify({"error": f"Erreur lors de la création de l'archive: {str(e)}"}), 500
        
        
@app.route('/api/player', methods=['GET'])
def media_player():
    """Affiche un lecteur pour les fichiers vidéo/audio."""
    relative_path = request.args.get('path')
    if not relative_path:
        return "Chemin de fichier manquant.", 400

    mime_type = mimetypes.guess_type(relative_path)[0] or 'application/octet-stream'
    
    if not mime_type.startswith(('video/', 'audio/')):
        return "Type de média non supporté par ce lecteur.", 400

    tag = 'video' if mime_type.startswith('video/') else 'audio'
    filename = os.path.basename(relative_path)
    extension = filename.split('.')[-1].lower() if '.' in filename else ''
    
    mime_map = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'mkv': 'video/x-matroska',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'flv': 'video/x-flv',
        'wmv': 'video/x-ms-wmv',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'flac': 'audio/flac',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4'
    }
    
    actual_mime = mime_map.get(extension, mime_type)
    media_url = f"/api/view?path={relative_path}"
    
    warning_message = ""
    unsupported_formats = ['mkv', 'avi', 'flv', 'wmv']
    if extension in unsupported_formats:
        warning_message = f"""
        <div class="bg-yellow-900/50 border border-yellow-600 text-yellow-200 px-4 py-3 rounded-lg mb-4 max-w-4xl">
            <div class="flex items-start">
                <i class="fas fa-exclamation-triangle text-yellow-400 mr-3 mt-1"></i>
                <div>
                    <p class="font-bold">Format non supporté nativement</p>
                    <p class="text-sm mt-1">
                        Les fichiers .{extension} ne sont pas supportés par la plupart des navigateurs web.
                        <br>Veuillez télécharger le fichier et l'ouvrir avec un lecteur vidéo comme VLC.
                    </p>
                </div>
            </div>
        </div>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lecteur Média: {filename}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
    </head>
    <body class="bg-gray-900 min-h-screen flex flex-col items-center justify-center p-4">
        <div class="w-full max-w-4xl">
            <h1 class="text-xl font-bold text-white mb-4 text-center break-words">{filename}</h1>
            
            {warning_message}
            
            <{tag} controls class="w-full shadow-2xl rounded-lg overflow-hidden bg-black" {"autoplay" if tag == 'video' else ""} preload="metadata">
                <source src="{media_url}" type="{actual_mime}">
                <p class="text-white p-4">
                    Votre navigateur ne supporte pas la lecture de ce format.
                    <br>Veuillez télécharger le fichier ci-dessous.
                </p>
            </{tag}>
            
            <div class="flex justify-center gap-4 mt-6">
                <a href="/api/download?path={relative_path}" 
                   class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-150 font-semibold shadow-lg">
                    <i class="fas fa-download"></i>
                    <span>Télécharger le fichier</span>
                </a>
                <button onclick="window.close()" 
                        class="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition duration-150 font-semibold shadow-lg">
                    <i class="fas fa-times"></i>
                    <span>Fermer</span>
                </button>
            </div>
            
            <div class="mt-6 text-center">
                <p class="text-gray-400 text-sm">
                    <i class="fas fa-info-circle mr-1"></i>
                    Formats supportés nativement: MP4, WebM, OGG (vidéo) | MP3, WAV, FLAC, OGG (audio)
                </p>
            </div>
        </div>
        
        <script>
            const mediaElement = document.querySelector('{tag}');
            if (mediaElement) {{
                mediaElement.addEventListener('error', function(e) {{
                    console.error('Erreur de lecture média:', e);
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg mt-4';
                    errorDiv.innerHTML = `
                        <div class="flex items-start">
                            <i class="fas fa-times-circle text-red-400 mr-3 mt-1"></i>
                            <div>
                                <p class="font-bold">Impossible de lire ce fichier</p>
                                <p class="text-sm mt-1">
                                    Le navigateur ne peut pas décoder ce format vidéo.
                                    <br>Utilisez le bouton "Télécharger" et ouvrez le fichier avec VLC ou un autre lecteur.
                                </p>
                            </div>
                        </div>
                    `;
                    mediaElement.parentElement.insertBefore(errorDiv, mediaElement.nextSibling);
                }});
            }}
        </script>
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
    app.run(host='0.0.0.0', port=5000, debug=True)
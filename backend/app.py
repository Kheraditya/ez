from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message
from flask_cors import CORS
import os
import uuid
import jwt
import datetime
from functools import wraps
from cryptography.fernet import Fernet

# Initialization
app = Flask(__name__)
CORS(app)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///file_sharing.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your_secret_key'
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'adityakher303@gmail.com'
app.config['MAIL_PASSWORD'] = 'cbcg mgqs tiyz plia'

# Initialize extensions
db = SQLAlchemy(app)
mail = Mail(app)

# Encryption key

key = b'w_xoFxQLCCJoJ6-vtUl77_A_NDtjLeZhJtjHqng9XWU='
# key = Fernet.generate_key()

cipher_suite = Fernet(key)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(10), nullable=False)  # 'ops' or 'client'
    is_verified = db.Column(db.Boolean, default=False)

class File(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(120), nullable=False)
    ops_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    download_token = db.Column(db.String(200), nullable=True)

# Utility Functions
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('x-access-token')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 403
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['id']).first()
        except:
            return jsonify({'message': 'Token is invalid!'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

def generate_download_link(file_id):
    token = cipher_suite.encrypt(f"file-{file_id}".encode()).decode()
    return f"http://localhost:5000/download-file/{token}"

# Routes
@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data['email']
    password = data['password']
    role = data['role']

    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already exists!'}), 400

    hashed_password = generate_password_hash(password, method='sha256')
    new_user = User(email=email, password=hashed_password, role=role)
    db.session.add(new_user)
    db.session.commit()

    # Generate JWT token for email verification
    try:
        token = jwt.encode({'email': email, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)}, 
                           app.config['SECRET_KEY'], 
                           algorithm='HS256')
        verification_link = f"http://localhost:5000/verify-email/{token}"

        # Send the email
        msg = Message('Verify Your Email', sender=app.config['MAIL_USERNAME'], recipients=[email])
        msg.body = f"Click the link to verify your email: {verification_link}"
        mail.send(msg)
        return jsonify({'message': 'User created! Verification email sent.'}), 200
    except Exception as e:
        return jsonify({'message': 'Error generating email verification link!', 'error': str(e)}), 500


@app.route('/verify-email/<token>', methods=['GET'])
def verify_email(token):
    try:
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        user = User.query.filter_by(email=data['email']).first()
        if user:
            user.is_verified = True
            db.session.commit()
            return jsonify({'message': 'Email verified!'}), 200
        return jsonify({'message': 'User not found!'}), 404
    except jwt.ExpiredSignatureError:
        return jsonify({'message': 'Verification link expired!'}), 400
    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid token!'}), 400


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data['email']
    password = data['password']

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({'message': 'Invalid credentials!'}), 401

    if not user.is_verified:
        return jsonify({'message': 'Email not verified!'}), 403

    token = jwt.encode({'id': user.id}, app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify({'token': token}), 200

@app.route('/upload-file', methods=['POST'])
@token_required
def upload_file(current_user):
    if current_user.role != 'ops':
        return jsonify({'message': 'Only Ops users can upload files!'}), 403

    file = request.files['file']
    if file.filename.split('.')[-1] not in ['pptx', 'docx', 'xlsx','pdf']:
        return jsonify({'message': 'Invalid file type!'}), 400

    filename = f"{uuid.uuid4()}-{file.filename}"
    filepath = os.path.join('uploads', filename)
    file.save(filepath)

    new_file = File(filename=filename, ops_user_id=current_user.id)
    db.session.add(new_file)
    db.session.commit()

    return jsonify({'message': 'File uploaded successfully!'}), 201

@app.route('/list-files', methods=['GET'])
@token_required
def list_files(current_user):
    if current_user.role != 'client':
        return jsonify({'message': 'Only Client users can view files!'}), 403

    files = File.query.all()
    file_list = [{'id': f.id, 'filename': f.filename} for f in files]
    return jsonify({'files': file_list}), 200

@app.route('/download-file/<token>', methods=['GET'])
@token_required
def download_file(current_user, token):
    if current_user.role != 'client':
        return jsonify({'message': 'Only Client users can download files!'}), 403

    try:
        # Decrypt the token
        decrypted_token = cipher_suite.decrypt(token.encode()).decode()
        print(f"Decrypted Token: {decrypted_token}")

        # Validate the token format
        if not decrypted_token.startswith("file-") or '-' not in decrypted_token:
            raise ValueError("Invalid token format!")

        # Extract file ID
        try:
            file_id = int(decrypted_token.split('-')[1])
        except (IndexError, ValueError):
            return jsonify({'message': 'Invalid token format!'}), 400
        print(f"File ID: {file_id}")

        # Retrieve the file from the database
        file = File.query.get(file_id)
        if not file:
            return jsonify({'message': 'File not found!'}), 404

        # Validate file existence on disk
        file_path = os.path.join('uploads', file.filename)
        print(f"File Path: {file_path}")
        if not os.path.exists(file_path):
            return jsonify({'message': 'File not found on server!'}), 404

        # Send the file
        return send_file(file_path, as_attachment=True), 200
    except Exception as e:
        print(f"Error during token processing: {e}")
        return jsonify({'message': 'Invalid or expired download link!'}), 400



if __name__ == '__main__':
    os.makedirs('uploads', exist_ok=True)
    db.create_all()
    app.run(debug=True)

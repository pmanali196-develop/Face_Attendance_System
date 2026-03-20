# IMPORTS
from flask import Flask, render_template, request, jsonify, session, redirect
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore, storage
import os
import json
import base64

# APP CONFIG
app = Flask(__name__, template_folder='templates', static_folder='frontend')
CORS(app)

app.secret_key = "supersecretkey"

# FIREBASE INIT
if not firebase_admin._apps:

    if os.environ.get("FIREBASE_KEY"):
        firebase_key = json.loads(os.environ["FIREBASE_KEY"])

        cred = credentials.Certificate(firebase_key)

    else:
        cred = credentials.Certificate("firebase_key.json")

    firebase_admin.initialize_app(cred, {
        'storageBucket': 'online-attendance-system-5b66b.firebasestorage.com'
    })

db = firestore.client()

# DATASET PATH
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.abspath("dataset")
os.makedirs(DATASET_PATH, exist_ok=True)

# ROUTES (PAGES)
@app.route('/')
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/dashboard')
def dashboard():
    if 'role' not in session:
        return redirect('/')
    return render_template('dashboard.html')

@app.route('/attendance')
def attendance():
    if 'role' not in session:
        return redirect('/')
    return render_template('attendance.html')

@app.route('/admin')
def admin():
    if session.get('role') != 'admin':
        return redirect('/')
    return render_template('admin.html')

# LOGIN API
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json

        users = db.collection('login') \
            .where('username', '==', data['username']) \
            .stream()

        for user in users:
            u = user.to_dict()

            # Plaintext password check
            if u['password'] == data['password']:
                session['role'] = u['role']
                session['employee_id'] = u.get('employee_id')

                if '@' not in data['username']:
                    return jsonify({"success": False, "error": "Use email"}), 400

                return jsonify({
                    "success": True,
                    "role": u['role']
                })

        return jsonify({"success": False})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/logout')
def logout():
    session.clear()
    return redirect('/')

# REGISTER API
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json

        # Debug line
        print("Received images:", len(data['images']))

        emp_id = data['employee_id']


        # Debug line
        # print("Received images:", len(data['images']))

        bucket = storage.bucket()
        image_urls = []

        for i, img in enumerate(data['images']):
            try:
                print("Uploading image:", i)

                img_data = base64.b64decode(img.split(',')[1])

                blob = bucket.blob(f"faces/{emp_id}/{i}.jpg")
                blob.upload_from_string(img_data, content_type='image/jpeg')

                blob.make_public()

                print("Uploaded:", blob.public_url)  # 🔥 DEBUG

                image_urls.append(blob.public_url)

                # img_data = base64.b64decode(img.split(',')[1])

                # blob = bucket.blob(f"faces/{emp_id}/{i}.jpg")
                # blob.upload_from_string(img_data, content_type='image/jpeg')

                # # Make public (for easy access)
                # blob.make_public()

                # image_urls.append(blob.public_url)

            except Exception as e:
                print("Upload error:", e)

        # Save employee
        db.collection('employee').document(emp_id).set({
            "employee_id": emp_id,
            "name": data['name'],
            "email": data['email'],
            "department": data['department'],
            "password": data['password'],
            "role": data['role'],
            "images": image_urls
        })

        # Save login (plaintext password)
        db.collection('login').add({
            "username": data['email'],
            "password": data['password'],
            "role": data['role'],
            "employee_id": emp_id
        })

        # Save images locally
        # folder = os.path.join(DATASET_PATH, emp_id)
        # os.makedirs(folder, exist_ok=True)

        # for i, img in enumerate(data['images']):
        #     try:
        #         img_data = base64.b64decode(img.split(',')[1])
        #         file_path = os.path.join(folder, f"{i}.jpg")

        #         with open(file_path, "wb") as f:
        #             f.write(img_data)

        #         print("Saved:", file_path)

        #     except Exception as e:
        #         print("Error saving image:", e)
            # img_data = base64.b64decode(img.split(',')[1])
            # with open(os.path.join(folder, f"{i}.jpg"), "wb") as f:
            #     f.write(img_data)

        # print("Saving images for:", emp_id)
        # print("Total images:", len(data['images']))

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# GET EMPLOYEE
@app.route('/api/employee/<emp_id>')
def get_employee(emp_id):
    try:
        doc = db.collection('employee').document(emp_id).get()

        if doc.exists:
            return jsonify(doc.to_dict())

        return jsonify({})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# LOCATION APIs
@app.route('/api/set-location', methods=['POST'])
def set_location():
    try:
        data = request.json

        db.collection('config').document('location').set({
            "lat": data['lat'],
            "lng": data['lng'],
            "radius": data['radius']
        })

        return jsonify({"status": "saved"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/get-location')
def get_location():
    try:
        doc = db.collection('config').document('location').get()

        if doc.exists:
            return jsonify(doc.to_dict())

        return jsonify({})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ATTENDANCE API
@app.route('/api/attendance', methods=['POST'])
def mark_attendance():
    try:
        data = request.json

        db.collection('attendance').add({
            "employee_id": data['employee_id'],
            "date": data['date'],
            "check_in": data.get('check_in'),
            "check_out": data.get('check_out')
        })

        return jsonify({"status": "success"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# RUN APP
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
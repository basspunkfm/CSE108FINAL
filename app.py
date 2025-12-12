from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_admin import Admin, AdminIndexView
from flask_admin.contrib.sqla import ModelView
import os


#initialized db stuff

app = Flask(__name__)

# Use environment variable for secret key in production
app.secret_key = os.environ.get("SECRET_KEY", "secret-idk")

# Use PostgreSQL in production (Render), SQLite locally
database_url = os.environ.get("DATABASE_URL", "sqlite:///battleship.db")
# Fix for Render's postgres:// URL (SQLAlchemy requires postgresql://)
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Log database configuration (hide password for security)
if "postgresql://" in database_url:
    print(f"📊 Using PostgreSQL database")
else:
    print(f"📊 Using SQLite database: {database_url}") 

db = SQLAlchemy(app)

# actual database model 

class Player(db.Model):
    id = db.Column(db.Integer, primary_key = True)
    username = db.Column(db.String(25), unique = True, nullable = False)
    password_hash = db.Column(db.String(200), nullable = False)
    score = db.Column(db.Integer, default=0)
    is_admin = db.Column(db.Boolean, default=False)

    def set_password(self,password_plain):
        self.password_hash = generate_password_hash(password_plain)
        
    def check_password(self, password_plain): 
        return check_password_hash(self.password_hash, password_plain) 


# login stuff 

def login_required(view_func):
    from functools import wraps

    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return view_func(*args, **kwargs)
    return wrapper

# Flask-Admin setup with authentication
class SecureModelView(ModelView):
    def is_accessible(self):
        if "user_id" not in session:
            return False
        player = Player.query.get(session["user_id"])
        return player and player.is_admin

    def inaccessible_callback(self, name, **kwargs):
        flash("You must be an admin to access this page.", "error")
        return redirect(url_for("login"))

class SecureAdminIndexView(AdminIndexView):
    def is_accessible(self):
        if "user_id" not in session:
            return False
        player = Player.query.get(session["user_id"])
        return player and player.is_admin

    def inaccessible_callback(self, name, **kwargs):
        flash("You must be an admin to access this page.", "error")
        return redirect(url_for("login"))

# Initialize Flask-Admin
admin = Admin(app, name='Battleship Admin', index_view=SecureAdminIndexView())
admin.add_view(SecureModelView(Player, db.session))

# Add logout link to admin navbar
from flask_admin.menu import MenuLink
admin.add_link(MenuLink(name='Logout', url='/logout'))

# Initialize database tables and admin user
def init_db():
    """Initialize database tables and create admin user"""
    try:
        with app.app_context():
            print("🔄 Creating database tables...")
            db.create_all()
            print("✅ Database tables created successfully!")

            # Create admin user if it doesn't exist
            admin_user = Player.query.filter_by(username="admin").first()
            if not admin_user:
                print("🔄 Creating admin user...")
                admin_user = Player(username="admin", is_admin=True, score=0)
                admin_user.set_password("admin")
                db.session.add(admin_user)
                db.session.commit()
                print("✅ Admin user created: username='admin', password='admin'")
            else:
                print("ℹ️  Admin user already exists")
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        import traceback
        traceback.print_exc()

# Run database initialization
init_db()

# page routes 

@app.route("/")
def index():
    if "user_id" in session:
        player = Player.query.get(session["user_id"])
        if player and player.is_admin:
            return redirect("/admin")  # Redirect admins to admin panel
        return redirect(url_for("menu"))  # Redirect regular users to menu
    return redirect(url_for("login")) 

@app.route("/login", methods = ["GET", "POST"])

def login():
    if request.method == "POST":
        username = request.form.get("username","").strip()
        password = request.form.get("password","")

        player = Player.query.filter_by(username=username).first()
        if player and player.check_password(password):
            # Save user in session
            session["user_id"] = player.id
            session["username"] = player.username
            session["is_admin"] = player.is_admin

            # Redirect based on admin status
            if player.is_admin:
                return redirect("/admin")  # Admin goes to admin panel
            else:
                return redirect(url_for("menu"))  # Regular user goes to menu

        else:
            error_msg = "Invalid username or password. Please try again."
            return render_template("index.html", error_msg= error_msg, username = username)

    return render_template("index.html")

@app.route("/register",methods=["GET","POST"])

def register(): 
    if request.method == "POST": 
        username = request.form.get("username","").strip()
        password = request.form.get("password","")

        if not username or not password: 
            flash("Username and password are required to play.", "error")
            return redirect(url_for("register"))

        existing = Player.query.filter_by(username=username).first()
        if existing: 
            flash("Username already taken.", "error")
            return redirect(url_for("register"))
        
        new_player = Player(username=username)
        new_player.set_password(password)
        new_player.score = 0 

        db.session.add(new_player)
        db.session.commit()

        return redirect(url_for("login"))

    return render_template("register.html")

@app.route("/menu")
@login_required
def menu():
    # Prevent admins from accessing game menu
    player = Player.query.get(session["user_id"])
    if player and player.is_admin:
        return redirect("/admin")

    username = session.get("username")
    return render_template("menu.html", username=username)

@app.route("/game")
@login_required
def game():
    # Serve the Battleship game (index.html from root)
    from flask import send_file
    return send_file("index.html")

@app.route('/assets/<path:filename>')
def serve_game_assets(filename):
    # Serve Vite build assets (JS, CSS, images)
    from flask import send_from_directory
    if os.path.exists('dist/assets'):
        return send_from_directory('dist/assets', filename)
    else:
        return send_from_directory('src', filename)

@app.route('/src/<path:filename>')
def serve_src(filename):
    # Serve source files for local development
    from flask import send_from_directory
    return send_from_directory('src', filename)

@app.route('/node_modules/<path:filename>')
def serve_node_modules(filename):
    # Serve node_modules for local development
    from flask import send_from_directory
    return send_from_directory('node_modules', filename)


@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out successfully.", "success")
    return redirect(url_for("login"))

@app.route("/api/update_score", methods=["POST"])
def update_score():
    """API endpoint to update player score from game server"""
    data = request.get_json()
    print(f"📊 Score update request received: {data}")

    if not data or "username" not in data or "score_change" not in data:
        print(f"❌ Invalid request data: {data}")
        return jsonify({"error": "Missing username or score_change"}), 400

    username = data["username"]
    score_change = data["score_change"]

    player = Player.query.filter_by(username=username).first()
    if not player:
        print(f"❌ Player not found: {username}")
        return jsonify({"error": "Player not found"}), 404

    old_score = player.score
    player.score += score_change
    db.session.commit()

    print(f"✅ Score updated for {username}: {old_score} → {player.score} (+{score_change})")

    return jsonify({
        "success": True,
        "username": username,
        "new_score": player.score,
        "score_change": score_change
    })

@app.route("/leaderboard")
def leaderboard():

    players = Player.query.order_by(Player.score.desc()).all()

    return render_template("leaderboard.html", players = players)


if __name__ == "__main__":
    # Database tables and admin user are created automatically when app starts
    app.run(debug=True, host="127.0.0.1", port=5000)
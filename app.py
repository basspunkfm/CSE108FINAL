from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash


#initialized db stuff 
app = Flask(__name__)

app.secret_key = "secret-idk"

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///battleship.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False 

db = SQLAlchemy(app) 

# actual database model 

class Player(db.Model): 
    id = db.Column(db.Integer, primary_key = True)
    username = db.Column(db.String(25), unique = True, nullable = False)
    password_hash = db.Column(db.String(128), nullable = False)
    score = db.Column(db.Integer, default=0)

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

# page routes 

@app.route("/")                             # if the user id is in the database, redirect to the game, 
def index():                                # if not, redirect back to login 
    if "user_id" in session: 
        return redirect(url_for("game"))
    return redirect(url_for("login")) 

@app.route("/login", methods = ["GET", "POST"])

def login(): 
    if request.method == "POST": 
        username = request.form.get("username","").strip()
        password = request.form.get("password","")

        player = Player.query.filter_by(username=username).first()
        if player and player.check_password(password): 
            #save the new user in the db session: 

            session["user_id"] = player.id 
            session["username"] = player.username 

    
            return redirect(url_for("game"))

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

@app.route("/game")
@login_required 
def game(): 
    
    return render_template("game.html", username = session.get("username"))


@app.route("/leaderboard")
def leaderboard():

    players = Player.query.order_by(Player.score.desc()).all()

    return render_template("leaderboard.html", players = players)


if __name__ == "__main__": 
    with app.app_context(): 
        db.create_all()

    app.run(debug= True, host = "127.0.0.1", port=5000)



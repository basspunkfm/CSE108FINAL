"""
Database initialization script for Render deployment.
Creates all database tables and the admin user.
"""
from app import app, db, Player

with app.app_context():
    print("Creating database tables...")
    db.create_all()
    print("✅ Database tables created!")

    # Create admin user if it doesn't exist
    admin = Player.query.filter_by(username="admin").first()
    if not admin:
        print("Creating admin user...")
        admin_user = Player(username="admin", is_admin=True, score=0)
        admin_user.set_password("admin")
        db.session.add(admin_user)
        db.session.commit()
        print("✅ Admin user created!")
        print("   Username: admin")
        print("   Password: admin")
    else:
        print("ℹ️  Admin user already exists")

print("✅ Database initialization complete!")

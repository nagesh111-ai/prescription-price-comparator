from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date, timedelta
from flask_wtf.csrf import CSRFProtect, CSRFError
import os
import time
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
csrf = CSRFProtect(app)  # Initialize CSRF protection

# Configure CSRF exemption for certain API endpoints
# These must be specified carefully to avoid security issues
csrf_exempt_routes = [
    '/server_time',
    '/get_active_reminders',
    '/get_active_reminders_detailed',
    '/api/price_comparison',
    '/api/save_price_result'
]

for route in csrf_exempt_routes:
    csrf.exempt(route)

# Error handler for CSRF errors to give better feedback
@app.errorhandler(CSRFError)
def handle_csrf_error(e):
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({'success': False, 'message': 'CSRF token missing or invalid'}), 400
    return render_template('error.html', message='CSRF token missing or invalid. Please try again.'), 400

# User Model
class User(UserMixin, db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    reminders = db.relationship('Reminder', backref='user', lazy=True)
    saved_prices = db.relationship('PharmacyPrice', backref='user', lazy=True)
    email_notifications = db.Column(db.Boolean, default=True)
    voice_alerts = db.Column(db.Boolean, default=True)
    desktop_notifications = db.Column(db.Boolean, default=True)

# Reminder Model
class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    medicine_name = db.Column(db.String(100), nullable=False)
    dosage = db.Column(db.String(50), nullable=False)
    reminder_time = db.Column(db.String(10), nullable=False)
    frequency = db.Column(db.String(20), nullable=False)
    days = db.Column(db.String(100))  # For weekly frequency: Mon,Tue,Wed,...
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    alert_type = db.Column(db.String(20), default='notification')  # notification, sound, etc.
    alert_message = db.Column(db.Text)  # Custom message for the reminder
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    next_time = db.Column(db.DateTime, nullable=True)  # Store the next reminder time
    
    def __repr__(self):
        return f'<Reminder {self.medicine_name}>'
        
    def calculate_next_time(self):
        """Calculate the next reminder time based on reminder settings."""
        if not self.is_active:
            return None
            
        now = datetime.now()
        today = datetime.today().date()
        
        # Parse the reminder time string into hours and minutes
        time_parts = self.reminder_time.split(':')
        hours = int(time_parts[0])
        minutes = int(time_parts[1])
        
        # Create a datetime for today's reminder
        today_reminder = datetime.combine(today, datetime.min.time().replace(hour=hours, minute=minutes))
        
        if self.frequency == 'once':
            reminder_datetime = datetime.combine(self.start_date, datetime.min.time().replace(hour=hours, minute=minutes))
            if reminder_datetime > now:
                return reminder_datetime
            return None  # Past reminder
            
        elif self.frequency == 'daily':
            if today < self.start_date:
                # If today is before start date, next time is the start date
                return datetime.combine(self.start_date, datetime.min.time().replace(hour=hours, minute=minutes))
            elif today > self.end_date:
                # If today is after end date, no more reminders
                return None
            elif today_reminder > now:
                # If today's reminder is in the future
                return today_reminder
            else:
                # If today's reminder has passed, next reminder is tomorrow
                tomorrow = today + timedelta(days=1)
                if tomorrow <= self.end_date:
                    return datetime.combine(tomorrow, datetime.min.time().replace(hour=hours, minute=minutes))
                return None
                
        elif self.frequency == 'weekly':
            if not self.days:
                return None
                
            days_list = self.days.split(',')
            weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            today_weekday = weekdays[now.weekday()]
            
            # Check if today is a reminder day and reminder time hasn't passed
            if today_weekday in days_list and today_reminder > now:
                return today_reminder
                
            # Find the next day from today that has a reminder
            for i in range(1, 8):  # Check next 7 days
                next_date = today + timedelta(days=i)
                if next_date > self.end_date:
                    return None  # Past end date
                    
                next_weekday = weekdays[next_date.weekday()]
                if next_weekday in days_list:
                    return datetime.combine(next_date, datetime.min.time().replace(hour=hours, minute=minutes))
                    
            return None
        
        return None  # Default fallback

# Pharmacy Price Model
class PharmacyPrice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    medicine_name = db.Column(db.String(100), nullable=False)
    pharmacy_name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    date_saved = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def __repr__(self):
        return f'<PharmacyPrice {self.medicine_name} at {self.pharmacy_name}>'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        
        if user and check_password_hash(user.password, password):
            login_user(user)
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'success': True, 'redirect': url_for('dashboard')})
            return redirect(url_for('dashboard'))
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({'success': False, 'message': 'Invalid email or password'})
        flash('Invalid email or password')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        
        if User.query.filter_by(email=email).first():
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'success': False, 'message': 'Email already registered'})
            flash('Email already registered')
            return redirect(url_for('register'))
        
        user = User(
            name=name,
            email=email,
            password=generate_password_hash(password)
        )
        db.session.add(user)
        db.session.commit()
        
        login_user(user)  # Log in the user after registration
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({'success': True, 'redirect': url_for('dashboard')})
        return redirect(url_for('dashboard'))
    
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    reminders = Reminder.query.filter_by(user_id=current_user.id).all()
    return render_template('dashboard.html', reminders=reminders)

@app.route('/profile')
@login_required
def profile():
    reminders = Reminder.query.filter_by(user_id=current_user.id).all()
    active_reminders = sum(1 for r in reminders if r.is_active)
    
    # Calculate next_time for reminders if needed
    now = datetime.now()
    for reminder in reminders:
        if reminder.next_time is None:
            reminder.next_time = reminder.calculate_next_time()
    
    missed_reminders = sum(1 for r in reminders if r.is_active and r.next_time and r.next_time < now)
    
    # Mock user preferences - in a real app, these would come from the database
    user_prefs = {
        'email_notifications': True,
        'voice_alerts': True,
        'desktop_notifications': True
    }
    
    # Mock recent activities - in a real app, these would come from the database
    recent_activities = [
        {'type': 'reminder_added', 'medicine': 'Paracetamol', 'time': datetime.now() - timedelta(hours=2)},
        {'type': 'reminder_taken', 'medicine': 'Aspirin', 'time': datetime.now() - timedelta(hours=5)},
        {'type': 'medicine_saved', 'medicine': 'Vitamin C', 'time': datetime.now() - timedelta(days=1)}
    ]
    
    return render_template('profile.html', 
                          total_reminders=len(reminders), 
                          active_reminders=active_reminders,
                          missed_reminders=missed_reminders,
                          user_prefs=user_prefs,
                          recent_activities=recent_activities)

@app.route('/edit_profile', methods=['GET', 'POST'])
@login_required
def edit_profile():
    # Get actual user preferences from database
    user_prefs = {
        'email_notifications': current_user.email_notifications,
        'voice_alerts': current_user.voice_alerts,
        'desktop_notifications': current_user.desktop_notifications
    }
    
    if request.method == 'POST':
        try:
            # Debug log of form data
            print("Form data received:", request.form)
            
            # Handle form submission to update user profile
            name = request.form.get('name')
            email = request.form.get('email')
            
            if not name or not email:
                flash('Name and email are required fields', 'error')
                return render_template('edit_profile.html', user_prefs=user_prefs)
            
            # Check if email is already used by another user
            if email != current_user.email:
                existing_user = User.query.filter_by(email=email).first()
                if existing_user:
                    flash('Email is already in use by another account', 'error')
                    return render_template('edit_profile.html', user_prefs=user_prefs)
            
            # Update user information
            print(f"Updating user {current_user.id} - Old name: {current_user.name}, New name: {name}")
            print(f"Updating user {current_user.id} - Old email: {current_user.email}, New email: {email}")
            
            current_user.name = name
            current_user.email = email
            
            # Check if password change is requested
            current_password = request.form.get('current_password')
            new_password = request.form.get('new_password')
            confirm_password = request.form.get('confirm_password')
            
            if current_password and new_password and confirm_password:
                print(f"Password change requested for user {current_user.id}")
                
                if not check_password_hash(current_user.password, current_password):
                    flash('Current password is incorrect', 'error')
                    return render_template('edit_profile.html', user_prefs=user_prefs)
                
                if new_password != confirm_password:
                    flash('New passwords do not match', 'error')
                    return render_template('edit_profile.html', user_prefs=user_prefs)
                
                # Validate password strength
                if len(new_password) < 8:
                    flash('Password must be at least 8 characters long', 'error')
                    return render_template('edit_profile.html', user_prefs=user_prefs)
                
                current_user.password = generate_password_hash(new_password)
                print(f"Password updated for user {current_user.id}")
            
            # Update notification preferences
            email_notifications = request.form.get('email_notifications') == 'on'
            voice_alerts = request.form.get('voice_alerts') == 'on'
            desktop_notifications = request.form.get('desktop_notifications') == 'on'
            
            print(f"Updating preferences - Email: {email_notifications}, Voice: {voice_alerts}, Desktop: {desktop_notifications}")
            
            current_user.email_notifications = email_notifications
            current_user.voice_alerts = voice_alerts
            current_user.desktop_notifications = desktop_notifications
            
            # Commit changes to database
            db.session.commit()
            print(f"Profile successfully updated for user {current_user.id}")
            flash('Profile updated successfully', 'success')
            return redirect(url_for('profile'))
            
        except Exception as e:
            # Roll back the transaction in case of error
            db.session.rollback()
            print(f"Error updating profile: {str(e)}")
            flash(f'Error updating profile: {str(e)}', 'error')
            return render_template('edit_profile.html', user_prefs=user_prefs)
    
    return render_template('edit_profile.html', user_prefs=user_prefs)

@app.route('/notifications')
@login_required
def notifications():
    # Get all reminders for the current user
    reminders = Reminder.query.filter_by(user_id=current_user.id).all()
    now = datetime.now()
    
    # Calculate next_time for each reminder if needed
    for reminder in reminders:
        if reminder.next_time is None:
            reminder.next_time = reminder.calculate_next_time()
    
    # Categorize reminders
    upcoming_reminders = []
    missed_reminders = []
    taken_reminders = []
    
    for reminder in reminders:
        if not reminder.is_active:
            taken_reminders.append(reminder)
        elif reminder.next_time and reminder.next_time < now:
            missed_reminders.append(reminder)
        elif reminder.next_time:
            upcoming_reminders.append(reminder)
    
    # Convert reminders to dictionaries for the template
    upcoming_data = []
    missed_data = []
    taken_data = []
    
    for reminder in upcoming_reminders:
        upcoming_data.append({
            'id': reminder.id,
            'medicine_name': reminder.medicine_name,
            'dosage': reminder.dosage,
            'time': reminder.reminder_time,
            'date': reminder.next_time.strftime('%Y-%m-%d') if reminder.next_time else '',
            'status': 'upcoming',
            'voice_enabled': reminder.alert_type == 'voice'
        })
    
    for reminder in missed_reminders:
        missed_data.append({
            'id': reminder.id,
            'medicine_name': reminder.medicine_name,
            'dosage': reminder.dosage,
            'time': reminder.reminder_time,
            'date': reminder.next_time.strftime('%Y-%m-%d') if reminder.next_time else '',
            'status': 'missed',
            'voice_enabled': reminder.alert_type == 'voice'
        })
    
    for reminder in taken_reminders:
        taken_data.append({
            'id': reminder.id,
            'medicine_name': reminder.medicine_name,
            'dosage': reminder.dosage,
            'time': reminder.reminder_time,
            'date': reminder.start_date.strftime('%Y-%m-%d'),
            'status': 'taken',
            'voice_enabled': reminder.alert_type == 'voice'
        })
    
    # Combine all notifications for the template
    notifications = upcoming_data + missed_data + taken_data
    
    return render_template('notifications.html', notifications=notifications)

@app.route('/get_active_reminders')
@login_required
def get_active_reminders():
    reminders = Reminder.query.filter_by(user_id=current_user.id, is_active=True).all()
    now = datetime.now()
    
    # Update next_time for each reminder if needed
    for reminder in reminders:
        if reminder.next_time is None:
            reminder.next_time = reminder.calculate_next_time()
    
    # Count upcoming and missed reminders
    upcoming_count = sum(1 for r in reminders if r.next_time and r.next_time > now)
    missed_count = sum(1 for r in reminders if r.next_time and r.next_time <= now)
    
    return jsonify({
        'total': len(reminders),
        'upcoming': upcoming_count,
        'missed': missed_count
    })

@app.route('/toggle_voice_alert/<int:id>', methods=['POST'])
@login_required
def toggle_voice_alert(id):
    reminder = Reminder.query.get_or_404(id)
    if reminder.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'})
    
    # Toggle the voice alert setting
    # In a real app, this would be stored in the database
    # For now, we'll just return success
    return jsonify({'success': True, 'enabled': request.json.get('enabled', False)})

@app.route('/snooze_reminder/<int:id>', methods=['POST'])
@login_required
def snooze_reminder(id):
    reminder = Reminder.query.get_or_404(id)
    if reminder.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'})
    
    # Get snooze time from request
    minutes = request.json.get('minutes', 5)
    
    # Calculate base time (now or current next_time if it exists)
    base_time = reminder.next_time if reminder.next_time else datetime.now()
    
    # Update the next time for the reminder
    reminder.next_time = base_time + timedelta(minutes=int(minutes))
    db.session.commit()
    
    return jsonify({'success': True, 'next_time': reminder.next_time.strftime('%Y-%m-%d %H:%M:%S')})

@app.route('/mark_taken/<int:id>', methods=['POST'])
@login_required
def mark_taken(id):
    reminder = Reminder.query.get_or_404(id)
    if reminder.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'})
    
    # Mark the reminder as taken (not active)
    reminder.is_active = False
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/add_reminder', methods=['GET', 'POST'])
@login_required
def add_reminder():
    if request.method == 'POST':
        try:
            medicine_name = request.form.get('medicine_name')
            dosage = request.form.get('dosage')
            reminder_time = request.form.get('reminder_time')  # Get as string
            frequency = request.form.get('frequency')
            start_date_str = request.form.get('start_date')
            end_date_str = request.form.get('end_date')
            alert_type = request.form.get('alert_type', 'voice')
            alert_message = request.form.get('alert_message')
            
            # Convert date strings to date objects
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            
            # Validate dates
            if start_date > end_date:
                flash('End date cannot be earlier than start date', 'error')
                return redirect(url_for('add_reminder'))
            
            # Handle days for weekly frequency
            days = None
            if frequency == 'weekly':
                selected_days = request.form.getlist('days[]')
                if not selected_days:
                    flash('Please select at least one day of the week for weekly reminders', 'error')
                    return redirect(url_for('add_reminder'))
                days = ','.join(selected_days)
            
            reminder = Reminder(
                medicine_name=medicine_name,
                dosage=dosage,
                reminder_time=reminder_time,  # Store as string
                frequency=frequency,
                days=days,
                start_date=start_date,
                end_date=end_date,
                alert_type=alert_type,
                alert_message=alert_message,
                user_id=current_user.id
            )
            
            db.session.add(reminder)
            db.session.commit()
            flash('Reminder added successfully!', 'success')
            return redirect(url_for('reminders'))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Error adding reminder: {str(e)}', 'error')
            return redirect(url_for('add_reminder'))
    
    return render_template('add_reminder.html', now=datetime.now())

@app.route('/reminders')
@login_required
def reminders():
    user_reminders = Reminder.query.filter_by(user_id=current_user.id).all()
    return render_template('reminders.html', reminders=user_reminders)

@app.route('/price_comparison')
def price_comparison_page():
    """Render the price comparison page."""
    return render_template('price_comparison.html')

@app.route('/edit_reminder/<int:id>', methods=['GET', 'POST'])
@login_required
def edit_reminder(id):
    reminder = Reminder.query.filter_by(id=id, user_id=current_user.id).first_or_404()
    
    if request.method == 'POST':
        try:
            medicine_name = request.form.get('medicine_name')
            dosage = request.form.get('dosage')
            reminder_time = request.form.get('reminder_time')
            frequency = request.form.get('frequency')
            start_date_str = request.form.get('start_date')
            end_date_str = request.form.get('end_date')
            alert_type = request.form.get('alert_type')
            alert_message = request.form.get('alert_message')
            
            # Convert date strings to date objects
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            
            # Validate dates
            if start_date > end_date:
                flash('End date cannot be earlier than start date', 'error')
                return render_template('edit_reminder.html', reminder=reminder)
            
            # For weekly reminders, get selected days
            days = None
            if frequency == 'weekly':
                selected_days = request.form.getlist('days[]')
                if not selected_days:
                    flash('Please select at least one day of the week for weekly reminders', 'error')
                    return render_template('edit_reminder.html', reminder=reminder)
                days = ','.join(selected_days)
            
            # Update reminder
            reminder.medicine_name = medicine_name
            reminder.dosage = dosage
            reminder.reminder_time = reminder_time
            reminder.frequency = frequency
            reminder.days = days
            reminder.start_date = start_date
            reminder.end_date = end_date
            reminder.alert_type = alert_type
            reminder.alert_message = alert_message
            
            db.session.commit()
            flash('Reminder updated successfully', 'success')
            return redirect(url_for('reminders'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating reminder: {str(e)}', 'error')
            return render_template('edit_reminder.html', reminder=reminder)
    
    return render_template('edit_reminder.html', reminder=reminder)

@app.route('/toggle_reminder/<int:id>', methods=['POST'])
@login_required
def toggle_reminder(id):
    reminder = Reminder.query.get_or_404(id)
    if reminder.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'})
    
    reminder.is_active = not reminder.is_active
    db.session.commit()
    return jsonify({'success': True})

@app.route('/delete_reminder/<int:id>', methods=['POST'])
@login_required
def delete_reminder(id):
    reminder = Reminder.query.get_or_404(id)
    if reminder.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'})
    
    db.session.delete(reminder)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/get_active_reminders_detailed', methods=['GET'])
@login_required
def get_active_reminders_detailed():
    """API endpoint to get all active reminders for the current user."""
    try:
        today = date.today()
        current_day = today.strftime('%A').lower()
        
        # Get all active reminders for the current user
        user_reminders = Reminder.query.filter_by(
            user_id=current_user.id, 
            is_active=True
        ).filter(
            Reminder.start_date <= today,
            Reminder.end_date >= today
        ).all()
        
        # Convert reminder objects to dictionaries
        reminders_data = []
        for reminder in user_reminders:
            # Skip weekly reminders if today is not a selected day
            if reminder.frequency == 'weekly' and reminder.days:
                days_list = reminder.days.split(',')
                if current_day not in days_list:
                    continue
            
            reminder_dict = {
                'id': reminder.id,
                'medicine_name': reminder.medicine_name,
                'dosage': reminder.dosage,
                'reminder_time': reminder.reminder_time,  # Already a string
                'frequency': reminder.frequency,
                'start_date': reminder.start_date.strftime('%Y-%m-%d'),
                'end_date': reminder.end_date.strftime('%Y-%m-%d'),
                'is_active': reminder.is_active,
                'alert_type': reminder.alert_type,
                'alert_message': reminder.alert_message
            }
            
            # Add days field if it exists (for weekly reminders)
            if reminder.days:
                reminder_dict['days'] = reminder.days
            
            reminders_data.append(reminder_dict)
        
        return jsonify({'success': True, 'reminders': reminders_data})
    
    except Exception as e:
        print(f"Error fetching reminders: {str(e)}")
        return jsonify({'success': False, 'message': f'Failed to fetch reminders: {str(e)}'})

@app.route('/get_reminder/<int:id>', methods=['GET'])
@login_required
def get_reminder(id):
    """API endpoint to get a specific reminder by ID."""
    try:
        # Get the specific reminder
        reminder = Reminder.query.filter_by(id=id, user_id=current_user.id).first()
        
        if not reminder:
            return jsonify({'success': False, 'message': 'Reminder not found'})
        
        # Convert reminder to dictionary
        reminder_dict = {
            'id': reminder.id,
            'medicine_name': reminder.medicine_name,
            'dosage': reminder.dosage,
            'reminder_time': reminder.reminder_time,
            'frequency': reminder.frequency,
            'start_date': reminder.start_date.strftime('%Y-%m-%d'),
            'end_date': reminder.end_date.strftime('%Y-%m-%d'),
            'is_active': reminder.is_active,
            'alert_type': reminder.alert_type,
            'alert_message': reminder.alert_message
        }
        
        # Add days field if it exists (for weekly reminders)
        if reminder.days:
            reminder_dict['days'] = reminder.days
        
        return jsonify({'success': True, 'reminder': reminder_dict})
    
    except Exception as e:
        print(f"Error fetching reminder: {str(e)}")
        return jsonify({'success': False, 'message': f'Failed to fetch reminder: {str(e)}'})

@app.route('/server_time', methods=['GET'])
def server_time():
    current_time = datetime.now()
    return jsonify({'success': True, 'server_time': current_time.strftime('%Y-%m-%d %H:%M:%S')})

@app.route('/notification_test')
@login_required
def notification_test():
    """Route for testing browser notifications and sound alerts."""
    return render_template('notification_test.html')

@app.route('/api/price_comparison', methods=['POST'])
def price_comparison_api():
    """API endpoint for medicine price comparison."""
    if not request.is_json:
        return jsonify({"success": False, "message": "Invalid request format"}), 400
    
    data = request.get_json()
    medicine_name = data.get('medicine_name', '').strip()
    location = data.get('location', '').strip()
    
    if not medicine_name:
        return jsonify({"success": False, "message": "Medicine name is required"}), 400
    
    # In a real app, this would call an external API or query a database
    # For demo purposes, we're returning mock data
    results = get_mock_price_data(medicine_name, location)
    
    return jsonify({
        "success": True,
        "results": results
    })

@app.route('/api/save_price_result', methods=['POST'])
def save_price_result():
    """Save a price comparison result for the user."""
    if not current_user.is_authenticated:
        return jsonify({"success": False, "message": "Please log in to save results"}), 401
    
    if not request.is_json:
        return jsonify({"success": False, "message": "Invalid request format"}), 400
    
    data = request.get_json()
    medicine_name = data.get('medicine_name')
    pharmacy_name = data.get('pharmacy_name')
    price = data.get('price')
    
    if not all([medicine_name, pharmacy_name, price]):
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    try:
        # Save to database
        new_price = PharmacyPrice(
            medicine_name=medicine_name,
            pharmacy_name=pharmacy_name,
            price=float(price),
            user_id=current_user.id
        )
        
        db.session.add(new_price)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Price information saved successfully"
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error saving price: {str(e)}")
        return jsonify({"success": False, "message": "Error saving price information"}), 500

@app.route('/saved_prices')
@login_required
def saved_prices():
    """Display user's saved medicine information."""
    saved_prices = PharmacyPrice.query.filter_by(user_id=current_user.id).order_by(PharmacyPrice.date_saved.desc()).all()
    return render_template('saved_prices.html', saved_prices=saved_prices)

@app.route('/api/delete_saved_price/<int:id>', methods=['POST'])
@login_required
def delete_saved_price(id):
    """Delete a saved price."""
    saved_price = PharmacyPrice.query.filter_by(id=id, user_id=current_user.id).first_or_404()
    
    try:
        db.session.delete(saved_price)
        db.session.commit()
        return jsonify({"success": True, "message": "Saved price deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Error deleting saved price: {str(e)}"}), 500

def get_mock_price_data(medicine_name, location):
    """Generate mock price comparison data for demonstration purposes."""
    import random
    
    # List of fictional Indian pharmacies with their cities
    pharmacies = [
        {"name": "Apollo Pharmacy", "address": "MG Road, Bangalore", "city": "bangalore"},
        {"name": "MedPlus", "address": "HSR Layout, Bangalore", "city": "bangalore"},
        {"name": "Apollo Pharmacy", "address": "Jubilee Hills, Hyderabad", "city": "hyderabad"},
        {"name": "MedPlus", "address": "Ameerpet, Hyderabad", "city": "hyderabad"},
        {"name": "Wellness Forever", "address": "Bandra, Mumbai", "city": "mumbai"},
        {"name": "MedPlus", "address": "Andheri, Mumbai", "city": "mumbai"},
        {"name": "NetMeds Store", "address": "Anna Nagar, Chennai", "city": "chennai"},
        {"name": "Apollo Pharmacy", "address": "T Nagar, Chennai", "city": "chennai"},
        {"name": "PharmEasy Store", "address": "Connaught Place, Delhi", "city": "delhi"},
        {"name": "Apollo Pharmacy", "address": "Dwarka, Delhi", "city": "delhi"},
        {"name": "Medlife Pharmacy", "address": "Banjara Hills, Hyderabad", "city": "hyderabad"},
        {"name": "Health & Glow", "address": "Koramangala, Bangalore", "city": "bangalore"},
        {"name": "Guardian Pharmacy", "address": "Viman Nagar, Pune", "city": "pune"},
        {"name": "MedPlus", "address": "Aundh, Pune", "city": "pune"},
        {"name": "Apollo Pharmacy", "address": "Sector 18, Noida", "city": "noida"}
    ]
    
    # Dictionary of common medicines with their price ranges in Indian Rupees
    common_medicines = {
        "paracetamol": {"min": 15, "max": 45, "type": "pain reliever"},
        "crocin": {"min": 22, "max": 55, "type": "pain reliever"},
        "dolo": {"min": 20, "max": 50, "type": "pain reliever"},
        "aspirin": {"min": 25, "max": 60, "type": "pain reliever"},
        "ibuprofen": {"min": 35, "max": 75, "type": "pain reliever"},
        "combiflam": {"min": 40, "max": 85, "type": "pain reliever"},
        "amoxicillin": {"min": 80, "max": 200, "type": "antibiotic"},
        "azithromycin": {"min": 120, "max": 250, "type": "antibiotic"},
        "cetirizine": {"min": 35, "max": 90, "type": "antiallergy"},
        "allegra": {"min": 85, "max": 160, "type": "antiallergy"},
        "montair": {"min": 110, "max": 220, "type": "antiallergy"},
        "insulin": {"min": 350, "max": 750, "type": "hormone"},
        "metformin": {"min": 70, "max": 180, "type": "antidiabetic"},
        "atorvastatin": {"min": 90, "max": 220, "type": "cholesterol"},
        "pantoprazole": {"min": 60, "max": 150, "type": "antacid"},
        "omeprazole": {"min": 50, "max": 140, "type": "antacid"},
        "montelukast": {"min": 120, "max": 280, "type": "asthma"},
        "levothyroxine": {"min": 80, "max": 190, "type": "thyroid"},
        "vitamin d": {"min": 110, "max": 350, "type": "supplement"},
        "vitamin b12": {"min": 85, "max": 290, "type": "supplement"},
        "multivitamin": {"min": 95, "max": 450, "type": "supplement"},
        "folic acid": {"min": 30, "max": 95, "type": "supplement"},
        "calcium": {"min": 70, "max": 280, "type": "supplement"}
    }
    
    results = []
    
    # Normalize the medicine name for comparison
    medicine_name_lower = medicine_name.lower().strip()
    
    # Find the matching medicine in the dictionary or use default pricing
    price_info = None
    for med_name, info in common_medicines.items():
        # Check if medicine name contains this key or vice versa
        if med_name in medicine_name_lower or medicine_name_lower in med_name:
            price_info = info
            break
    
    # Default price ranges if no match found
    if not price_info:
        price_info = {"min": 75, "max": 250, "type": "general"}
    
    # Filter pharmacies based on location
    filtered_pharmacies = pharmacies
    if location:
        location_lower = location.lower().strip()
        filtered_pharmacies = [p for p in pharmacies if location_lower in p["city"]]
        
        # If no matches, include pharmacies from a couple of random cities
        if not filtered_pharmacies:
            all_cities = list(set(p["city"] for p in pharmacies))
            random_cities = random.sample(all_cities, min(2, len(all_cities)))
            filtered_pharmacies = [p for p in pharmacies if p["city"] in random_cities]
    
    # Generate 3-6 random results or fewer if filtered_pharmacies has fewer items
    num_results = min(random.randint(3, 6), len(filtered_pharmacies))
    
    # If we have fewer pharmacies than requested results, just use all available
    if num_results < len(filtered_pharmacies):
        selected_pharmacies = random.sample(filtered_pharmacies, num_results)
    else:
        selected_pharmacies = filtered_pharmacies
    
    # Set a seed based on medicine name to ensure consistent prices for the same medicine
    random.seed(hash(medicine_name_lower) % 10000)
    
    # Base price from the price_info
    base_price = random.uniform(price_info["min"], price_info["max"])
    
    for pharmacy in selected_pharmacies:
        # Vary the price slightly around the base price (±15%)
        price_variation = random.uniform(-0.15, 0.15)
        price = round(base_price * (1 + price_variation), 2)
        
        # Special discount for one pharmacy to show "best value"
        is_best_value = random.random() < 0.3  # 30% chance for special discount
        if is_best_value:
            price = round(price * 0.85, 2)  # 15% discount for "best value"
        
        # Calculate distance - only if location is provided
        if location:
            distance = round(random.uniform(0.5, 10.0), 1)
        else:
            distance = None
        
        # More realistic availability distribution
        stock_probability = random.random()
        if stock_probability < 0.75:  # 75% chance for in stock
            availability = "In Stock"
        elif stock_probability < 0.90:  # 15% chance for limited stock
            availability = "Limited Stock"
        else:  # 10% chance for out of stock
            availability = "Out of Stock"
        
        results.append({
            "pharmacy_name": pharmacy["name"],
            "address": pharmacy["address"],
            "city": pharmacy["city"].capitalize(),
            "price": price,
            "distance": distance,
            "availability": availability,
            "medicine_type": price_info["type"].capitalize()
        })
    
    # Sort by price (lowest first)
    results.sort(key=lambda x: x["price"])
    
    # Reset the random seed
    random.seed()
    
    return results

# Initialize database
def init_db():
    with app.app_context():
        # Create all tables (only if they don't already exist)
        db.create_all()
        
        # Check tables for missing columns and add them if needed
        inspector = db.inspect(db.engine)
        
        # Check if we need to add the next_time column to Reminder table
        reminder_columns = [column['name'] for column in inspector.get_columns('reminder')]
        if 'next_time' not in reminder_columns:
            # If using SQLite, we need to recreate the table
            # For production apps, use proper migrations with Flask-Migrate
            try:
                with db.engine.connect() as conn:
                    conn.execute(db.text("ALTER TABLE reminder ADD COLUMN next_time TIMESTAMP"))
                    conn.commit()
                    print("Added next_time column to reminder table")
            except Exception as e:
                print(f"Could not add column automatically: {e}")
                print("Please consider using proper migrations for schema changes")
        
        # Check if we need to add notification preference columns to User table
        user_columns = [column['name'] for column in inspector.get_columns('user')]
        missing_columns = []
        
        if 'email_notifications' not in user_columns:
            missing_columns.append("email_notifications BOOLEAN DEFAULT 1")
        
        if 'voice_alerts' not in user_columns:
            missing_columns.append("voice_alerts BOOLEAN DEFAULT 1")
        
        if 'desktop_notifications' not in user_columns:
            missing_columns.append("desktop_notifications BOOLEAN DEFAULT 1")
        
        # Add missing columns to user table
        if missing_columns:
            try:
                with db.engine.connect() as conn:
                    for column_def in missing_columns:
                        conn.execute(db.text(f"ALTER TABLE user ADD COLUMN {column_def}"))
                    conn.commit()
                    print(f"Added missing columns to user table: {', '.join(col.split()[0] for col in missing_columns)}")
            except Exception as e:
                print(f"Could not add columns automatically: {e}")
                print("Please consider using proper migrations for schema changes")
        
        print("Database tables initialized successfully!")

# Initialize the database when the application starts
init_db()

if __name__ == '__main__':
    app.run(debug=True) 
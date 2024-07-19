from flask import request, jsonify
from config import app, db
from models import Member, Membership
from datetime import datetime, timedelta

# List of all members
@app.route("/members", methods=["GET"])
def get_members():
  members = Member.query.all()
  return jsonify([member.to_json() for member in members])

# Get a specific member by ID
@app.route("/member/<int:member_id>", methods=["GET"])
def get_member(member_id):
  member = Member.query.get(member_id)
  if not member:
    return jsonify({'error': 'Member not found'}), 404
  
  return jsonify(member.to_json())

# Delete a member by ID
@app.route("/delete_member/<int:member_id>", methods=["DELETE"])
def delete_member(member_id):
  member = Member.query.get(member_id)
  if not member:
    return jsonify({'error': 'Member not found'}), 404
  
  try:
    db.session.delete(member)
    db.session.commit()
  except Exception as e:
    return jsonify({'error': str(e)}), 400
  
  return jsonify({'message': 'Member deleted successfully'})

# Create a new member that doesn't have any memberships yet
@app.route("/create_member", methods=["POST"])
def create_new_member():
  member_name = request.json.get('name')

  if not member_name:
    return jsonify({'error': 'Please provide a name'}), 400
  
  if Member.query.filter_by(name=member_name).first():
    return jsonify({'error': 'Member already exists'}), 400
  
  member = Member(name=member_name)
  try:
    db.session.add(member)
    db.session.commit()

  except Exception as e:
    return jsonify({'error': str(e)}), 400
  
  return jsonify(member.to_json()), 201

# Edit a member's name
@app.route("/update_member/<int:member_id>", methods=["POST"])
def update_member(member_id):
  member = Member.query.get(member_id)
  if not member:
    return jsonify({'error': 'Member not found'}), 404
  
  new_name = request.json.get('name')
  if not new_name:
    return jsonify({'error': 'Please provide a name'}), 400
  
  member.name = new_name
  try:
    db.session.commit()
  except Exception as e:
    return jsonify({'error': str(e)}), 400
  
  return jsonify(member.to_json())

# Renew a member's membership
@app.route("/update_membership/<int:member_id>", methods=["POST"])
def update_membership(member_id):
  member = Member.query.get(member_id)
  if not member:
    return jsonify({'error': 'Member not found'}), 404
  
  new_membership = Membership(
    member_id=member_id,
    end_date=datetime.now() + timedelta(days=30)
  )
  try:
    db.session.add(new_membership)
    db.session.commit()
  except Exception as e:
    return jsonify({'error': str(e)}), 400
  
  return jsonify(new_membership.to_json()), 201


# List all memberships
@app.route("/memberships", methods=["GET"])
def get_memberships():
  memberships = Membership.query.all()
  return jsonify([membership.to_json() for membership in memberships])

# Get a specific membership by ID
@app.route("/membership/<int:membership_id>", methods=["GET"])
def get_membership(membership_id):
  membership = Membership.query.get(membership_id)
  if not membership:
    return jsonify({'error': 'Membership not found'}), 404
  
  return jsonify(membership.to_json())

# Create a new membership
@app.route("/create_membership", methods=["POST"])
def create_membership():
  member_id = request.json.get('memberId')
  end_date = request.json.get('endDate')

  if not member_id:
    return jsonify({'error': 'Please provide a member id'}), 400
  
  if not end_date:
    end_date = datetime.now() + timedelta(days=30)
  
  member = Member.query.get(member_id)
  if not member:
    return jsonify({'error': 'Member not found for ID: {}'.format(member_id)}), 404
  
  membership = Membership(
    member_id=member_id,
    end_date=end_date
  )
  try:
    db.session.add(membership)
    db.session.commit()
  except Exception as e:
    return jsonify({'error': str(e)}), 400
  
  return jsonify(membership.to_json()), 201

# Delete a membership by ID
@app.route("/delete_membership/<int:membership_id>", methods=["DELETE"])
def delete_membership(membership_id):
  membership = Membership.query.get(membership_id)
  if not membership:
    return jsonify({'error': 'Membership not found'}), 404
  
  try:
    db.session.delete(membership)
    db.session.commit()
  except Exception as e:
    return jsonify({'error': str(e)}), 400
  
  return jsonify({'message': 'Membership deleted successfully'})

# Update a membership's end date
@app.route("/update_membership_end_date/<int:membership_id>", methods=["POST"])
def update_membership_end_date(membership_id):
  membership = Membership.query.get(membership_id)
  if not membership:
    return jsonify({'error': 'Membership not found'}), 404
  
  new_end_date_str = request.json.get('endDate')
  if not new_end_date_str:
    return jsonify({'error': 'Please provide an end date'}), 400
  
  try:
    new_end_date = datetime.strptime(new_end_date_str, '%Y-%m-%d').date()
  except ValueError:
    return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD.'}), 400
  
  membership.end_date = new_end_date
  try:
    db.session.commit()
  except Exception as e:
    return jsonify({'error': str(e)}), 400
  
  return jsonify(membership.to_json())

if __name__ == '__main__':
  # Create the database models (tables)
  with app.app_context():
    db.create_all()

  app.run(debug=True)
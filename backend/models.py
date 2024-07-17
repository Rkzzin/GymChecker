from config import db
from datetime import datetime, timedelta

class Member(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(100), nullable=False)

  def to_json(self):
    return {
      'id': self.id,
      'name': self.name
    }

class Membership(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  member_id = db.Column(db.Integer, db.ForeignKey('member.id'), nullable=False)
  start_date = db.Column(db.Date, nullable=False, default=datetime.now)
  end_date = db.Column(db.Date, nullable=False)
  month = db.Column(db.Integer, nullable=False, default=datetime.now().month)
  year = db.Column(db.Integer, nullable=False, default=datetime.now().year)

  def to_json(self):
    return {
      'id': self.id,
      'memberId': self.member_id,
      'startDate': self.start_date,
      'endDate': self.end_date,
      'month': self.month,
      'year': self.year
    }


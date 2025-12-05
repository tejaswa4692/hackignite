import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import client, create_client


url: str = "https://uivlgbwjswwodswogdmh.supabase.co"
key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpdmxnYndqc3d3b2Rzd29nZG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzQ1NzQsImV4cCI6MjA3NzMxMDU3NH0.reI9TpS4rzm3aRQUCWLvI6OxFyvrmbSbvnrpAup2wdg"
supabase = create_client(url, key)
app = Flask(__name__)
CORS(app)


@app.route("/")
def init()
    response = supabase.table("main").select("*").execute()
    rows = response.data
    return jsonify(rows)





if __name__ == "__main__":
    app.run(debug=True)
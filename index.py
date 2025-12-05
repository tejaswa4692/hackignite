import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import client, create_client


url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")



supabase = create_client(url, key)
app = Flask(__name__)
CORS(app, origins=["https://hackthonepicwebsite.onrender.com"])


@app.route("/")
def init():
    response = supabase.table("main").select("*").execute()
    rows = response.data
    print(jsonify(rows))
    return jsonify(rows)


        # id: 'i_' + Date.now(),
        # type,
        # desc,
        # coords,
        # ts: Date.now(),
        # status: "pending",
        # imglnk: link2iimg

@app.route("/add_entry", methods=["POST"])
def add_cards():
    try:
        data = request.get_json()

        # Extract fields
        type = data.get("type")

        time = data.get("ts")
        desc = data.get("desc")
        coordy = data.get("coordy")
        imglnk = data.get("imglnk")
        status = data.get("status")
        coordx = data.get("coordx")
        
        print(desc, time, type, imglnk)


        # Insert into Supabase
        response = supabase.table("main").insert({
            "desc": desc,
            "date": time,
            "type": type,
            "status": status,
            "imglnk": imglnk,
            "coordy": coordy,
            "coordx": coordx,
            }).execute()

        return jsonify({"message": "Card added successfully!", "card": response.data}), 201
    

    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/get-issues", methods=["GET"])
def get_issues():
    try:
        response = supabase.table("main").select("*").execute()
        rows = response.data
        return jsonify({"status": "success", "data": rows})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))

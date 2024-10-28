import pandas as pd
import numpy as np
import json
from flask import Flask, jsonify, Response, request
from flask_cors import CORS
from streaming_elastic import StreamingDepth

app = Flask(__name__)
cors = CORS(app)

@app.route("/getData/<filename>")
def get_data(filename):
    df = pd.read_csv('./data/'+filename)
    df = df.replace({np.nan: None})
    response = {
        'data': df.to_dict(orient='records')
    }
    return Response(json.dumps(response), mimetype='application/json')

if __name__ == '__main__':
    app.run(debug=True, port=5001)
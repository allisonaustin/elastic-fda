import pandas as pd
import numpy as np
import json
from flask import Flask, jsonify, Response, request
from flask_cors import CORS
from streaming_elastic import StreamingDepth

app = Flask(__name__)
cors = CORS(app)

df = pd.DataFrame()
depths = StreamingDepth()
fname = ''

@app.route("/getData/<filename>")
def get_data(filename):
    global fname 
    global df 

    fname = filename
    df = pd.read_csv('./data/'+filename)
    df = df.replace({np.nan: None})

    return get_outliers()


@app.route("/getOutliers/<k>/<threshold>")
def get_outliers(k=1.5, threshold=0.5, start=None, end=None):
    global df 
    global depths

    if (start == None):
        start = round(len(df) * 0.3)
    if (end == None):
        end = round(len(df) * 0.5)

    values_df = df.drop('timestamp', axis=1) \
        .apply(pd.to_numeric, errors='coerce')
    
    F = values_df.loc[start:end].to_numpy()
    depths = StreamingDepth(F)
    depths.k = float(k)
    depths.threshold = float(threshold)
    elastic_out = depths.elastic_outliers()

    depths_df = pd.DataFrame(elastic_out.depths)
    labels_df = pd.DataFrame(elastic_out.labels)
    depths_df['measurement'] = values_df.columns.tolist()
    labels_df['measurement'] = values_df.columns.tolist()

    response = {
        'data': df.to_dict(orient='records'),
        'depths': depths_df.to_dict(),
        'labels': labels_df.to_dict()   
    }
    return Response(json.dumps(response), mimetype='application/json')

if __name__ == '__main__':
    app.run(debug=True, port=5001)
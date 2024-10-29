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

@app.route("/getData/<filename>")
def get_data(filename):
    df = pd.read_csv('./data/'+filename)
    df = df.replace({np.nan: None})

    start = round(len(df) * 0.3)
    end = round(len(df) * 0.5)

    # removing timestamp column for computing amplitude and phase depths
    values_df = df.drop('timestamp', axis=1)
    F = values_df.loc[start:end].to_numpy()
    depths = StreamingDepth(F)
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
# Conveyor Belt AI System — Node.js / JavaScript

This is the converted version of the uploaded Conveyor Belt AI project.

### What was converted
- Python FastAPI backend → Node.js + Express
- Python dataset service → JavaScript CSV service
- Python model service / `con.py` → JavaScript XGBoost JSON inference engine
- Python prediction service → JavaScript
- Python streaming service → JavaScript timers/WebSocket broadcasting
- Python WebSocket manager → Node.js `ws`
- `predict.py` → `backend/predict.js`
- `predict_live.py` → `backend/predict-live.js`
- `run_server.py` → `run-server.js`
- `run_system.py` → `run-system.js`
- `train_model.py` → `backend/train-model.js` (optional JS training path)

The frontend was already HTML/CSS/JavaScript, so it was retained.

### Important
The original trained XGBoost model is preserved as `model/model.json`. The Node prediction engine reads the XGBoost JSON tree structure directly, so Python, pandas, scikit-learn and pickle are not required for normal inference.

The JavaScript inference was checked against the original Python XGBoost model on sample dataset rows; the predicted class and probabilities match to normal floating-point precision.

## Run the project

### 1. Open terminal in this folder
```bash
cd conveyor_ai_system_node
```

### 2. Install Node dependencies
```bash
npm install
```

### 3. Start backend + frontend
```bash
npm start
```

Then open:
- `http://localhost:8000/dashboard`
- `http://localhost:8000/fault-analysis`
- `http://localhost:8000/predictive-maintenance`
- `http://localhost:8000/sensor-health`

### Development mode
```bash
npm run dev
```

### Test the model without starting the web server
```bash
npm run predict
```

### Test simulated live prediction
```bash
npm run live:simulate
```

## Main API endpoints

- `GET /api/health`
- `GET /api/status`
- `GET /api/dataset/info`
- `POST /api/predict`
- `POST /api/inject`
- `POST /api/stream/start`
- `POST /api/stream/pause`
- `POST /api/stream/stop`
- `POST /api/stream/reset`
- `POST /api/stream/inject-row`
- `GET /api/stream/status`
- `GET /api/fault-summary`
- `GET /api/sensor-status`
- WebSocket: `/ws`

## Folder structure

```text
conveyor_ai_system_node/
├── backend/
│   ├── config.js
│   ├── dataset-service.js
│   ├── model-service.js
│   ├── prediction-service.js
│   ├── stream-service.js
│   ├── websocket-manager.js
│   ├── hardware.js
│   ├── predict.js
│   ├── predict-live.js
│   └── train-model.js
├── data/
├── frontend/
├── model/
│   ├── model.json
│   ├── feature_columns.json
│   └── label_classes.json
├── server.js
├── run-server.js
├── run-system.js
├── package.json
└── README.md
```

### Note about Raspberry Pi hardware
The web application is immediately runnable in dataset/simulation mode. The hardware boundary is isolated in `backend/hardware.js`, and live sensor packets can be injected through `/api/inject`. This keeps the dashboard/API contract unchanged while avoiding a Python runtime.

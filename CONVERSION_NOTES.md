# Python → JavaScript conversion map

| Original Python | Node.js replacement |
|---|---|
| backend/main.py | server.js |
| backend/config.py | backend/config.js |
| backend/dataset_service.py | backend/dataset-service.js |
| backend/model_service.py + con.py | backend/model-service.js |
| backend/prediction_service.py | backend/prediction-service.js |
| backend/stream_service.py | backend/stream-service.js |
| backend/websocket_manager.py | backend/websocket-manager.js |
| predict.py | backend/predict.js |
| predict_live.py | backend/predict-live.js |

No Python source, Python bytecode, or pickle model files are included in the converted runtime.

The frontend was already JavaScript/HTML/CSS, so it was retained instead of unnecessarily rewriting it.

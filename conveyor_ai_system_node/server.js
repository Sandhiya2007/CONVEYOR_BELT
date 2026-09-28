const express=require("express");
const cors=require("cors");
const http=require("node:http");
const path=require("node:path");
const {WebSocketServer}=require("ws");
const {
  HOST,PORT,LAN_IP,FRONTEND_DIR,SENSOR_SPECS
}=require("./backend/config");
const {DatasetService}=require("./backend/dataset-service");
const {ModelService}=require("./backend/model-service");
const {PredictionService}=require("./backend/prediction-service");
const {WebSocketManager}=require("./backend/websocket-manager");
const {StreamService}=require("./backend/stream-service");

const app=express();
app.use(cors({origin:true,credentials:true}));
app.use(express.json({limit:"2mb"}));
app.use("/css",express.static(path.join(FRONTEND_DIR,"css")));
app.use("/js",express.static(path.join(FRONTEND_DIR,"js")));
app.use("/assets",express.static(path.join(FRONTEND_DIR,"assets")));

const datasetService=new DatasetService();
const modelService=new ModelService();
const predictionService=new PredictionService(modelService);
const wsManager=new WebSocketManager();
const streamService=new StreamService(datasetService,predictionService,wsManager);

function page(file){return (req,res)=>res.sendFile(path.join(FRONTEND_DIR,file));}
app.get("/",page("dashboard.html"));
app.get("/dashboard",page("dashboard.html"));
app.get("/control",page("dashboard.html")); // original ZIP has no control.html; dashboard remains usable
app.get("/simulation",page("dashboard.html"));
app.get("/fault-analysis",page("fault-analysis.html"));
app.get("/predictive-maintenance",page("predictive-maintenance.html"));
app.get("/sensor-health",page("sensor-health.html"));

app.get("/api/health",(req,res)=>{
  const healthy=modelService.isLoaded&&datasetService.isLoaded;
  res.status(healthy?200:503).json({status:healthy?"healthy":"degraded",model_loaded:modelService.isLoaded,
    model_error:modelService.loadError,dataset_loaded:datasetService.isLoaded,dataset_error:datasetService.loadError,
    total_rows:datasetService.totalRows,timestamp:new Date().toISOString()});
});
app.get("/api/status",(req,res)=>res.json({
  title:"Intelligent Conveyor Belt AI Monitoring",
  project:"Monitoring & Prediction of Conveyor Belt Joint Rupture and Damages",
  industry:"Iron Ore Mining Industry",conveyor_id:"LINE-01-PRIMARY-FEEDER",
  server_time:new Date().toISOString().replace("T"," ").slice(0,19),host:HOST,port:PORT,lan_ip:LAN_IP,
  dashboard_url:`http://${LAN_IP}:${PORT}/dashboard`,control_url:`http://${LAN_IP}:${PORT}/control`,
  model_status:{loaded:modelService.isLoaded,feature_columns:modelService.featureColumns,classes:modelService.classes,error:modelService.loadError},
  dataset_status:{loaded:datasetService.isLoaded,filename:path.basename(datasetService.datasetPath),total_rows:datasetService.totalRows,
    detected_classes:datasetService.detectedClasses,class_counts:datasetService.classCounts},
  stream_status:streamService.getStatus(),connected_ws_clients:wsManager.clients.size
}));
app.get("/api/dataset/info",(req,res)=>res.json(datasetService.getInfo()));
app.post("/api/predict",(req,res)=>{
  try{if(!modelService.isLoaded)return res.status(500).json({success:false,error:modelService.loadError||"Model not loaded"});
    res.json(modelService.predict(req.body));}
  catch(err){res.status(400).json({success:false,error:err.message});}
});
app.post("/api/inject",(req,res)=>{
  try{res.json({status:"success",message:"Telemetry received and broadcasted to monitoring displays.",packet:streamService.injectSensorPayload(req.body)});}
  catch(err){res.status(400).json({detail:err.message});}
});
app.post("/api/stream/start",(req,res)=>{
  try{const b=req.body||{};streamService.startStream(b.start_row??1,b.end_row??datasetService.totalRows,b.speed??2);
    res.json({status:"success",message:"Data stream started.",stream_status:streamService.getStatus()});}
  catch(err){res.status(400).json({detail:err.message});}
});
app.post("/api/stream/pause",(req,res)=>{streamService.pauseStream();res.json({status:"success",message:"Data stream paused.",stream_status:streamService.getStatus()});});
app.post("/api/stream/stop",(req,res)=>{streamService.stopStream();res.json({status:"success",message:"Data stream stopped.",stream_status:streamService.getStatus()});});
app.post("/api/stream/reset",(req,res)=>{streamService.resetStream();res.json({status:"success",message:"Data stream and metrics reset.",stream_status:streamService.getStatus()});});
app.post("/api/stream/inject-row",(req,res)=>{
  try{const row=Number(req.body?.row_number);const packet=streamService.injectRow(row);res.json({status:"success",row_number:row,packet});}
  catch(err){res.status(400).json({detail:err.message});}
});
app.get("/api/stream/status",(req,res)=>res.json(streamService.getStatus()));
app.get("/api/fault-summary",(req,res)=>res.json(streamService.getFaultSummary()));
app.get("/api/sensor-status",(req,res)=>{
  const sensors=Object.entries(SENSOR_SPECS).map(([id,s])=>({...s,id,status:"DEMO / DATASET MODE",signal_quality:"99.2%",last_update:"Synchronized with Dataset Stream"}));
  res.json({bus_controller:"Raspberry Pi 4B Industrial Carrier (Future Hardware)",mode:streamService.mode,
    mode_label:streamService.mode==="DEMO"?"DEMO / DATASET MODE":"LIVE HARDWARE STREAM",
    note:"Currently operating in DEMO / DATASET SIMULATION mode using synthetic_motor_fault_dataset.csv. Physical sensors can connect through the Node.js hardware adapter.",
    sensors});
});

const server=http.createServer(app);
const wss=new WebSocketServer({server,path:"/ws"});
wss.on("connection",(ws)=>{
  wsManager.add(ws);
  ws.send(JSON.stringify({type:"CONNECTION_ESTABLISHED",server_time:new Date().toISOString().replace("T"," ").slice(0,19),
    dataset_info:datasetService.getInfo(),stream_status:streamService.getStatus()}));
  ws.on("close",()=>wsManager.remove(ws));
  ws.on("error",()=>wsManager.remove(ws));
  ws.on("message",()=>{});
});

server.listen(PORT,HOST,()=>{
  console.log("=".repeat(65));
  console.log("  CONVEYOR BELT AI INDUSTRIAL MONITORING SYSTEM");
  console.log(`  Local Dashboard:    http://localhost:${PORT}/dashboard`);
  console.log(`  LAN Access:         http://${LAN_IP}:${PORT}/dashboard`);
  console.log(`  Control:            http://${LAN_IP}:${PORT}/control`);
  console.log(`  Dataset:            ${path.basename(datasetService.datasetPath)} (${datasetService.totalRows} rows)`);
  console.log(`  Model loaded:       ${modelService.isLoaded ? "YES" : "NO"}`);
  if(!modelService.isLoaded) console.log(`  Model error:        ${modelService.loadError}`);
  console.log("=".repeat(65));
});
function shutdown(){streamService.stopStream();wss.close();server.close(()=>process.exit(0));}
process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);

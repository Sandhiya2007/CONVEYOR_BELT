const path = require("node:path");
const os = require("node:os");

const BASE_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(BASE_DIR, "data");
const MODEL_DIR = path.join(BASE_DIR, "model");
const FRONTEND_DIR = path.join(BASE_DIR, "frontend");
const RESULTS_DIR = path.join(BASE_DIR, "results");
const MODEL_PATH = path.join(MODEL_DIR, "model.json");
const CLASSES_PATH = path.join(MODEL_DIR, "label_classes.json");
const FEATURES_PATH = path.join(MODEL_DIR, "feature_columns.json");
const DATASET_PATH = path.join(DATA_DIR, "synthetic_motor_fault_dataset.csv");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8000);

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const item of entries || []) {
      if (item.family === "IPv4" && !item.internal) return item.address;
    }
  }
  return "127.0.0.1";
}

const LAN_IP = getLanIp();

const TARGET_COLUMN = "Belt_Condition";
const ID_COLUMN = "ID";
const OPERATING_HOURS_COLUMN = "Operating_Hours";
const NON_FEATURE_COLUMNS = [ID_COLUMN, TARGET_COLUMN];

const DEFAULT_CLASSES = ["normal load","overload","misalignment","splice rupture"];
const CLASS_DISPLAY_NAMES = {
  "normal load":"NORMAL LOAD","overload":"OVERLOAD","misalignment":"MISALIGNMENT",
  "splice rupture":"SPLICE RUPTURE","belt tear":"BELT TEAR"
};
const SEVERITY_MAP = {
  "normal load":"NORMAL","overload":"WARNING","misalignment":"WARNING",
  "splice rupture":"CRITICAL","belt tear":"CRITICAL"
};
const MAINTENANCE_RECOMMENDATIONS = {
  "normal load":"MONITOR","overload":"INSPECT LOAD / DRIVE SYSTEM",
  "misalignment":"INSPECT BELT ALIGNMENT","splice rupture":"IMMEDIATE INSPECTION",
  "belt tear":"IMMEDIATE INSPECTION"
};
const DIGITAL_TWIN_STATUS = {
  "normal load":{color:"#00ff9d",label:"NORMAL LOAD - NOMINAL OPERATION"},
  "overload":{color:"#f59e0b",label:"OVERLOAD - EXCESS CONVEYOR TONNAGE"},
  "misalignment":{color:"#f97316",label:"MISALIGNMENT - BELT TRACKING DRIFT"},
  "splice rupture":{color:"#ef4444",label:"SPLICE RUPTURE - JOINT FAILURE"},
  "belt tear":{color:"#ef4444",label:"BELT TEAR - CRITICAL SURFACE DAMAGE"}
};

const SENSOR_SPECS = {
  ZMPT101B:{name:"ZMPT101B Precision Voltage Transformer",parameter:"Voltage RMS",unit:"V",bus:"MCP3208 Analog CH0",nominal_range:"380 - 440 V",sample_rate:"1000 Hz",description:"High-accuracy micro-voltage transformer module for 3-phase industrial supply monitoring"},
  "SCT-013":{name:"SCT-013-000 Non-Invasive Current Transformer",parameter:"Current RMS (Irms)",unit:"A",bus:"MCP3208 Analog CH1",nominal_range:"10 - 30 A",sample_rate:"1000 Hz",description:"Split-core CT measuring AC current draw on conveyor drive motor line"},
  ADXL345:{name:"ADXL345 3-Axis Digital Accelerometer",parameter:"Tri-Axial Vibration (X, Y, Z)",unit:"mm/s, g",bus:"I2C 0x53",nominal_range:"±16g (13-bit)",sample_rate:"3200 Hz",description:"High resolution accelerometer placed on drive bearing housing for joint rupture & vibration diagnostics"},
  DS18B20:{name:"DS18B20 Digital Temperature Sensor",parameter:"Bearing & Motor Temp",unit:"°C",bus:"1-Wire GPIO4",nominal_range:"-55 to +125 °C",sample_rate:"1 Hz",description:"Waterproof digital thermal probe measuring bearing housing and drive gearbox temperatures"},
  MCP3208:{name:"MCP3208 12-Bit 8-Channel SPI ADC",parameter:"Analog Signal Acquisition",unit:"Counts / V",bus:"SPI0 CS0",nominal_range:"0 - 3.3 V",sample_rate:"100 ksps max",description:"Precision analog-to-digital converter interface between industrial transducers and host processor"}
};

module.exports = {
  BASE_DIR,DATA_DIR,MODEL_DIR,FRONTEND_DIR,RESULTS_DIR,MODEL_PATH,CLASSES_PATH,FEATURES_PATH,DATASET_PATH,
  HOST,PORT,LAN_IP,TARGET_COLUMN,ID_COLUMN,OPERATING_HOURS_COLUMN,NON_FEATURE_COLUMNS,
  DEFAULT_CLASSES,CLASS_DISPLAY_NAMES,SEVERITY_MAP,MAINTENANCE_RECOMMENDATIONS,DIGITAL_TWIN_STATUS,SENSOR_SPECS
};

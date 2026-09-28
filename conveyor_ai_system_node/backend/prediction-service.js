const {
  TARGET_COLUMN, ID_COLUMN, OPERATING_HOURS_COLUMN, SEVERITY_MAP,
  MAINTENANCE_RECOMMENDATIONS, CLASS_DISPLAY_NAMES, DIGITAL_TWIN_STATUS
} = require("./config");

function round(n,d=2){ const p=10**d; return Math.round(n*p)/p; }

class PredictionService {
  constructor(modelService){ this.modelService=modelService; }
  getRemainingUsefulLife(condition,confidence,rowNumber=1) {
    const norm=String(condition).trim().toLowerCase();
    const base={"normal load":184,"overload":78,"misalignment":44,"splice rupture":6,"belt tear":4}[norm]??96;
    const fluctuation=(Math.sin(rowNumber*0.3)*3.5)-((1-confidence)*6);
    const rul=Math.max(2,round(base+fluctuation,1));
    const days=Math.floor(rul/24), hours=Math.floor(rul%24);
    const formatted=days>0?`${days} DAYS ${hours} HOURS`:`${hours} HOURS`;
    let degradation,gauge;
    if(rul>120){degradation="LOW";gauge=92;} else if(rul>50){degradation="MEDIUM";gauge=64;}
    else if(rul>15){degradation="HIGH";gauge=35;} else {degradation="CRITICAL";gauge=10;}
    return {rul_hours:rul,rul_formatted:formatted,degradation,maintenance_action:MAINTENANCE_RECOMMENDATIONS[norm]||"MONITOR",
      gauge_percentage:gauge,is_simulated:true,
      disclaimer:"SIMULATED RUL – DEMONSTRATION ONLY (XGBoost Classifier active; awaiting LSTM/GRU RUL model)"};
  }
  processTelemetry(rawRow,rowNumber=1,mode="DEMO"){
    const row={...rawRow};
    const actual=String(row[TARGET_COLUMN]??row[TARGET_COLUMN.toLowerCase()]??row.Label??"UNKNOWN").trim();
    const rowId=Number(row[ID_COLUMN]??rowNumber);
    const operatingHours=round(Number(row[OPERATING_HOURS_COLUMN]??1248.5),1);
    const timestamp=String(row.Timestamp||new Date().toISOString().replace("T"," ").slice(0,19));
    const result=this.modelService.predict(row);
    const prediction=result.prediction, confidence=Number(result.confidence), probabilities=result.probabilities;
    const normPred=prediction.toLowerCase(), normActual=actual.toLowerCase();
    const correct=actual!=="UNKNOWN" ? normActual===normPred : null;
    const status=SEVERITY_MAP[normPred]||"WARNING";
    const recommendation=MAINTENANCE_RECOMMENDATIONS[normPred]||"MONITOR";
    let health=status==="NORMAL"?92+confidence*7.5:status==="WARNING"?58+confidence*12:15+(1-confidence)*20;
    health=Math.min(99.9,Math.max(5,health));
    const num=(k,def)=>Number.isFinite(Number(row[k]))?Number(row[k]):def;
    const sensor={
      Voltage_RMS:round(num("Voltage_RMS",415.2),2),Irms:round(num("Irms",18.4),2),
      Power_Factor:round(num("Power_Factor",.91),3),Phase_Angle:round(num("Phase_Angle",24.5),2),
      I_THD:round(num("I_THD",3.2),2),Vibration_X:round(num("Vibration_X",.12),3),
      Vibration_Y:round(num("Vibration_Y",.08),3),Vibration_Z:round(num("Vibration_Z",9.81),3),
      RMS_Vibration:round(num("RMS_Vibration",2.84),3),Peak_Acceleration:round(num("Peak_Acceleration",4.12),3),
      Kurtosis:round(num("Kurtosis",3.1),2),Skewness:round(num("Skewness",.15),3),
      Variance:round(num("Variance",.85),3),Peak_to_Peak:round(num("Peak_to_Peak",8.24),3),
      Dominant_Frequency:round(num("Dominant_Frequency",49.8),1),Spectral_Energy:round(num("Spectral_Energy",145.2),2),
      Operating_Hours:operatingHours
    };
    const i=sensor.Irms,v=sensor.RMS_Vibration;
    sensor.Motor_Temperature=round(52+i*.75+(status==="CRITICAL"?14:0),1);
    sensor.Bearing_Temperature=round(48+v*4.2+(["splice rupture","misalignment"].includes(normPred)?18:0),1);
    sensor.Gearbox_Temperature=round(50+i*.42+(normPred==="overload"?10:0),1);
    let beltSpeed,motorRpm,load,flow,tension;
    if(normPred==="overload"){beltSpeed=2.92;motorRpm=1430;load=1480;flow=1890;tension=58.2;}
    else if(normPred==="misalignment"){beltSpeed=3.08;motorRpm=1465;load=890;flow=1180;tension=47.4;}
    else if(["splice rupture","belt tear"].includes(normPred)){beltSpeed=2.75;motorRpm=1410;load=920;flow=1200;tension=62.5;}
    else {beltSpeed=round(3.20+Math.sin(rowNumber*.1)*.04,2);motorRpm=Math.trunc(1480+(18.4-i)*4);load=round(850+(i-18)*32,1);flow=round(load*1.34,1);tension=round(41.5+(i-18)*.5,1);}
    Object.assign(sensor,{Belt_Speed:beltSpeed,Motor_RPM:motorRpm,Conveyor_Load:load,Material_Flow_Rate:flow,Belt_Tension:tension});
    return {
      row_number:rowNumber,row_id:rowId,timestamp,operating_hours:operatingHours,sensor_data:sensor,
      actual_condition:actual,actual_display_name:CLASS_DISPLAY_NAMES[normActual]||actual.toUpperCase(),
      prediction,prediction_display_name:CLASS_DISPLAY_NAMES[normPred]||prediction.toUpperCase(),
      confidence:round(confidence*100,2),confidence_ratio:confidence,correct,status,
      probabilities:Object.fromEntries(Object.entries(probabilities).map(([k,v])=>[k,round(v*100,2)])),
      probabilities_ratio:probabilities,health_score:round(health,1),recommendation,
      rul:this.getRemainingUsefulLife(prediction,confidence,rowNumber,operatingHours),
      digital_twin:DIGITAL_TWIN_STATUS[normPred]||{color:"#00ff9d",label:`${prediction.toUpperCase()} - MONITORED`},mode
    };
  }
}
module.exports={PredictionService};

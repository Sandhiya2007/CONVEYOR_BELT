const readline=require("node:readline");
const {ModelService}=require("./model-service");
const {FEATURES_PATH}=require("./config");
const fs=require("node:fs");

const model=new ModelService();
const featureColumns=JSON.parse(fs.readFileSync(FEATURES_PATH,"utf8"));

function normal(mean,sd){let u=0,v=0;while(u===0)u=Math.random();while(v===0)v=Math.random();return mean+sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function buildSimulatedRow(){
  const row={
    Voltage_RMS:normal(238,1.5),Irms:normal(.9,.25),Power_Factor:normal(.92,.02),
    Phase_Angle:normal(.39,.08),I_THD:Math.abs(normal(.03,.02)),
    Vibration_X:Math.abs(normal(.16,.05)),Vibration_Y:Math.abs(normal(.28,.08)),Vibration_Z:Math.abs(normal(.27,.08)),
    RMS_Vibration:Math.abs(normal(.18,.05)),Peak_Acceleration:Math.abs(normal(.9,.5)),
    Kurtosis:normal(1,2),Skewness:normal(.5,.5),Variance:Math.abs(normal(.02,.01)),
    Peak_to_Peak:Math.abs(normal(1.1,.5)),Dominant_Frequency:Math.abs(normal(90,30)),Spectral_Energy:Math.abs(normal(90000,30000)),
    Operating_Hours:normal(1248,25)
  };
  return Object.fromEntries(featureColumns.map(k=>[k,row[k]]));
}
async function main(){
  console.log("Loading model...");
  if(!model.isLoaded)throw new Error(model.loadError);
  console.log(`Model loaded. Classes: ${model.classes.join(", ")}`);
  console.log("Simulate mode: no hardware is used.");
  const rl=readline.createInterface({input:process.stdin,output:process.stdout});
  const ask=()=>new Promise(resolve=>rl.question("Press ENTER to simulate a button press (Ctrl+C to quit)... ",resolve));
  while(true){
    await ask();
    const t=Date.now();const row=buildSimulatedRow();const r=model.predict(row);
    console.log(`[${new Date().toISOString().replace("T"," ").slice(0,19)}] Prediction: ${r.prediction} (confidence ${(r.confidence*100).toFixed(1)}%, took ${((Date.now()-t)/1000).toFixed(2)}s)`);
    for(const [cls,p] of Object.entries(r.probabilities).sort((a,b)=>b[1]-a[1]))console.log(`  ${cls.padEnd(18)} ${(p*100).toFixed(1)}%`);
    console.log();
  }
}
if(require.main===module){main().catch(e=>{console.error(e);process.exit(1);});}
module.exports={buildSimulatedRow};

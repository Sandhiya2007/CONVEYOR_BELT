const fs=require("node:fs");
const path=require("node:path");
const {DatasetService}=require("./dataset-service");
const {ModelService}=require("./model-service");
const {DATASET_PATH}=require("./config");

const args=process.argv.slice(2);
const getArg=(name,def)=>{const i=args.indexOf(name);return i>=0?args[i+1]:def;};
const model=new ModelService();
if(!model.isLoaded){console.error(model.loadError);process.exit(1);}
const csv=getArg("--csv",null);
const sample=args.includes("--sample")||!csv;
const dataset=new DatasetService(csv||DATASET_PATH);

if(sample){
  const {row}=dataset.getRow(1);
  const result=model.predict(row);
  console.log("[SAMPLE INFERENCE]");
  console.log("Ground Truth:",row.Belt_Condition||"Unknown");
  console.log(`Prediction:   ${result.prediction} (${(result.confidence*100).toFixed(1)}% confidence)`);
  console.log("Probabilities:",Object.fromEntries(Object.entries(result.probabilities).map(([k,v])=>[k,`${(v*100).toFixed(2)}%`])));
} else {
  const out=getArg("--out","predictions.csv");
  const lines=["Predicted_Condition,Confidence"];
  for(const row of dataset.rows){const r=model.predict(row);lines.push(`${JSON.stringify(r.prediction)},${(r.confidence*100).toFixed(2)}`);}
  fs.writeFileSync(out,lines.join("\n"));
  console.log(`Saved predictions to ${path.resolve(out)}`);
}

const fs=require("node:fs");
const path=require("node:path");
const {parse}=require("csv-parse/sync");
const {XGBModel}=require("@wlearn/xgboost");
const {DATASET_PATH,MODEL_DIR,CLASSES_PATH,FEATURES_PATH}=require("./config");

async function main(){
  const csv=process.argv[2]||DATASET_PATH;
  const rows=parse(fs.readFileSync(csv,"utf8"),{columns:true,skip_empty_lines:true,trim:true});
  const features=Object.keys(rows[0]).filter(c=>c!=="ID"&&c!=="Belt_Condition");
  const classes=[...new Set(rows.map(r=>String(r.Belt_Condition).trim()))].sort();
  const map=new Map(classes.map((c,i)=>[c,i]));
  const X=rows.map(r=>features.map(f=>Number(r[f])));
  const y=rows.map(r=>map.get(String(r.Belt_Condition).trim()));
  const model=await XGBModel.create({objective:"multi:softprob",num_class:classes.length,max_depth:6,eta:.3,numRound:300,subsample:.9,colsample_bytree:.9});
  model.fit(X,y);
  fs.mkdirSync(MODEL_DIR,{recursive:true});
  fs.writeFileSync(CLASSES_PATH,JSON.stringify(classes,null,2));
  fs.writeFileSync(FEATURES_PATH,JSON.stringify(features,null,2));
  fs.writeFileSync(path.join(MODEL_DIR,"model.wlrn"),Buffer.from(model.save()));
  console.log("Training completed. New JS model bundle: model/model.wlrn");
  model.dispose();
}
main().catch(err=>{console.error(err);process.exit(1);});

const fs = require("node:fs");
const { parse } = require("csv-parse/sync");
const { DATASET_PATH, TARGET_COLUMN, ID_COLUMN, OPERATING_HOURS_COLUMN, CLASS_DISPLAY_NAMES } = require("./config");

class DatasetService {
  constructor(datasetPath=DATASET_PATH) {
    this.datasetPath=datasetPath;
    this.rows=[]; this.totalRows=0; this.columns=[]; this.featureColumns=[];
    this.detectedClasses=[]; this.classCounts={}; this.isLoaded=false; this.loadError=null;
    this.loadDataset();
  }
  loadDataset() {
    try {
      if (!fs.existsSync(this.datasetPath)) throw new Error(`Dataset CSV not found at: ${this.datasetPath}`);
      const text=fs.readFileSync(this.datasetPath,"utf8");
      this.rows=parse(text,{columns:true,skip_empty_lines:true,relax_column_count:true,trim:true});
      this.totalRows=this.rows.length;
      this.columns=this.rows.length ? Object.keys(this.rows[0]) : [];
      if (!this.columns.includes(TARGET_COLUMN)) throw new Error(`Target column '${TARGET_COLUMN}' not found in dataset columns: ${this.columns.join(", ")}`);
      this.featureColumns=this.columns.filter(c=>c!==ID_COLUMN && c!==TARGET_COLUMN);
      this.detectedClasses=[...new Set(this.rows.map(r=>String(r[TARGET_COLUMN]??"").trim()).filter(Boolean))].sort();
      for(const r of this.rows){ const k=String(r[TARGET_COLUMN]??"").trim(); this.classCounts[k]=(this.classCounts[k]||0)+1; }
      this.isLoaded=true; this.loadError=null;
    } catch(err) { this.isLoaded=false; this.loadError=err.message; }
  }
  getRow(rowIdx) {
    if(!this.isLoaded) throw new Error(`Dataset is not loaded. Error: ${this.loadError}`);
    if(rowIdx<1 || rowIdx>this.totalRows) throw new Error(`Row ${rowIdx} is out of bounds (1 to ${this.totalRows}).`);
    const row=this.rows[rowIdx-1];
    const features={};
    for(const col of this.featureColumns) features[col]=Number(row[col]);
    return {
      row,
      features,
      actualCondition:String(row[TARGET_COLUMN]??"").trim(),
      rowId:Number(row[ID_COLUMN]??rowIdx),
      operatingHours:Number(row[OPERATING_HOURS_COLUMN]??0)
    };
  }
  getInfo() {
    if(!this.isLoaded) return {loaded:false,error:this.loadError||"Dataset not loaded",filename:this.datasetPath.split(/[\\/]/).pop()};
    const conditions=this.detectedClasses.map(cls=>({
      raw_label:cls,display_name:CLASS_DISPLAY_NAMES[cls]||cls.toUpperCase(),sample_count:this.classCounts[cls]||0
    }));
    return {
      loaded:true,filename:this.datasetPath.split(/[\\/]/).pop(),filepath:this.datasetPath,total_rows:this.totalRows,
      total_columns:this.columns.length,target_column:TARGET_COLUMN,id_column:ID_COLUMN,
      operating_hours_column:OPERATING_HOURS_COLUMN,columns:this.columns,feature_columns:this.featureColumns,
      detected_classes:this.detectedClasses,class_counts:this.classCounts,conditions,
      active_mode_label:"DATASET SIMULATION ACTIVE",
      disclaimer:`DATASET SIMULATION ACTIVE: synthetic_motor_fault_dataset.csv (${this.totalRows} Samples)`
    };
  }
}
module.exports = { DatasetService };

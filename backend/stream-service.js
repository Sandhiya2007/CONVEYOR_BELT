class StreamService {
  constructor(dataset,prediction,ws){
    this.dataset=dataset;this.prediction=prediction;this.ws=ws;
    this.isStreaming=false;this.isPaused=false;this.currentRow=1;this.startRow=1;this.endRow=dataset.totalRows;
    this.speedSeconds=2;this.mode="DEMO";this.timer=null;
    this.totalProcessed=0;this.correctPredictions=0;this.incorrectPredictions=0;this.runningAccuracy=100;
    this.recentHistory=[];this.recentAlerts=[];this.conditionCounts={};this.initCounts();
  }
  initCounts(){this.conditionCounts={};for(const c of this.dataset.detectedClasses)this.conditionCounts[c]=0;}
  updateMetrics(packet){
    this.totalProcessed++;
    const pred=packet.prediction;
    if(pred in this.conditionCounts)this.conditionCounts[pred]++;else this.conditionCounts[pred]=1;
    if(packet.correct===true)this.correctPredictions++;else if(packet.correct===false)this.incorrectPredictions++;
    const total=this.correctPredictions+this.incorrectPredictions;
    this.runningAccuracy=total>0?Math.round(this.correctPredictions/total*10000)/100:100;
    const item={row:packet.row_number,row_id:packet.row_id,timestamp:packet.timestamp,operating_hours:packet.operating_hours,
      actual:packet.actual_condition,actual_display:packet.actual_display_name,predicted:pred,predicted_display:packet.prediction_display_name,
      confidence:packet.confidence,correct:packet.correct,status:packet.status};
    this.recentHistory.unshift(item);if(this.recentHistory.length>100)this.recentHistory.pop();
    if(packet.status==="WARNING"||packet.status==="CRITICAL"||this.totalProcessed===1){
      this.recentAlerts.unshift({id:`alert_${this.totalProcessed}`,timestamp:packet.timestamp,condition:pred,
        display_name:packet.prediction_display_name,status:packet.status,confidence:packet.confidence,
        actual:packet.actual_condition,action:packet.recommendation});
      if(this.recentAlerts.length>50)this.recentAlerts.pop();
    }
  }
  processRow(rowNumber){
    const {row}=this.dataset.getRow(rowNumber);
    const packet=this.prediction.processTelemetry(row,rowNumber,this.mode);
    this.updateMetrics(packet);packet.stream_status=this.getStatus();this.ws.broadcast(packet);
  }
  startStream(startRow=1,endRow=this.dataset.totalRows,speed=2){
    if(!this.dataset.isLoaded)throw new Error("Cannot start stream: Dataset CSV is not loaded.");
    this.startRow=Math.max(1,Math.min(Number(startRow)||1,this.dataset.totalRows));
    this.currentRow=Math.max(this.startRow,Math.min(this.currentRow||this.startRow,this.dataset.totalRows));
    this.currentRow=this.startRow;
    this.endRow=Math.max(this.startRow,Math.min(Number(endRow)||this.dataset.totalRows,this.dataset.totalRows));
    this.speedSeconds=Math.max(.2,Number(speed)||2);this.isPaused=false;this.mode="DEMO";
    if(this.isStreaming)return;
    this.isStreaming=true;this.scheduleNext();
  }
  scheduleNext(){
    if(!this.isStreaming)return;
    if(!this.isPaused){
      if(this.currentRow>this.endRow)this.currentRow=this.startRow;
      try{this.processRow(this.currentRow);}catch(err){console.error("Streaming error:",err);this.stopStream();return;}
      this.currentRow++;if(this.currentRow>this.endRow)this.currentRow=this.startRow;
    }
    this.timer=setTimeout(()=>this.scheduleNext(),this.speedSeconds*1000);
  }
  pauseStream(){this.isPaused=true;}
  stopStream(){this.isStreaming=false;this.isPaused=false;if(this.timer){clearTimeout(this.timer);this.timer=null;}}
  resetStream(){this.stopStream();this.currentRow=1;this.startRow=1;this.endRow=this.dataset.totalRows;this.totalProcessed=0;this.correctPredictions=0;this.incorrectPredictions=0;this.runningAccuracy=100;this.recentHistory=[];this.recentAlerts=[];this.initCounts();}
  injectRow(rowNumber){const {row}=this.dataset.getRow(Number(rowNumber));const packet=this.prediction.processTelemetry(row,Number(rowNumber),"DEMO");this.updateMetrics(packet);packet.stream_status=this.getStatus();this.ws.broadcast(packet);return packet;}
  injectSensorPayload(sensorDict){this.mode="LIVE";const rowNumber=this.totalProcessed+1;const packet=this.prediction.processTelemetry(sensorDict,rowNumber,"LIVE");this.updateMetrics(packet);packet.stream_status=this.getStatus();this.ws.broadcast(packet);return packet;}
  getFaultSummary(){return {total_samples:this.dataset.totalRows,total_processed:this.totalProcessed,correct_predictions:this.correctPredictions,
    incorrect_predictions:this.incorrectPredictions,running_accuracy:this.runningAccuracy,
    current_condition:this.recentHistory[0]?.predicted||"normal load",condition_counts:this.conditionCounts,
    dataset_distribution:this.dataset.classCounts,recent_history:this.recentHistory.slice(0,50),recent_alerts:this.recentAlerts.slice(0,25)};}
  getStatus(){return {is_streaming:this.isStreaming,is_paused:this.isPaused,current_row:this.currentRow,start_row:this.startRow,
    end_row:this.endRow,total_rows:this.dataset.totalRows,progress_percentage:Math.round(this.currentRow/Math.max(1,this.dataset.totalRows)*10000)/100,
    speed_seconds:this.speedSeconds,mode:this.mode,active_mode_label:this.mode==="DEMO"?"DATASET SIMULATION ACTIVE":"LIVE SENSOR STREAM",
    total_processed:this.totalProcessed,correct_predictions:this.correctPredictions,incorrect_predictions:this.incorrectPredictions,running_accuracy:this.runningAccuracy};}
}
module.exports={StreamService};

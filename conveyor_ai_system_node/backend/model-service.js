const fs = require("node:fs");
const { MODEL_PATH, CLASSES_PATH, FEATURES_PATH } = require("./config");

function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map(v => Math.exp(v - max));
  const sum = exps.reduce((a,b) => a+b, 0);
  return exps.map(v => v / sum);
}

class XGBoostJsonModel {
  constructor(modelPath = MODEL_PATH) {
    this.modelPath = modelPath;
    this.model = JSON.parse(fs.readFileSync(modelPath, "utf8"));
    const learner = this.model.learner;
    this.featureNames = learner.feature_names || [];
    this.numClass = Number(learner.learner_model_param.num_class || 1);
    this.baseScore = this.parseBaseScore(learner.learner_model_param.base_score);
    const gm = learner.gradient_booster.model;
    this.trees = gm.trees;
    this.treeInfo = gm.tree_info.map(Number);
    this.loaded = true;
  }

  parseBaseScore(raw) {
    if (Array.isArray(raw)) return raw.map(Number);
    if (typeof raw === "number") return [raw];
    if (typeof raw !== "string") return [0];
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.map(Number) : [Number(v)];
    } catch {
      return raw.replace(/^\[|\]$/g,"").split(",").map(x => Number(x.replace(/[^0-9eE+.\-]/g,"")) || 0);
    }
  }

  featureVector(input) {
    return this.featureNames.map(name => {
      const value = input[name];
      const n = Number(value);
      return Number.isFinite(n) ? n : NaN;
    });
  }

  evalTree(tree, x) {
    let node = 0;
    while (tree.left_children[node] !== -1) {
      const feature = Number(tree.split_indices[node]);
      const threshold = Number(tree.split_conditions[node]);
      const value = x[feature];
      if (!Number.isFinite(value)) {
        const goLeft = Boolean(Number(tree.default_left[node]));
        node = goLeft ? tree.left_children[node] : tree.right_children[node];
      } else {
        // XGBoost numerical split: values strictly less than threshold go left.
        node = value < threshold ? tree.left_children[node] : tree.right_children[node];
      }
    }
    return Number(tree.split_conditions[node]);
  }

  predictProba(input) {
    const x = this.featureVector(input);
    const scores = Array.from({length:this.numClass}, () => 0);
    for (let i=0; i<this.trees.length; i++) {
      const cls = this.treeInfo[i];
      scores[cls] += this.evalTree(this.trees[i], x);
    }
    for (let c=0; c<this.numClass; c++) {
      scores[c] += Number(this.baseScore[c] || 0);
    }
    return softmax(scores);
  }

  predict(input, classes) {
    const probabilities = this.predictProba(input);
    let idx = 0;
    for (let i=1; i<probabilities.length; i++) {
      if (probabilities[i] > probabilities[idx]) idx = i;
    }
    const label = classes[idx] ?? String(idx);
    return {
      prediction: label,
      confidence: probabilities[idx],
      probabilities: Object.fromEntries(classes.map((c,i) => [c, probabilities[i] ?? 0]))
    };
  }
}

class ModelService {
  constructor() {
    this.model = null;
    this.classes = [];
    this.featureColumns = [];
    this.isLoaded = false;
    this.loadError = null;
    this.loadArtifacts();
  }
  loadArtifacts() {
    try {
      this.model = new XGBoostJsonModel(MODEL_PATH);
      this.classes = JSON.parse(fs.readFileSync(CLASSES_PATH, "utf8"));
      this.featureColumns = JSON.parse(fs.readFileSync(FEATURES_PATH, "utf8"));
      this.isLoaded = true;
    } catch (err) {
      this.isLoaded = false;
      this.loadError = err.message;
    }
  }
  validateFeatures(input) {
    const row = {};
    for (const key of this.featureColumns) {
      if (!(key in input)) throw new Error(`Missing required feature: ${key}`);
      const value = Number(input[key]);
      if (!Number.isFinite(value)) throw new Error(`Invalid numeric value for feature: ${key}`);
      row[key] = value;
    }
    return row;
  }
  predict(input) {
    if (!this.isLoaded) throw new Error(this.loadError || "Model is not loaded");
    const row = this.validateFeatures(input);
    return this.model.predict(row, this.classes);
  }
  status() {
    return {
      loaded:this.isLoaded,
      model_path:this.modelPath,
      feature_columns:this.featureColumns,
      classes:this.classes,
      error:this.loadError
    };
  }
}
module.exports = { ModelService, XGBoostJsonModel };

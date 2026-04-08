const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const ML_SYSTEM_DIR = path.join(PROJECT_ROOT, 'ml-ranking-system');
const PYTHON_EXECUTABLE = process.env.ML_PYTHON_PATH || 'python';
const PREDICT_SCRIPT_PATH = path.join(ML_SYSTEM_DIR, '08_model_predict.py');
const MODEL_PATH = process.env.ML_MODEL_PATH || path.join(ML_SYSTEM_DIR, 'ranking_model.pkl');
const SCALER_PATH = process.env.ML_SCALER_PATH || path.join(ML_SYSTEM_DIR, 'scaler.pkl');

function runModelPrediction(rows) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      rows,
      modelPath: MODEL_PATH,
      scalerPath: SCALER_PATH
    });

    const child = spawn(PYTHON_EXECUTABLE, [PREDICT_SCRIPT_PATH], {
      cwd: ML_SYSTEM_DIR,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to start ML predictor: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ML predictor exited with code ${code}: ${stderr || 'Unknown error'}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout || '{}');
        resolve(parsed);
      } catch (error) {
        reject(new Error(`Failed to parse ML predictor output: ${error.message}. Raw output: ${stdout}`));
      }
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}

module.exports = {
  runModelPrediction,
  PYTHON_EXECUTABLE,
  PREDICT_SCRIPT_PATH,
  MODEL_PATH,
  SCALER_PATH
};

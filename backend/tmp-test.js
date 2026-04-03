const { analyzeCode } = require('./services/qualityService');
(async () => {
  try {
    const result = await analyzeCode('Project Kick-off & Backend API Design', '');
    console.log('empty repo code result', result);
  } catch (e) {
    console.error('error', e.message, e);
  }
})();
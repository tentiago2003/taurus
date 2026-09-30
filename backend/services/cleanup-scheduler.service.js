const systemSettingsService = require('./systemSettings.service');

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
let intervalId = null;

function runCheck() {
  try {
    const result = systemSettingsService.executeAutomaticCleanupIfDue();
    if (result) {
      console.log(
        `Automatic cleanup executed: ${result.measurements_deleted} measurement(s), ` +
        `${result.raw_messages_deleted} raw message(s).`
      );
    }
  } catch (error) {
    console.error(`Automatic cleanup failed: ${error.message}`);
  }
}

function start() {
  if (intervalId) {
    return;
  }

  runCheck();
  intervalId = setInterval(runCheck, CHECK_INTERVAL_MS);
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = { start, stop, CHECK_INTERVAL_MS };

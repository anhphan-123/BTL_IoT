const hardwareStatus = {
  isOnline: false,
  lastSeen: null
};

const deviceStates = {
  light: false,
  fan: false,
  air_conditioner: false
};

const pendingCommands = new Map();

module.exports = {
  hardwareStatus,
  deviceStates,
  pendingCommands
};
const PACKAGES = {
  '10': {
    duration: 1 * 60 * 60 * 1000, // 1 hour
    label: '1 Hour',
    timeLabel: '1Hr',
  },
  '15': {
    duration: 4 * 60 * 60 * 1000, // 4 hours
    label: '4 Hours',
    timeLabel: '4Hrs',
  },
  '20': {
    duration: 12 * 60 * 60 * 1000, // 12 hours
    label: '12 Hours',
    timeLabel: '12Hrs',
  },
  '30': {
    duration: 24 * 60 * 60 * 1000, // 24 hours
    label: '24 Hours',
    timeLabel: '24Hrs',
  },
};

const isValidPackage = (amount) => {
  return Object.keys(PACKAGES).includes(String(amount));
};

const getPackageByAmount = (amount) => {
  return PACKAGES[String(amount)];
};

module.exports = {
  PACKAGES,
  isValidPackage,
  getPackageByAmount,
};

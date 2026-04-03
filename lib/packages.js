/**
 * WiFi Plan Packages
 *
 * Each plan defines:
 *  - duration       : session hard-expiry in ms (enforced by BullMQ)
 *  - idleTimeoutSec : MikroTik hotspot profile idle-timeout in seconds
 *                     (MikroTik disconnects device if idle for this long)
 *  - dataCapMB      : data cap in megabytes, null = unlimited
 *  - dataCapBytes   : computed from dataCapMB (used for MikroTik limit-bytes-total)
 */

const MB = 1024 * 1024;

const PACKAGES = {
  '10': {
    duration:       1 * 60 * 60 * 1000,  // 1 hour
    label:          '1 Hour',
    timeLabel:      '1Hr',
    idleTimeoutSec: 600,                  // 10 min idle → disconnect
    dataCapMB:      null,                 // unlimited (set a number to cap, e.g. 500)
    get dataCapBytes() { return this.dataCapMB ? this.dataCapMB * MB : 0; },
  },
  '15': {
    duration:       4 * 60 * 60 * 1000,  // 4 hours
    label:          '4 Hours',
    timeLabel:      '4Hrs',
    idleTimeoutSec: 600,
    dataCapMB:      null,
    get dataCapBytes() { return this.dataCapMB ? this.dataCapMB * MB : 0; },
  },
  '20': {
    duration:       12 * 60 * 60 * 1000, // 12 hours
    label:          '12 Hours',
    timeLabel:      '12Hrs',
    idleTimeoutSec: 600,
    dataCapMB:      null,
    get dataCapBytes() { return this.dataCapMB ? this.dataCapMB * MB : 0; },
  },
  '30': {
    duration:       24 * 60 * 60 * 1000, // 24 hours
    label:          '24 Hours',
    timeLabel:      '24Hrs',
    idleTimeoutSec: 600,
    dataCapMB:      null,
    get dataCapBytes() { return this.dataCapMB ? this.dataCapMB * MB : 0; },
  },
};

const isValidPackage    = (amount)  => Object.keys(PACKAGES).includes(String(amount));
const getPackageByAmount = (amount) => PACKAGES[String(amount)] || null;

/** Look up a package by its timeLabel (e.g. "1Hr"). Used in voucher flow. */
const getPackageByPlanKey = (planKey) =>
  Object.values(PACKAGES).find((p) => p.timeLabel === planKey) || null;

module.exports = { PACKAGES, isValidPackage, getPackageByAmount, getPackageByPlanKey };

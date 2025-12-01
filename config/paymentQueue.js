// BullMQ queue setup for M-Pesa payment jobs
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const paymentQueue = new Queue('mpesa-payments', { connection });

module.exports = paymentQueue;

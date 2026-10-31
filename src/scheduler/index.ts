import cron from 'node-cron'
import { runIngestion } from '../ingestion/run'

// 每 15 分钟跑一次采集
cron.schedule('*/15 * * * *', () => {
  console.log('[scheduler] ingestion start', new Date().toISOString())
  runIngestion().catch((e) => console.error('[scheduler] ingestion error', e))
})

console.log('[scheduler] running')

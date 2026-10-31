import { getPayload } from 'payload'
import config from '@/payload.config'

export async function payloadClient() {
  return getPayload({ config })
}

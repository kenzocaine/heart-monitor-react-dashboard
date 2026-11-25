import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/graphqlHeartMonitor';
import type { Schema } from '../../data/resource';
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>({ authMode: 'iam' });
type Event = { deviceId?: string; messageType?: string; timestamp?: number; bpm?: number; valid?: boolean; sampleRate?: number; samples?: number[] };
export const handler = async (event: Event) => {
  if (event.deviceId !== 'HeartMonitor01') throw new Error('Unknown device');
  const device_id = event.deviceId;
  if (typeof event.timestamp !== 'number' || !Number.isSafeInteger(event.timestamp) || event.timestamp <= 0) throw new Error('Invalid timestamp');
  const timestamp = String(event.timestamp);
  if (event.messageType === 'bpm') {
    if (typeof event.bpm !== 'number' || !Number.isFinite(event.bpm) || event.bpm < 0 || typeof event.valid !== 'boolean') throw new Error('Invalid BPM');
    const result = await client.models.HeartRate.create({ device_id, timestamp, bpm: event.bpm, valid: event.valid });
    if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
  } else if (event.messageType === 'waveform') {
    const { samples, sampleRate } = event;
    if (!Array.isArray(samples) || samples.length !== 500 || !samples.every(Number.isFinite) || sampleRate !== 100) throw new Error('Invalid waveform');
    const record = { device_id, timestamp, sampleRate, sampleCount: samples.length, samples };
    const existing = await client.models.Waveform.get({ device_id });
    if (existing.errors?.length) throw new Error(JSON.stringify(existing.errors));
    if (existing.data && Number(existing.data.timestamp) >= event.timestamp) return { ignored: true };
    const result = existing.data ? await client.models.Waveform.update(record) : await client.models.Waveform.create(record);
    if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
  } else throw new Error('Unknown message type');
  return { ok: true };
};

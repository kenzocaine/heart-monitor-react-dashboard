import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { graphqlHeartMonitor } from '../functions/graphqlHeartMonitor/resource';
const schema = a.schema({
  HeartRate: a.model({
    device_id: a.string().required(),
    timestamp: a.string().required(),
    bpm: a.float().required(),
    valid: a.boolean().required(),
  }).identifier(['device_id', 'timestamp']).authorization(allow => [allow.groups(['MonitorReaders']).to(['read'])]),
  Waveform: a.model({
    device_id: a.string().required(),
    timestamp: a.string().required(),
    sampleRate: a.integer().required(),
    sampleCount: a.integer().required(),
    samples: a.float().required().array().required(),
  }).identifier(['device_id']).authorization(allow => [allow.groups(['MonitorReaders']).to(['read'])]),
}).authorization(allow => [allow.resource(graphqlHeartMonitor).to(['query', 'mutate'])]);
export type Schema = ClientSchema<typeof schema>;
export const data = defineData({ schema, authorizationModes: { defaultAuthorizationMode: 'userPool' } });

import { defineFunction } from '@aws-amplify/backend';
export const graphqlHeartMonitor = defineFunction({ name: 'graphqlHeartMonitor', entry: './handler.ts' });

import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { graphqlHeartMonitor } from './functions/graphqlHeartMonitor/resource';
defineBackend({ auth, data, graphqlHeartMonitor });

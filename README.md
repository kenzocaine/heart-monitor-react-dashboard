# Heart Monitor
Clean Amplify Gen 2 project adapted from the original Vite template. Existing standalone DynamoDB and Python waveform processor remain unchanged. New Amplify-managed tables hold BPM history and the latest waveform. Only Cognito users in MonitorReaders can read the data; no public API key or browser write access.

## Deploy
1. Use Node 22 and npm 10 or newer. Run `npm ci`.
2. Create a new Git repository and push this folder. Connect it to a new Amplify Hosting app (Gen 2); use the included amplify.yml and a service role permitted to deploy Gen 2 resources. Do not overwrite the old app unless you intend to remove its resources.
3. Sign up on the new website. In Cognito, open the new user pool, find the user and add them to the MonitorReaders group. Sign out and back in. All members of this group can see this single device's measurements. Do not grant membership to untrusted users.
4. In Lambda locate the newly deployed graphqlHeartMonitor function. Create two IoT rules (SQL version 2016-03-23), both with Lambda action targeting that function. Allow IoT Core to invoke it. Keep the existing DynamoDB and Python processing rules enabled.

BPM rule:
```sql
SELECT *, 'bpm' AS messageType, timestamp() AS timestamp FROM 'heartmonitor/HeartMonitor01/bpm'
```
Processed waveform rule:
```sql
SELECT *, 'waveform' AS messageType FROM 'heartmonitor/HeartMonitor01/processed'
```
The processed message must include numeric timestamp (Unix milliseconds), deviceId, sampleRate=100 and 500 numeric samples. The BPM rule supplies timestamp. Invalid BPM is retained in Amplify so the dashboard can show signal loss. The separate historical table may continue filtering invalid readings.

## Local development
`npx ampx sandbox` provisions a separate backend and generates amplify_outputs.json. Alternatively use `npx ampx generate outputs --app-id YOUR_APP_ID --branch main` for the deployed backend. Then `npm run dev`. Do not commit generated outputs or credentials. Connect IoT rules to the backend you actually use.

## Operations
The dashboard shows the most recent 120 BPM records and latest waveform; historical storage is not automatically expired. Configure retention separately if needed. BPM is duplicated in the standalone and Amplify tables. Waveform is optical PPG, not ECG. No medical use. AWS deployment and end-to-end operation must be verified in your account. Concurrent Lambda invocations may race on waveform updates; for a single device publishing every 10 seconds this is a prototype implementation.

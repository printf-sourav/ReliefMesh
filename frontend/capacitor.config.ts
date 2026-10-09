import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'org.reliefmesh.app', appName: 'ReliefMesh', webDir: 'dist',
  server: { androidScheme: 'https' },
};
export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.larsmacario.rephive',
  appName: 'rephive',
  webDir: 'dist',
  backgroundColor: '#0a0a0a',
  ios: {
    scrollEnabled: true,
    contentInset: 'never',
    backgroundColor: '#0a0a0a'
  }
};

export default config;

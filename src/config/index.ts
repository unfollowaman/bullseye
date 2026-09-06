export interface AppConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  appUrl: string;
  isHeadless: boolean;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: (process.env.NODE_ENV as AppConfig['env']) || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  isHeadless: process.env.HEADLESS !== 'false',
};

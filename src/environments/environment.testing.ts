import { createEnvironment, TestingBypassUser } from './environment.base';

const defaultBypassUser: TestingBypassUser = {
  id: 'testing-bypass-user',
  name: 'QA Automation User',
  email: 'qa.automation@conductores.com',
  role: 'asesor',
  permissions: [
    'dashboard:view',
    'clients:view',
    'quotes:create',
    'documents:upload',
    'postventa:manage'
  ]
};

export const environment = createEnvironment({
  testing: true,
  bypassAuth: true,
  mockAuth: true,
  features: {
    enableMockData: true
  },
  authTesting: {
    bypassUser: defaultBypassUser,
    token: 'testing-bypass-token',
    refreshToken: 'testing-bypass-refresh',
    expiresIn: 3600
  }
});

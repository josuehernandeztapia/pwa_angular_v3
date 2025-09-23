/// <reference types="jasmine" />

declare global {
  const expect: typeof jasmine.expect;
  const spyOn: typeof jasmine.spyOn;
  const describe: typeof jasmine.describe;
  const it: typeof jasmine.it;
  const beforeEach: typeof jasmine.beforeEach;
  const afterEach: typeof jasmine.afterEach;
}
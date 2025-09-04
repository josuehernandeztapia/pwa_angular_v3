import { InjectionToken } from '@angular/core';
import { createWorker } from 'tesseract.js';

export type CreateWorkerType = typeof createWorker;

export const TESSERACT_CREATE_WORKER = new InjectionToken<CreateWorkerType>('TESSERACT_CREATE_WORKER');


import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client, ImportStatus } from '../../models/types';

interface ImportMilestone {
  key: keyof ImportStatus;
  label: string;
  description: string;
  icon: string;
  estimatedDays: number;
  color: string;
}

@Component({
  selector: 'app-import-tracker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="import-tracker bg-gray-900 rounded-xl border border-gray-800 p-6">
      <!-- Header -->
      <div class="tracker-header mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="icon-container">

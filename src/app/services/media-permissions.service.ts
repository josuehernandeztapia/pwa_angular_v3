import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MediaPermissionsService {
  private hasRequestedPermissions = false;

  async requestCameraAndMicrophonePermissions(): Promise<{camera: boolean, microphone: boolean}> {
    if (this.hasRequestedPermissions) {
      return this.checkPermissions();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      // Immediately stop all tracks to release the devices
      stream.getTracks().forEach(track => track.stop());
      
      this.hasRequestedPermissions = true;
      return { camera: true, microphone: true };
    } catch (error) {
      
      // Try individual permissions
      const results = { camera: false, microphone: false };
      
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach(track => track.stop());
        results.camera = true;
      } catch {}
      
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach(track => track.stop());
        results.microphone = true;
      } catch {}
      
      this.hasRequestedPermissions = true;
      return results;
    }
  }

  async checkPermissions(): Promise<{camera: boolean, microphone: boolean}> {
    const results = { camera: false, microphone: false };
    
    try {
      // Check camera permission
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      results.camera = cameraPermission.state === 'granted';
    } catch {}
    
    try {
      // Check microphone permission
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      results.microphone = micPermission.state === 'granted';
    } catch {}
    
    return results;
  }

  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}

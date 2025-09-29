import { CommonModule } from '@angular/common';
import { Component, HostBinding, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserProfile as BffUserProfile, UpdatePasswordDto, UpdateUserProfileDto, UserProfileService } from '../../../services/user-profile.service';
import { IconComponent } from '../../shared/icon/icon.component';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  company: string;
  avatar?: string;
  lastLogin: Date;
  memberSince: Date;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit {
  @HostBinding('class') readonly hostClass = 'perfil-page';
  isEditing = false;

  userProfile: UserProfile = {
    id: 'USR-001',
    firstName: 'José Luis',
    lastName: 'González Martínez',
    email: 'jose.gonzalez@conductores.com',
    phone: '+52 449 123 4567',
    position: 'Gerente de Operaciones',
    company: 'Transportes González y Asociados',
    lastLogin: new Date(),
    memberSince: new Date(2023, 0, 15)
  };

  private originalProfile: UserProfile = { ...this.userProfile };

  constructor(private userProfileService: UserProfileService) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  getInitials(): string {
    const first = this.userProfile.firstName.charAt(0).toUpperCase();
    const last = this.userProfile.lastName.charAt(0).toUpperCase();
    return first + last;
  }

  toggleEdit(): void {
    if (this.isEditing) {
      this.cancelEdit();
    } else {
      this.isEditing = true;
      this.originalProfile = { ...this.userProfile };
    }
  }

  getEditToggleClasses(): Record<string, boolean> {
    return {
      'perfil-page__edit-toggle--active': this.isEditing,
    };
  }

  getInputClasses(disabled: boolean): Record<string, boolean> {
    return {
      'perfil-page__input': true,
      'perfil-page__input--disabled': disabled,
    };
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.userProfile = { ...this.originalProfile };
  }

  saveProfile(): void {
    const dto: UpdateUserProfileDto = {
      name: `${this.userProfile.firstName} ${this.userProfile.lastName}`.trim(),
      email: this.userProfile.email
    };
    this.userProfileService.update(dto).subscribe({
      next: (bff) => {
        this.userProfile.firstName = (bff.name || '').split(' ')[0] || this.userProfile.firstName;
        this.userProfile.lastName = (bff.name || '').split(' ').slice(1).join(' ') || this.userProfile.lastName;
        this.userProfile.email = bff.email;
        this.isEditing = false;
        this.originalProfile = { ...this.userProfile };
      },
      error: () => {}
    });
  }

  changeAvatar(): void {
    // Here you would implement file upload logic
  }

  changePassword(): void {
    const body: UpdatePasswordDto = { currentPassword: 'demo123', newPassword: 'demo1234' };
    this.userProfileService.updatePassword(body).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  setup2FA(): void {
    // Here you would open 2FA setup wizard
  }

  viewSessions(): void {
    // Here you would show active sessions list
  }

  exportData(): void {
    // Here you would trigger data export
  }

  deleteAccount(): void {
    // Here you would show confirmation dialog
  }

  private loadUserProfile(): void {
    this.userProfileService.me().subscribe({
      next: (bff: BffUserProfile) => {
        const [firstName, ...rest] = (bff.name || '').split(' ');
        this.userProfile.id = bff.id;
        this.userProfile.firstName = firstName || this.userProfile.firstName;
        this.userProfile.lastName = rest.join(' ') || this.userProfile.lastName;
        this.userProfile.email = bff.email;
      },
      error: () => {}
    });
  }
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'asesor' | 'supervisor' | 'admin';
  permissions: string[];
  avatarUrl?: string;
}

export class AuthResponseDto {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}
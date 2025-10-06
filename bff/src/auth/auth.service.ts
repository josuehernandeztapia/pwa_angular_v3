import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import * as jwt from 'jsonwebtoken';

interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'asesor' | 'supervisor' | 'admin';
  permissions: string[];
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  private readonly demoUsers: DemoUser[] = [
    {
      id: '1',
      name: 'Ana Torres',
      email: 'asesor@conductores.com',
      password: 'demo123', // En producción esto estaría hasheado
      role: 'asesor',
      permissions: ['quotes', 'clients', 'simulators'],
      avatarUrl: 'https://ui-avatars.com/api/?name=Ana+Torres&background=06d6a0&color=fff'
    },
    {
      id: '2',
      name: 'Carlos Mendez',
      email: 'supervisor@conductores.com',
      password: 'super123',
      role: 'supervisor',
      permissions: ['quotes', 'clients', 'simulators', 'reports', 'team'],
      avatarUrl: 'https://ui-avatars.com/api/?name=Carlos+Mendez&background=2563eb&color=fff'
    },
    {
      id: '3',
      name: 'Maria Rodriguez',
      email: 'admin@conductores.com',
      password: 'admin123',
      role: 'admin',
      permissions: ['*'], // Todos los permisos
      avatarUrl: 'https://ui-avatars.com/api/?name=Maria+Rodriguez&background=dc2626&color=fff'
    }
  ];

  private readonly jwtSecret = process.env.JWT_SECRET || 'conductores-demo-secret-key';

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Validar formato de email corporativo
    if (!email.endsWith('@conductores.com')) {
      throw new UnauthorizedException('Solo se permiten emails corporativos (@conductores.com)');
    }

    // Buscar usuario
    const user = this.demoUsers.find(u => u.email === email && u.password === password);

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Generar tokens
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '8h' });
    const refreshToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '7d' });

    // Retornar respuesta sin contraseña
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      refreshToken,
      expiresIn: 28800 // 8 horas en segundos
    };
  }

  async validateToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  async refreshToken(oldToken: string): Promise<AuthResponseDto> {
    try {
      const payload = jwt.verify(oldToken, this.jwtSecret) as any;
      const user = this.demoUsers.find(u => u.id === payload.sub);

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      // Generar nuevos tokens
      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role
      };

      const token = jwt.sign(newPayload, this.jwtSecret, { expiresIn: '8h' });
      const refreshToken = jwt.sign(newPayload, this.jwtSecret, { expiresIn: '7d' });

      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token,
        refreshToken,
        expiresIn: 28800
      };
    } catch (error) {
      throw new UnauthorizedException('Token de refresh inválido');
    }
  }

  // Método para obtener usuarios demo (solo para UI)
  getDemoUsers() {
    return this.demoUsers.map(user => ({
      email: user.email,
      role: user.role,
      name: user.name,
      // NO incluir password
    }));
  }
}
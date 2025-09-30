import { HttpClient } from '@angular/common/http';
import { Injectable, Optional } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

export type UsuarioRol = 'admin' | 'asesor' | 'operaciones' | 'soporte';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: UsuarioRol;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsuarioDto {
  nombre: string;
  email: string;
  rol: UsuarioRol;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly storageKey = '__admin_users__';
  private readonly usersSubject = new BehaviorSubject<Usuario[]>(this.seedUsers());
  private readonly useBff: boolean;
  private readonly baseUrl: string;

  constructor(@Optional() private readonly http?: HttpClient) {
    this.baseUrl = environment.api?.users ?? `${environment.apiUrl}/admin/usuarios`;
    this.useBff = Boolean(this.http && environment.api?.users && environment.features.enableAdminBff);
    this.restoreFromStorage();
  }

  list(): Observable<Usuario[]> {
    if (this.useBff && this.http) {
      return this.http.get<Usuario[]>(this.baseUrl).pipe(tap(users => this.usersSubject.next(users)));
    }
    return this.usersSubject.asObservable();
  }

  create(dto: UsuarioDto): Observable<Usuario> {
    if (this.useBff && this.http) {
      return this.http.post<Usuario>(this.baseUrl, dto).pipe(tap(() => this.refreshFromBackend()));
    }
    const user = this.buildUsuario(dto);
    this.usersSubject.next([user, ...this.usersSubject.value]);
    this.persist();
    return of(user);
  }

  update(id: string, dto: UsuarioDto): Observable<Usuario> {
    if (this.useBff && this.http) {
      return this.http.put<Usuario>(`${this.baseUrl}/${id}`, dto).pipe(tap(() => this.refreshFromBackend()));
    }

    const updated: Usuario | null = this.applyUpdate(id, dto);
    return of(updated ?? this.buildUsuario(dto));
  }

  toggleStatus(id: string, active: boolean): Observable<Usuario> {
    if (this.useBff && this.http) {
      return this.http.patch<Usuario>(`${this.baseUrl}/${id}/status`, { activo: active }).pipe(tap(() => this.refreshFromBackend()));
    }

    const updated = this.applyToggle(id, active);
    return of(updated);
  }

  delete(id: string): Observable<boolean> {
    if (this.useBff && this.http) {
      return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
        tap(() => this.refreshFromBackend()),
        map(() => true)
      );
    }

    const next = this.usersSubject.value.filter(user => user.id !== id);
    this.usersSubject.next(next);
    this.persist();
    return of(true);
  }

  private refreshFromBackend(): void {
    if (!this.useBff || !this.http) {
      return;
    }
    this.http
      .get<Usuario[]>(this.baseUrl)
      .subscribe(users => {
        this.usersSubject.next(users);
      });
  }

  private applyUpdate(id: string, dto: UsuarioDto): Usuario | null {
    let updated: Usuario | null = null;
    const next = this.usersSubject.value.map(user => {
      if (user.id === id) {
        updated = {
          ...user,
          nombre: dto.nombre,
          email: dto.email,
          rol: dto.rol,
          updatedAt: new Date().toISOString()
        };
        return updated;
      }
      return user;
    });

    if (updated) {
      this.usersSubject.next(next);
      this.persist();
    }

    return updated;
  }

  private applyToggle(id: string, active: boolean): Usuario {
    let updatedUser: Usuario | null = null;
    const next = this.usersSubject.value.map(user => {
      if (user.id === id) {
        updatedUser = {
          ...user,
          activo: active,
          updatedAt: new Date().toISOString()
        };
        return updatedUser;
      }
      return user;
    });

    if (!updatedUser) {
      throw new Error(`Usuario ${id} no encontrado`);
    }

    this.usersSubject.next(next);
    this.persist();
    return updatedUser;
  }

  private buildUsuario(dto: UsuarioDto): Usuario {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      nombre: dto.nombre,
      email: dto.email,
      rol: dto.rol,
      activo: true,
      createdAt: now,
      updatedAt: now
    };
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.usersSubject.value));
    } catch {
      // ignore storage errors
    }
  }

  private restoreFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Usuario[];
      if (Array.isArray(parsed) && parsed.length) {
        this.usersSubject.next(parsed);
      }
    } catch {
      // ignore parse errors and keep seed data
    }
  }

  private seedUsers(): Usuario[] {
    const now = new Date();
    return [
      {
        id: crypto.randomUUID(),
        nombre: 'Administrador General',
        email: 'admin@conductores.mx',
        rol: 'admin',
        activo: true,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: crypto.randomUUID(),
        nombre: 'Sara Hernández',
        email: 'sara.hernandez@conductores.mx',
        rol: 'operaciones',
        activo: true,
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: crypto.randomUUID(),
        nombre: 'Joel Martínez',
        email: 'joel.martinez@conductores.mx',
        rol: 'asesor',
        activo: false,
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }
}

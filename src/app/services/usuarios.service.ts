import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'asesor' | 'operaciones' | 'soporte';
  activo: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface UsuarioDto {
  nombre: string;
  email: string;
  rol: 'admin' | 'asesor' | 'operaciones' | 'soporte';
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly baseUrl = `${environment.apiUrl}/admin/usuarios`;

  constructor(private http: HttpClient) {}

  list(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.baseUrl);
  }

  create(dto: UsuarioDto): Observable<Usuario> {
    return this.http.post<Usuario>(this.baseUrl, dto);
  }

  update(id: string, dto: UsuarioDto): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.baseUrl}/${id}`, dto);
  }

  toggleStatus(id: string, active: boolean): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.baseUrl}/${id}/status`, { activo: active });
  }
}


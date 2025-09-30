import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Usuario, UsuarioDto, UsuarioRol, UsuariosService } from '../../../services/usuarios.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss'
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  usuarios: Usuario[] = [];
  search = '';
  showModal = false;
  editing: Usuario | null = null;
  form: UsuarioDto = { nombre: '', email: '', rol: 'asesor' };
  readonly qaEnabled = environment.features?.enableQaTools === true;

  readonly roles: Array<{ label: string; value: UsuarioRol }> = [
    { label: 'Administrador', value: 'admin' },
    { label: 'Asesor', value: 'asesor' },
    { label: 'Operaciones', value: 'operaciones' },
    { label: 'Soporte', value: 'soporte' }
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly usuariosService: UsuariosService) {}

  ngOnInit(): void {
    this.usuariosService
      .list()
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.usuarios = users;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredUsuarios(): Usuario[] {
    const needle = this.search.trim().toLowerCase();
    if (!needle) {
      return this.usuarios;
    }
    return this.usuarios.filter(usuario => {
      return (
        usuario.nombre.toLowerCase().includes(needle) ||
        usuario.email.toLowerCase().includes(needle) ||
        usuario.rol.toLowerCase().includes(needle)
      );
    });
  }

  openCreate(): void {
    this.editing = null;
    this.form = { nombre: '', email: '', rol: 'asesor' };
    this.showModal = true;
  }

  edit(usuario: Usuario): void {
    this.editing = usuario;
    this.form = {
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    };
    this.showModal = true;
  }

  save(): void {
    if (!this.form.nombre || !this.form.email) {
      return;
    }

    if (this.editing) {
      this.usuariosService.update(this.editing.id, this.form).subscribe(() => {
        this.closeModal();
      });
    } else {
      this.usuariosService.create(this.form).subscribe(() => {
        this.closeModal();
      });
    }
  }

  toggle(usuario: Usuario): void {
    this.usuariosService.toggleStatus(usuario.id, !usuario.activo).subscribe();
  }

  delete(usuario: Usuario): void {
    if (!confirm(`¿Eliminar a ${usuario.nombre}?`)) {
      return;
    }
    this.usuariosService.delete(usuario.id).subscribe();
  }

  closeModal(): void {
    this.showModal = false;
    this.editing = null;
    this.form = { nombre: '', email: '', rol: 'asesor' };
  }

  trackByUsuario(_index: number, usuario: Usuario): string {
    return usuario.id;
  }

  getInitials(nombre: string): string {
    if (!nombre) {
      return 'NA';
    }
    const parts = nombre.trim().split(/\s+/).filter(Boolean);
    const first = parts[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    return initials || nombre.charAt(0).toUpperCase();
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

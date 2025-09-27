import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Usuario, UsuarioDto, UsuariosService } from '../../../services/usuarios.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <h1>Administración de Usuarios</h1>

      <div class="actions">
        <button (click)="openCreate()">+ Nuevo Usuario</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of usuarios">
            <td>{{ u.nombre }}</td>
            <td>{{ u.email }}</td>
            <td>
              <select [(ngModel)]="u.rol" (ngModelChange)="onEdit(u)">
                <option value="admin">Admin</option>
                <option value="asesor">Asesor</option>
                <option value="operaciones">Operaciones</option>
                <option value="soporte">Soporte</option>
              </select>
            </td>
            <td>
              <span [class.active]="u.activo" [class.inactive]="!u.activo">{{ u.activo ? 'Activo' : 'Bloqueado' }}</span>
            </td>
            <td>
              <button (click)="toggle(u)">{{ u.activo ? 'Bloquear' : 'Desbloquear' }}</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="modal" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>{{ editing ? 'Editar Usuario' : 'Crear Usuario' }}</h3>
          <form (ngSubmit)="save()">
            <label>Nombre <input [(ngModel)]="form.nombre" name="nombre" required /></label>
            <label>Email <input [(ngModel)]="form.email" name="email" type="email" required /></label>
            <label>Rol
              <select [(ngModel)]="form.rol" name="rol" required>
                <option value="admin">Admin</option>
                <option value="asesor">Asesor</option>
                <option value="operaciones">Operaciones</option>
                <option value="soporte">Soporte</option>
              </select>
            </label>
            <div class="modal-actions">
              <button type="button" (click)="closeModal()">Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container { padding: 16px; }
    .actions { margin: 12px 0; }
    .table { width: 100%; border-collapse: collapse; background: white; }
    .table th, .table td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
    .active { color: #16a34a; }
    .inactive { color: #ef4444; }
    .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; }
    .modal-content { background: white; padding: 16px; border-radius: 8px; min-width: 320px; }
    .modal-actions { display:flex; justify-content:flex-end; gap: 8px; margin-top: 12px; }
    form label { display:block; margin: 8px 0; }
    input, select { width: 100%; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px; }
  `]
})
export class AdminPanelComponent implements OnInit {
  usuarios: Usuario[] = [];
  showModal = false;
  editing: Usuario | null = null;
  form: UsuarioDto = { nombre: '', email: '', rol: 'asesor' };

  constructor(private usuariosService: UsuariosService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.usuariosService.list().subscribe((users: Usuario[]) => this.usuarios = users);
  }

  openCreate(): void {
    this.editing = null;
    this.form = { nombre: '', email: '', rol: 'asesor' };
    this.showModal = true;
  }

  onEdit(user: Usuario): void {
    const dto: UsuarioDto = { nombre: user.nombre, email: user.email, rol: user.rol };
    this.usuariosService.update(user.id, dto).subscribe((updated: Usuario) => {
      const idx = this.usuarios.findIndex(u => u.id === updated.id);
      if (idx >= 0) this.usuarios[idx] = updated;
    });
  }

  toggle(user: Usuario): void {
    this.usuariosService.toggleStatus(user.id, !user.activo).subscribe((updated: Usuario) => {
      const idx = this.usuarios.findIndex(u => u.id === updated.id);
      if (idx >= 0) this.usuarios[idx] = updated;
    });
  }

  save(): void {
    if (this.editing) {
      this.usuariosService.update(this.editing.id, this.form).subscribe(() => {
        this.closeModal();
        this.refresh();
      });
    } else {
      this.usuariosService.create(this.form).subscribe(() => {
        this.closeModal();
        this.refresh();
      });
    }
  }

  closeModal(): void {
    this.showModal = false;
  }
}
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Usuario, UsuarioDto, UsuariosService } from '../../../services/usuarios.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss'
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

  trackByUsuario(_index: number, usuario: Usuario): string {
    return usuario.id;
  }

  getInitials(nombre: string): string {
    if (!nombre) {
      return 'NA';
    }
    const parts = nombre.trim().split(/\s+/).filter(Boolean);
    const [first = '', second = ''] = [parts[0] ?? '', parts.length > 1 ? parts[parts.length - 1] : ''];
    const initials = `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
    return initials || nombre.charAt(0).toUpperCase();
  }
}

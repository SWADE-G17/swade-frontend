export type UsuarioRole = "Administrador" | "Clínico" | "Académico";

export interface Usuario {
  id: string;
  username: string | null;
  role: UsuarioRole;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsuarioUpdateRequest {
  username?: string;
  role?: UsuarioRole;
}

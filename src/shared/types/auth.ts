export interface Auth0JwtPayload {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  azp?: string;
  scope?: string;
  permissions?: string[];
  roles?: string[];
  [key: string]: unknown;
}

export type AppRole = 'user' | 'admin';

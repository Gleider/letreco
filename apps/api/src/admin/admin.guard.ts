import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { jwtVerify } from 'jose';

export interface AdminPayload {
  sub: string;
  role: string;
}

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);
  private readonly secret: Uint8Array;

  constructor() {
    const raw = process.env.API_JWT_SECRET;
    if (!raw) {
      throw new Error('API_JWT_SECRET não configurado');
    }
    this.secret = new TextEncoder().encode(raw);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { adminUser?: AdminPayload }>();
    const authorization = request.headers['authorization'];

    if (!authorization) {
      throw new UnauthorizedException('Acesso negado: token de autenticação ausente');
    }

    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Acesso negado: token inválido');
    }

    const token = authorization.slice(7);

    let payload: AdminPayload;
    try {
      const result = await jwtVerify(token, this.secret, {
        algorithms: ['HS256'],
        clockTolerance: 30,
      });
      payload = result.payload as unknown as AdminPayload;
    } catch {
      throw new UnauthorizedException('Acesso negado: token inválido');
    }

    if (payload.role !== 'admin') {
      throw new ForbiddenException('Acesso negado: privilégios insuficientes');
    }

    this.logger.log(`Admin request from: ${payload.sub}`);
    request.adminUser = payload;

    return true;
  }
}

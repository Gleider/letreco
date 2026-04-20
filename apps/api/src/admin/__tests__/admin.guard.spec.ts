import * as crypto from 'crypto';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AdminGuard } from '../admin.guard';

const SECRET = 'test-secret-for-unit-tests';

function b64url(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function signTestJwt(
  payload: Record<string, unknown>,
  secret = SECRET,
): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify(payload));
  const input = `${header}.${claims}`;
  const sig = crypto.createHmac('sha256', secret).update(input).digest('base64url');
  return `${input}.${sig}`;
}

function validToken(overrides: Record<string, unknown> = {}, secret = SECRET): string {
  return signTestJwt({
    sub: 'gleider',
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  }, secret);
}

function makeContext(authHeader?: string): ExecutionContext {
  const request: Record<string, unknown> = { headers: {} as Record<string, string> };
  if (authHeader !== undefined) {
    (request.headers as Record<string, string>)['authorization'] = authHeader;
  }
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    process.env.API_JWT_SECRET = SECRET;
    guard = new AdminGuard();
  });

  afterEach(() => {
    delete process.env.API_JWT_SECRET;
  });

  it('happy path: token válido com role admin retorna true e popula adminUser', async () => {
    const ctx = makeContext(`Bearer ${validToken()}`);
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest() as { adminUser: { sub: string } };
    expect(req.adminUser.sub).toBe('gleider');
  });

  it('error: sem header Authorization lança UnauthorizedException com mensagem de ausência', async () => {
    const ctx = makeContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      message: 'Acesso negado: token de autenticação ausente',
    });
  });

  it('error: header sem prefixo Bearer lança UnauthorizedException token inválido', async () => {
    const ctx = makeContext('token-sem-bearer');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      message: 'Acesso negado: token inválido',
    });
  });

  it('error: token assinado com segredo diferente lança UnauthorizedException', async () => {
    const token = validToken({}, 'wrong-secret');
    const ctx = makeContext(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      message: 'Acesso negado: token inválido',
    });
  });

  it('error: token expirado além da tolerância lança UnauthorizedException', async () => {
    const token = validToken({ exp: Math.floor(Date.now() / 1000) - 120 });
    const ctx = makeContext(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      message: 'Acesso negado: token inválido',
    });
  });

  it('error: token válido mas com role user lança ForbiddenException', async () => {
    const token = validToken({ role: 'user' });
    const ctx = makeContext(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      message: 'Acesso negado: privilégios insuficientes',
    });
  });

  it('edge: API_JWT_SECRET ausente na construção lança erro de inicialização', () => {
    delete process.env.API_JWT_SECRET;
    expect(() => new AdminGuard()).toThrow('API_JWT_SECRET não configurado');
  });

  it('edge: token quase expirado dentro dos 30s de tolerância é aceito', async () => {
    const token = validToken({ exp: Math.floor(Date.now() / 1000) - 20 });
    const ctx = makeContext(`Bearer ${token}`);
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});

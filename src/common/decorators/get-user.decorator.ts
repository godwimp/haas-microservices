import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';

export const GetUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

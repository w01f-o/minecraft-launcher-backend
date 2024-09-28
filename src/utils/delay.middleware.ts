import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction } from 'express';

@Injectable()
export class DelayMiddleware implements NestMiddleware {
  public async use(_req: Request, _res: Response, next: NextFunction) {
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    next();
  }
}

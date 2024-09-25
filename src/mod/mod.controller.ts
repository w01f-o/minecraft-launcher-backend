import { Controller } from '@nestjs/common';
import { ModService } from './mod.service';

@Controller('mod')
export class ModController {
  constructor(private readonly modService: ModService) {}
}

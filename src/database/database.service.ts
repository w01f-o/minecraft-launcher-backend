import { INestApplication, Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class DatabaseService extends PrismaClient{
  public async onOnModuleInit() {
    await this.$connect();
  }

  public async onOnModuleDestroy() {
    await this.$disconnect();
  }

  public async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}

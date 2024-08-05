import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StakeModule } from './stake/stake.module';
import { StakeMiddleware } from './stake/stake.middleware';
import { UserModule } from './user/user.module';

@Module({
  imports: [StakeModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(StakeMiddleware)
      .forRoutes(
        { path: 'stake', method: RequestMethod.POST },
        { path: 'stake/unstake', method: RequestMethod.POST },
      );
  }
}

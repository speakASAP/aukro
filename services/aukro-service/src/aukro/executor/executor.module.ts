import { Module } from '@nestjs/common';
import { AuthModule } from '@aukro/shared';
import { AukroPublicApiModule } from '../public-api';
import { AukroExecutorController } from './executor.controller';
import { AukroExecutorService } from './executor.service';

@Module({
  imports: [AukroPublicApiModule, AuthModule],
  controllers: [AukroExecutorController],
  providers: [AukroExecutorService],
  exports: [AukroExecutorService],
})
export class AukroExecutorModule {}

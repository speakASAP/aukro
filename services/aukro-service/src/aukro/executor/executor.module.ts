import { Module } from '@nestjs/common';
import { AukroPublicApiModule } from '../public-api';
import { AukroExecutorController } from './executor.controller';
import { AukroExecutorService } from './executor.service';

@Module({
  imports: [AukroPublicApiModule],
  controllers: [AukroExecutorController],
  providers: [AukroExecutorService],
  exports: [AukroExecutorService],
})
export class AukroExecutorModule {}

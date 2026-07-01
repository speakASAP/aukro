import { Module } from '@nestjs/common';
import { AukroPublicApiModule } from '../public-api';
import { AukroExecutorService } from './executor.service';

@Module({
  imports: [AukroPublicApiModule],
  providers: [AukroExecutorService],
  exports: [AukroExecutorService],
})
export class AukroExecutorModule {}

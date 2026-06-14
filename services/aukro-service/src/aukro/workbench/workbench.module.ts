import { Module } from '@nestjs/common';
import { PrismaModule, LoggerModule, AuthModule } from '@aukro/shared';
import { WorkbenchController } from './workbench.controller';
import { WorkbenchService } from './workbench.service';

@Module({
  imports: [PrismaModule, LoggerModule, AuthModule],
  controllers: [WorkbenchController],
  providers: [WorkbenchService],
  exports: [WorkbenchService],
})
export class WorkbenchModule {}

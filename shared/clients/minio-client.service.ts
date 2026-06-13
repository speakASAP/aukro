import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '../logger/logger.service';
import { EcosystemClientBase } from './ecosystem-client.base';
import { AukroClientContext, EcosystemClientResult } from './ecosystem-client.types';

@Injectable()
export class MinioClientService extends EcosystemClientBase {
  constructor(httpService: HttpService, logger: LoggerService) {
    super(
      httpService,
      logger,
      'minio-microservice',
      process.env.MINIO_SERVICE_URL || process.env.S3_ENDPOINT_URL || 'http://minio-microservice:9000',
      Number(process.env.MINIO_SERVICE_TIMEOUT || process.env.HTTP_TIMEOUT || 5000),
    );
  }

  requestImageVariant(input: Record<string, any>, context?: AukroClientContext): Promise<EcosystemClientResult> {
    return this.post('/api/aukro/media/image-variants', 'aukro.minio.image-variant.v1', { input, context });
  }

  requestEvidenceBundle(input: Record<string, any>, context?: AukroClientContext): Promise<EcosystemClientResult> {
    return this.post('/api/aukro/evidence-bundles', 'aukro.minio.evidence-bundle.v1', { input, context });
  }
}

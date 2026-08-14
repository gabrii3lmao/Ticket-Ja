import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderConfig } from 'src/payment/interfaces/payment-provider-config.interface';

@Injectable()
export class AsaasConfig implements PaymentProviderConfig {
  readonly baseUrl: string;
  readonly apiKey: string;

  constructor(configService: ConfigService) {
    this.apiKey = configService.getOrThrow<string>('ASAAS_API_KEY');
    this.baseUrl = configService.getOrThrow<string>('ASAAS_BASE_URL');
  }
}

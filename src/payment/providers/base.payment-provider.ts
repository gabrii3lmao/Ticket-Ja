import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { PaymentStatus } from 'generated/prisma/enums';
import type { PaymentProviderConfig } from '../interfaces/payment-provider-config.interface';

@Injectable()
export abstract class BasePaymentProvider {
  constructor(
    protected readonly http: HttpService,
    protected readonly config: PaymentProviderConfig,
  ) {}

  protected async request<T>(
    path: string,
    options?: AxiosRequestConfig,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    const { data } = await firstValueFrom(
      this.http
        .request<T>({
          url,
          method: options?.method ?? 'GET',
          timeout: 10000,
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { access_token: this.config.apiKey }),
            ...options?.headers,
          },
        })
        .pipe(
          catchError((err) => {
            const detail =
              err?.response?.data?.errors?.[0]?.description ??
              err?.response?.data ??
              err.message;

            throw new InternalServerErrorException(
              `Gateway request failed: ${
                typeof detail === 'object' ? JSON.stringify(detail) : detail
              }`,
            );
          }),
        ),
    );

    return data;
  }

  protected abstract mapStatus(rawStatus: string): PaymentStatus;
}

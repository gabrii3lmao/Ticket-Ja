export type AsaasBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj?: string;
  email?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  status: string; // 'PENDING' | 'RECEIVED' | 'OVERDUE' | ...
  billingType: AsaasBillingType;
  value: number;
  dueDate: string; // 'YYYY-MM-DD'
  invoiceUrl?: string;
}

export interface AsaasPixQrCode {
  encodedImage: string; // data URI do QR code
  payload: string; // "copia e cola" do PIX
  expirationDate?: string;
}

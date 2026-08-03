import { MercadoPagoConfig } from "mercadopago";

let _client: MercadoPagoConfig | undefined;

export function getMercadoPago(): MercadoPagoConfig {
  if (!_client) {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("MP_ACCESS_TOKEN environment variable is not set");
    }
    _client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 }
    });
  }
  return _client;
}

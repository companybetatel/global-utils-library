export const ourServices: Record<
  string,
  { service_id: string; unit_price: number }
> = {
  "flash-call": {
    service_id: "flash-call",
    unit_price: 0.05,
  },
  "otp-call": {
    service_id: "otp-call",
    unit_price: 0.03,
  },
  "text-to-speech": {
    service_id: "text-to-speech",
    unit_price: 0.04,
  },
  sms: {
    service_id: "sms",
    unit_price: 0.04,
  },
};

export default ourServices;

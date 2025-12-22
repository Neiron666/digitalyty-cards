import mockProvider from "./mock.provider.js";
import tranzilaProvider from "./tranzila.provider.js";

const provider =
    process.env.PAYMENT_PROVIDER === "tranzila"
        ? tranzilaProvider
        : mockProvider;

export default {
    createPayment: provider.createPayment,
    handleNotify: provider.handleNotify,
};

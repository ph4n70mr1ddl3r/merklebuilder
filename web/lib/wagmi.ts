import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { RPC_URL } from "./env";

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [],
  transports: {
    [sepolia.id]: http(RPC_URL),
  },
  ssr: true,
});

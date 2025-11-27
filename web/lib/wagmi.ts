import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";

// Minimal wagmi config: omit heavy connectors to avoid MetaMask SDK RN deps.
export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [],
  transports: {
    [sepolia.id]: http("https://1rpc.io/sepolia"),
  },
  ssr: true,
});

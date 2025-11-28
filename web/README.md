# DEMO Airdrop Web Frontend

Modern Next.js 14 web application for a Merkle-proof based airdrop with invite gating and an integrated AMM market maker.

## 🚀 Features

- **Merkle Airdrop**: Claim DEMO tokens using cryptographic proofs
- **Invite System**: Share access slots after claiming
- **Market Maker**: Constant-product AMM for ETH ↔ DEMO swaps
- **Real-time Updates**: Auto-refreshing contract state with React Query
- **Toast Notifications**: User-friendly feedback with Sonner
- **Type-Safe**: Full TypeScript with Zod validation
- **Error Handling**: Comprehensive error boundaries
- **Testing**: Unit tests with Vitest

## 📦 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Web3**: Wagmi v2, Viem, Ethers.js
- **State**: TanStack Query (React Query)
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Notifications**: Sonner
- **Testing**: Vitest + Testing Library

## 🛠️ Setup

### Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Update .env.local with your values
# NEXT_PUBLIC_API_BASE=your_api_url
# NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address
# NEXT_PUBLIC_CHAIN_ID=11155111  # Sepolia
# NEXT_PUBLIC_CHAIN_NAME=Sepolia
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
web/
├── app/
│   ├── components/          # UI components
│   │   ├── AirdropPanel.tsx
│   │   ├── InvitesPanel.tsx
│   │   ├── MarketPanel.tsx
│   │   ├── Hero.tsx
│   │   ├── TabNav.tsx
│   │   ├── Primitives.tsx
│   │   └── ProviderModal.tsx
│   ├── layout.tsx           # Root layout with ErrorBoundary
│   ├── page.tsx             # Main page
│   ├── providers.tsx        # Wagmi + React Query + Toast providers
│   └── globals.css          # Global styles
├── components/
│   └── ErrorBoundary.tsx    # Error boundary component
├── hooks/
│   ├── useContractState.ts  # Contract state management
│   ├── useMarketReserves.ts # Market data fetching
│   ├── useProof.ts          # Merkle proof fetching
│   ├── useAirdrop.ts        # Legacy hook
│   └── useWallet.ts         # Legacy hook
├── lib/
│   ├── airdrop.ts           # Contract ABI and exports
│   ├── constants.ts         # App constants
│   ├── env.ts               # Validated environment variables
│   ├── format.ts            # Formatting utilities
│   ├── types.ts             # Shared TypeScript types
│   ├── utils.ts             # General utilities
│   ├── validators.ts        # Zod validation schemas
│   └── wagmi.ts             # Wagmi configuration
├── __tests__/               # Test files
│   ├── format.test.ts
│   └── validators.test.ts
├── vitest.config.ts         # Vitest configuration
└── vitest.setup.ts          # Test setup
```

## 🔧 Key Improvements

### 1. **Modular Architecture**
- Extracted custom hooks (`useContractState`, `useProof`, `useMarketReserves`)
- Centralized types in `lib/types.ts`
- Constants moved to `lib/constants.ts`

### 2. **Enhanced Error Handling**
- Error boundary wraps the entire app
- Graceful fallback UI on crashes
- Comprehensive try-catch blocks

### 3. **Better UX**
- Toast notifications replace status messages
- Loading states for all async operations
- Clear error messages

### 4. **Type Safety**
- Zod schemas for runtime validation
- Environment variable validation
- Address and amount validation

### 5. **Testing Infrastructure**
- Vitest configured for React components
- Unit tests for utilities
- Test setup with jsdom

### 6. **Performance**
- React Query for efficient data fetching
- Automatic cache management
- Configurable polling intervals

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Test Files
- `__tests__/format.test.ts` - Utility function tests
- `__tests__/validators.test.ts` - Zod schema validation tests

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE` | Merkle proof API URL | `http://18.143.177.167:3000` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Contract address | `0x20E6...EA34` |
| `NEXT_PUBLIC_CHAIN_ID` | Chain ID (Sepolia) | `11155111` |
| `NEXT_PUBLIC_CHAIN_NAME` | Network name | `Sepolia` |

## 🔐 Validation

All user inputs are validated using Zod:
- Ethereum addresses (checksum validation)
- Token amounts (positive numbers)
- Slippage (0-100%)
- Environment variables

## 🎨 UI Components

### AirdropPanel
- Merkle proof fetching and display
- Claim transaction flow
- Recipient address input

### InvitesPanel
- Invitation slot management
- Create and revoke invitations
- View invitation status

### MarketPanel
- ETH → DEMO swaps
- DEMO → ETH swaps  
- Pool seeding (donations)
- Slippage configuration
- Real-time price quotes

## 🔄 State Management

- **React Query**: Server state (contract data, reserves)
- **Local State**: UI state, form inputs
- **Wagmi Hooks**: Wallet connection, transactions

## 🚨 Error Handling

1. **Error Boundary**: Catches React errors
2. **Toast Notifications**: User-friendly error messages
3. **Validation**: Input validation before submission
4. **Fallback Values**: Graceful degradation

## 📊 Performance

- Contract state polling: 10s intervals
- Market data polling: 5s intervals
- Query caching with React Query
- Optimistic UI updates

## 🛡️ Security

- Address checksum validation
- Zero address checks
- Slippage protection
- Network validation
- Environment variable validation

## 📱 Responsive Design

- Mobile-first approach
- Tailwind CSS utilities
- Glass-morphism effects
- Dark theme optimized

## 🔗 Contract Integration

### Supported Functions
- `claim()` / `claimTo()` - Claim airdrop
- `createInvitation()` - Create invite
- `revokeInvitation()` - Revoke unused invite
- `buyDemo()` - Buy DEMO with ETH
- `sellDemo()` - Sell DEMO for ETH
- `getReserves()` - Query pool reserves
- `balanceOf()` - Check DEMO balance

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Use Zod for validation
4. Update this README

## 📄 License

MIT

## 🙏 Acknowledgments

Built with Wagmi, Viem, Next.js, and TanStack Query.

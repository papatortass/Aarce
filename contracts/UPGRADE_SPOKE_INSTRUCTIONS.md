# Upgrade Spoke to SpokeV2 and Update to New Hub

## Current Situation
- Spoke: `0xe08b9D03Dc60F5ae45d34565a6eE4Ce1A1C0B7Bd`
- Current Hub (old): `0xf314d13e6138f0202177B8ac945FebAB12Bd920d`
- New Hub: `0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423`
- ProxyAdmin: `0xd8d68945fd68bb6c31c7179b95182a5048d898c3`
- ProxyAdmin Owner: `0x683c64D3fAB51d33744ADdb8Cbc8852DE7Ab54D0`

## Steps Required

### Step 1: Deploy SpokeV2 Implementation
```bash
cd contracts
forge create src/spoke/SpokeV2.sol:SpokeV2 \
  --constructor-args 0x0CC12d6Fa3cEd6A5497C0e8748927205BF4C7Ba0 \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key $YOUR_PRIVATE_KEY
```

Save the deployed address as `SPOKE_V2_IMPL`.

### Step 2: Upgrade Spoke Proxy (Requires ProxyAdmin Owner's Key)

**Option A: Using Foundry Script (if you have ProxyAdmin owner's key)**
```bash
cd contracts
PROXY_ADMIN_OWNER_KEY=<proxy_admin_owner_private_key> \
SPOKE=0xe08b9D03Dc60F5ae45d34565a6eE4Ce1A1C0B7Bd \
SPOKE_V2_IMPL=<deployed_spoke_v2_address> \
HUB_NEW=0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423 \
PROXY_ADMIN=0xd8d68945fd68bb6c31c7179b95182a5048d898c3 \
forge script scripts/UpgradeSpokeWithProxyAdminOwner.s.sol:UpgradeSpokeWithProxyAdminOwner \
  --rpc-url https://rpc.testnet.arc.network \
  --broadcast \
  --private-key $PROXY_ADMIN_OWNER_KEY
```

**Option B: Using cast send directly**
```bash
# Get authority address
AUTHORITY=$(cast call 0xe08b9D03Dc60F5ae45d34565a6eE4Ce1A1C0B7Bd "authority()" --rpc-url https://rpc.testnet.arc.network)

# Encode initialization data
INIT_DATA=$(cast calldata "initialize(address)" $AUTHORITY)

# Upgrade via ProxyAdmin (requires ProxyAdmin owner's key)
cast send 0xd8d68945fd68bb6c31c7179b95182a5048d898c3 \
  "upgradeAndCall(address,address,bytes)" \
  0xe08b9D03Dc60F5ae45d34565a6eE4Ce1A1C0B7Bd \
  <SPOKE_V2_IMPL> \
  $INIT_DATA \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key $PROXY_ADMIN_OWNER_KEY
```

### Step 3: Update All Reserves to New Hub

After the upgrade, update all reserves (requires deployer's key with restricted role):

```bash
cd contracts
SPOKE=0xe08b9D03Dc60F5ae45d34565a6eE4Ce1A1C0B7Bd \
HUB_NEW=0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423 \
forge script scripts/UpdateAllReservesToNewHub.s.sol:UpdateAllReservesToNewHub \
  --rpc-url https://rpc.testnet.arc.network \
  --broadcast \
  --private-key $YOUR_PRIVATE_KEY
```

Or update individually using cast:
```bash
# Update USDC (reserve 0)
cast send 0xe08b9D03Dc60F5ae45d34565a6eE4Ce1A1C0B7Bd \
  "updateReserveHub(uint256,address)" \
  0 \
  0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423 \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key $YOUR_PRIVATE_KEY

# Update EURC (reserve 1) - if it exists
cast send 0xe08b9D03Dc60F5ae45d34565a6eE4Ce1A1C0B7Bd \
  "updateReserveHub(uint256,address)" \
  1 \
  0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423 \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key $YOUR_PRIVATE_KEY

# Update USDT (reserve 2) - if it exists
cast send 0xe08b9D03Dc60F5ae45d34565a6eE4Ce1A1C0B7Bd \
  "updateReserveHub(uint256,address)" \
  2 \
  0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423 \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key $YOUR_PRIVATE_KEY
```

### Step 4: Verify

```bash
cd contracts
SPOKE=0xe08b9D03Dc60F5ae45d34565a6eE4Ce1A1C0B7Bd \
forge script scripts/CheckSpokeHub.s.sol:CheckSpokeHub \
  --rpc-url https://rpc.testnet.arc.network
```

## Notes
- The upgrade requires the ProxyAdmin owner's private key (`0x683c64D3fAB51d33744ADdb8Cbc8852DE7Ab54D0`)
- The reserve updates require the deployer's key (which should have the `restricted` role)
- After upgrade, the Spoke will be SpokeV2 (revision 2) and all reserves will point to the new Hub

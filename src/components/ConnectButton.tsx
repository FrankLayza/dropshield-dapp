import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";

/**
 * Thin wrapper around RainbowKit's ConnectButton so the rest of the app imports
 * a stable local name. RainbowKit handles the multi-wallet modal, account display,
 * network switching, and disconnect.
 */
export function ConnectButton() {
  return (
    <RainbowConnectButton
      showBalance={false}
      // Compact on phones (avatar only) so the address can't wrap the navbar;
      // full address on larger screens.
      accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
      chainStatus={{ smallScreen: "none", largeScreen: "icon" }}
    />
  );
}

// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

/**
 * @title  RecipientRegistry
 * @notice Stores recipient wallet addresses per campaign so the claim page can
 *         verify membership on-chain without revealing allocation amounts.
 *
 *         This is a standalone registry — it does NOT modify the TokenOps
 *         ConfidentialAirdrop contracts. Campaign addresses are used as keys
 *         (the same addresses already used throughout the DropShield dApp).
 *
 * @dev    Only the wallet that first registers recipients for a campaign is
 *         recorded as the campaign creator. Subsequent registrations by the
 *         same creator are allowed (for batching), but a different wallet
 *         cannot overwrite an existing registration.
 */
contract RecipientRegistry {
    /// @notice O(1) lookup: campaign address => recipient address => bool
    mapping(address => mapping(address => bool)) private _isRecipient;

    /// @notice The wallet that registered recipients for each campaign.
    mapping(address => address) public registeredBy;

    /// @notice Human-readable campaign name stored at registration time.
    mapping(address => string) public campaignName;

    /// @notice Number of recipients registered for a campaign.
    mapping(address => uint256) public recipientCount;

    /// @notice Emitted after each batch of recipients is registered.
    event RecipientsRegistered(address indexed campaign, uint256 count);

    error NotCampaignCreator();
    error EmptyRecipientList();

    /**
     * @notice Register a batch of recipient addresses for a campaign.
     * @dev    The first caller becomes the campaign creator. Subsequent calls
     *         by the same creator append more recipients (supports batching at
     *         50 addresses per tx). A different wallet will be rejected.
     *
     * @param campaign   The deployed campaign contract address.
     * @param recipients Array of recipient wallet addresses to register.
     * @param name       Human-readable campaign name (only stored on the first
     *                   call; ignored on subsequent batch calls).
     */
    function registerRecipients(
        address campaign,
        address[] calldata recipients,
        string calldata name
    ) external {
        if (recipients.length == 0) revert EmptyRecipientList();

        // First registration: record the creator and campaign name.
        if (registeredBy[campaign] == address(0)) {
            registeredBy[campaign] = msg.sender;
            campaignName[campaign] = name;
        } else if (registeredBy[campaign] != msg.sender) {
            // Only the original creator can add more recipients.
            revert NotCampaignCreator();
        }

        for (uint256 i = 0; i < recipients.length; i++) {
            if (!_isRecipient[campaign][recipients[i]]) {
                _isRecipient[campaign][recipients[i]] = true;
                recipientCount[campaign]++;
            }
        }

        emit RecipientsRegistered(campaign, recipientCount[campaign]);
    }

    /**
     * @notice Check whether a wallet is a registered recipient of a campaign.
     * @dev    View function — costs no gas to call.
     *
     * @param campaign The campaign contract address.
     * @param wallet   The wallet address to check.
     * @return         True if the wallet is a registered recipient.
     */
    function checkRecipient(
        address campaign,
        address wallet
    ) external view returns (bool) {
        return _isRecipient[campaign][wallet];
    }
}

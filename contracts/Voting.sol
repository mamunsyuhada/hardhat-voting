// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// https://sepolia.etherscan.io/address/0x8646CeD5291A277F18B736e685cE871E69070e51#code
// https://sepolia.etherscan.io/address/0xD0257b618232AF348E75F62c93342Bc76110B958#code

contract Voting {
    struct Proposal {
        string name;
        string description;
        uint256 voteCount;
        uint256 startDate;
        uint256 endDate;
        address creator;
    }

    Proposal[] public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(
        uint256 indexed proposalId,
        string name,
        address indexed creator
    );
    event ProposalEdited(uint256 indexed proposalId, string newName);
    event Voted(uint256 indexed proposalId, address indexed voter);
    event VoteUndone(uint256 indexed proposalId, address indexed voter);

    function createProposal(
        string memory name,
        string memory description,
        uint256 startDate,
        uint256 endDate
    ) public {
        require(bytes(name).length > 0, "Name is required");
        require(bytes(description).length > 0, "Description is required");
        require(
          endDate > startDate,
          "End date must be after start date"
        );

        proposals.push(
            Proposal({
                name: name,
                description: description,
                voteCount: 0,
                startDate: startDate,
                endDate: endDate,
                creator: msg.sender
            })
        );

        emit ProposalCreated(proposals.length - 1, name, msg.sender);
    }

    function editProposal(
        uint256 proposalId,
        string memory newName,
        string memory newDescription
    ) public {
        require(proposalId < proposals.length, "Invalid proposal ID");
        Proposal storage proposal = proposals[proposalId];

        require(
            msg.sender == proposal.creator,
            "Only the creator can edit the proposal"
        );

        require(
            block.timestamp < proposal.startDate,
            "Cannot edit a proposal after voting has started"
        );

        proposal.name = newName;
        proposal.description = newDescription;

        emit ProposalEdited(proposalId, newName);
    }

    function vote(uint256 proposalId) public {
        require(proposalId < proposals.length, "Invalid proposal ID");
        Proposal storage proposal = proposals[proposalId];

        require(
            block.timestamp >= proposal.startDate &&
                block.timestamp <= proposal.endDate,
            "Voting is not allowed at this time"
        );
        require(!hasVoted[proposalId][msg.sender], "You have already voted");

        proposal.voteCount += 1;
        hasVoted[proposalId][msg.sender] = true;

        emit Voted(proposalId, msg.sender);
    }

    function undoVote(uint256 proposalId) public {
        require(proposalId < proposals.length, "Invalid proposal ID");
        Proposal storage proposal = proposals[proposalId];

        require(
            block.timestamp >= proposal.startDate &&
                block.timestamp <= proposal.endDate,
            "Cannot undo vote outside voting period"
        );
        require(hasVoted[proposalId][msg.sender], "You have not voted yet");

        proposal.voteCount -= 1;
        hasVoted[proposalId][msg.sender] = false;

        emit VoteUndone(proposalId, msg.sender);
    }

    function getProposal(
        uint256 proposalId
    )
        public
        view
        returns (
            string memory name,
            string memory description,
            uint256 voteCount,
            uint256 startDate,
            uint256 endDate,
            address creator
        )
    {
        require(proposalId < proposals.length, "Invalid proposal ID");
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.name,
            proposal.description,
            proposal.voteCount,
            proposal.startDate,
            proposal.endDate,
            proposal.creator
        );
    }

    function getAllProposals() public view returns (Proposal[] memory) {
        return proposals;
    }

    function getTotalProposals() public view returns (uint256) {
        return proposals.length;
    }
}

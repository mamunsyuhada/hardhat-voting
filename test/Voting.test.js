const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting Contract", function () {
  let Voting, voting, owner, addr1, addr2;

  beforeEach(async function () {
    // Deploy the contract before each test
    Voting = await ethers.getContractFactory("Voting");
    [owner, addr1, addr2] = await ethers.getSigners();
    voting = await Voting.deploy();
    await voting.deployed();
  });

  describe("Proposal Creation", function () {
    it("Should allow the owner to create a proposal", async function () {
      const tx = await voting.createProposal(
        "Proposal 1",
        "Description for Proposal 1",
        Math.floor(Date.now() / 1000) + 100, // Start in 100 seconds
        Math.floor(Date.now() / 1000) + 1000 // End in 1000 seconds
      );
      await tx.wait();

      const proposal = await voting.getProposal(0);

      expect(proposal.name).to.equal("Proposal 1");
      expect(proposal.description).to.equal("Description for Proposal 1");
      expect(proposal.voteCount).to.equal(0);
      expect(proposal.creator).to.equal(owner.address);
    });

    it("Should fail if required fields are missing", async function () {
      await expect(
        voting.createProposal("", "Description", 1, 2)
      ).to.be.revertedWith("Name is required");

      await expect(
        voting.createProposal("Name", "", 1, 2)
      ).to.be.revertedWith("Description is required");

      await expect(
        voting.createProposal("Name", "Description", 2, 1)
      ).to.be.revertedWith("End date must be after start date");
    });
  });

  describe("Editing Proposals", function () {
    beforeEach(async function () {
      await voting.createProposal(
        "Proposal 1",
        "Description for Proposal 1",
        Math.floor(Date.now() / 1000) + 100,
        Math.floor(Date.now() / 1000) + 1000
      );
    });

    it("Should allow the creator to edit the proposal", async function () {
      const tx = await voting.editProposal(0, "Updated Name", "Updated Description");
      await tx.wait();

      const proposal = await voting.getProposal(0);

      expect(proposal.name).to.equal("Updated Name");
      expect(proposal.description).to.equal("Updated Description");
    });

    it("Should fail if a non-creator tries to edit the proposal", async function () {
      await expect(
        voting.connect(addr1).editProposal(0, "New Name", "New Description")
      ).to.be.revertedWith("Only the creator can edit the proposal");
    });

    it("Should fail if the proposal is being edited after voting has started", async function () {
      await ethers.provider.send("evm_increaseTime", [200]); // Simulate 200 seconds passing
      await ethers.provider.send("evm_mine", []);
      await expect(
        voting.editProposal(0, "New Name", "New Description")
      ).to.be.revertedWith("Cannot edit a proposal after voting has started");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      await voting.createProposal(
        "Proposal 1",
        "Description for Proposal 1",
        Math.floor(Date.now() / 1000) + 100,
        Math.floor(Date.now() / 1000) + 1000
      );
    });

    it("Should allow users to vote within the voting period", async function () {
      await ethers.provider.send("evm_increaseTime", [200]); // Simulate 200 seconds passing
      await ethers.provider.send("evm_mine", []);

      const tx = await voting.connect(addr1).vote(0);
      await tx.wait();

      const proposal = await voting.getProposal(0);
      expect(proposal.voteCount).to.equal(1);
      expect(await voting.hasVoted(0, addr1.address)).to.be.true;
    });

    it("Should fail if the user votes outside the voting period", async function () {
      await expect(voting.connect(addr1).vote(0)).to.be.revertedWith(
        "Voting is not allowed at this time"
      );
    });

    it("Should fail if the user votes more than once", async function () {
      await ethers.provider.send("evm_increaseTime", [200]);
      await ethers.provider.send("evm_mine", []);

      await voting.connect(addr1).vote(0);

      await expect(voting.connect(addr1).vote(0)).to.be.revertedWith(
        "You have already voted"
      );
    });
  });

  describe("Undo Vote", function () {
    beforeEach(async function () {
      await voting.createProposal(
        "Proposal 1",
        "Description for Proposal 1",
        Math.floor(Date.now() / 1000) + 100,
        Math.floor(Date.now() / 1000) + 1000
      );

      await ethers.provider.send("evm_increaseTime", [200]);
      await ethers.provider.send("evm_mine", []);

      await voting.connect(addr1).vote(0);
    });

    it("Should allow users to undo their vote within the voting period", async function () {
      const tx = await voting.connect(addr1).undoVote(0);
      await tx.wait();

      const proposal = await voting.getProposal(0);
      expect(proposal.voteCount).to.equal(0);
      expect(await voting.hasVoted(0, addr1.address)).to.be.false;
    });

    it("Should fail if the user has not voted", async function () {
      await expect(voting.connect(addr2).undoVote(0)).to.be.revertedWith(
        "You have not voted yet"
      );
    });

    it("Should fail if undoing the vote outside the voting period", async function () {
      await ethers.provider.send("evm_increaseTime", [900]); // Simulate passing voting period
      await ethers.provider.send("evm_mine", []);

      await expect(voting.connect(addr1).undoVote(0)).to.be.revertedWith(
        "Cannot undo vote outside voting period"
      );
    });
  });
});

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "base64-sol/base64.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

contract RandomSVGNFT is ERC721URIStorage, VRFConsumerBase, Ownable {
    
    // State variables
    uint256 public tokenCounter;
        // ChainLink VRF parameters and mappings
    bytes32 public keyHash;
    uint256 public fee;
    mapping(bytes32 => address) public requestIdToSender;
    mapping(uint256 => uint256) public tokenIdToRandomNumber;
    mapping(bytes32 => uint256) public requestIdToTokenId;
        // Random SVG parameters
    uint256 public maxNumberOfPaths;
    uint256 public maxNumberOfPathCommands;
    uint256 public size;
    string[] public pathCommands;
    string[] public colors;

    // Events
    event RandomSVGCreated(address minter, uint256 indexed tokenId, string tokenURI);
    event RandomSVGRequested(address minter, bytes32 indexed requestId, uint256 indexed tokenId);
    event CreatedUnfinishedRandomSVG(address minter, uint256 indexed tokenId, uint256 randomNumber);

    // Constructor
    constructor(address _VRFCoordinatorAddress, address _linkTokenAddress, bytes32 _keyHash, uint256 _fee) 
    VRFConsumerBase(_VRFCoordinatorAddress, _linkTokenAddress) 
    ERC721("RandomSVG NFT", "RndmSVGNFT") {
        tokenCounter = 0;
        keyHash = _keyHash;
        fee = _fee;
        maxNumberOfPaths = 10;
        maxNumberOfPathCommands = 5;
        size = 500;
        pathCommands = ["M", "L"];
        colors = ["red", "blue", "green", "yellow", "black", "white"];
    }

    /** 
     *      To mint a random SVG NFT :
     *      - call the create() function
     *      - wait for the ChainLink VRF to success on its callback function (fulfillRandomness())
     *      - call finishMint() to process the randomness into a SVG
     *
     *      NOTE: 
     *          According to ChainLink docs : (https://docs.chain.link/docs/get-a-random-number/)
     *               "If your fulfillRandomness() function uses more than 200k gas, the transaction will fail."
     *          This is why finishMint() is called by the minter by a second contract call after create() and not by fulfillRandomness()
     *
     */
    function create() public {
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        // Requests ChainLink VRF randomness 
        bytes32 requestId = requestRandomness(keyHash, fee);
        requestIdToSender[requestId] = msg.sender;
        uint256 tokenId = tokenCounter;
        requestIdToTokenId[requestId] = tokenId;
        tokenCounter = tokenCounter + 1;
        emit RandomSVGRequested(msg.sender, requestId, tokenId);
    }

    /**
     * Callback function used by ChainLink VRF Coordinator
     * Cannot use more than 200k gas
     */
    function fulfillRandomness(bytes32 _requestId, uint256 _randomNumber) internal override {
        address minter = requestIdToSender[_requestId];
        uint256 tokenId = requestIdToTokenId[_requestId];
        _safeMint(minter, tokenId);
        tokenIdToRandomNumber[tokenId] = _randomNumber;
        emit CreatedUnfinishedRandomSVG(minter, tokenId, _randomNumber);
    }

    /**
     * Function to call after ChainLink VRF response succeeded
     */
    function finishMint(uint256 _tokenId) public {
        require(bytes(tokenURI(_tokenId)).length <= 0, "tokenURI is already set!");
        require(tokenCounter > _tokenId, "TokenId has not been minted yet!");
        require(tokenIdToRandomNumber[_tokenId] > 0, "Need to wait for the Chainlink node to respond!");
        uint256 randomNumber = tokenIdToRandomNumber[_tokenId];
        string memory svg = generateSVG(randomNumber);
        string memory imageURI = svgToImageURI(svg);
        _setTokenURI(_tokenId, formatTokenURI(imageURI));
        emit RandomSVGCreated(msg.sender, _tokenId, svg);
    }

    function generateSVG(uint256 _randomNumber) public view returns (string memory finalSvg) {
        // We will only use the path element, with stroke and d elements
        uint256 numberOfPaths = (_randomNumber % maxNumberOfPaths) + 1;
        finalSvg = string(abi.encodePacked("<svg xmlns='http://www.w3.org/2000/svg' height='", uint2str(size), "' width='", uint2str(size), "'>"));
        for(uint i = 0; i < numberOfPaths; i++) {
            // we get a new random number for each path
            string memory pathSvg = generatePath(uint256(keccak256(abi.encode(_randomNumber, i))));
            finalSvg = string(abi.encodePacked(finalSvg, pathSvg));
        }
        finalSvg = string(abi.encodePacked(finalSvg, "</svg>"));
    }

    function generatePath(uint256 _randomNumber) public view returns(string memory pathSvg) {
        uint256 numberOfPathCommands = (_randomNumber % maxNumberOfPathCommands) + 1;
        pathSvg = "<path d='";
        for(uint i = 0; i < numberOfPathCommands; i++) {
            string memory pathCommand = generatePathCommand(uint256(keccak256(abi.encode(_randomNumber, size + i))));
            pathSvg = string(abi.encodePacked(pathSvg, pathCommand));
        }
        string memory color = colors[_randomNumber % colors.length];
        pathSvg = string(abi.encodePacked(pathSvg, "' fill='transparent' stroke='", color,"'/>"));
    }

    function generatePathCommand(uint256 _randomNumber) public view returns(string memory pathCommand) {
        pathCommand = pathCommands[_randomNumber % pathCommands.length];
        uint256 parameterOne = uint256(keccak256(abi.encode(_randomNumber, size * 2))) % size;
        uint256 parameterTwo = uint256(keccak256(abi.encode(_randomNumber, size * 2 + 1))) % size;
        pathCommand = string(abi.encodePacked(pathCommand, " ", uint2str(parameterOne), " ", uint2str(parameterTwo)));
    }
    
    // From: https://stackoverflow.com/a/65707309/11969592
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    function svgToImageURI(string memory _svg) public pure returns (string memory) {
        // transforms:
        // <svg width='500' height='500' viewBox='0 0 285 350' fill='none' xmlns='http://www.w3.org/2000/svg'><path fill='black' d='M150,0,L75,200,L225,200,Z'></path></svg>
        // to:
        // data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNTAwJyBoZWlnaHQ9JzUwMCcgdmlld0JveD0nMCAwIDI4NSAzNTAnIGZpbGw9J25vbmUnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PHBhdGggZmlsbD0nYmxhY2snIGQ9J00xNTAsMCxMNzUsMjAwLEwyMjUsMjAwLFonPjwvcGF0aD48L3N2Zz4=
        string memory baseURL = "data:image/svg+xml;base64,";
        string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(_svg))));
        return string(abi.encodePacked(baseURL,svgBase64Encoded));
    }

    function formatTokenURI(string memory _imageURI) public pure returns (string memory) {
        return string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"Random SVG NFT",', 
                                '"description":"An NFT based on random SVG!",', 
                                '"attributes":"",', 
                                '"image":"',_imageURI,'"}'
                            )
                        )
                    )
                )
            );
    }    
}
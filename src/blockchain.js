/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');
const hex2ascii = require('hex2ascii');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            if (self.chain.length > 0) {
                block.previousBlockHash = self.chain[self.chain.length - 1].hash;
            }
            block.height = self.chain.length;
            block.time = new Date().getTime().toString().slice(0,-3);
            block.hash = SHA256(JSON.stringify(block)).toString();
            this.chain.push(block);
            this.height += 1;
            resolve(self.validateChain());
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            //getnewaddress "mylabel" "legacy"
            //mrPrghtHxE2s7Pcm6pALdTRaTjppfxX4yp
            let Msg = address + ':' + new Date().getTime().toString().slice(0,-3) + ':starRegistry';
            if(Msg){
                resolve(Msg);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));
            let Timestamp = parseInt(message.split(':')[1]);
            if (currentTime <= Timestamp + 300) {
                if (bitcoinMessage.verify(message, address, signature)) {
                    let block = new BlockClass.Block({data: {"owner": message.split(':')[0], "star": star}});
                    console.log('123');
                    let chain_error_log = await self._addBlock(block);
                    console.log(chain_error_log.length);
                    if (chain_error_log.length == 0) {
                        resolve(block);
                    }else{
                        resolve(chain_error_log);
                    }
                    
                } else {
                    resolve('Singature invalid');
                }
            } else {
                resolve('Singature expired, please regenerate and use it within 5 min.');
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        //console.log("hash");
        let self = this;
        
        return new Promise((resolve, reject) => {
            //console.log(hash);
            let filtered_block = self.chain.filter(function(x){return x.hash === hash})[0];
            //console.log(filtered_block);
            if(filtered_block){
                resolve(filtered_block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            var i;
            var my_stars = [];
            console.log(self.height);
            for (i = 1; i <= parseInt(self.height); i++) {
                console.log(i);
                let current_block_body = self.chain[i].body;
                console.log(current_block_body);
                let current_block_data = JSON.parse(hex2ascii(current_block_body)).data;
                //let current_block_data = hex2ascii('0x68656c6c6f20776f726c64');
                console.log(current_block_data);
                if (current_block_data.owner == address){
                    my_stars.push(current_block_data);
                }
            }
            resolve(my_stars);

            
        });
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        var i;
        return new Promise(async (resolve, reject) => {
            for (i = 1; i <= parseInt(self.height); i++) {
                //console.log(i);
                let recent_error = await self.chain[i].validate()
                //console.log(recent_error);
                //let current_block_data = JSON.parse(hex2ascii(current_block_body)).data;
                //let current_block_data = hex2ascii('0x68656c6c6f20776f726c64');
                //console.log(current_block_data);
                if (recent_error != "Block is valid") {
                    errorLog.push("Block " + i + ": " + recent_error);
                }
                
                if (self.chain[i].previousBlockHash == self.chain[i - 1].hash){
                    //errorLog.push("Block " + i + "'s previous block's Hash value is valid!");
                } else {
                    errorLog.push("Block " + i + " is broken from previous block's Hash value!");
                }
            }
            console.log('abc');
            console.log(errorLog);
            resolve(errorLog);
        });
    }

}

module.exports.Blockchain = Blockchain;
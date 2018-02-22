
const { createHash } = require('crypto')
const { Record, Set } = require('immutable')

const POW_DIFFICULTY = 2
const POW_MAX_NONCE = Math.pow(10, POW_DIFFICULTY * 2)

const Block = Record({ prevHash: '', timestamp: 0, data: '', hash: '', nonce: 0 })

const blockHeader = block => [
  block.get('prevHash'),
  block.get('data'),
  block.get('timestamp'),
  block.get('nonce'),
]

const blockHash = block => createHash('sha256')
  .update(JSON.stringify(blockHeader(block)))
  .digest('hex')

const NewBlock = ({ prevHash, data, nonce }) => {
  const block = (new Block)
    .set('prevHash', prevHash)
    .set('data', data)
    .set('timestamp', (new Date).getTime())
    .set('nonce', nonce || 0)
  return block.set('hash', blockHash(block))
}

const GenesisBlock = () => BlockProofOfWork(NewBlock({ data: '__<genesis>__' }))

const NewBlockchain = () => Set.of(GenesisBlock())

const AddBlock = ({ blockchain, data }) => {
  const prevHash = blockchain.last().get('hash')
  const block = NewBlock({ data, prevHash })
  return blockchain.add(BlockProofOfWork(block))
}

const isValidProofOfWork = ({ hash, difficulty }) => (function check(tail, d = 0) {
  return tail[0] !== '0' ? d >= difficulty : check(tail.substr(1), d + 1)
})(hash)

const BlockProofOfWork = block => (function work(wBlock) {
  const nonce = wBlock.get('nonce', 0)
  if (nonce > POW_MAX_NONCE) {
    throw new Error('Max nonce exceeded')
  }
  const candidate = wBlock.set('nonce', nonce + 1)
  const hash = blockHash(candidate)
  return isValidProofOfWork({ hash, difficulty: POW_DIFFICULTY }) ?
    candidate.set('hash', hash) : work(candidate)
})(block)

const isValidBlockchain = blockchain => {
  const blocks = blockchain.toArray()
  return (function check(tail, cur) {
    return tail.length === 0 ? true :
      (cur.hash !== tail[0].prevHash ? false : check(tail.slice(1), tail[0]))
  })(blocks.slice(1), blocks[0])
}

// -------------------- test area ----------------------------------------------

const blockchain = (function addBlocks(data, blockchain) {
  return data.length === 0 ? blockchain
    : addBlocks(data.slice(1), AddBlock({ blockchain, data: data[0] }))
})([
  'charlie gives 2 BTC to brice',
  'brice gives 1 BTC to caroline'
], NewBlockchain())

console.log(JSON.stringify(blockchain, null, 2))
console.log(isValidBlockchain(blockchain))

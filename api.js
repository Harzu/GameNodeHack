const Web3 = require('web3')
const abi = require('./abi.json')
const accs = require('./accounts')
const signHh = require('web3-eth-accounts/node_modules/eth-lib/lib/account.js')

const gp   = 100 * 1000000000;
const web3 = new Web3(new Web3.providers.HttpProvider('https://ropsten.infura.io/JCnK5ifEPH9qcQkX0Ahl'))
const cont = new web3.eth.Contract(
  abi,
  '0xe1bab84766C1C58F981e0CC661287eD80efa9aAe'
)

let inter = 0;
let session_id = ''

const numToHex = (num) => {
  return num.toString(16)
}

const makeSeed = () => {
  var str = '0x'
  var possible = 'abcdef0123456789'

  for (var i = 0; i < 64; i++) {
    if (new Date().getTime() % 2 === 0) {
      str += possible.charAt(Math.floor(Math.random() * possible.length))
    } else {
      str += possible.charAt(Math.floor(Math.random() * (possible.length - 1)))
    }
  }

  return web3.utils.sha3(numToHex(str))
}

const add0x = (str) => {
  if (str.substr(0, 2) !== '0x') {
    str = '0x' + str
  }
  return str
}

function signHash (hash, pvt) {
  hash = add0x(hash)
  if (!web3.utils.isHexStrict(hash)) {
    console.log('err')
    Utils.debugLog(hash + ' is not correct hex', _config.loglevel)
    Utils.debugLog('Use DCLib.Utils.makeSeed or Utils.soliditySHA3(your_args) to create valid hash', _config.loglevel)
  }

  return signHh.sign(hash, add0x(pvt))
}

module.exports.initAcc = async function(req, res) {
  inter = (inter !== 1) ? ++inter : 0;
  console.log(inter)
  const acc = accs.pull[inter];

  let [inv, wild] = await Promise.all([
    cont.methods.getInventory(acc.openKey).call(),
    cont.methods.getWilds(acc.openKey).call()
  ])

  if (wild.length > 0) {
    web3.eth.accounts.wallet.add(acc.privateKey)
    res.status(200).json({
      openkey: acc.openKey,
      privateKey: acc.privateKey,
      inv: inv,
      wild: wild
    })
    return
  }

  web3.eth.accounts.wallet.add(acc.privateKey)
  const seed = makeSeed()

  const receipt = await cont.methods
    .initNewPlayer(
      acc.openKey, seed
    ).send({
      from: acc.openKey,
      gas: 4600000,
      gasPrice: 1.2 * gp
    }).on('transactionHash', tx => console.log(tx))
    .on('error', err => res.status(401).json({err: err}))

  if (receipt) {
    [inv, wild] = await Promise.all([
      cont.methods.getInventory(acc.openKey).call(),
      cont.methods.getWilds(acc.openKey).call()
    ])

    if (inv && wild) {
      res.status(200).json({
        openkey: acc.openKey,
        privateKey: acc.privateKey,
        inv: inv,
        wild: wild
      })
    }
  }
}

module.exports.startGame = async function(req, res) {
  session_id = makeSeed()
  const address    = req.body.address
  const pvt        = req.body.pvt
  const wild       = req.body.wild
  const gen        = req.body.gen

  const [inv, wilds] = await Promise.all([
    cont.methods.getInventory(address).call(),
    cont.methods.getWilds(address).call()
  ])

  const sign = signHash(web3.utils.soliditySha3(
    {t: 'bytes', v: session_id},
    {t: 'address', v: address},
    {t: 'uint', v: gen},
    {t: 'uint', v:wild},
    {t: 'uint', v: wilds},
    {t: 'uint', v: inv}
    ),
    pvt
  )
  const receipt = await cont.methods.startGame(
    session_id,
    address,
    wild,
    gen,
    sign
  ).send({
    from: address,
    gas: 4600000,
    gasPrice: 1.2 * gp
  }).on('transactionHash', tx => console.log(tx))
  .on('error', err => res.status(401).json({err: err}))

  if (receipt) {
    res
      .status(200)
      .json({channel: true})
  }
}

module.exports.closeGame = async function(req, res) {
  const address    = req.body.address
  const pvt        = req.body.pvt
  const wild       = req.body.wild
  const gen        = req.body.gen
  const seed       = makeSeed()
  console.log(req)
  const [inv, wilds] = await Promise.all([
    cont.methods.getInventory(address).call(),
    cont.methods.getWilds(address).call()
  ])

  const sign = signHash(web3.utils.soliditySha3(
    {t: 'bytes', v: session_id},
    {t: 'address', v: address},
    {t: 'uint', v: gen},
    {t: 'uint', v: wild},
    {t: 'uint', v: wilds},
    {t: 'uint', v: inv}
    ),
    pvt
  )

  const receipt = await cont.methods.closeGame(
    session_id,
    address,
    wild,
    gen,
    seed,
    sign
  ).send({
    from: address,
    gas: 4600000,
    gasPrice: 1.2 * gp
  }).on('transactionHash', tx => console.log(tx))
  .on('error', err => res.status(401).json({err: err}))

  if (receipt) {
    const [inv, wilds] = await Promise.all([
      cont.methods.getInventory(address).call(),
      cont.methods.getWilds(address).call()
    ])

    res
      .status(200)
      .json({
        channel: false,
        inv: inv,
        wilds: wilds
      })
  }
}

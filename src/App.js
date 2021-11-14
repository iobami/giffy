import { useCallback, useEffect, useState } from 'react';

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import {
  Program, Provider, web3
} from '@project-serum/anchor';

import twitterLogo from './assets/twitter-logo.svg';
import './App.css';

import kp from './keypair.json';
import idl from './myepicproject.json';

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = Keypair.fromSecretKey(secret)

// Get our program's id form the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devent.
const network = clusterApiUrl('devnet');

// Control's how we want to acknowledge when a trasnaction is "done".
const opts = {
  preflightCommitment: "processed"
}

// Constants
const TWITTER_HANDLE = 'iobami';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

// const TEST_GIFS = [
//   'https://media.giphy.com/media/O5NyCibf93upy/giphy.gif',
//   'https://media.giphy.com/media/ebAfdhOr5mn0LG1mme/giphy.gif',
//   'https://media.giphy.com/media/26FPzgftlRfgwkEw0/giphy.gif',
//   'https://media.giphy.com/media/l3q2JCu9lep6dAmyY/giphy.gif',
//   'https://media.giphy.com/media/d3MLV9CB1iYb0IBG/giphy.gif'
// ]

function Like() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="css-i6dzq1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
  );
}

function getParseFloat(value) {
  if (Number.isNaN(Number.parseFloat(value))) {
    return 0;
  }

  return parseFloat(value);
}

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [modalState, setModalState] = useState({ toPubkey: '', show: false });
  const [amount, setAmount] = useState(0);
  const [gifList, setGifList] = useState([]);

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');

          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with Public Key:',
            response.publicKey.toString()
          );

          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!")
      return
    }
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF sucesfully sent to program", inputValue)

      await getGifList();

      setInputValue('');
    } catch (error) {
      console.log("Error sending GIF:", error)
    }
  };

  const likeGif = async (gitLink) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.likeGif(gitLink, walletAddress, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });

      await getGifList();
    } catch (error) {
      console.log("Error liking GIF:", error)
    }
  };

  const unlikeGif = async (gitLink) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.unlikeGif(gitLink, walletAddress, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });

      await getGifList();
    } catch (error) {
      console.log("Error unliking GIF:", error)
    }
  };

  const getGifList = useCallback(async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log("Got the account", account)
      setGifList(account.gifList)

    } catch (error) {
      console.log("Error in getGifs: ", error)
      setGifList(null);
    }
  }, [setGifList]);

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping")
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
      await getGifList();

    } catch (error) {
      console.log("Error creating BaseAccount account:", error)
    }
  }

  const tipUser = async () => {
    try {
      const { solana } = window;

      const { Transaction, SystemProgram, clusterApiUrl, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');

      let connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

      const payer = await solana.connect();
      let fromPubkey = payer.publicKey;

      let transaction = new Transaction();

      let blockhashObj = await connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhashObj.blockhash;
      transaction.feePayer = fromPubkey;

      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey: modalState.toPubkey,
          lamports: LAMPORTS_PER_SOL * getParseFloat(amount),
        })
      );

      const signedTransaction = await solana.signTransaction(
        transaction
      );

      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      console.log(signature);

      setModalState({ show: false, toPubkey: '' });
    } catch (error) {
      console.log('error:::', error);
    } finally {
      console.log('we are done !');
    }
  };

  const showModal = (toPubkey) => {
    setModalState({ ...modalState, toPubkey, show: true });
  };

  const renderConnectedContainer = () => {
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    }

    return (
      <div className="connected-container">
        <form
          onSubmit={(event) => {
            event.preventDefault();

            sendGif();
          }}
        >
          <input
            type="text"
            placeholder="Enter gif link!"
            value={inputValue}
            onChange={onInputChange}
          />
          <button type="submit" className="cta-button submit-gif-button">Submit</button>
        </form>

        <div className="gif-grid">
          {gifList.map((item) => {
            const userLikedGif = item.addressOfUsersThatLikeGif.includes(walletAddress);

            return (
              <div className="gif-item" key={item.gifLink}>
                <img src={item.gifLink} alt={item.gifLink} />

                <div className="overlay">
                  <div className="actions">
                    <div className={`like ${userLikedGif ? 'active' : ''}`}>
                      <span>{item?.likes?.toString()}</span>

                      <span title={userLikedGif ? 'unlike' : 'like'} onClick={() => (userLikedGif ? unlikeGif(item.gifLink) : likeGif(item.gifLink))}><Like /></span>
                    </div>

                    <button onClick={() => showModal(item?.userAddress)} type="submit" className="cta-button submit-gif-button tip">$ tip</button>
                  </div>

                  <p className="owner" title="copy address">{item?.userAddress?.toString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const Modal = () => (
    <div className={`modal ${modalState.show ? 'show' : ''}`}>
      <div className="modal__content">


        <form
          onSubmit={(event) => {
            event.preventDefault();

            tipUser();
          }}
          className="connected-container"
        >
          <label>Amount in $sol</label>

          <div>
            <input
              type="number"
              placeholder="Enter amount $sol"
              value={amount}
              min={0}
              step="0.0001"
              onChange={(e) => setAmount(e.target.value)}
            />
            <button type="submit" className="cta-button submit-gif-button">Submit</button>
          </div>
        </form>

        <span onClick={() => setModalState({ ...modalState, show: false })} className="modal__close">&times;</span>
      </div>
    </div>
  );

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');

      // Call Solana program here.
      getGifList();
    }
  }, [getGifList, walletAddress]);

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🖼 Jordan GIFs</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>

          {!walletAddress && renderNotConnectedContainer()}

          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>

      <Modal key="modal" />
    </div>
  );
};

export default App;

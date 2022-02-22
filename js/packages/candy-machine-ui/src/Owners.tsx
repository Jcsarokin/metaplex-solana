import { useCallback, useEffect, useState } from 'react';

import * as anchor from '@project-serum/anchor';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import bs58 from 'bs58';

import {
  TextField,
  Paper,
  TableContainer,
  Table,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@material-ui/core';

import {
  getCandyMachineCreator,
  TOKEN_METADATA_PROGRAM_ID,
} from './candy-machine';

const MAX_NAME_LENGTH = 32;
const MAX_URI_LENGTH = 200;
const MAX_SYMBOL_LENGTH = 10;
const MAX_CREATOR_LEN = 32 + 1 + 1;
const MAX_CREATOR_LIMIT = 5;
const MAX_DATA_SIZE =
  4 +
  MAX_NAME_LENGTH +
  4 +
  MAX_SYMBOL_LENGTH +
  4 +
  MAX_URI_LENGTH +
  2 +
  1 +
  4 +
  MAX_CREATOR_LIMIT * MAX_CREATOR_LEN;
const MAX_METADATA_LEN = 1 + 32 + 32 + MAX_DATA_SIZE + 1 + 1 + 9 + 172;
const CREATOR_ARRAY_START =
  1 +
  32 +
  32 +
  4 +
  MAX_NAME_LENGTH +
  4 +
  MAX_URI_LENGTH +
  4 +
  MAX_SYMBOL_LENGTH +
  2 +
  1 +
  4;

export interface OwnersProps {
  candyMachineId?: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
}

interface OwnerList {
  name: String;
  nftToken: String;
  owner: String;
}

const Owners = (props: OwnersProps) => {
  const [ownerList, setOwnerList] = useState<OwnerList[]>([]);
  const [search, setSearch] = useState<string>('');

  const { connection, candyMachineId } = props;

  const getMintAddresses = async (
    firstCreatorAddress: anchor.web3.PublicKey,
  ) => {
    const metadataAccounts = await connection.getProgramAccounts(
      TOKEN_METADATA_PROGRAM_ID,
      {
        // The mint address is located at byte 33 and lasts for 32 bytes.
        // dataSlice: { offset: 33, length: 32 },

        filters: [
          // Only get Metadata accounts.
          { dataSize: MAX_METADATA_LEN },

          // Filter using the first creator.
          {
            memcmp: {
              offset: CREATOR_ARRAY_START,
              bytes: firstCreatorAddress.toBase58(),
            },
          },
        ],
      },
    );

    return metadataAccounts.map(metadataAccountInfo => ({
      addr: bs58.encode(metadataAccountInfo.account.data.slice(33, 65)),
      name: metadataAccountInfo.account.data
        .slice(
          69,
          101 -
            metadataAccountInfo.account.data
              .slice(69, 101)
              .filter(da => da == 0).length,
        )
        .toString(),
    }));
  };

  const getList = useCallback(async () => {
    if (candyMachineId) {
      let result = ownerList;
      const candyMachineCreator = await getCandyMachineCreator(candyMachineId);
      getMintAddresses(candyMachineCreator[0])
        .then(async res => {
          // console.log(res);
          await res.map(async ({ addr, name }) => {
            // let addr = bs58.encode(metadataAccountInfo.account.data);
            const largestAccounts = await connection.getTokenLargestAccounts(
              new anchor.web3.PublicKey(addr),
            );
            // console.log(largestAccounts.value[0].address, metadataAccountInfo.pubkey, metadataAccountInfo.account)
            let data;
            if (largestAccounts.value.length > 0) {
              const largestAccountInfo = await connection.getParsedAccountInfo(
                largestAccounts.value[0].address,
              );
              data = largestAccountInfo.value?.data;
            }

            if (data && Object.prototype.hasOwnProperty.call(data, 'parsed')) {
              let parsed = JSON.parse(JSON.stringify(data))['parsed'];
              let owner = parsed.info.owner;

              if (owner) {
                result.push({
                  owner,
                  nftToken: addr,
                  name,
                });
                setOwnerList([...result]);
              }
            }
          });
        })
        .catch(err => {
          console.log(err, '-----------------');
        });
    }
  }, [connection, candyMachineId]);

  useEffect(() => {
    getList();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const compare = (a: OwnerList, b: OwnerList) => {
    let an = Number(a.name.split('#')[1]);
    let bn = Number(b.name.split('#')[1]);
    if (an < bn) {
      return -1;
    }
    if (an > bn) {
      return 1;
    }
    return 0;
  };

  return (
    <>
      <div style={{ textAlign: 'right', marginBottom: 20 }}>
        <TextField
          style={{ minWidth: 400 }}
          type="search"
          id="standard-required"
          label="Search by Attribute or Owner Address"
          value={search}
          onChange={handleChange}
        />
      </div>
      <TableContainer component={Paper}>
        <Table aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Token</TableCell>
              <TableCell align="left">Owner</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ownerList.length > 0 &&
              ownerList
                .filter(
                  row =>
                    row.name.includes(search) ||
                    row.owner.toLowerCase().includes(search.toLowerCase()),
                )
                .map((row, i) => (
                  <TableRow key={i}>
                    <TableCell component="th" scope="row">
                      {row.name}
                    </TableCell>
                    <TableCell>{row.nftToken}</TableCell>
                    <TableCell align="left">{row.owner}</TableCell>
                  </TableRow>
                ))}
            {ownerList.length == 0 && (
              <TableRow>
                <TableCell align="center" colSpan={3} scope="row">
                  Loading...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default Owners;

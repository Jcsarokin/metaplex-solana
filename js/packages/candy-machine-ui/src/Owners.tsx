import { useCallback, useEffect, useState } from 'react';

import * as anchor from '@project-serum/anchor';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import bs58 from 'bs58';

import { Paper, TableContainer, Table, TableRow, TableHead, TableBody, TableCell } from '@material-ui/core';

import { getCandyMachineCreator, TOKEN_METADATA_PROGRAM_ID } from './candy-machine';

const MAX_NAME_LENGTH = 32;
const MAX_URI_LENGTH = 200;
const MAX_SYMBOL_LENGTH = 10;
const MAX_CREATOR_LEN = 32 + 1 + 1;
const MAX_CREATOR_LIMIT = 5;
const MAX_DATA_SIZE = 4 + MAX_NAME_LENGTH + 4 + MAX_SYMBOL_LENGTH + 4 + MAX_URI_LENGTH + 2 + 1 + 4 + MAX_CREATOR_LIMIT * MAX_CREATOR_LEN;
const MAX_METADATA_LEN = 1 + 32 + 32 + MAX_DATA_SIZE + 1 + 1 + 9 + 172;
const CREATOR_ARRAY_START = 1 + 32 + 32 + 4 + MAX_NAME_LENGTH + 4 + MAX_URI_LENGTH + 4 + MAX_SYMBOL_LENGTH + 2 + 1 + 4;

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

  const { connection, candyMachineId } = props;

  const getMintAddresses = async (firstCreatorAddress: anchor.web3.PublicKey) => {
    const metadataAccounts = await connection.getProgramAccounts(
      TOKEN_METADATA_PROGRAM_ID,
      {
        // The mint address is located at byte 33 and lasts for 32 bytes.
        dataSlice: { offset: 33, length: 32 },

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

    return metadataAccounts.map(metadataAccountInfo =>
      bs58.encode(metadataAccountInfo.account.data),
    );
  };

  const getList = useCallback(
    async () => {
    if (candyMachineId) {
      let result = ownerList;
      const candyMachineCreator = await getCandyMachineCreator(candyMachineId);
      getMintAddresses(candyMachineCreator[0]).then(async res => {
        await res.map(async addr => {
          const largestAccounts = await connection.getTokenLargestAccounts(
            new anchor.web3.PublicKey(addr),
            );
            const largestAccountInfo = await connection.getParsedAccountInfo(
              largestAccounts.value[0].address,
              );
              let data = largestAccountInfo.value?.data;
              
            const metadataPDA = await Metadata.getPDA(new anchor.web3.PublicKey(addr));
            const tokenMetadata = await Metadata.load(connection, metadataPDA);
            let name = tokenMetadata.data.data.name;

          if (Object.prototype.hasOwnProperty.call(data, 'parsed')) {
            let parsed = JSON.parse(JSON.stringify(data))['parsed'];
            let owner = parsed.info.owner;
            let nftToken = parsed.info.mint;
            if (owner) {
              result.push({
                owner,
                nftToken,
                name
              });
              setOwnerList([...result]);
            }
          }
        });
      });
    }
  },
    [connection, candyMachineId],
  )

  useEffect(() => {
    getList();
  }, []);

  return (
    <TableContainer component={Paper}>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Token</TableCell>
            <TableCell align="right">Owner</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ownerList.length > 0 && ownerList.map((row, i) => (
            <TableRow key={i}>
              <TableCell component="th" scope="row">
                {row.name}
              </TableCell>
              <TableCell>
                {row.nftToken}
              </TableCell>
              <TableCell align="right">{row.owner}</TableCell>
            </TableRow>
          ))}
          {ownerList.length == 0 && 
            <TableRow>
              <TableCell align="center" colSpan={3} scope="row">
                Loading...
              </TableCell>
            </TableRow>
          }
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default Owners;
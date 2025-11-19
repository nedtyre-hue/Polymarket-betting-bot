import { ethers } from 'ethers';
import { RPC_URL, USDC_CONTRACT_ADDRESS } from '@/config/constants';
import { erc20Abi } from '@/utils/abis/erc20Abi';
import logger from './logger';


const USDC_ABI = ['function balanceOf(address owner) view returns (uint256)', 'function symbol() view returns (string)'];

const POLYGON_NETWORK = {
    name: 'matic',
    chainId: 137,
};

/**
 * Check USDC allowance for a given spender contract
 * @param ownerAddress The wallet address that owns the USDC
 * @param spenderAddress The contract address that needs to spend USDC (e.g., CLOB contract)
 * @returns Allowance amount in USDC (6 decimals)
 */
export const checkUSDCAllowance = async (
    ownerAddress: string,
    spenderAddress: string
): Promise<number> => {
    if (!ethers.utils.isAddress(ownerAddress)) {
        throw new Error('Invalid owner address format');
    }
    if (!ethers.utils.isAddress(spenderAddress)) {
        throw new Error('Invalid spender address format');
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL, POLYGON_NETWORK);
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, erc20Abi, provider);
    
    const allowance = await usdcContract.allowance(ownerAddress, spenderAddress);
    const allowanceFormatted = ethers.utils.formatUnits(allowance, 6);
    
    return parseFloat(allowanceFormatted);
};

/**
 * Approve USDC spending for a given spender contract
 * @param privateKey Private key of the wallet that owns USDC
 * @param spenderAddress The contract address that needs to spend USDC (e.g., CLOB contract)
 * @param amount Amount to approve (in USDC, will be converted to 6 decimals). Use 'max' for unlimited approval
 * @returns Transaction hash
 */
export const approveUSDC = async (
    privateKey: string,
    spenderAddress: string,
    amount: number | 'max' = 'max'
): Promise<string> => {
    if (!ethers.utils.isAddress(spenderAddress)) {
        throw new Error('Invalid spender address format');
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL, POLYGON_NETWORK);
    const wallet = new ethers.Wallet(privateKey, provider);
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, erc20Abi, wallet);
    
    let approveAmount: ethers.BigNumber;
    
    if (amount === 'max') {
        // Approve maximum uint256 for unlimited approval
        approveAmount = ethers.constants.MaxUint256;
    } else {
        // Convert USDC amount to 6 decimals
        approveAmount = ethers.utils.parseUnits(amount.toString(), 6);
    }
    
    const tx = await usdcContract.approve(spenderAddress, approveAmount, {
        maxPriorityFeePerGas: ethers.utils.parseUnits("30", "gwei"),
        maxFeePerGas: ethers.utils.parseUnits("60", "gwei"),
        gasLimit: 200000
    });
    console.log("tx =", JSON.stringify(tx));
    await tx.wait();
    
    return tx.hash;
};

/**
 * Utility script to check wallet balance and configuration
 * Run with: npx ts-node src/utils/checkWallet.ts
 */
export const checkWalletStatus = async (privateKey?: string, walletAddress?: string) => {
    console.log('\n🔍 Wallet Status Check\n');
    console.log('='.repeat(60));
    
    // If no parameters provided, try to get from env (for backward compatibility)
    const PRIVATE_KEY = privateKey || process.env.PRIVATE_KEY;
    const PRIVATE_WALLET = walletAddress || process.env.PRIVATE_WALLET;
    
    if (!PRIVATE_KEY) {
        console.log('⚠️  No private key provided');
        return;
    }
    
    // Check if PRIVATE_WALLET matches the address from PRIVATE_KEY
    try {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const walletFromKey = new ethers.Wallet(PRIVATE_KEY, provider);
        const addressFromKey = walletFromKey.address;
        
        console.log('\n📋 Configuration:');
        if (PRIVATE_WALLET) {
            console.log(`   PRIVATE_WALLET (from .env):  ${PRIVATE_WALLET}`);
        }
        console.log(`   Address from PRIVATE_KEY:  ${addressFromKey}`);
        
        if (PRIVATE_WALLET && addressFromKey.toLowerCase() !== PRIVATE_WALLET.toLowerCase()) {
            console.log('\n⚠️  WARNING: PRIVATE_KEY does not match PRIVATE_WALLET address!');
            console.log('   The bot will use the address from PRIVATE_KEY.');
            console.log(`   Update PRIVATE_WALLET in .env to: ${addressFromKey}`);
        } else if (PRIVATE_WALLET) {
            console.log('   ✅ Addresses match!');
        }
        
        // Use the address from private key (this is what the bot actually uses)
        const actualWalletAddress = addressFromKey;
        
        console.log('\n💰 Balance Check (Polygon Network):');
        console.log(`   Checking configured USDC contract: ${USDC_CONTRACT_ADDRESS}`);
        
        try {
            const balance = await getMyBalance(actualWalletAddress, true);
            console.log(`   Configured USDC Balance: ${balance.toFixed(2)} USDC`);
            
            if (balance === 0) {
                console.log('\n⚠️  No balance found in configured USDC contract. Checking both USDC versions...');
                
                // Check both USDC versions
                const allBalances = await checkAllUSDCBalances(actualWalletAddress);
                console.log(`\n   📊 All USDC Balances:`);
                console.log(`      Native USDC (0x3c49...3359):  ${allBalances.native.toFixed(2)} USDC`);
                console.log(`      Bridged USDC.e (0x2791...84174): ${allBalances.bridged.toFixed(2)} USDC.e`);
                console.log(`      Total: ${allBalances.total.toFixed(2)} USDC/USDC.e`);
                
                if (allBalances.total > 0) {
                    console.log('\n✅ USDC found in a different contract!');
                    if (allBalances.native > 0) {
                        console.log(`   You have ${allBalances.native.toFixed(2)} Native USDC`);
                        console.log(`   Update USDC_CONTRACT_ADDRESS in .env to: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`);
                    }
                    if (allBalances.bridged > 0) {
                        console.log(`   You have ${allBalances.bridged.toFixed(2)} Bridged USDC.e`);
                        console.log(`   Update USDC_CONTRACT_ADDRESS in .env to: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`);
                    }
                } else {
                    console.log('\n❌ No USDC found in either contract!');
                    console.log(`   Wallet Address: ${actualWalletAddress}`);
                    console.log('   Please deposit USDC to this address on Polygon network.');
                    console.log('   You can send USDC from MetaMask Account 2 to this address.');
                }
            } else {
                console.log(`   ✅ Wallet has ${balance.toFixed(2)} USDC in configured contract`);
            }
        } catch (error: any) {
            console.error(`   ❌ Error checking balance: ${error.message}`);
            console.log('\n   Attempting to check both USDC versions...');
            try {
                const allBalances = await checkAllUSDCBalances(actualWalletAddress);
                console.log(`   Native USDC: ${allBalances.native.toFixed(2)}`);
                console.log(`   Bridged USDC.e: ${allBalances.bridged.toFixed(2)}`);
            } catch {
                // Ignore
            }
        }

    } catch (error: any) {
        console.error('❌ Error checking wallet:', error.message);
        console.error('   Make sure your .env file is configured correctly.');
    }
};

// Both USDC versions on Polygon
const POLYGON_USDC_NATIVE = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'; // Native USDC
const POLYGON_USDC_BRIDGED = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC.e (bridged)

const getMyBalance = async (address: string, showDetails: boolean = false): Promise<number> => {
    // Validate address format to ensure it's not an ENS name
    if (!ethers.utils.isAddress(address)) {
        throw new Error(`Invalid address format: ${address}. Must be a valid Ethereum address (0x...).`);
    }

    // Create provider with explicit Polygon network to prevent ENS resolution
    const rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL, POLYGON_NETWORK);
    
    // Check the configured USDC contract
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, rpcProvider);
    
    try {
        let symbol = 'USDC';
        try {
            symbol = await usdcContract.symbol();
        } catch {
            // If symbol() fails, just use default
        }
        
        if (showDetails) {
            logger.info(`   Checking ${symbol} at contract: ${USDC_CONTRACT_ADDRESS}`);
        }
        
        const balance_usdc = await usdcContract.balanceOf(address);
        const balance_usdc_real = ethers.utils.formatUnits(balance_usdc, 6);
        const balance = parseFloat(balance_usdc_real);
        
        if (showDetails) {
            logger.info(`   ${symbol} Balance: ${balance.toFixed(2)} ${symbol}`);
        }
        
        return balance;
    } catch (error: any) {
        if (showDetails) {
            logger.error(`   Error checking ${USDC_CONTRACT_ADDRESS}: ${error.message}`);
        }
        throw error;
    }
};

/**
 * Check balance for both USDC versions on Polygon
 */
export const checkAllUSDCBalances = async (address: string): Promise<{ native: number; bridged: number; total: number }> => {
    const rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL, POLYGON_NETWORK);
    const usdcABI = ['function balanceOf(address owner) view returns (uint256)'];
    
    try {
        // Check native USDC
        const nativeContract = new ethers.Contract(POLYGON_USDC_NATIVE, usdcABI, rpcProvider);
        const nativeBalance = await nativeContract.balanceOf(address);
        const nativeAmount = parseFloat(ethers.utils.formatUnits(nativeBalance, 6));
        
        // Check bridged USDC.e
        const bridgedContract = new ethers.Contract(POLYGON_USDC_BRIDGED, usdcABI, rpcProvider);
        const bridgedBalance = await bridgedContract.balanceOf(address);
        const bridgedAmount = parseFloat(ethers.utils.formatUnits(bridgedBalance, 6));
        
        return {
            native: nativeAmount,
            bridged: bridgedAmount,
            total: nativeAmount + bridgedAmount
        };
    } catch (error: any) {
        logger.error(`Error checking all USDC balances: ${error.message}`);
        throw error;
    }
};

export default getMyBalance;

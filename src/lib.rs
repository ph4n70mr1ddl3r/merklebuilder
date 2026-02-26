use k256::elliptic_curve::sec1::ToEncodedPoint;
use k256::SecretKey;
use sha3::{Digest, Keccak256};

pub mod merkle;
pub mod progress;

pub const ADDRESS_SIZE: usize = 20;
pub const HASH_SIZE: usize = 32;
pub const ADDRESS_HEX_LENGTH: usize = 40;
pub const MAX_ADDRESSES: usize = 1_000_000;
pub const MAX_LAYERS: usize = 64;

#[must_use]
pub fn ethereum_address(secret_key: &SecretKey) -> String {
    let public_key = secret_key.public_key();
    let encoded = public_key.to_encoded_point(false);
    let public_bytes = encoded.as_bytes();

    debug_assert!(
        public_bytes.len() == 65,
        "Unexpected public key length: {}",
        public_bytes.len()
    );

    if public_bytes.len() != 65 {
        return String::new();
    }

    let hash = Keccak256::digest(&public_bytes[1..]);
    let address_bytes = &hash[12..];
    to_checksum_address(address_bytes)
}

#[must_use]
pub fn to_checksum_address(address: &[u8]) -> String {
    let hex = hex::encode(address);
    let hash = Keccak256::digest(hex.as_bytes());
    let mut checksummed = String::with_capacity(42);
    checksummed.push_str("0x");

    for (i, ch) in hex.chars().enumerate() {
        let hash_byte = hash[i / 2];
        let hash_nibble = if i % 2 == 0 {
            hash_byte >> 4
        } else {
            hash_byte & 0x0f
        };

        if ch.is_ascii_digit() || hash_nibble < 8 {
            checksummed.push(ch.to_ascii_lowercase());
        } else {
            checksummed.push(ch.to_ascii_uppercase());
        }
    }

    checksummed
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_checksum_address() {
        let bytes: [u8; ADDRESS_SIZE] = [
            0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56, 0x78,
            0x90, 0x12, 0x34, 0x56, 0x78, 0x90,
        ];
        let checksummed = to_checksum_address(&bytes);
        assert!(checksummed.starts_with("0x"));
        assert_eq!(checksummed.len(), 42);
    }
}
